import { buildContextFrom } from "../utils/rbac.util.js";
import { createHash, randomInt } from "node:crypto";
import IamUser from "../models/IamUser.model.js";
import {
  hashPassword,
  isPasswordExpired,
  validatePasswordPolicy,
  verifyPassword,
} from "../utils/password.util.js";
import { signAccessToken } from "../utils/jwt.util.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 3;

function hashCode(code) {
  return createHash("sha256")
    .update(String(code || ""))
    .digest("hex");
}

function buildFormspreeEndpoint() {
  const endpoint = String(process.env.FORMSPREE_ENDPOINT || "").trim();
  if (endpoint) return endpoint;

  const formId = String(process.env.FORMSPREE_FORM_ID || "").trim();
  if (!formId) return null;
  return `https://formspree.io/f/${formId}`;
}

async function sendPasswordCodeByFormspree({ email, code }) {
  const endpoint = buildFormspreeEndpoint();
  if (!endpoint) {
    throw new Error("FORMSPREE_ENDPOINT o FORMSPREE_FORM_ID no configurado");
  }

  const body = {
    email: "no-reply@senaf.local",
    _subject: "Codigo de verificacion SENAF",
    message: `Tu codigo de verificacion es ${code}. Expira en 10 minutos.`,
    to: email,
  };

  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`No se pudo enviar correo por Formspree (${r.status}) ${txt}`);
  }
}

/**
 * Helper para sumar días a una fecha. Devuelve una nueva fecha.
 * @param {Date} date 
 * @param {number} days 
 * @returns {Date}
 */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Helper para construir el payload del JWT a partir de un usuario. Incluye sub (externalId o _id), email, name, roles y permissions.
 * @param {*} user 
 * @returns 
 */
function buildUserJwtPayload(user) {
  return {
    sub: user.externalId || String(user._id),
    email: user.email || null,
    name: user.name || null,
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.perms) ? user.perms : [],
  };
}

/**
 * Controlador para login local con email y password. Verifica credenciales, estado del usuario, expiración de contraseña y devuelve un JWT si es válido. Si es el primer login o la contraseña expiró, devuelve un error indicando que se requiere cambio de contraseña.
 * @route POST /iam/auth/login
 * @body {string} email
 * @body {string} password
 * @returns {object} { ok: true, token, user } o { ok: false, error }
 */
export const login = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "email y password son requeridos" });
    }

    const user = await IamUser.findOne({ email })
      .select(
        "+passwordHash name email active roles perms mustChangePassword passwordExpiresAt",
      )
      .lean();

    if (!user || !user.passwordHash || !user.active) {
      return res
        .status(401)
        .json({ ok: false, error: "credenciales inválidas" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res
        .status(401)
        .json({ ok: false, error: "credenciales inválidas" });
    }

    const passwordExpired = isPasswordExpired(user.passwordExpiresAt);
    const firstLogin = !!user.mustChangePassword;

    if (firstLogin || passwordExpired) {
      return res.status(403).json({
        ok: false,
        code: "PASSWORD_CHANGE_REQUIRED",
        requirePasswordChange: true,
        reason: firstLogin ? "first_login" : "expired",
        email: user.email,
      });
    }

    const token = signAccessToken(buildUserJwtPayload(user));
    const { passwordHash, ...safeUser } = user;
    res.json({ ok: true, token, user: safeUser });
  } catch (e) {
    next(e);
  }
};

/**
 * Función para cambiar la contraseña de un usuario. Puede ser llamada por el usuario autenticado (en cuyo caso se verifica el token JWT) o por un usuario que provea email + currentPassword (en cuyo caso se verifica contra la base de datos). Verifica que la nueva contraseña cumpla la política, que no sea igual a la actual y actualiza el hash, las fechas de cambio y expiración. Devuelve un nuevo token JWT con el nuevo payload.
 * @route POST /iam/auth/change-password
 * @body {string} email (opcional si el usuario ya está autenticado)
 * @body {string} currentPassword
 * @body {string} newPassword
 * @returns {object} { ok: true, token } o { ok: false, error }
 */
export const changePassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!email || !newPassword) {
      return res
        .status(400)
        .json({
          ok: false,
          error: "Los campos correo electronico y Nueva contraseña son requeridos.",
        });
    }

    if (!validatePasswordPolicy(newPassword)) {
      return res.status(400).json({
        ok: false,
        error:
          "La nueva contraseña no cumple la política (min 12, mayúscula, minúscula, número y símbolo)",
      });
    }

    // Flujo explícito por email + currentPassword (sin depender de token/contexto)
    const user = await IamUser.findOne({ email }).select(
      "+passwordHash active mustChangePassword passwordResetCodeSentAt passwordResetVerifiedAt",
    );

    if (!user || !user.active || !user.passwordHash) {
      return res
        .status(401)
        .json({ ok: false, error: "Credenciales inválidas" });
    }

    const needsCodeVerification = !!user.mustChangePassword || !currentPassword;
    if (needsCodeVerification) {
      const sentAtMs = new Date(user.passwordResetCodeSentAt || 0).getTime();
      const verifiedAtMs = new Date(user.passwordResetVerifiedAt || 0).getTime();
      const verifiedIsFresh = verifiedAtMs && Date.now() - verifiedAtMs <= CODE_TTL_MS;
      const isAfterLastCode = verifiedAtMs >= sentAtMs;

      if (!verifiedIsFresh || !isAfterLastCode) {
        return res.status(403).json({
          ok: false,
          code: "PASSWORD_CODE_REQUIRED",
          error: "Debes validar el codigo enviado al correo antes de cambiar la contrasena.",
        });
      }
    }

    if (currentPassword) {
      const validCurrent = await verifyPassword(
        currentPassword,
        user.passwordHash,
      );
      if (!validCurrent) {
        return res
          .status(401)
          .json({ ok: false, error: "Contraseña actual invalida" });
      }
    }

    const isSamePassword = await verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ ok: false, error: "La nueva contraseña debe ser distinta" });
    }

    user.passwordHash = await hashPassword(newPassword);
    const now = new Date();
    user.passwordChangedAt = now;
    user.passwordExpiresAt = addDays(now, 60);
    user.mustChangePassword = false;
    user.passwordResetCodeHash = undefined;
    user.passwordResetCodeExpiresAt = undefined;
    user.passwordResetCodeAttempts = 0;
    user.passwordResetCodeLockedUntil = undefined;
    user.passwordResetCodeSentAt = undefined;
    user.passwordResetVerifiedAt = undefined;
    await user.save();

    const token = signAccessToken(buildUserJwtPayload(user));
    res.json({ ok: true, token, message: "Password changed" });
  } catch (e) {
    next(e);
  }
};

/**
 * Función para cerrar sesión. También limpia las cookies relacionadas con autenticación. Devuelve un mensaje de éxito.
 * @route POST /iam/auth/logout
 * @returns {object} { ok: true, message } o { ok: false, error }
 */

/**
 * Solicita y envia codigo de verificacion por correo (6 digitos, TTL 10 min).
 * @route POST /iam/auth/password-code/request
 * @body {string} email
 */
export const requestPasswordCode = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ ok: false, error: "email requerido" });
    }

    const user = await IamUser.findOne({ email }).select(
      "active +passwordResetCodeExpiresAt +passwordResetCodeLockedUntil",
    );

    if (!user || !user.active) {
      return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
    }

    const now = Date.now();
    const lockedUntilMs = new Date(user.passwordResetCodeLockedUntil || 0).getTime();
    const expiresAtMs = new Date(user.passwordResetCodeExpiresAt || 0).getTime();

    if (lockedUntilMs > now && expiresAtMs > now) {
      return res.status(429).json({
        ok: false,
        code: "PASSWORD_CODE_LOCKED",
        error: "Codigo bloqueado temporalmente. Espera para solicitar uno nuevo.",
        lockedUntil: new Date(lockedUntilMs).toISOString(),
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    }

    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    const expiresAt = new Date(now + CODE_TTL_MS);

    user.passwordResetCodeHash = hashCode(code);
    user.passwordResetCodeExpiresAt = expiresAt;
    user.passwordResetCodeAttempts = 0;
    user.passwordResetCodeLockedUntil = undefined;
    user.passwordResetCodeSentAt = new Date(now);
    user.passwordResetVerifiedAt = undefined;
    await user.save();

    await sendPasswordCodeByFormspree({ email: user.email, code });

    return res.json({
      ok: true,
      message: "Codigo enviado",
      expiresAt: expiresAt.toISOString(),
      attemptsRemaining: CODE_MAX_ATTEMPTS,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Verifica codigo de correo para cambio de contrasena.
 * @route POST /iam/auth/password-code/verify
 * @body {string} email
 * @body {string} code
 */
export const verifyPasswordCode = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!email || !code) {
      return res.status(400).json({ ok: false, error: "email y code son requeridos" });
    }

    const user = await IamUser.findOne({ email }).select(
      "active +passwordResetCodeHash +passwordResetCodeExpiresAt +passwordResetCodeAttempts +passwordResetCodeLockedUntil",
    );

    if (!user || !user.active) {
      return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
    }

    const now = Date.now();
    const expiresAtMs = new Date(user.passwordResetCodeExpiresAt || 0).getTime();
    const lockedUntilMs = new Date(user.passwordResetCodeLockedUntil || 0).getTime();

    if (!user.passwordResetCodeHash || !expiresAtMs) {
      return res.status(400).json({
        ok: false,
        code: "PASSWORD_CODE_MISSING",
        error: "Primero debes solicitar un codigo.",
      });
    }

    if (expiresAtMs <= now) {
      return res.status(400).json({
        ok: false,
        code: "PASSWORD_CODE_EXPIRED",
        error: "El codigo expiro. Solicita uno nuevo.",
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    }

    if (lockedUntilMs > now) {
      return res.status(429).json({
        ok: false,
        code: "PASSWORD_CODE_LOCKED",
        error: "Codigo bloqueado temporalmente.",
        lockedUntil: new Date(lockedUntilMs).toISOString(),
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    }

    const incomingHash = hashCode(code);
    const isValid = incomingHash === user.passwordResetCodeHash;

    if (!isValid) {
      user.passwordResetCodeAttempts = Number(user.passwordResetCodeAttempts || 0) + 1;
      const attemptsRemaining = Math.max(0, CODE_MAX_ATTEMPTS - user.passwordResetCodeAttempts);

      if (attemptsRemaining <= 0) {
        user.passwordResetCodeLockedUntil = new Date(expiresAtMs);
      }

      await user.save();

      return res.status(400).json({
        ok: false,
        code: attemptsRemaining <= 0 ? "PASSWORD_CODE_LOCKED" : "PASSWORD_CODE_INVALID",
        error:
          attemptsRemaining <= 0
            ? "Se agotaron los intentos. Espera para solicitar un nuevo codigo."
            : "Codigo incorrecto.",
        attemptsRemaining,
        lockedUntil:
          attemptsRemaining <= 0 ? new Date(expiresAtMs).toISOString() : null,
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    }

    user.passwordResetVerifiedAt = new Date(now);
    user.passwordResetCodeAttempts = 0;
    user.passwordResetCodeLockedUntil = undefined;
    await user.save();

    return res.json({
      ok: true,
      message: "Codigo validado",
      expiresAt: new Date(expiresAtMs).toISOString(),
    });
  } catch (e) {
    next(e);
  }
};
/**
 * Funcion para cerrar sesion. Tambien limpia cookies relacionadas con autenticacion.
 * @route POST /iam/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const clearAuthCookies = () => {
      const names = [
        "access_token",
        "id_token",
        "refresh_token",
        "token",
        "jwt",
        "connect.sid",
      ];
      for (const name of names) {
        res.clearCookie(name, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
        res.clearCookie(name, {
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    };

    if (req.session?.destroy) {
      return req.session.destroy(() => {
        clearAuthCookies();
        return res.json({ ok: true, message: "Logged out" });
      });
    }

    clearAuthCookies();
    res.json({ ok: true, message: "Logged out" });
  } catch (e) {
    next(e);
  }
};

/**
 * Devolver información de la sesión actual. Verifica el token JWT, construye el contexto RBAC y devuelve el usuario, roles, permisos y payload del token.
 * @route GET /iam/auth/me
 * @returns {object} { ok: true, user, roles, permissions, tokenPayload } o { ok: false, error }
 */
export const getSessionMe = async (req, res, next) => {
  try {
    const ctx = await buildContextFrom(req);
    const tokenPayload = req?.auth?.payload || null;
    res.json({
      ok: true,
      user: ctx.user,
      roles: ctx.roles,
      permissions: ctx.permissions,
      tokenPayload,
    });
  } catch (e) {
    next(e);
  }
};


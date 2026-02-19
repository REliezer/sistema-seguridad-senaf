import { buildContextFrom } from "../utils/rbac.util.js";
import IamUser from "../models/IamUser.model.js";
import {
  hashPassword,
  isPasswordExpired,
  validatePasswordPolicy,
  verifyPassword,
} from "../utils/password.util.js";
import { signAccessToken } from "../utils/jwt.util.js";

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
    const user = await IamUser.findOne({ email }).select("+passwordHash active");

    if (!user || !user.active || !user.passwordHash) {
      return res
        .status(401)
        .json({ ok: false, error: "Credenciales inválidas" });
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

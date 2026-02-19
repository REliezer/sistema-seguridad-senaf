import { verifyAccessToken } from "../../modules/iam/utils/jwt.util.js";

const DISABLE_AUTH = String(process.env.DISABLE_AUTH || "0") === "1";

/**
 * Función para parsear el token Bearer del header Authorization. Retorna null si no existe o no es válido.
 * @param {*} req 
 * @returns 
 */
function parseBearer(req) {
  const h = String(req.headers.authorization || "");
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

/**
 * Función para parsear las roles y permisos desde el payload del JWT. Soporta:
 * - roles: array de roles (ej: ["admin", "user"])
 * - permissions: array de permisos (ej: ["iam.users.manage"])
 * - scope: string con permisos separados por espacios (ej: "iam.users.manage iam.roles.manage")
 * @param {*} p 
 * @returns 
 */
function parsePermissionsFromPayload(p = {}) {
  let perms = Array.isArray(p.permissions) ? p.permissions : [];
  if ((!perms || perms.length === 0) && typeof p.scope === "string") {
    perms = p.scope
      .split(" ")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return Array.from(new Set(perms));
}

/**
 * Función para convertir un valor a array. Si ya es un array, lo retorna. Si es un string, lo convierte en array de un elemento. Si es falsy, retorna array vacío.
 * @param {*} v 
 * @returns 
 */
function toArr(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Función para construir un objeto de usuario a partir del payload del JWT. Extrae sub, email, name, roles y permissions.
 * - sub: se mapea a externalId (legacy Auth0) o se toma directamente del payload
 * - email: se toma del campo email o de un claim personalizado (ej: https://senaf/email)
 * - name: se toma del campo name
 * - roles: se normaliza a array de strings
 * - permissions: se parsea con parsePermissionsFromPayload
 * @param {*} p 
 * @returns 
 */
export function getUserFromPayload(p = {}) {
  const rolesRaw = p.roles || [];
  const roles = toArr(rolesRaw).filter(Boolean);
  const permissions = parsePermissionsFromPayload(p);

  return {
    sub: p.sub || null,
    email: p.email || null,
    name: p.name || null,
    roles,
    permissions,
  };
}

/**
 * Función middleware para autenticar el token JWT de la cabecera Authorization. Si el token es válido, adjunta el payload en req.auth.payload y el usuario construido en req.user. Si el token no es válido o no existe, responde con 401 a menos que se indique que la autenticación es opcional.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @param {*} optional 
 * @returns 
 */
function authenticateToken(req, res, next, optional = false) {
  if (DISABLE_AUTH) return next();

  const token = parseBearer(req);
  if (!token) {
    if (optional) return next();
    return res.status(401).json({ ok: false, error: "No autenticado" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = req.auth || {};
    req.auth.payload = payload;
    req.user = getUserFromPayload(payload);
    return next();
  } catch (err) {
    if (optional) return next();
    return res.status(401).json({ ok: false, error: "Token inválido" });
  }
}

export function requireAuth(req, res, next) {
  return authenticateToken(req, res, next, false);
}

export { requireAuth as checkJwt };

export function optionalAuth(req, res, next) {
  return authenticateToken(req, res, next, true);
}

export function attachUser(req, _res, next) {
  if (req?.auth?.payload) {
    req.user = getUserFromPayload(req.auth.payload);
  }
  next();
}

export const attachAuthUser = attachUser;

export function requireAdmin(req, res, next) {
  if (DISABLE_AUTH) return next();

  const user =
    req.user ||
    (req?.auth?.payload ? getUserFromPayload(req.auth.payload) : null);

  if (!user) {
    return res.status(401).json({ ok: false, message: "No autenticado" });
  }

  const roles = (user.roles || []).map((r) => String(r).toLowerCase());
  const perms = Array.isArray(user.permissions) ? user.permissions : [];

  if (roles.includes("admin") || perms.includes("*")) return next();

  return res.status(403).json({
    ok: false,
    message: "Acceso solo para administradores",
    roles,
    perms,
  });
}


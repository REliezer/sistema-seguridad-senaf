import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.APP_JWT_SECRET || "";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

/**
 * Función para obtener el secreto JWT desde la configuración. Lanza error si no está configurado.
 * @returns {string} El secreto JWT
 */
export function getJwtSecret() {
  return JWT_SECRET;
}

/**
 * Firma un JWT con el payload dado. Opciones:
 * - expiresIn: tiempo de expiración (ej: "8h", "15m", etc). Por defecto "8h".
 * @param {*} payload
 * @param {*} opts 
 * @returns 
 */
export function signAccessToken(payload = {}, opts = {}) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET no configurado");
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: opts.expiresIn || JWT_EXPIRES_IN,
  });
}

/**
 * Función para verificar un JWT y obtener su payload. Lanza error si no es válido o expiró.
 * @param {*} token 
 * @returns 
 */
export function verifyAccessToken(token) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET no configurado");
  return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
}


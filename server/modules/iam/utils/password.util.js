// ESM module
import bcrypt from "bcryptjs";

/**
 * Hashea una contraseña con bcrypt (cost=10).
 * Devuelve un string con el hash.
 */
export async function hashPassword(pwd) {
  const plain = String(pwd ?? "");
  if (!plain) throw new Error("password vacío");
  const saltRounds = 10;
  return bcrypt.hash(plain, saltRounds);
}

/**
 * Verifica una contraseña contra un hash bcrypt.
 * Devuelve true/false.
 */
export async function verifyPassword(pwd, hash) {
  const plain = String(pwd ?? "");
  const h = String(hash ?? "");
  if (!plain || !h) return false;
  return bcrypt.compare(plain, h);
}

/**
 * Helper de política sobre formato de contraseña: 
 * longitud mínima (12)
 * Minimo una mayúsculas
 * Minimo una minúscula
 * Minimo un número
 * Minimo un símbolo
 */
export function validatePasswordPolicy(pwd) {
  const plain = String(pwd ?? "");
  if (plain.length < 12) return false;
  if (!/[A-Z]/.test(plain)) return false;
  if (!/[a-z]/.test(plain)) return false;
  if (!/[0-9]/.test(plain)) return false;
  if (!/[^A-Za-z0-9]/.test(plain)) return false;
  return true;
}

/**
 * Helper para saber si una contraseña ha expirado (comparar fecha actual con expiresAt)
 */
export function isPasswordExpired(expiresAt) {
  if (!expiresAt) return false; // si no hay fecha, no expira
  return new Date() > new Date(expiresAt);
} 

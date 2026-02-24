// ESM module
import bcrypt from "bcryptjs";
import { getParameterCached } from "./system.helpers.js";

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
 * Helper de política sobre formato de contraseña (DINÁMICA desde system-parameters)
 * Lee parámetros:
 * - password_min_length (por defecto 12)
 * - password_require_uppercase (por defecto true)
 * - password_require_lowercase (por defecto true)
 * - password_require_number (por defecto true)
 * - password_require_symbol (por defecto true)
 */
export async function validatePasswordPolicy(pwd) {
  const plain = String(pwd ?? "");
  
  // Obtener parámetros con caché
  const minLength = await getParameterCached("password_min_length", 12);
  const requireUppercase = await getParameterCached("password_require_uppercase", true);
  const requireLowercase = await getParameterCached("password_require_lowercase", true);
  const requireNumber = await getParameterCached("password_require_number", true);
  const requireSymbol = await getParameterCached("password_require_symbol", true);

  const minLengthNum = Number(minLength) || 12;

  if (plain.length < minLengthNum) return false;
  if (requireUppercase && !/[A-Z]/.test(plain)) return false;
  if (requireLowercase && !/[a-z]/.test(plain)) return false;
  if (requireNumber && !/[0-9]/.test(plain)) return false;
  if (requireSymbol && !/[^A-Za-z0-9]/.test(plain)) return false;
  
  return true;
}

/**
 * Helper para saber si una contraseña ha expirado (comparar fecha actual con expiresAt)
 */
export function isPasswordExpired(expiresAt) {
  if (!expiresAt) return false; // si no hay fecha, no expira
  return new Date() > new Date(expiresAt);
}

/**
 * Genera una contraseña aleatoria que cumpla la política de seguridad (DINÁMICA):
 * - Mínimo password_min_length (por defecto 12) caracteres
 * - Al menos una mayúscula (si password_require_uppercase es true)
 * - Al menos una minúscula (si password_require_lowercase es true)
 * - Al menos un número (si password_require_number es true)
 * - Al menos un símbolo (si password_require_symbol es true)
 * @returns {Promise<string>} Contraseña generada aleatoriamente
 */
export async function generateRandomPassword() {
  // Obtener parámetros con caché
  const minLength = await getParameterCached("password_min_length", 12);
  const requireUppercase = await getParameterCached("password_require_uppercase", true);
  const requireLowercase = await getParameterCached("password_require_lowercase", true);
  const requireNumber = await getParameterCached("password_require_number", true);
  const requireSymbol = await getParameterCached("password_require_symbol", true);

  const minLengthNum = Math.max(Number(minLength) || 12, 8);

  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{}|;:,.<>?";

  const allChars = uppercase + lowercase + numbers + symbols;

  // Garantizar al menos uno de cada tipo requerido
  let password = "";
  
  if (requireUppercase) password += uppercase[Math.floor(Math.random() * uppercase.length)];
  if (requireLowercase) password += lowercase[Math.floor(Math.random() * lowercase.length)];
  if (requireNumber) password += numbers[Math.floor(Math.random() * numbers.length)];
  if (requireSymbol) password += symbols[Math.floor(Math.random() * symbols.length)];

  // Rellenar hasta minLength caracteres con caracteres aleatorios
  while (password.length < minLengthNum) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mezclar la contraseña para que no siempre empiece con mayúscula
  const passwordArray = password.split("");
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join("");
}

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

/**
 * Genera una contraseña aleatoria que cumpla la política de seguridad:
 * - Mínimo 12 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un símbolo
 * @returns {string} Contraseña generada aleatoriamente
 */
export function generateRandomPassword() {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{}|;:,.<>?";

  const allChars = uppercase + lowercase + numbers + symbols;

  // Garantizar al menos uno de cada tipo
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Rellenar el resto hasta 12 caracteres con caracteres aleatorios
  const minLength = 12;
  while (password.length < minLength) {
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

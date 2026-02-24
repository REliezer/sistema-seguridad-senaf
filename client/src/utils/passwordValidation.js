/**
 * NOTA: Estos valores DEBEN coincidir con los del servidor en system-parameters.seed
 * Si cambias estos, también cambiar en:
 * - server/modules/iam/utils/system-parameters.seed.js (DEFAULT_SYSTEM_PARAMETERS)
 * 
 * Valores por defecto:
 * - password_min_length: 12
 * - password_require_uppercase: true
 * - password_require_lowercase: true
 * - password_require_number: true
 * - password_require_symbol: true
 */

const PASSWORD_CONFIG = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
};

/**
 * Función para validar la política de contraseña (valores locales por defecto)
 * Devuelve objeto con validaciones detalladas para UI
 */
export function validatePasswordPolicy(pwd) {
  const plain = String(pwd ?? "");
  
  return {
    isValid:
      plain.length >= PASSWORD_CONFIG.minLength &&
      (!PASSWORD_CONFIG.requireUppercase || /[A-Z]/.test(plain)) &&
      (!PASSWORD_CONFIG.requireLowercase || /[a-z]/.test(plain)) &&
      (!PASSWORD_CONFIG.requireNumber || /[0-9]/.test(plain)) &&
      (!PASSWORD_CONFIG.requireSymbol || /[^A-Za-z0-9]/.test(plain)),
    minLength: {
      ok: plain.length >= PASSWORD_CONFIG.minLength,
      label: `Mínimo ${PASSWORD_CONFIG.minLength} caracteres`,
    },
    hasUppercase: {
      ok: /[A-Z]/.test(plain),
      label: "Al menos una mayúscula",
    },
    hasLowercase: {
      ok: /[a-z]/.test(plain),
      label: "Al menos una minúscula",
    },
    hasNumber: {
      ok: /[0-9]/.test(plain),
      label: "Al menos un número",
    },
    hasSymbol: {
      ok: /[^A-Za-z0-9]/.test(plain),
      label: "Al menos un símbolo especial",
    },
  };
}

/**
 * Función para validar la política de contraseña:
 * - Mínimo 12 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un símbolo
 */
export function validatePasswordPolicy(pwd) {
  const plain = String(pwd ?? "");
  return {
    isValid: plain.length >= 12 && 
             /[A-Z]/.test(plain) && 
             /[a-z]/.test(plain) && 
             /[0-9]/.test(plain) && 
             /[^A-Za-z0-9]/.test(plain),
    minLength: { ok: plain.length >= 12, label: "Mínimo 12 caracteres" },
    hasUppercase: { ok: /[A-Z]/.test(plain), label: "Al menos una mayúscula" },
    hasLowercase: { ok: /[a-z]/.test(plain), label: "Al menos una minúscula" },
    hasNumber: { ok: /[0-9]/.test(plain), label: "Al menos un número" },
    hasSymbol: { ok: /[^A-Za-z0-9]/.test(plain), label: "Al menos un símbolo" },
  };
}

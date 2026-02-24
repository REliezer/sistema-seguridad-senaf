import SystemParameter from "../models/SystemParameter.model.js";

/**
 * Seed de parámetros del sistema por defecto
 */
export const DEFAULT_SYSTEM_PARAMETERS = [
  {
    key: "password_expiry_days",
    value: "60",
    description: "Número de días hasta que una contraseña expire",
    category: "password",
    dataType: "number",
  },
  {
    key: "password_min_length",
    value: "12",
    description: "Longitud mínima de la contraseña",
    category: "password",
    dataType: "number",
  },
  {
    key: "password_require_uppercase",
    value: "true",
    description: "Requiere al menos una letra mayúscula en la contraseña",
    category: "password",
    dataType: "boolean",
  },
  {
    key: "password_require_lowercase",
    value: "true",
    description: "Requiere al menos una letra minúscula en la contraseña",
    category: "password",
    dataType: "boolean",
  },
  {
    key: "password_require_number",
    value: "true",
    description: "Requiere al menos un número en la contraseña",
    category: "password",
    dataType: "boolean",
  },
  {
    key: "password_require_symbol",
    value: "true",
    description: "Requiere al menos un símbolo especial en la contraseña",
    category: "password",
    dataType: "boolean",
  },
  {
    key: "session_timeout_minutes",
    value: "30",
    description: "Minutos de inactividad antes de cerrar sesión automáticamente",
    category: "security",
    dataType: "number",
  },
  {
    key: "max_login_attempts",
    value: "3",
    description: "Número máximo de intentos fallidos de login antes de bloquear cuenta",
    category: "security",
    dataType: "number",
  },
  {
    key: "lock_duration_minutes",
    value: "15",
    description: "Minutos que se bloquea una cuenta después de exceder intentos de login",
    category: "security",
    dataType: "number",
  },
];

/**
 * Inicializa los parámetros del sistema
 * Solo crea si no existen (no sobrescribe los existentes)
 */
export async function seedSystemParameters() {
  try {
    console.log("[seedSystemParameters] Iniciando seed de parámetros del sistema...");

    let created = 0;
    let skipped = 0;

    for (const param of DEFAULT_SYSTEM_PARAMETERS) {
      const exists = await SystemParameter.findOne({ key: param.key });

      if (exists) {
        skipped++;
        console.log(`[seedSystemParameters] Parámetro "${param.key}" ya existe, se omite`);
        continue;
      }

      await SystemParameter.create({
        ...param,
        updatedBy: "seed",
      });

      created++;
      console.log(`[seedSystemParameters] Parámetro "${param.key}" creado`);
    }

    console.log(
      `[seedSystemParameters] Completado: ${created} creados, ${skipped} omitidos`
    );
    return { ok: true, created, skipped };
  } catch (err) {
    console.error("[seedSystemParameters] Error:", err?.message);
    throw err;
  }
}

/**
 * Obtiene el estado del seed (para verificar si ya se ejecutó)
 */
export async function getSystemParametersStatus() {
  try {
    const count = await SystemParameter.countDocuments();
    return { ok: true, parametersCount: count };
  } catch (err) {
    console.error("[getSystemParametersStatus] Error:", err?.message);
    return { ok: false, error: err?.message };
  }
}

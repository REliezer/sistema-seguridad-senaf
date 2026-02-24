import SystemParameter from "../models/SystemParameter.model.js";

/**
 * Obtiene un parámetro del sistema por clave
 * @param {string} key - Clave del parámetro
 * @param {any} defaultValue - Valor por defecto si no existe
 * @returns {Promise<any>} Valor del parámetro o valor por defecto
 */
export async function getParameter(key, defaultValue = null) {
  try {
    const param = await SystemParameter.findOne({
      key: String(key || "").toLowerCase().trim(),
    }).lean();

    if (!param) return defaultValue;

    // Convertir según el tipo de dato configurado
    if (param.dataType === "number") {
      return Number(param.value) || defaultValue;
    }
    if (param.dataType === "boolean") {
      return ["true", "1", "yes"].includes(String(param.value).toLowerCase());
    }

    return param.value;
  } catch (err) {
    console.error("[getParameter] Error fetching parameter:", key, err?.message);
    return defaultValue;
  }
}

/**
 * Establece o actualiza un parámetro del sistema
 * @param {string} key - Clave del parámetro
 * @param {any} value - Valor a guardar
 * @param {object} opts - Opciones adicionales { description, category, dataType, updatedBy }
 * @returns {Promise<object>} Documento guardado
 */
export async function setParameter(key, value, opts = {}) {
  try {
    const normalizedKey = String(key || "").toLowerCase().trim();
    if (!normalizedKey) throw new Error("Clave de parámetro requerida");

    const update = {
      key: normalizedKey,
      value: String(value || "").trim(),
      description: opts.description || "",
      category: opts.category || "general",
      dataType: opts.dataType || "string",
      updatedBy: opts.updatedBy || "system",
    };

    const param = await SystemParameter.findOneAndUpdate(
      { key: normalizedKey },
      update,
      { upsert: true, new: true }
    );

    return param;
  } catch (err) {
    console.error("[setParameter] Error setting parameter:", key, err?.message);
    throw err;
  }
}

/**
 * Obtiene todos los parámetros de una categoría
 * @param {string} category - Categoría de parámetros
 * @returns {Promise<array>} Array de parámetros
 */
export async function getParametersByCategory(category) {
  try {
    const params = await SystemParameter.find({
      category: String(category || "").trim(),
    }).lean();
    return params || [];
  } catch (err) {
    console.error("[getParametersByCategory] Error:", category, err?.message);
    return [];
  }
}

/**
 * Cache local simple para parámetros frecuentes
 * (para reducir llamadas a BD)
 */
const paramCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene un parámetro con caché
 * @param {string} key - Clave del parámetro
 * @param {any} defaultValue - Valor por defecto
 * @returns {Promise<any>}
 */
export async function getParameterCached(key, defaultValue = null) {
  const now = Date.now();
  const cached = paramCache.get(key);

  if (cached && now - cached.time < CACHE_TTL_MS) {
    return cached.value;
  }

  const value = await getParameter(key, defaultValue);
  paramCache.set(key, { value, time: now });
  return value;
}

/**
 * Invalida el caché de un parámetro
 * @param {string} key - Clave del parámetro (null para limpiar todo)
 */
export function invalidateParameterCache(key = null) {
  if (key === null) {
    paramCache.clear();
  } else {
    paramCache.delete(key);
  }
}

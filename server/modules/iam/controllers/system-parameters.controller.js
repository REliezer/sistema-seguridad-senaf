import SystemParameter from "../models/SystemParameter.model.js";
import { invalidateParameterCache } from "../utils/system.helpers.js";

/**
 * Lista todos los parámetros del sistema
 * @route GET /iam/v1/system-parameters
 */
export async function listParameters(req, res, next) {
  try {
    const category = String(req.query.category || "").trim();

    const filter = category ? { category } : {};
    const items = await SystemParameter.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({ ok: true, items, count: items.length });
  } catch (err) {
    return next(err);
  }
}

/**
 * Obtiene un parámetro por clave
 * @route GET /iam/v1/system-parameters/:key
 */
export async function getParameter(req, res, next) {
  try {
    const { key } = req.params;
    if (!key) return res.status(400).json({ ok: false, error: "Clave requerida" });

    const item = await SystemParameter.findOne({
      key: String(key).toLowerCase().trim(),
    }).lean();

    if (!item) {
      return res.status(404).json({ ok: false, error: "Parámetro no encontrado" });
    }

    return res.json({ ok: true, item });
  } catch (err) {
    return next(err);
  }
}

/**
 * Crea un nuevo parámetro
 * @route POST /iam/v1/system-parameters
 * @body {string} key - Clave única del parámetro
 * @body {string} value - Valor del parámetro
 * @body {string} description - Descripción (opcional)
 * @body {string} category - Categoría (security, password, general, system)
 * @body {string} dataType - Tipo de dato (string, number, boolean)
 */
export async function createParameter(req, res, next) {
  try {
    const { key, value, description, category, dataType } = req.body || {};

    if (!key || !value) {
      return res
        .status(400)
        .json({ ok: false, error: "La clave y el valor son requeridos" });
    }

    const normalizedKey = String(key).toLowerCase().trim();

    // Verificar que no exista
    const exists = await SystemParameter.findOne({ key: normalizedKey });
    if (exists) {
      return res.status(409).json({
        ok: false,
        error: "Esta clave de parámetro ya existe",
      });
    }

    const item = await SystemParameter.create({
      key: normalizedKey,
      value: String(value).trim(),
      description: description ? String(description).trim() : "",
      category: category || "general",
      dataType: dataType || "string",
      updatedBy: req.user?.email || "system",
    });

    invalidateParameterCache(normalizedKey);

    return res.status(201).json({ ok: true, item });
  } catch (err) {
    return next(err);
  }
}

/**
 * Actualiza un parámetro existente
 * @route PATCH /iam/v1/system-parameters/:key
 * @body {string} value - Nuevo valor
 * @body {string} description - Nueva descripción (opcional)
 */
export async function updateParameter(req, res, next) {
  try {
    const { key } = req.params;
    const { value, description, category, dataType } = req.body || {};

    if (!key) return res.status(400).json({ ok: false, error: "Clave requerida" });
    if (!value) return res.status(400).json({ ok: false, error: "Valor requerido" });

    const normalizedKey = String(key).toLowerCase().trim();

    const updateData = {
      value: String(value).trim(),
      updatedBy: req.user?.email || "system",
    };

    if (description !== undefined) {
      updateData.description = String(description).trim();
    }
    if (category !== undefined) {
      updateData.category = category;
    }
    if (dataType !== undefined) {
      updateData.dataType = dataType;
    }

    const item = await SystemParameter.findOneAndUpdate(
      { key: normalizedKey },
      updateData,
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ ok: false, error: "Parámetro no encontrado" });
    }

    invalidateParameterCache(normalizedKey);

    return res.json({ ok: true, item });
  } catch (err) {
    return next(err);
  }
}

/**
 * Elimina un parámetro
 * @route DELETE /iam/v1/system-parameters/:key
 */
export async function deleteParameter(req, res, next) {
  try {
    const { key } = req.params;
    if (!key) return res.status(400).json({ ok: false, error: "Clave requerida" });

    const normalizedKey = String(key).toLowerCase().trim();
    const item = await SystemParameter.findOneAndDelete({ key: normalizedKey });

    if (!item) {
      return res.status(404).json({ ok: false, error: "Parámetro no encontrado" });
    }

    invalidateParameterCache(normalizedKey);

    return res.json({ ok: true, message: "Parámetro eliminado", item });
  } catch (err) {
    return next(err);
  }
}

import { Router } from "express";
import {
  listParameters,
  getParameter,
  createParameter,
  updateParameter,
  deleteParameter,
} from "../controllers/system-parameters.controller.js";

const router = Router();

/**
 * GET /iam/v1/system-parameters
 * Lista todos los parámetros del sistema (opcional filtrar por categoría)
 */
router.get("/", listParameters);

/**
 * GET /iam/v1/system-parameters/:key
 * Obtiene un parámetro específico por clave
 */
router.get("/:key", getParameter);

/**
 * POST /iam/v1/system-parameters
 * Crea un nuevo parámetro
 */
router.post("/", createParameter);

/**
 * PATCH /iam/v1/system-parameters/:key
 * Actualiza un parámetro existente
 */
router.patch("/:key", updateParameter);

/**
 * DELETE /iam/v1/system-parameters/:key
 * Elimina un parámetro
 */
router.delete("/:key", deleteParameter);

export default router;

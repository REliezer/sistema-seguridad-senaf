// server/modules/iam/routes/audit.routes.js
import { Router } from "express";
import { devOr, requirePerm } from "../utils/rbac.util.js";
import { listAudit, createAudit, cleanupAudit } from "../controllers/audit.controller.js";


const auditRoutes = Router();

auditRoutes.get("/", devOr(requirePerm("iam.roles.manage")), listAudit);
auditRoutes.post("/", devOr(requirePerm("iam.roles.manage")), createAudit);
auditRoutes.delete("/cleanup", devOr(requirePerm("iam.roles.manage")), cleanupAudit);

export default auditRoutes;
import { Router } from "express";
import IamPermission from "../models/IamPermission.model.js";
import IamRole from "../models/IamRole.model.js";
import { requirePerm, devOr } from "../utils/rbac.util.js";
import { writeAudit } from "../utils/audit.util.js";
import { createPermissions, deletePermissionsById, listPermissions, syncPermissions, updatePermissions } from "../controllers/permissions.controller.js";

const permissionsRoutes = Router();

permissionsRoutes.get("/", devOr(requirePerm("iam.roles.manage")), listPermissions);
permissionsRoutes.post("/", devOr(requirePerm("iam.roles.manage")), createPermissions);
permissionsRoutes.patch("/:id", devOr(requirePerm("iam.roles.manage")), updatePermissions);
permissionsRoutes.delete("/:id", devOr(requirePerm("iam.roles.manage")), deletePermissionsById);
permissionsRoutes.post("/sync", devOr(requirePerm("iam.roles.manage")), syncPermissions);

export default permissionsRoutes;
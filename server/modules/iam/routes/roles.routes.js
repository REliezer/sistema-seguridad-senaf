// modules/iam/routes/roles.routes.js
import { Router } from "express";
import { devOr, requireAnyPerm, requirePerm } from "../utils/rbac.util.js";
import { createRol, deleteRolById, getPermissionsRolByKey, listRoles, replacePermissionsRolByKey, updateRolById } from "../controllers/roles.controller.js";

const rolesRoutes = Router();

rolesRoutes.get("/", devOr(requireAnyPerm("iam.roles.manage", "iam.users.manage")), listRoles);
rolesRoutes.post("/", devOr(requirePerm("iam.roles.manage")), createRol);
rolesRoutes.patch("/:id", devOr(requirePerm("iam.roles.manage")), updateRolById);
rolesRoutes.delete("/:id", devOr(requirePerm("iam.roles.manage")), deleteRolById);
rolesRoutes.get("/:id/permissions", devOr(requirePerm("iam.roles.manage")), getPermissionsRolByKey);
rolesRoutes.put("/:id/permissions", devOr(requirePerm("iam.roles.manage")), replacePermissionsRolByKey);

export default rolesRoutes;
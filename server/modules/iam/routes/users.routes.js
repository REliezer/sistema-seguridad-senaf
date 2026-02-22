import { Router } from "express";
import { devOr, requirePerm } from "../utils/rbac.util.js";
import {
  createUser,
  deleteUserById,
  disableUserById,
  enableUserById,
  getUserById,
  listGuards,
  listGuardsPicker,
  listUsers,
  patchUserById,
  updateUserPassword,
} from "../controllers/users.controller.js";

const usersRoutes = Router();

usersRoutes.get("/", devOr(requirePerm("iam.users.manage")), listUsers);
usersRoutes.get("/guards/picker", devOr(requirePerm("incidents.create")), listGuardsPicker);
usersRoutes.get("/guards", devOr(requirePerm("iam.users.manage")), listGuards);

usersRoutes.get("/:id", devOr(requirePerm("iam.users.manage")), getUserById);
usersRoutes.post("/", devOr(requirePerm("iam.users.manage")), createUser);
usersRoutes.patch("/:id", devOr(requirePerm("iam.users.manage")), patchUserById);
usersRoutes.post("/:id/enable", devOr(requirePerm("iam.users.manage")), enableUserById);
usersRoutes.post("/:id/disable", devOr(requirePerm("iam.users.manage")), disableUserById);
usersRoutes.post("/:id/password", devOr(requirePerm("iam.users.manage")), updateUserPassword);
usersRoutes.delete("/:id", devOr(requirePerm("iam.users.manage")), deleteUserById);

export default usersRoutes;

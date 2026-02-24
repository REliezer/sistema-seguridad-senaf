import { Router } from "express";
import {
  checkEmail,
  getSessionMe,
  logout,
  changePassword,
  login,
  requestPasswordCode,
  verifyPasswordCode,
} from "../controllers/auth.controller.js";

const iamUserRoutes = Router();

iamUserRoutes.post("/check-email", checkEmail);
iamUserRoutes.get("/session/me", getSessionMe);
iamUserRoutes.post("/logout", logout);
iamUserRoutes.post("/change-password", changePassword);
iamUserRoutes.post("/password-code/request", requestPasswordCode);
iamUserRoutes.post("/password-code/verify", verifyPasswordCode);
iamUserRoutes.post("/login", login);

export default iamUserRoutes;

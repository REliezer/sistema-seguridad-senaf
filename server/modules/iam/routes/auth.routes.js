import { Router } from "express";
import {
  getSessionMe,
  logout,
  changePassword,
  login,
} from "../controllers/auth.controller.js";

const iamUserRoutes = Router();

iamUserRoutes.get("/session/me", getSessionMe);
iamUserRoutes.post("/logout", logout);
iamUserRoutes.post("/change-password", changePassword);
iamUserRoutes.post("/login", login);

export default iamUserRoutes;

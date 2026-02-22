// server/modules/iam/routes/me.routes.js
import { Router } from "express";
import { meInfo } from "../controllers/me.controller.js";

const meInfoRoutes = Router();

meInfoRoutes.get("/", meInfo);

export default meInfoRoutes;
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { updateAlertsSettings } from "../controllers/alerts.controller";

const router = Router();

router.patch("/alerts", authMiddleware, updateAlertsSettings);

export default router;

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { updateAlertsSettings, testAlertsRun } from "../controllers/alerts.controller";

const router = Router();

router.patch("/alerts", authMiddleware, updateAlertsSettings);
router.post("/alerts/test-run", authMiddleware, testAlertsRun);

export default router;

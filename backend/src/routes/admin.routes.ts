import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { getOverview } from "../controllers/admin/overview.controller";

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/overview", getOverview);

export default router;

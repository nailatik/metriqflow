import { Router } from "express";
import { redeemPromo } from "../controllers/subscription.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.post("/redeem", authMiddleware, authLimiter, redeemPromo);

export default router;

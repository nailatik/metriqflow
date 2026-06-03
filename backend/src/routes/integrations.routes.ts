import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { generateTelegramToken, getTelegramStatus, unlinkTelegram } from "../controllers/integrations.controller";
import { getUserChannels, getChannelAnalytics, getCombinedSummary } from "../controllers/analytics.controller";
import { aiInsightsTelegram } from "../controllers/ai.controller";

const router = Router();

router.use(authMiddleware);

router.post("/telegram/token",                              generateTelegramToken);
router.get("/telegram/status",                              getTelegramStatus);
router.delete("/telegram/unlink",                           unlinkTelegram);
router.get("/telegram/channels",                            getUserChannels);
router.get("/telegram/channels/:channelId/analytics",      getChannelAnalytics);
router.post("/telegram/channels/:channelId/ai-insights",   aiInsightsTelegram);
router.get("/analytics/summary",                            getCombinedSummary);

export default router;

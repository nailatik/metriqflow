import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getVkAuthUrl,
  handleVkCallback,
  getVkStatus,
  disconnectVk,
  getVkCommunities,
  getVkCommunityAnalytics,
} from "../controllers/vk.controller";

const router = Router();

// Public — VK redirects here after OAuth
router.get("/callback", handleVkCallback);

router.use(authMiddleware);

router.get("/auth-url",                               getVkAuthUrl);
router.get("/status",                                 getVkStatus);
router.delete("/disconnect",                          disconnectVk);
router.get("/communities",                            getVkCommunities);
router.get("/communities/:communityId/analytics",     getVkCommunityAnalytics);

export default router;

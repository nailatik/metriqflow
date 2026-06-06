import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  addVkCommunity,
  removeVkCommunity,
  getVkCommunities,
  getVkCommunityAnalytics,
  searchVkPosts,
} from "../controllers/vk.controller";
import { aiInsightsVk } from "../controllers/ai.controller";

const router = Router();

router.use(authMiddleware);

router.get("/communities",                                 getVkCommunities);
router.post("/communities",                                addVkCommunity);
router.delete("/communities/:id",                          removeVkCommunity);
router.get("/communities/:communityId/analytics",          getVkCommunityAnalytics);
router.get("/communities/:communityId/posts-search",       searchVkPosts);
router.post("/communities/:communityId/ai-insights",       aiInsightsVk);

export default router;

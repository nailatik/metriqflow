import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  addVkCommunity,
  removeVkCommunity,
  getVkCommunities,
  getVkCommunityAnalytics,
} from "../controllers/vk.controller";

const router = Router();

router.use(authMiddleware);

router.get("/communities",                        getVkCommunities);
router.post("/communities",                       addVkCommunity);
router.delete("/communities/:id",                 removeVkCommunity);
router.get("/communities/:communityId/analytics", getVkCommunityAnalytics);

export default router;

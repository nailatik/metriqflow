import { Router } from "express";
import { searchPosts } from "../controllers/posts.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/search", authMiddleware, searchPosts);

export default router;

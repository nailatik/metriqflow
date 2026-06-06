import { Router } from "express";
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  getBestTime,
} from "../controllers/content-posts.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/best-time", authMiddleware, getBestTime);
router.get("/",          authMiddleware, getPosts);
router.post("/",         authMiddleware, createPost);
router.patch("/:id",     authMiddleware, updatePost);
router.delete("/:id",    authMiddleware, deletePost);

export default router;

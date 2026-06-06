import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  addCompetitor,
  getCompetitors,
  removeCompetitor,
  getCompetitorCompare,
} from "../controllers/competitors.controller";

const router = Router();

router.use(authMiddleware);

router.get("/",           getCompetitors);
router.post("/",          addCompetitor);
router.delete("/:id",     removeCompetitor);
router.get("/:id/compare", getCompetitorCompare);

export default router;

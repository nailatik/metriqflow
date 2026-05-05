import { Router } from "express";
import {
  getReports,
  createReport,
  updateReport,
  deleteReport,
} from "../controllers/reports.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getReports);
router.post("/", authMiddleware, createReport);
router.patch("/:id", authMiddleware, updateReport);
router.delete("/:id", authMiddleware, deleteReport);

export default router;
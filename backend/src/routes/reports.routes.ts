import { Router } from "express";
import {
  getReports,
  createReport,
  downloadReport,
  deleteReport,
} from "../controllers/reports.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/",           authMiddleware, getReports);
router.post("/",          authMiddleware, createReport);
router.get("/:id/download", authMiddleware, downloadReport);
router.delete("/:id",     authMiddleware, deleteReport);

export default router;

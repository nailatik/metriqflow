import { Router } from "express";
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleChannel,
} from "../controllers/schedules.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/",                            authMiddleware, getSchedules);
router.post("/",                           authMiddleware, createSchedule);
router.patch("/:id",                       authMiddleware, updateSchedule);
router.delete("/:id",                      authMiddleware, deleteSchedule);
router.patch("/:id/channels/:channel",     authMiddleware, toggleScheduleChannel);

export default router;

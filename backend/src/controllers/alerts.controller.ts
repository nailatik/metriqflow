import { Request, Response } from "express";
import { query } from "../db";
import { logger } from "../lib/logger";
import { triggerAlertsRun } from "../services/alerts.service";

export const testAlertsRun = async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "Not found" });
  }

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { forUserId, force } = req.body as { forUserId?: unknown; force?: unknown };
  const targetId = typeof forUserId === "number" ? forUserId : userId;
  const forceFlag = force === true;

  logger.info({ triggeredBy: userId, targetId, force: forceFlag }, "ALERTS: manual test-run triggered");

  triggerAlertsRun(targetId, forceFlag).catch((err) => {
    logger.error({ err }, "ALERTS: test-run failed");
  });

  return res.json({ ok: true, message: `Alert run started for userId=${targetId}. Check logs.` });
};

export const updateAlertsSettings = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { enabled } = req.body as { enabled?: unknown };
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled must be boolean" });
  }

  try {
    await query("UPDATE users SET alerts_enabled = $1 WHERE id = $2", [enabled, userId]);
    return res.json({ alerts_enabled: enabled });
  } catch (err) {
    logger.error({ err }, "ALERTS SETTINGS ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

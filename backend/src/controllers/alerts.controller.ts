import { Request, Response } from "express";
import { query } from "../db";
import { logger } from "../lib/logger";

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

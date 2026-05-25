import { Router, Request, Response } from "express";
import { query } from "../db";
import { logger } from "../lib/logger";

const router = Router();

// Liveness: process is up. No DB call so it stays cheap and reliable.
router.get("/live", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Readiness: app can serve traffic. Pings DB; returns 503 if degraded so
// load balancers can stop routing without killing the container.
router.get("/ready", async (_req: Request, res: Response) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", db: "ok" });
  } catch (err) {
    logger.error({ err }, "Readiness probe failed");
    res.status(503).json({ status: "degraded", db: "down" });
  }
});

// Root health alias — useful for ad-hoc curl checks and uptime monitors.
router.get("/", async (_req: Request, res: Response) => {
  try {
    await query("SELECT 1");
    res.json({
      status: "ok",
      uptime: process.uptime(),
      db: "ok",
      ts: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Health probe failed");
    res.status(503).json({ status: "degraded", db: "down" });
  }
});

export default router;

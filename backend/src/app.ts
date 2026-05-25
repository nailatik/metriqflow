import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes";
import reportsRoutes from "./routes/reports.routes";
import schedulesRoutes from "./routes/schedules.routes";
import integrationsRoutes from "./routes/integrations.routes";
import vkRoutes from "./routes/vk.routes";
import { globalLimiter, authLimiter, analyticsLimiter } from "./middleware/rateLimit.middleware";
import { startScheduler } from "./services/scheduler.service";

// CORS_ORIGINS is the single source of truth — comma-separated list of allowed
// origins. Falls back to FRONTEND_URL for backwards compatibility, then to a
// safe dev default. Do NOT add hardcoded localhost ports here: list them in
// .env for dev (e.g. CORS_ORIGINS="http://localhost:3000,http://localhost:5173").
const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ??
  process.env.FRONTEND_URL ??
  "http://localhost:3000"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());
app.use(globalLimiter);

app.use("/auth",             authLimiter,      authRoutes);
app.use("/reports",         reportsRoutes);
app.use("/report-schedules", schedulesRoutes);
app.use("/integrations",    analyticsLimiter, integrationsRoutes);
app.use("/vk",              analyticsLimiter, vkRoutes);

startScheduler();

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;

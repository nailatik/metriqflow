import "./lib/sentry";
import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "./db";
import { startScheduler, stopScheduler } from "./services/scheduler.service";
import { startAlertScheduler, stopAlertScheduler } from "./services/alerts.service";

const PORT = Number(process.env.PORT) || 8000;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server running");
});

startScheduler();
startAlertScheduler();

// Give in-flight requests this many ms to finish before we kill the process.
// 10s is comfortable for typical request shapes (auth, /reports list); long
// PDF generation jobs should already be on a queue, not the request thread.
const SHUTDOWN_TIMEOUT_MS = 10_000;

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Received shutdown signal, draining…");

  // Force-exit fallback — if any step hangs, don't leave the container alive.
  const killTimer = setTimeout(() => {
    logger.error({ signal }, "Shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  killTimer.unref();

  try {
    stopScheduler();
    stopAlertScheduler();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await pool.end();
    logger.info("Shutdown clean");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Shutdown error");
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception, exiting");
  process.exit(1);
});

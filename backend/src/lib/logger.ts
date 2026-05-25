import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const level = process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");

// In dev we use pino-pretty for human-readable output; in prod we emit raw
// JSON lines which any log aggregator (Loki/Datadog/CloudWatch) can ingest.
export const logger = pino({
  level,
  // Strip noisy/PII fields automatically — extend the list as new fields appear.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "newPassword",
      "currentPassword",
      "accessToken",
      "refreshToken",
      "token",
    ],
    censor: "[REDACTED]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

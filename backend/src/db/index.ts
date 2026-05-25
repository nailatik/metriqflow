import { Pool, QueryResult } from "pg";
import dotenv from "dotenv";
import { logger } from "../lib/logger";

dotenv.config();

export const pool = new Pool({
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  host:               process.env.DB_HOST,
  port:               Number(process.env.DB_PORT),
  max:                20,
  idleTimeoutMillis:  30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected DB pool error");
});

// Queries slower than this get a warn-level log line so they show up in any
// log search. The threshold is intentionally generous in dev (chatty otherwise)
// and configurable via SLOW_QUERY_MS for prod tuning.
const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS) || 500;

export const query = async (
  text: string,
  params?: unknown[]
): Promise<QueryResult<Record<string, unknown>>> => {
  const startedAt = Date.now();
  try {
    return await pool.query(text, params);
  } finally {
    const ms = Date.now() - startedAt;
    if (ms >= SLOW_QUERY_MS) {
      logger.warn({ ms, sql: text.replace(/\s+/g, " ").trim().slice(0, 200) }, "Slow query");
    }
  }
};

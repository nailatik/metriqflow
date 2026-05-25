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

export const query = async (
  text: string,
  params?: unknown[]
): Promise<QueryResult<Record<string, unknown>>> => {
  return pool.query(text, params);
};

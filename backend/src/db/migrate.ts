import fs from "fs";
import path from "path";
import "../config/env"; // loads + validates env (DB_* + dotenv) before pool use
import { pool } from "./index";
import { logger } from "../lib/logger";

// migrations/ lives at the backend root, not under src/. __dirname is
// dist/db (prod) or src/db (ts-node) — both are exactly 2 levels below
// backend/, so ../../migrations resolves correctly in both.
const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

function migrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 001_, 002_, ... lexicographic == chronological
}

async function baseline(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(CREATE_TABLE);
    const files = migrationFiles();
    for (const file of files) {
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
        [file],
      );
    }
    logger.info({ count: files.length }, "Baselined existing migrations (not executed)");
  } finally {
    client.release();
  }
}

async function apply(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(CREATE_TABLE);
    const appliedRows = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations",
    );
    const applied = new Set(appliedRows.rows.map((r) => r.filename));

    const files = migrationFiles();
    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      logger.info({ file }, "Applying migration");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        ran++;
      } catch (err) {
        await client.query("ROLLBACK");
        logger.error({ err, file }, "Migration failed — rolled back");
        throw err;
      }
    }
    logger.info({ ran, total: files.length }, ran ? "Migrations applied" : "Already up to date");
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode === "baseline") {
    await baseline();
  } else {
    await apply();
  }
  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, "Migration runner failed");
    process.exit(1);
  });

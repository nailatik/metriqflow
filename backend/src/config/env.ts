import dotenv from "dotenv";
import { z } from "zod";

// Load .env FIRST, before any other module reads process.env. This file is the
// first import in server.ts, so dotenv runs before db/sentry/etc. (db/index.ts
// also calls dotenv.config() — harmless, it never overrides already-set vars.)
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8000),

  // Auth — required. Presence only (length is a recommendation, not enforced,
  // so we never surprise an existing dev with a short local secret).
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),

  // Database — required core. DB_PASSWORD optional (local trust/peer auth).
  DB_HOST: z.string().min(1, "DB_HOST is required"),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z.enum(["true", "false"]).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  // Use console here on purpose: the logger may not be configured yet and this
  // must be visible on stderr before the process dies.
  console.error(`\nInvalid environment configuration:\n${lines}\n`);
  process.exit(1);
}

export const env = parsed.data;

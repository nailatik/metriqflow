# DEPLOY_FIXES.md — pre-deploy hardening spec

**Audience:** Sonnet (executor). **Author:** Opus (design).
**Goal:** make the repo deployable via CI/CD. 6 fixes + 2 housekeeping. Each is small and self-contained.
**Branch:** work on a new branch `deploy-prep` (do NOT commit to `main`, do NOT commit at all unless the user asks).

---

## GLOBAL RULES — read before touching anything

1. **Minimal blast radius.** Do exactly what each phase says. Do not "improve" adjacent code.
2. **DO NOT refactor existing `process.env.X` reads.** The env-validation phase adds a *gate* only; existing reads stay untouched.
3. **DO NOT change `__dirname`-based paths** in `backend/src/controllers/reports.controller.ts` (font + storage). They already resolve correctly under the `dist/` build because `src/controllers` and `dist/controllers` are both exactly 2 levels below `backend/`. Touching them will break PDF generation.
4. **DO NOT run migrations on server boot.** Migrations are a separate explicit command.
5. **DO NOT delete the `/vk` rewrite** in `next.config.ts` — only parametrize its destination.
6. **DO NOT commit.** Leave changes in the working tree for the user to review.
7. After all phases, run the verification commands in the final section and paste the output.
8. Commit style if the user later asks: `<prefix> | <lowercase desc>` (see `CLAUDE.md`). Never add Claude attribution.

---

## PHASE 1 — backend production build + start scripts

**Problem:** `backend/package.json` only has `dev: ts-node-dev`. No way to build/run in prod.

### 1a. `backend/tsconfig.json`
Add `outDir`, `include`, `exclude`. Set `declaration` to `false` (app build, no need for `.d.ts` noise). Final file:

```jsonc
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "commonjs",
    "target": "esnext",
    "lib": ["esnext"],
    "types": ["node"],
    "sourceMap": true,
    "declaration": false,
    "declarationMap": false,
    "noUncheckedIndexedAccess": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1b. `backend/package.json` scripts
Replace the `scripts` block with:

```jsonc
"scripts": {
  "dev": "ts-node-dev src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "migrate": "node dist/db/migrate.js",
  "migrate:baseline": "node dist/db/migrate.js baseline",
  "test": "echo \"Error: no test specified\" && exit 1"
},
```

(The `migrate*` scripts depend on PHASE 5. Add them now anyway.)

### 1c. root `.gitignore`
Append one line so the build output is never committed:

```
/backend/dist
```

**Acceptance:** `cd backend && npm run build` produces `backend/dist/server.js` with no TS errors. `node dist/server.js` boots (assuming env + DB present).

---

## PHASE 2 — DB SSL support

**Problem:** `backend/src/db/index.ts` opens the pool with no SSL. Managed Postgres (Neon/Supabase/Timeweb/Yandex Cloud/RDS) rejects non-SSL connections.

**Edit** `backend/src/db/index.ts` — add one field to the `new Pool({...})` config (keep everything else identical):

```ts
export const pool = new Pool({
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  host:               process.env.DB_HOST,
  port:               Number(process.env.DB_PORT),
  max:                20,
  idleTimeoutMillis:  30_000,
  connectionTimeoutMillis: 5_000,
  // Managed Postgres usually requires SSL. rejectUnauthorized:false accepts the
  // provider's chain without bundling a CA — fine for hosted PG over a trusted
  // network. Off by default so local dev (no SSL) keeps working.
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
```

**Acceptance:** with `DB_SSL` unset → local dev connects as before. With `DB_SSL=true` → SSL handshake used.

---

## PHASE 3 — fix hardcoded backend URL in `next.config.ts`

**Problem:** the `/vk` rewrite destination is hardcoded `http://localhost:8000` → breaks in prod.

**Edit** `frontend/next.config.ts`. The file already computes `const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";` near the top. Use it in the rewrite:

```ts
  async rewrites() {
    return [
      {
        source: "/vk/:path*",
        destination: `${apiUrl}/vk/:path*`,
      },
    ];
  },
```

Only that one string changes. Do not remove the rewrite, do not touch `headers()` or the CSP block.

**Acceptance:** `grep -n "localhost:8000" frontend/next.config.ts` returns only the `apiUrl` fallback line (line ~9), not the rewrite.

---

## PHASE 4 — fail-fast env validation at boot

**Problem:** `JWT_SECRET` is read with `process.env.JWT_SECRET!`. If unset, the app boots fine and only crashes on the first auth request. Required env must be validated at startup. `zod` is already a backend dependency.

This is a **gate only** — it validates presence/shape and exits with a clear message if something is missing. It does **not** replace existing `process.env` reads anywhere.

### 4a. New file `backend/src/config/env.ts`

```ts
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
```

> Note for executor: this project uses **zod v4** (`backend/package.json` → `"zod": "^4.4.3"`). `parsed.error.issues` is the correct v4 accessor. Do not use `.flatten()` or `.errors`.

### 4b. Wire it first in `backend/src/server.ts`

The current first line is `import "./lib/sentry";`. Add the env import **above it** so validation + dotenv run before anything else:

```ts
import "./config/env";
import "./lib/sentry";
import app from "./app";
// ...rest unchanged
```

Do not change anything else in `server.ts`. (The existing `const PORT = Number(process.env.PORT) || 8000;` line stays — it now reads an already-validated var.)

**Acceptance:** unset `JWT_SECRET` and run `node dist/server.js` → process prints the missing-var list and exits 1 (does not start listening). With all required vars set → boots normally.

---

## PHASE 5 — migration runner

**Problem:** 20 SQL migrations in `backend/migrations/` are applied by hand via psql. CI/CD needs a repeatable command.

**Critical context — existing DBs are already migrated.** The user's dev DB and current prod-candidate DB already have all 20 migrations applied manually, but have **no** `schema_migrations` table. If the runner naively ran all 20 against them, the first `CREATE TABLE` would fail. So the runner supports two modes:

- `node dist/db/migrate.js` — apply every `.sql` not yet recorded in `schema_migrations` (used on every deploy; on a **fresh** empty DB it applies all 20 in order).
- `node dist/db/migrate.js baseline` — record all current `.sql` filenames as applied **without running them** (run ONCE on an already-migrated existing DB to adopt it into the system).

### New file `backend/src/db/migrate.ts`

```ts
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
```

**Notes for executor:**
- Some migration files may contain multiple statements; node-postgres `client.query(sql)` runs a multi-statement string fine when not using parameters. Keep it as one `query` call per file (transactional).
- Do NOT make migrations run on server boot. This is a standalone script only.

**Acceptance:**
1. `npm run build` compiles `dist/db/migrate.js`.
2. On the user's **existing** DB: `npm run migrate:baseline` creates `schema_migrations` and records 20 rows, runs no DDL.
3. After baseline, `npm run migrate` prints "Already up to date", applies nothing.
4. (Conceptually) on a fresh empty DB, `npm run migrate` applies all 20 in order.

---

## PHASE 6 — Sentry hardening (PII scrub + release)

**Problem:** `setupExpressErrorHandler` can attach request body / auth header / cookies to events — that includes passwords on `/auth/*`. Also no release tag → events don't group by version.

**Edit** `backend/src/lib/sentry.ts` — full replacement:

```ts
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Set by CI (e.g. the git sha). Optional — undefined is fine locally.
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip anything that can carry secrets: request body (passwords on
      // /auth/*), the Authorization bearer, and cookies (refresh token).
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });
}

export { Sentry };
```

**Acceptance:** TS compiles. (Runtime scrub is verified later against a real DSN — not in scope now.)

---

## HOUSEKEEPING — env example files

Keep `.env.example` files in sync with the new vars so the deploy checklist is complete.

### `backend/.env.example`
- In the Database section, add:
  ```
  # Set to "true" when connecting to managed Postgres that requires SSL
  # (Neon/Supabase/Timeweb/Yandex Cloud/RDS). Leave unset for local.
  DB_SSL=false
  ```
- Add a new Admin section:
  ```
  # ─── Admin ─────────────────────────────────────────────────────────────────
  # Comma-separated emails granted is_admin on boot (seedAdmins).
  ADMIN_EMAILS=
  ```
- In the Sentry section, add:
  ```
  # Release identifier (git sha) for grouping events by version. Set by CI.
  SENTRY_RELEASE=
  ```

### `frontend/.env.example`
- If `NEXT_PUBLIC_VK_APP_ID` is genuinely used (grep the frontend; VK OAuth was deprecated), add it with a comment; otherwise leave a note. Do not invent values.

> Do NOT touch the user's actual `.env` files (gitignored). Example files only.

---

## OUT OF SCOPE (do not do these now)

- No Dockerfile / CI YAML (the user writes those next; but note: any Docker image MUST copy `backend/assets/` and create a writable `backend/storage/reports/` dir — the PDF font + report files live there and are NOT inside `dist/`).
- No tests.
- No refactor of existing `process.env` reads.
- No changes to controllers, routes, services, or frontend features.

---

## FINAL VERIFICATION (run and paste output)

```bash
# Backend builds clean
cd backend && npm run build

# Build emitted the entry points
ls dist/server.js dist/db/migrate.js

# Env gate fires when a required var is missing (should print missing list + exit 1)
JWT_SECRET= node dist/server.js ; echo "exit=$?"

# No hardcoded backend URL left in the rewrite
grep -n "localhost:8000" ../frontend/next.config.ts

# Frontend type-checks / builds
cd ../frontend && npm run build
```

Expected: backend build OK, both dist files exist, env gate prints the JWT_SECRET error and `exit=1`, grep shows only the `apiUrl` fallback line, frontend build OK.
```

# Deployment — single VPS, push-to-deploy

One `git push` to `main` → GitHub Actions builds both apps (gate), then SSHes
into the VPS and runs `docker compose up -d --build` + migrations. The VPS runs
**postgres + backend + frontend + Caddy** (auto-HTTPS) via `docker-compose.yml`.

```
push main ─► GitHub Actions
              ├─ build gate: backend tsc + frontend next build
              └─ deploy (push only): ssh VPS → git pull → compose up --build → migrate
VPS: Caddy(TLS) ─► frontend:3000  (SITE_DOMAIN)
                └► backend:8000   (API_DOMAIN)  ─► postgres
```

Frontend and backend live on **subdomains of the same registrable domain**
(`metriqflow.com` + `api.metriqflow.com`). That keeps cookies *same-site*, so
`COOKIE_SAMESITE=lax` is enough — only CORS is cross-origin.

---

## One-time VPS setup

1. **DNS** — A records for both domains → VPS IP:
   - `metriqflow.com` → VPS IP
   - `api.metriqflow.com` → VPS IP

2. **Docker** — install Docker Engine + the compose plugin.

3. **Clone** the repo to the deploy path (this becomes `DEPLOY_PATH`):
   ```bash
   sudo mkdir -p /srv/metriqflow && sudo chown $USER /srv/metriqflow
   git clone https://github.com/nailatik/metriqflow /srv/metriqflow
   cd /srv/metriqflow
   ```

4. **Host env files** (gitignored — create by hand, copy from the examples):

   `./.env` (compose infra — DB creds, domains, NEXT_PUBLIC_* build args):
   ```bash
   cp .env.example .env && nano .env
   ```

   `./backend/.env` (backend runtime secrets — copy from `backend/.env.example`):
   ```bash
   cp backend/.env.example backend/.env && nano backend/.env
   ```
   In `backend/.env` for prod, set at minimum:
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` — 64-hex each
     (`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
   - `CORS_ORIGINS=https://metriqflow.com`
   - `COOKIE_SAMESITE=lax`
   - integration keys you use: `VK_SERVICE_TOKEN`, `BOT_TOKEN`, SMTP\_\*,
     `ANTHROPIC_API_KEY`, `SENTRY_DSN`, `ADMIN_EMAILS`
   - leave `DB_*` blank/ignored here — compose injects them from `./.env`.

5. **First boot + bootstrap schema.** The numbered migrations in
   `backend/migrations/` only `ALTER`/extend a base schema (`users`, `reports`,
   `refresh_tokens`, …) that was created by hand on dev and never captured as a
   migration. On a fresh Postgres, `001` fails immediately (`relation "users"
   does not exist`). So load the full schema dump first, then **baseline** (mark
   every migration as applied without re-running its DDL):
   ```bash
   docker compose up -d --build postgres
   # load the committed dump (deploy/schema.sql == pg_dump of the dev schema)
   docker compose exec -T postgres \
     psql -U "$DB_USER" -d "$DB_NAME" < deploy/schema.sql
   docker compose up -d --build
   docker compose exec -T backend npm run migrate:baseline
   docker compose exec -T backend npm run migrate   # "Already up to date"
   ```

   > **Fresh DB with NO base schema and you skip the dump?** `migrate` will run
   > `001` and fail on the missing `users` table. Always load `deploy/schema.sql`
   > first on a brand-new database.
   >
   > To refresh the dump after schema changes on dev:
   > ```bash
   > pg_dump --schema-only --no-owner --no-privileges \
   >   --exclude-table=schema_migrations \
   >   -h localhost -p 5432 -U postgres -d metriq > deploy/schema.sql
   > ```

6. **GitHub Actions secrets** (repo → Settings → Secrets → Actions):
   | Secret        | Value                                   |
   |---------------|-----------------------------------------|
   | `SSH_HOST`    | VPS IP / hostname                       |
   | `SSH_USER`    | deploy user                             |
   | `SSH_KEY`     | **private** key (PEM) for that user     |
   | `SSH_PORT`    | `22` (or custom)                        |
   | `DEPLOY_PATH` | `/srv/metriqflow`                       |

   Generate a deploy keypair, add the **public** key to the VPS user's
   `~/.ssh/authorized_keys`, put the **private** key in `SSH_KEY`:
   ```bash
   ssh-keygen -t ed25519 -f deploy_key -N ""   # deploy_key.pub → VPS, deploy_key → secret
   ```

Done. From now on `git push origin main` deploys automatically.

---

## Day-to-day

- **Deploy** = `git push origin main`. Watch the run in the Actions tab.
- **Manual deploy on the box** (same effect the CI runs):
  ```bash
  cd /srv/metriqflow && git pull && docker compose up -d --build \
    && docker compose exec -T backend npm run migrate
  ```
- **Logs**: `docker compose logs -f backend` (or `frontend`, `caddy`).
- **New migration**: drop `0NN_*.sql` in `backend/migrations/`, push — the
  deploy step's `migrate` applies it inside a transaction.

## Notes / gotchas

- **NEXT_PUBLIC_* are build-time.** Changing `NEXT_PUBLIC_API_URL` etc. in
  `./.env` only takes effect after a frontend rebuild (`up -d --build`).
- **Reports volume**: generated PDFs/CSVs live in the `reports` named volume,
  surviving rebuilds. Back it up if reports must be durable.
- **Postgres volume**: `pgdata` named volume. Back it up
  (`docker compose exec -T postgres pg_dump ...`).
- **External managed Postgres**: delete the `postgres` service + `depends_on` +
  `pgdata` in `docker-compose.yml`, set `DB_HOST`/`DB_SSL=true` for the managed
  instance, and baseline it once if it was already migrated.

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
     bot (telegram polling, no host port)       ─► postgres
```

The **bot** is a separate compose service (aiogram long-polling + a telethon
MTProto scheduler). It needs no inbound port — it polls Telegram outbound — so
it sits behind no domain. It shares the same Postgres; the bot tables are
already in `deploy/schema.sql`. `docker compose up -d --build` builds it like
any other service, so the existing push-to-deploy flow ships it with no CI
change.

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

   `./telegram_bot/.env` (bot runtime secrets — copy from
   `telegram_bot/.env.example`):
   ```bash
   cp telegram_bot/.env.example telegram_bot/.env && nano telegram_bot/.env
   ```
   Set `BOT_TOKEN`, `BOT_USERNAME`, and `TELEGRAM_API_ID` / `TELEGRAM_API_HASH`
   (from https://my.telegram.org → API development tools — needed for the
   telethon stats scheduler). Leave `DB_*` blank — the `bot` service injects
   them from `./.env`, same as backend.

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

## Email / SMTP (self-hosted MTA)

Email verification + alerts send through the **`mailer`** service in
`docker-compose.yml` — Postfix + OpenDKIM. The backend talks to `mailer:25`
over the private compose network with **no auth** (see `backend/.env`); the
self-signed STARTTLS cert on that internal hop is intentionally not verified.
`mailer` is **not** published to the host (internal-only, to avoid an open relay).

`backend/.env` for the own-MTA path:
```
SMTP_HOST=mailer
SMTP_PORT=25
SMTP_SECURE=false
SMTP_FROM=noreply@<domain>     # USER/PASS empty
```

The hard part is **deliverability**, not the code. Setup, in order:

1. **Port 25 outbound** must be open on the VPS (many hosts block it). Test from
   the box: `nc -zv gmail-smtp-in.l.google.com 25`. Blocked → open a ticket with
   the server host, or fall back to a hosted relay (below).

2. **Deploy.** On first boot `mailer` auto-generates a DKIM keypair into the
   `dkim_keys` volume (persists across restarts, so the published record stays
   valid). Read the public key to publish:
   ```bash
   docker compose exec mailer sh -c \
     'grep -o "\"[^\"]*\"" /etc/opendkim/keys/<domain>.txt | tr -d "\"\n"; echo'
   ```

3. **DNS** — at the domain's **authoritative nameserver** (here: Cloudflare, not
   the registrar). `mail` must be **DNS-only / un-proxied** (an orange-cloud
   proxy breaks SMTP and hides the real IP, so SPF/PTR stop aligning):

   | Type | Name | Value |
   |------|------|-------|
   | A    | `mail`            | `<VPS_IP>` (proxy OFF) |
   | TXT  | `@`               | `v=spf1 a:mail.<domain> ip4:<VPS_IP> include:... ~all` |
   | TXT  | `mail._domainkey` | (the DKIM string from step 2) |
   | TXT  | `_dmarc`          | `v=DMARC1; p=none; rua=mailto:postmaster@<domain>` |

   > Only **one** SPF record per domain — if one already exists, **merge** the
   > `a:`/`ip4:` into it, don't add a second.

4. **PTR / reverse DNS** — set at the **IP owner** (the server host's panel or a
   support ticket), **not** in the DNS provider: `<VPS_IP>` → `mail.<domain>`.
   Gmail/Yandex do a forward-confirmed reverse-DNS check; a missing/mismatched
   PTR → spam or reject. Verify: `dig +short -x <VPS_IP>` → `mail.<domain>.`

5. **Test** with a fresh address from **mail-tester.com** (target ≥ 8):
   ```bash
   docker compose exec backend node -e "require('nodemailer').createTransport({host:'mailer',port:25,secure:false,tls:{rejectUnauthorized:false}}).sendMail({from:'noreply@<domain>',to:process.argv[1],subject:'test',text:'ping'}).then(()=>console.log('SENT')).catch(e=>console.error(e.message))" test-XXXX@srv1.mail-tester.com
   ```

**Swapping to a hosted relay later** needs no code change — just edit
`backend/.env` and `docker compose up -d backend`:
- Yandex: `SMTP_HOST=smtp.yandex.ru PORT=465 SECURE=true USER/PASS=<app pw>`
- Resend: `SMTP_HOST=smtp.resend.com PORT=465 SECURE=true USER=resend PASS=<api key>`

With `SMTP_USER` set, auth is sent and strict TLS cert validation is restored
automatically (the relaxed cert check only applies to the auth-less own MTA).

---

## Day-to-day

- **Deploy** = `git push origin main`. Watch the run in the Actions tab.
- **Manual deploy on the box** (same effect the CI runs):
  ```bash
  cd /srv/metriqflow && git pull && docker compose up -d --build \
    && docker compose exec -T backend npm run migrate
  ```
- **Logs**: `docker compose logs -f backend` (or `frontend`, `caddy`, `bot`).
  Bot healthy = log line `Starting @<username> (id=…)` on boot.
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

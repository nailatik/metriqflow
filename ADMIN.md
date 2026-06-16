# Metriq Flow — Admin Panel (design spec / source of truth)

**Author:** Opus (design). **Implementer:** Sonnet (build against this doc + `frontend/DESIGN.md` + `RESPONSIVE.md`).
**Branch:** `admin-panel`. **Entry:** `/admin` (locale-prefixed: `/{ru|en}/admin`).

This is the internal control room for the founder/operator — **not** a customer-facing screen. Read
`frontend/DESIGN.md` (Warm Amber tokens, type, component conventions) before building any screen. Admin
reuses the exact same design language; it is not a separate visual system. The only difference is a distinct
shell (own sidebar) so admin nav never leaks into the customer app.

> **Golden rule:** the frontend gate is UX only. **Every `/admin/*` API must be server-authorized**
> (re-check `is_admin` in the DB on every request). Hiding a nav link is not security.

---

## 0. What exists today (don't rebuild)

- **Plans:** `free | pro | agency | ultimate` — `ultimate` is the *hidden* plan (not on pricing page).
  `backend/src/config/plans.ts` (`PLAN_LIMITS`, `getLimits`), mirrored in `frontend/shared/lib/plans.ts`
  (`PLAN_NAMES`, `PLAN_LIMITS`). The admin **must** support all four including `ultimate` and `free`.
- **Promo tables (migration 013):**
  - `promo_codes(code PK, grants_plan, grants_duration_days, max_uses, used_count, expires_at, active)`
  - `promo_redemptions(code, user_id, redeemed_at, PK(code,user_id))`
  - Redeem flow: `backend/src/controllers/subscription.controller.ts → redeemPromo` (atomic, race-safe,
    idempotent). Admin **reuses this grant model** — do not invent a parallel one.
- **Users table columns (verify before querying):** `id, email, password, created_at, is_profile_completed,
  email_verified, full_name, birth_date, organization, phone, password_length, plan, plan_expires_at,
  last_active_at, agreed_to_processing, email_verification_token, email_verification_expires_at`.
- **Per-account "what's connected" lives in:** `telegram_users` (TG link per user), `vk_integrations` +
  `vk_communities`, `report_schedules` + `schedule_channels`, `reports`, `competitors`, `content_posts`,
  `alerts`. **Sonnet: confirm exact column names with `\d <table>` / migration files before writing SQL.**
- **Auth:** JWT access 15m carries `{id,email,full_name}` (`backend/src/auth/auth.tokens.ts`);
  `authMiddleware` verifies + throttled `last_active_at` bump. Refresh tokens hashed.
- **No payments table yet** (ЮКассa is not live — billing is promo-only for now). See §6.

---

## 1. Access control & security (build this first)

### 1.1 Who is an admin
Add an `is_admin` flag on `users`. Do **not** put it in the JWT (so revocation is instant; the 15m token
shouldn't carry privilege). `adminMiddleware` reads it fresh from the DB each request.

`backend/migrations/018_admin.sql`:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(id) WHERE is_admin = true;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    INT         NOT NULL REFERENCES users(id),
  action      VARCHAR(60) NOT NULL,          -- e.g. 'promo.create', 'user.plan.change', 'user.delete'
  target_type VARCHAR(40),                   -- 'user' | 'promo' | ...
  target_id   VARCHAR(80),                   -- user id or promo code
  meta        JSONB,                         -- before/after snapshot, never secrets
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);
```

Add `created_at` + a human label to promo_codes so the admin can show "when created":
```sql
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS label      VARCHAR(120);  -- e.g. "Визитки конференция X"
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id);
```

### 1.2 Seeding the first admin
On server boot, promote any email in env `ADMIN_EMAILS` (comma-separated). Idempotent, no manual SQL:
```ts
// backend/src/lib/seedAdmins.ts — call once from server.ts after pool ready
const emails = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
if (emails.length) await query(
  `UPDATE users SET is_admin = true WHERE lower(email) = ANY($1::text[])`, [emails]);
```
Founder adds `ADMIN_EMAILS=tugushev.niall@gmail.com` (or chosen address) to `backend/.env`. Promoting
further admins later is a future admin action; not MVP.

### 1.3 `adminMiddleware`
`backend/src/middleware/admin.middleware.ts` — runs **after** `authMiddleware`:
```ts
export const adminMiddleware = async (req, res, next) => {
  const id = req.user?.id;
  if (!id) return res.status(401).json({ message: "Unauthorized" });
  const r = await query("SELECT is_admin FROM users WHERE id = $1", [id]);
  if (!r.rows[0]?.is_admin) return res.status(403).json({ message: "Forbidden" });
  next();
};
```
Mount: `app.use("/admin", authMiddleware, adminMiddleware, adminRoutes)` in `backend/src/app.ts`. A
dedicated `adminLimiter` (reuse rate-limit middleware) guards it. **Never** return password hashes, refresh
tokens, or verification tokens from any `/admin` endpoint.

### 1.4 Audit everything that writes
Every mutating admin endpoint writes one `admin_audit_log` row (action, target, before/after in `meta`).
Wrap in a tiny `audit(adminId, action, targetType, targetId, meta)` helper. This is the single most
valuable "real product" admin feature and is cheap.

### 1.5 Expose `is_admin` to the frontend gate
Add `is_admin` to the `/me` select (`auth.controller.ts` line ~39) and to the login response user object;
add `is_admin?: boolean` to `frontend/entities/user/types/User`. The frontend reads this to gate the route
and conditionally show an "Admin" entry — but the server is the real boundary (§1.3).

---

## 2. Feature scope (researched against typical SaaS admin panels)

Standard operator-console sections, trimmed to what Metriq Flow actually needs. MVP = **Overview, Users,
Promo codes, Billing/Subscription history, Audit log.** Each maps to the founder's explicit asks.

| Section | Founder ask it satisfies | Phase |
|---|---|---|
| **Overview** (KPIs + charts) | "статистику в целом" | MVP |
| **Users** (table + detail drawer) | "статистику каждого аккаунта, что подключено, когда" | MVP |
| **Promo codes** (CRUD + redemptions) | "промокоды… удалять/добавлять по billing, сроки, кол-во активаций" | MVP |
| **Billing / Subscription history** | "историю оплат" | MVP (events now, payments-ready for ЮКасса) |
| **Audit log** | trust / safety (operator hygiene) | MVP |
| Integrations health, Feature flags, Broadcast | nice-to-have | Later |

---

## 3. Sections in detail

### 3.1 Overview  `/admin`
Top KPI stat row (mono numbers, `shadow-card`), then charts (recharts, chart1/2/3 tokens, styled tooltips —
per DESIGN.md). All from a single `GET /admin/overview`.

- **Stat cards:** total users · active 7d / 30d (`last_active_at`) · new signups 7d · paid users
  (plan ≠ free) · est. MRR (sum of plan price × paid count; price map in config) · active promo codes ·
  redemptions 30d.
- **Plan distribution** — donut/bar over `free/pro/agency/ultimate` (counts).
- **Signups over time** — area chart, last 30/90d (`date_trunc('day', created_at)`).
- **Active users over time** — line, by `last_active_at`.
- **Integrations connected** — small bars: # TG-linked, # VK communities, # with schedules.

### 3.2 Users  `/admin/users`
Server-side paginated, searchable, filterable table.

- `GET /admin/users?search=&plan=&verified=&sort=&dir=&page=&pageSize=`
- Columns: email · name · **plan** (badge, amber tint for paid, distinct for `ultimate`) · expires
  (`plan_expires_at`, relative) · verified (✓/✕) · created · last active · #integrations · #reports.
- Search on email/full_name (ILIKE). Filters: plan, verified. Sort: created/last_active/plan.
- Row click → **user detail drawer** (right-side sheet on desktop, bottom-sheet on phone — RESPONSIVE.md).

**User detail drawer** — `GET /admin/users/:id` returns one composite payload:
- Profile: email, name, phone, org, birth_date, verified, profile_completed, created, last_active.
- **Plan block:** current plan + expiry + source; inline actions:
  - **Change / comp plan** → `PATCH /admin/users/:id/plan` `{ plan, mode }` where `mode` = `permanent` |
    `{ duration_days }` | `downgrade_to_free`. Reuse the same NOW()+interval math as `redeemPromo`.
  - **Verify email manually** → `POST /admin/users/:id/verify-email`.
- **What's connected, and when** (the founder asked for this explicitly):
  - Telegram: linked? since when (`telegram_users`).
  - VK: communities list + connected_at (`vk_communities`).
  - Schedules: count + next_send (`report_schedules`).
- **Activity:** last N reports (date, type, source), AI usage (from `ai_cache`/alerts if tracked).
- **Promo redemptions:** codes this user redeemed + when.
- **Danger zone:** delete account → `DELETE /admin/users/:id`. **Soft-delete preferred** (set
  `deleted_at`, anonymize email) over hard delete to preserve FK integrity of reports/redemptions; if hard
  delete, must cascade or block. Decide per Сonstraints; default = soft delete + sign-out. Confirm-by-typing
  modal. Audited.
- **No impersonation in MVP** (high blast-radius; revisit with explicit scoping + audit later).

### 3.3 Promo codes  `/admin/promos`  ← founder's headline feature
Table + create modal + per-code redemptions view. Supports **all four plans incl. hidden `ultimate` and
`free`**.

- `GET /admin/promos` → list with computed fields: `remaining = max_uses - used_count`, `status`
  (active / exhausted / expired / disabled), redemption count, created_at, label.
- **Create** `POST /admin/promos` `{ code?, label?, grants_plan, mode, max_uses, expires_at? }`:
  - `code` optional → auto-generate (e.g. `METRIQ-XXXX-XXXX`, A–Z2–9, collision-checked) if blank.
  - `grants_plan` = dropdown of all 4 plans (ultimate included — this is how the founder gifts ultimate,
    cf. `DEFENSE2026`).
  - `mode` = `permanent` | `{ duration_days }` (maps to `grants_duration_days` null vs N).
  - `max_uses` required; `expires_at` optional.
  - Normalize code to UPPERCASE (matches redeem path). Reject duplicates (PK conflict → 409).
- **Edit** `PATCH /admin/promos/:code` → toggle `active`, bump `max_uses`, change `expires_at`, edit
  `label`. **Do not** allow changing `grants_plan`/`grants_duration_days` once redeemed (integrity).
- **Delete** `DELETE /admin/promos/:code` → hard-delete **only if `used_count = 0`**; otherwise 409 with
  message "has redemptions — disable instead" (FK from `promo_redemptions`). UI offers "Disable" as the
  safe alternative.
- **Redemptions** `GET /admin/promos/:code/redemptions` → who (email) + when. Drawer/expand row.
- Surface clearly: **expiry date, used/max activations, status** — these are exactly what the founder
  listed.

### 3.4 Billing / Subscription history  `/admin/billing`
Since ЮКасса isn't live, "payment history" today = the **subscription events timeline** derived from promo
redemptions + admin plan changes (both already produce signals: redemptions table + audit log). Present as a
unified, filterable event feed: `when · user · event (redeem / comp / extend / downgrade / expire) · plan ·
source (promo code / admin / payment)`.

`GET /admin/billing/events?type=&page=` unions:
- promo redemptions (source = code),
- audit rows where action LIKE `user.plan.%` (source = admin),
- (future) `payments` rows (source = yookassa).

**Forward-compatible payments table** (create now, populate when ЮКасса goes live — keeps this section
"real" and avoids reshaping later):
```sql
-- backend/migrations/019_payments.sql
CREATE TABLE IF NOT EXISTS payments (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INT          NOT NULL REFERENCES users(id),
  provider      VARCHAR(20)  NOT NULL DEFAULT 'yookassa',
  provider_id   VARCHAR(120),                 -- ЮКасса payment id (idempotency)
  amount_minor  INT          NOT NULL,        -- kopecks
  currency      VARCHAR(3)   NOT NULL DEFAULT 'RUB',
  status        VARCHAR(20)  NOT NULL,        -- pending|succeeded|canceled|refunded
  plan          VARCHAR(20),
  period_days   INT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
```
Admin Billing screen renders `payments` when present and falls back to the event union otherwise. When
ЮКасса is wired, its webhook just inserts here — no admin rework. (See `project-billing-gtm` memory for the
ЮКассa/ИП timing.)

### 3.5 Audit log  `/admin/audit`
`GET /admin/audit?action=&admin=&page=` → reverse-chron feed of `admin_audit_log`. Read-only. Filter by
action/admin. Each row expandable to show `meta` (before/after). This is the operator's accountability trail.

---

## 4. Backend API summary (all under `/admin`, all `authMiddleware → adminMiddleware`)

```
GET    /admin/overview
GET    /admin/users?search=&plan=&verified=&sort=&dir=&page=&pageSize=
GET    /admin/users/:id
PATCH  /admin/users/:id/plan          { plan, mode }            audited
POST   /admin/users/:id/verify-email                            audited
DELETE /admin/users/:id               (soft delete)             audited
GET    /admin/promos
POST   /admin/promos                  { code?, label?, grants_plan, mode, max_uses, expires_at? }  audited
PATCH  /admin/promos/:code            { active?, max_uses?, expires_at?, label? }                   audited
DELETE /admin/promos/:code            (only if used_count=0)     audited
GET    /admin/promos/:code/redemptions
GET    /admin/billing/events?type=&page=
GET    /admin/payments                (phase 2; empty-safe now)
GET    /admin/audit?action=&admin=&page=
```
- New files: `routes/admin.routes.ts`, `controllers/admin/{overview,users,promos,billing,audit}.controller.ts`
  (split by section — these controllers will be large), `middleware/admin.middleware.ts`,
  `lib/seedAdmins.ts`, `lib/audit.ts`.
- Validate all inputs with **zod** (repo already uses zod + `validate` middleware). Plan values validated
  against the 4-plan union. Pagination clamped (pageSize ≤ 100).
- Reuse `getLimits`/`PLAN_LIMITS` for any limit display. Add a `PLAN_PRICES` map (RUB) in
  `config/plans.ts` for MRR math (single source).

---

## 5. Frontend structure (build against DESIGN.md + RESPONSIVE.md)

### 5.1 Routing & gate
New route group so the URL is `/admin` (not `/app/admin`) and the shell is separate:
```
frontend/app/[locale]/(admin)/
  layout.tsx            // AdminWrapper (requireAuth + requireAdmin) + AdminShell
  admin/page.tsx        // Overview
  admin/users/page.tsx
  admin/promos/page.tsx
  admin/billing/page.tsx
  admin/audit/page.tsx
```
- `metadata.robots = { index:false, follow:false }` (like the dashboard group).
- **AdminWrapper:** wrap existing `AuthWrapper requireAuth`, then check
  `userStore.state.user?.is_admin`. If not admin → `notFound()` (404, don't reveal the route exists) or
  redirect `/app`. Default: `notFound()`.
- **AdminShell:** same tokens as `RootLayout` but its own slim sidebar with admin sections (Overview /
  Users / Promo codes / Billing / Audit) + a "← Back to app" link. Reuse responsive contract (drawer on
  phone, icon-rail tablet, full sidebar desktop).
- Optional: a single "Admin" link in the normal app sidebar, rendered only when `user.is_admin` — quick
  access without exposing it to everyone.

### 5.2 State & data
- `frontend/features/admin/*` (UI), `entities/admin/types` (DTOs), `shared/store/adminStore` (MobX, same
  sync/async facade pattern as the other stores — see `userStore`), `shared/api/adminService` (axios; the
  shared axios interceptor already handles 401/refresh).
- Keep admin data **out** of customer stores. Lazy-load on entering `/admin`.

### 5.3 UI components
`shared/ui` is currently thin (Button, Input only). This feature needs a small reusable set — build them in
`shared/ui` (per DESIGN.md Phase 4) so the rest of the rollout benefits, not one-offs:
**Card, Stat, Badge, Table (sortable header + pagination), Select, Modal/Sheet, Drawer, EmptyState,
Skeleton.** All token-driven, no hardcoded hex, focus rings, mono `tabular-nums` for numbers. Charts via
recharts with chart1/2/3 tokens + styled tooltip (mirror the analytics chart-craft reference).

### 5.4 i18n
Admin is operator-only — **EN strings are sufficient** for MVP (skip full ru/en mirroring to save Sonnet
time), but still route under `[locale]` and use a single `admin` namespace in `messages/en.json` so it's not
hardcoded. (Founder note: confirm if you want RU too — default is EN-only for the panel.)

---

## 6. Phasing for Sonnet

1. **Security spine (do first, no UI):** migration 018, `adminMiddleware`, `seedAdmins`, `audit` helper,
   mount `/admin` router with a stub `GET /admin/overview`, expose `is_admin` on `/me` + User type +
   AdminWrapper gate. Verify a non-admin gets 403/404 and an admin gets through. **Ship nothing else until
   this is proven.**
2. **shared/ui kit** (Card/Stat/Badge/Table/Select/Modal/Drawer/Empty/Skeleton) against DESIGN.md.
3. **Promo codes** end-to-end (founder's headline) — list, create (all 4 plans), edit/disable, delete-guard,
   redemptions view. Audited.
4. **Users** — table + filters + detail drawer (connections + plan actions). Audited.
5. **Overview** — KPIs + charts.
6. **Billing/Subscription history** (event union) + migration 019 payments (empty-safe).
7. **Audit log** screen.

Each step: backend endpoint + zod + audit → store/service → screen against DESIGN.md → verify empty/loading/
error states (no white screens). Run the app and click through before moving on.

## 7. Open decisions (founder to confirm; sensible defaults chosen so Sonnet isn't blocked)
- Admin auth = **`is_admin` column + `ADMIN_EMAILS` env seed** (default) vs pure env allowlist. → column.
- User delete = **soft-delete + anonymize** (default) vs hard delete.
- Panel language = **EN-only** (default) vs full ru/en.
- Impersonation = **excluded from MVP** (default).
- Non-admin hitting `/admin` = **404 `notFound()`** (default) vs redirect `/app`.
```

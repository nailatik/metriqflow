# Metriq Flow — Responsive / Adaptive spec (execution doc for Sonnet)

> **Status:** design locked, not yet built. This is the *what & how*; execution is mechanical per-screen against this doc + `DESIGN.md` + the pilot.
> **Read first:** `DESIGN.md` (tokens, spacing, components). This doc only adds the *adaptive layer* on top — it never overrides a token or color rule.
> **Goal:** the app currently has **no responsive behaviour at all** (sidebar always in flow, fixed `p-8`, hardcoded multi-col grids, fixed-px filter inputs, a 7-column week calendar). Bring every dashboard screen to a clean, touch-grade experience at 375 / 768 / 1024 / 1440 without regressing the desktop craft.

---

## 1. Breakpoint contract (Tailwind defaults — do not invent custom ones)

| Tier | Range | Tailwind prefix | Navigation | Content gutter |
|---|---|---|---|---|
| **Phone** | `< 768px` | (base, no prefix) | Off-canvas **drawer** + sticky **mobile top bar** (hamburger). Sidebar is NOT in document flow. | `p-4` |
| **Tablet** | `768–1023px` | `md:` | Persistent **icon-rail** sidebar (`w-14`, icons only). Tap hamburger / logo to expand as an overlay temporarily. | `sm:p-6` |
| **Desktop** | `≥ 1024px` | `lg:` | Full **sidebar** `w-64`. User may still manually collapse to the rail (existing behaviour, persisted). | `lg:p-8` |

- **Mobile-first.** Base classes target phone; layer `md:` / `lg:` upward. Never write desktop-first with `max-*`.
- **Target devices to verify:** 375 (small phone), 768 (tablet portrait), 1024 (tablet landscape / small laptop), 1440 (desktop). Plus landscape phone.
- **No horizontal page scroll** at any width. Horizontal scroll is allowed *only inside* an explicitly scoped element (charts, heatmap, wide data tables) — never the page body.
- Replace `h-screen` / `100vh` with **`min-h-dvh`** on the shell (mobile browser chrome correctness).

---

## 2. Shell architecture (the #1 change — everything else depends on it)

Today: `widgets/RootLayout/RootLayout.tsx` is `flex h-screen` + `<Sidebar>` (always in flow) + `<main p-8>`. One manual `collapsed` boolean. No drawer, no mobile bar.

### 2.1 New / changed files
| File | Action |
|---|---|
| `shared/hooks/useMediaQuery.ts` | **NEW** — `useMediaQuery(query)` + `useIsDesktop()` (`min-width:1024px`). SSR-safe (returns `false` until mounted to avoid hydration mismatch). |
| `shared/hooks/useLockBodyScroll.ts` | **NEW** — locks `document.body` scroll while the mobile drawer is open. |
| `widgets/MobileTopBar/MobileTopBar.tsx` | **NEW** — sticky bar, `md:hidden`. Hamburger (44×44 tap target) + logo mark + locale toggle + avatar→`/app`. |
| `widgets/RootLayout/RootLayout.tsx` | **REWRITE** — see 2.3. |
| `widgets/Sidebar/Sidebar.tsx` | **REWORK** — becomes responsive (off-canvas on phone, rail on tablet, full on desktop). See 2.2. |

### 2.2 Sidebar — three presentations, one component

The existing `collapsed` prop stays for the **desktop manual rail**. Add a `drawerOpen` + `onCloseDrawer` prop pair for the **mobile off-canvas** behaviour. The same nav markup serves all three; only the wrapper `<aside>` classes and positioning change.

```
<aside
  className={cn(
    // base = PHONE off-canvas overlay, full width content
    "fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border",
    "flex flex-col transition-transform duration-200 ease-out",
    drawerOpen ? "translate-x-0" : "-translate-x-full",
    // TABLET = static icon-rail in flow
    "md:static md:z-auto md:translate-x-0 md:w-14",
    // DESKTOP = full, unless user collapsed to rail
    collapsed ? "lg:w-14" : "lg:w-64",
  )}
>
```
- **Phone:** off-canvas, `w-64`, slides in on `drawerOpen`. Always show **full** content (labels), never the rail, inside the drawer. Render a **scrim** `fixed inset-0 z-40 bg-black/50 md:hidden` that closes on click. `Esc` closes. Lock body scroll while open. **Auto-close on route change** (`usePathname` effect).
- **Tablet (`md`):** static rail `w-14`, icons only, tooltips on hover/focus for labels. (Reuse existing collapsed-rail markup.)
- **Desktop (`lg`):** full `w-64`; manual collapse toggle persists to `localStorage` per-user (follow existing per-user key convention `sidebar_collapsed_{userId}` — read in `useEffect`, not `useState`, to avoid hydration issues).
- Every nav row / icon button must be **≥44px tall** touch target (currently `py-2` rows are ~36px — bump to `py-2.5`/`min-h-11` on phone).
- The collapse/expand chevron is **desktop-only** (`hidden lg:block`); on phone the drawer is closed via scrim/Esc/route-change, on tablet via the top-bar hamburger.

### 2.3 RootLayout — new structure

```
<div className="flex min-h-dvh overflow-hidden bg-bg">
  <Sidebar drawerOpen={drawerOpen} onCloseDrawer={close} collapsed={collapsed} onToggle={toggle} />
  <div className="flex flex-1 flex-col min-w-0">          {/* min-w-0 = lets children shrink, kills overflow */}
    <MobileTopBar onOpenDrawer={open} />                  {/* md:hidden */}
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
  </div>
</div>
```
- State: `drawerOpen` (phone), `collapsed` (desktop rail, persisted). Close drawer on `lg` resize (no stale open state when rotating to desktop).
- `min-w-0` on the content column is **mandatory** — without it fl/grid children refuse to shrink and force page-level horizontal scroll.

---

## 3. Universal component recipes (apply wherever the pattern appears)

### 3.1 Multi-column grids → stack-first
Every `grid grid-cols-N` with **no responsive prefix** is a bug. Rewrite mobile-first:
| Current | Replace with |
|---|---|
| `grid grid-cols-3` (stat rows) | `grid grid-cols-1 sm:grid-cols-3` (or `grid-cols-2 sm:grid-cols-3` if cells are short) |
| `grid grid-cols-2 gap-x-12` (info pairs) | `grid grid-cols-1 sm:grid-cols-2 gap-x-8` |
Hit-list (confirmed): `app/[locale]/(dashboard)/app/page.tsx:287,294,301`, `features/profile/ui/ProfileView/ProfileView.tsx:50`.

### 3.2 Modals → bottom-sheet on phone, centered on desktop
Current pattern (`CreateReportModal`, schedules, `PostForm`): `fixed inset-0 flex items-center justify-center p-4` + panel `w-full max-w-md`.
Make the overlay **bottom-anchored on phone**, centered from `sm` up, and always height-capped + scrollable:
```
overlay:  fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4
panel:    w-full sm:max-w-md max-h-[92dvh] overflow-y-auto
          rounded-t-2xl sm:rounded-2xl bg-bg border border-border shadow-2xl
```
- Sticky modal header (`sticky top-0 bg-bg`) so the close button stays reachable while scrolling a long form.
- Apply to: `CreateReportModal`, `CreateScheduleModal`, `EditScheduleModal`, `PostForm`, any future dialog. Extract a shared `shared/ui/Modal` wrapper if not already — single source for this recipe.

### 3.3 Wide data tables / rows → scroll-scoped or card-stack
Two acceptable patterns, pick per density:
- **Card-stack (preferred for ≤4 meaningful columns):** below `md`, drop the table; render each row as a stacked card (label: value pairs). Use for reports list, schedules list, top-posts rows.
- **Scoped horizontal scroll (for genuinely wide/dense data):** wrap in `overflow-x-auto` with the table at its natural `min-w-[…]`. Already used correctly for the heatmap (`AnalyticsView.tsx:144`, `VKAnalyticsView.tsx:158`) — **keep and standardize**, add an edge fade hint. Do NOT let this leak to the page body.

### 3.4 Filter / toolbar rows → wrap + fluid widths
`PostsSearchView` filter row uses fixed `w-[120px]`, `w-[160px]`, `max-w-[220px]` → overflow on phone. Rewrite:
- Container `flex flex-wrap gap-2` (already partly), inputs `w-full sm:w-auto sm:max-w-[220px]`, date inputs `w-full sm:w-[140px]`, the search input `flex-1 min-w-0`.
- Stat chips (`min-w-[72px]`) are fine but the chip *row* should `flex-wrap`.
Files: `features/posts/ui/PostsSearchView/PostsSearchView.tsx:398,409,423,429,435,439`.

### 3.5 Charts (recharts)
- Use recharts `<ResponsiveContainer width="100%" height={…}>` everywhere (verify each chart). Reduce `height` on phone (e.g. `h-[200px] sm:h-[280px]`).
- Reduce X-axis tick density on small screens (fewer ticks / abbreviated labels) — honour `responsive-chart`.
- Heatmap stays in its `overflow-x-auto` + `min-w-[560px]` scroller (acceptable). Add a left day-label sticky column if cheap.
- Keep empty + skeleton loading states (already present) — they must also reflow.

### 3.6 Tab switchers / segmented controls
`AnalyticsTabView` tab pills (`w-fit`) are OK but ensure they `flex-wrap` and tap targets ≥44px on phone (`py-1.5` → `py-2.5` below `sm`). The "Create report" CTA row: make full-width button on phone (`w-full sm:w-auto`).

---

## 4. The hard one: Content Planner week calendar

`features/content-planner/ui/ContentPlannerView/ContentPlannerView.tsx:114` — `grid grid-cols-7` with `min-h-[120px]` cells. Seven columns at 375px = ~45px each = unusable.

**Design:** breakpoint-switch the layout, not the data.
- **Desktop / tablet-landscape (`lg:`)**: keep the 7-column week grid as-is.
- **Phone / tablet-portrait (`< lg`)**: switch to a **vertical agenda list** — a horizontally-scrollable day-picker strip (Mon–Sun pills with date + post-count badge) at top; below it, the selected day's posts as a vertical stack of the existing `PostCard`s. "Add post" FAB or full-width button per day.
- Reuse `PostCard` and `getWeekDays` untouched; only the container layout forks on `lg:`. Keep one source of truth for week math.

This is the single screen that needs genuine layout divergence (conditional render via `useIsDesktop()` or `hidden lg:grid` / `lg:hidden` twin containers). Everything else is pure Tailwind responsive classes.

---

## 5. Landing & auth (lower priority, partially done)
- Landing (`features/landing/*`) already uses `hidden md:flex` etc. — audit for 375px overflow only; the decorative blur blobs (`w-[900px]` in `Hero`) are absolute/clipped, leave them but confirm parent `overflow-hidden`.
- Auth pages (`login`/`register`/`verify-email`/`delete-confirm`): card `w-full max-w-md` + `p-4` gutter; verify no fixed widths. Quick pass.

---

## 6. Accessibility & touch (non-negotiable, from UX rules §1–§2)
- **Touch targets ≥44×44px** for every nav row, icon button, tab, chip-close, hamburger. Use `min-h-11` / padding, extend hit area for sub-44 icons.
- Hamburger + drawer: `aria-expanded`, `aria-controls`, focus moves into drawer on open, returns to hamburger on close, `Esc` closes, scrim click closes.
- Keep existing `focus-visible:ring` rings — never remove. Verify tab order matches visual order in the drawer.
- Respect `prefers-reduced-motion`: drawer/transition fall back to instant (no slide) when set.
- Mobile inputs: `font-size ≥16px` (prevents iOS auto-zoom) — body text base already 14–16, ensure form inputs are not `text-sm`/13px on phone.
- `viewport` meta with `width=device-width, initial-scale=1` and **zoom NOT disabled** — confirm in `app/[locale]/layout.tsx`.

---

## 7. Rollout order (Sonnet — each step independently shippable & verifiable)

1. **Shell** — `useMediaQuery`, `useLockBodyScroll`, `MobileTopBar`, `RootLayout` rewrite, `Sidebar` 3-mode. *Acceptance:* drawer opens/closes (scrim, Esc, route-change), rail at tablet, full at desktop, no page horizontal scroll, body scroll locked under drawer.
2. **Dashboard `/app`** + **ProfileView** — stat/info grids stack. (Pilot reference for content responsiveness.)
3. **Analytics** (`AnalyticsTabView`, `AnalyticsView`, `VKAnalyticsView`, `AllAnalyticsView`) — chart heights, tabs, CTA, heatmap scroller.
4. **Posts search** — filter row wrap + fluid widths + results.
5. **Reports / Schedules** — list → card-stack, modals → bottom-sheet.
6. **Content Planner** — agenda fork (§4). *Highest-effort screen.*
7. **Integrations · VK · Competitors · Billing · Settings** — grids, cards, forms.
8. **Auth · Landing** — audit pass (§5).

**Per-screen acceptance checklist** (run at 375 / 768 / 1024):
- [ ] No horizontal page scroll. [ ] All targets ≥44px. [ ] Modals reachable & scrollable. [ ] No fixed-px element overflows. [ ] Dark + light both pass. [ ] Charts/tables reflow or scroll-scoped. [ ] Reduced-motion respected.

---

## 8. Out of scope (do not touch)
- Token/color/font decisions — owned by `DESIGN.md`.
- Backend, data shapes, business logic.
- The desktop visual design that's already approved — adaptive must not regress it.

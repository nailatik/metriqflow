# Metriq Flow — Design Language (source of truth)

**Direction C · Warm Amber.** Warm-neutral (stone) base + a single amber signature accent,
**same hue in both light & dark** (only tonal shift for contrast). Deliberately OFF the
indigo/violet category default. Dual-mode, **light is default**. Hybrid feel:
Linear/Vercel craft shell + data-first dashboard content.

## Principles (anti-generic — read before building any screen)
- **Craft > exotic style.** Polish lives in spacing rhythm, type scale, motion, chart
  styling, and empty/hover/focus/loading states — not in a flashy theme.
- **One signature: warm amber.** No second brand hue. **Purple/indigo is banned.**
- **Warm neutrals (stone), never cold slate/blue grays.**
- **Numbers = tabular mono** (`font-mono`). Data columns never shift width.
- **Charts are first-class:** custom series palette, styled tooltips/axes. No default recharts look.
- **Dark text on amber** — amber is a light hue; white-on-amber fails WCAG (~3.3:1).
- No emoji as icons. One icon set (stroke 1.75–2). Focus rings always visible.

## Color tokens — `shared/styles/globals.css` (CSS vars), exposed in Tailwind
| Token (CSS var) | Tailwind | Light | Dark |
|---|---|---|---|
| `--color-primary` | `primary` | `#D97706` | `#F59E0B` |
| `--color-primary-hover` | `primaryHover` | `#B45309` | `#FBBF24` |
| `--color-accent` | `accent` | `#B45309` | `#D97706` |
| `--color-on-accent` | `onAccent` | `#1C1917` | `#1A1714` |
| `--color-bg` | `bg` | `#FAF8F4` | `#1A1714` |
| `--color-surface` | `surface` | `#FFFFFF` | `#221E1A` |
| `--color-surface-2` | `surfaceMuted` | `#F4F1EA` | `#2B2620` |
| `--color-text-main` | `textMain` | `#1C1917` | `#F5F0E8` |
| `--color-text-secondary` | `textSecondary` | `#78716C` | `#B5A99A` |
| `--color-border` | `border` | `#E7E1D6` | `#3A332C` |
| `--color-success` | `success` | `#15803D` | `#4ADE80` |
| `--color-error` | `error` | `#DC2626` | `#F87171` |
| `--color-chart-1` | `chart1` | `#D97706` | `#F59E0B` |
| `--color-chart-2` | `chart2` | `#0D9488` | `#2DD4BF` |
| `--color-chart-3` | `chart3` | `#A16207` | `#FBBF24` |

Never hardcode hex in components — always Tailwind token or CSS var.

## Typography — wired via `next/font` in `app/[locale]/layout.tsx`
- **Latin headings + body:** Plus Jakarta Sans → `--font-sans` (`font-sans`)
- **Cyrillic fallback:** Manrope → `--font-sans-cyr` (Plus Jakarta has no Cyrillic;
  per-glyph fallback — EN renders Jakarta, RU renders Manrope automatically)
- **Numbers / data / mono:** JetBrains Mono → `--font-mono` (`font-mono`, `tabular-nums`)
- **Scale (px):** 12 · 13 · 14 · 16 · 18 · 20 · 26 · 32. Body 14–16, h1 26–32.
- **Weights:** 700 display, 600 headings, 500 labels, 400 body. Headings tracking `-0.02em`.

## Spacing / shape
- 4 / 8px rhythm. Card padding 18px. Section gap 16px.
- Radius: cards & inputs 14px (`rounded-xl`), large 20px (`rounded-2xl`), pills 8–10px.
- `shadow-card` for cards (subtle warm). 1px `border-border` separators in both modes.

## Charts (recharts)
- Series order: `chart1` (amber) → `chart2` (teal) → `chart3` (amber-dark).
- Grid lines low-contrast (`border`). Tooltip = `surface` + `border`, mono numbers.
- Area gradient from `chart1` 0.28 → 0. Always provide empty + loading (skeleton) states.

## Component conventions (Tailwind tokens)
- **Button primary:** `bg-primary text-onAccent rounded-xl`, hover `bg-primaryHover`.
- **Button ghost:** `bg-surface border border-border text-textMain`.
- **Card:** `bg-surface border border-border rounded-xl shadow-card`.
- **Nav active:** amber icon + tinted bg (`bg-primary/10 text-primary`).
- Page bg `bg-bg`, surfaces `bg-surface` / `bg-surfaceMuted`, text `text-textMain` / `text-textSecondary`.

## Responsive / Adaptive (contract — full spec in `RESPONSIVE.md`)
Mobile-first, Tailwind default breakpoints. **Read `RESPONSIVE.md` before building or restyling any screen.**
- **Phone `<768`:** off-canvas drawer + sticky mobile top bar (hamburger). Sidebar not in flow. Gutter `p-4`.
- **Tablet `768–1023` (`md:`):** persistent icon-rail sidebar (`w-14`). Gutter `sm:p-6`.
- **Desktop `≥1024` (`lg:`):** full `w-64` sidebar (manual collapse persists). Gutter `lg:p-8`.
- Shell uses `min-h-dvh` (not `h-screen`); content column needs `min-w-0`.
- No horizontal **page** scroll ever — only inside scoped charts/heatmaps/wide tables (`overflow-x-auto`).
- Every grid mobile-first (`grid-cols-1 sm:grid-cols-N`). Modals = bottom-sheet on phone, centered `sm:` up.
- Touch targets ≥44px. Inputs ≥16px on phone. Keep focus rings. Respect `prefers-reduced-motion`.

## Build order
1. ✅ Tokens + fonts + config (Phase 2)
2. ⏳ Pilot north-star screen: **Dashboard `/app`** (Phase 3, Opus)
3. ⏳ Extract `shared/ui` components from pilot: Button, Input, Card, Stat, Table,
   Badge, Select, Modal, Chart wrappers (Phase 4)
4. ⏳ Rollout (Phase 5, Sonnet against this doc + pilot):
   - [ ] analytics · posts · content-planner · competitors · reports
   - [ ] integrations · vk · billing · profile · settings
   - [ ] auth: login · register · verify-email · delete-confirm
   - [ ] landing `/`

## Model strategy
**Opus:** design language, tokens, pilot, component library, reviews.
**Sonnet:** per-screen rollout against the pilot + this doc.

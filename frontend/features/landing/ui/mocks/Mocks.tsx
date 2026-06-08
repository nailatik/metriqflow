/**
 * Coded product mockups — pure SVG/CSS on Warm Amber tokens. No recharts,
 * no images: crisp at any DPI, themeable light/dark, animatable. These are
 * the landing's "show the product" visuals.
 */
import type { ReactNode } from "react";

/* ── chart geometry helpers ──────────────────────────────────── */
function buildArea(values: number[], w: number, h: number, pad = 4) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / range);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  return { line, area, pts };
}

interface AreaChartProps {
  values: number[];
  stroke?: string;
  className?: string;
  height?: number;
  grid?: boolean;
  uid: string;
}

function AreaChart({ values, stroke = "var(--color-chart-1)", className = "", height = 90, grid = true, uid }: AreaChartProps) {
  const W = 320;
  const H = height;
  const { line, area, pts } = buildArea(values, W, H, 6);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid && [0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 5" opacity="0.7" />
      ))}
      <path d={area} fill={`url(#fill-${uid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="animate-draw" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--color-surface)" stroke={stroke} strokeWidth="2.5" />
    </svg>
  );
}

function Bars({ values, color = "var(--color-chart-2)" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-1.5 h-full">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm animate-rise"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: 0.35 + (v / max) * 0.65, animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

/* ── window chrome wrapper ───────────────────────────────────── */
export function MockWindow({ children, label, className = "" }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface shadow-card overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 h-9 border-b border-border bg-surfaceMuted/60">
        <span className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-textSecondary/25" />
          <span className="w-2.5 h-2.5 rounded-full bg-textSecondary/25" />
          <span className="w-2.5 h-2.5 rounded-full bg-textSecondary/25" />
        </span>
        {label && (
          <span className="mx-auto text-[11px] text-textSecondary font-mono px-3 py-0.5 rounded-md bg-surface border border-border">
            {label}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function LogoMark({ size = "w-7 h-7", text = "text-sm" }: { size?: string; text?: string }) {
  return (
    <div className={`${size} rounded-lg bg-gradient-to-br from-primary to-primaryHover flex items-center justify-center text-onAccent font-bold ${text} shrink-0`}>
      M
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2.5 sm:p-3">
      <p className="text-[10px] sm:text-[11px] text-textSecondary truncate">{label}</p>
      <p className="text-base sm:text-lg font-semibold font-mono text-textMain mt-0.5">{value}</p>
      <p className="text-[10px] font-medium text-success mt-0.5 flex items-center gap-0.5">
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {delta}
      </p>
    </div>
  );
}

/* ── 1. Hero dashboard ───────────────────────────────────────── */
export function DashboardMock() {
  return (
    <MockWindow label="metriqflow.app/app">
      <div className="flex">
        {/* mini sidebar */}
        <div className="hidden sm:flex w-14 shrink-0 border-r border-border bg-surface flex-col items-center gap-3 py-3">
          <LogoMark />
          <span className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30" />
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-7 h-7 rounded-lg bg-surfaceMuted" />
          ))}
        </div>

        {/* main */}
        <div className="flex-1 p-3 sm:p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-textMain">Overview</p>
              <p className="text-[10px] text-textSecondary">Last 7 days</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-surface">
              {["24h", "7d", "30d"].map((p) => (
                <span key={p} className={`text-[10px] px-2 py-0.5 rounded-md ${p === "7d" ? "bg-primary text-onAccent font-medium" : "text-textSecondary"}`}>{p}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Followers" value="48.2K" delta="6.4%" />
            <Stat label="Reach" value="312K" delta="12%" />
            <Stat label="Engagement" value="7.9%" delta="1.3%" />
          </div>

          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium text-textMain">Audience growth</p>
              <span className="text-[10px] font-mono text-success">+5,140</span>
            </div>
            <AreaChart uid="hero" height={92} values={[18, 22, 20, 28, 26, 34, 33, 41, 46, 44, 52, 58]} className="w-full h-[78px]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-[11px] font-medium text-textMain mb-2">Engagement</p>
              <div className="h-12">
                <Bars values={[5, 8, 6, 10, 7, 12, 9]} />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-[11px] font-medium text-textMain mb-2">Top posts</p>
              <div className="space-y-1.5">
                {[["Launch thread", "9.1K", 1], ["Behind the scenes", "6.4K", 0.7], ["Weekly recap", "4.2K", 0.45]].map(([t, v, w]) => (
                  <div key={t as string} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-surfaceMuted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(w as number) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-textSecondary w-9 text-right">{v as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ── 2. AI insights ──────────────────────────────────────────── */
export function InsightsMock() {
  return (
    <MockWindow className="max-w-md">
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15 text-primary">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4L12 3z" /><path d="M5 17l.8 2 2 .8-2 .8L5 23l-.8-2-2-.8 2-.8L5 17z" /></svg>
          </span>
          <p className="text-sm font-semibold text-textMain">AI Insight</p>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">High confidence</span>
        </div>
        <p className="text-sm text-textMain leading-relaxed">
          Posts published <span className="font-semibold text-primary">Tue–Thu, 7–9pm</span> get <span className="font-semibold font-mono">2.3×</span> more reach. You're currently posting mostly on weekends.
        </p>
        <div className="rounded-xl border border-border bg-surfaceMuted/50 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-textSecondary">Reach by posting time</p>
            <span className="text-[10px] font-mono text-success">+128%</span>
          </div>
          <AreaChart uid="insight" height={70} grid={false} values={[12, 14, 13, 20, 28, 40, 38, 30, 18, 14]} className="w-full h-[56px]" />
        </div>
        <button className="w-full text-xs font-medium py-2 rounded-lg bg-primary text-onAccent">Apply recommendation</button>
      </div>
    </MockWindow>
  );
}

/* ── 3. Competitors ──────────────────────────────────────────── */
export function CompetitorsMock() {
  const rows = [
    { name: "You", value: "48.2K", w: 0.82, color: "var(--color-chart-1)", you: true },
    { name: "@rival.media", value: "41.0K", w: 0.7, color: "var(--color-chart-2)", you: false },
    { name: "@trendlab", value: "29.7K", w: 0.5, color: "var(--color-chart-3)", you: false },
  ];
  return (
    <MockWindow className="max-w-md">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-textMain">Channel comparison</p>
          <span className="text-[10px] text-textSecondary font-mono">30 days</span>
        </div>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${r.you ? "font-semibold text-textMain" : "text-textSecondary"}`}>{r.name}</span>
                <span className="text-xs font-mono text-textMain">{r.value}</span>
              </div>
              <div className="h-2.5 rounded-full bg-surfaceMuted overflow-hidden">
                <div className="h-full rounded-full animate-rise" style={{ width: `${r.w * 100}%`, backgroundColor: r.color, transformOrigin: "left" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-surfaceMuted/50 p-3 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-success/10 text-success shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></svg>
          </span>
          <p className="text-[11px] text-textMain leading-snug">You're growing <span className="font-semibold text-success">17% faster</span> than the category average this month.</p>
        </div>
      </div>
    </MockWindow>
  );
}

/* ── 4. Content planner ──────────────────────────────────────── */
export function PlannerMock() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  // status: 0 none, 1 scheduled (primary), 2 published (success), 3 draft (border)
  const cells = [0, 1, 0, 2, 0, 0, 3, 2, 0, 1, 0, 3, 0, 0, 0, 2, 1, 0, 0, 2, 0, 3, 0, 1, 0, 2, 0, 0];
  const dot = (s: number) => {
    if (s === 1) return "bg-primary";
    if (s === 2) return "bg-success";
    if (s === 3) return "bg-border";
    return "";
  };
  return (
    <MockWindow className="max-w-md">
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-textMain">June</p>
          <div className="flex gap-3 text-[10px] text-textSecondary">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />Scheduled</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />Published</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => <span key={i} className="text-[10px] text-textSecondary text-center">{d}</span>)}
          {cells.map((s, i) => (
            <div key={i} className="aspect-square rounded-md border border-border bg-surface flex items-center justify-center">
              {s > 0 && <span className={`w-1.5 h-1.5 rounded-full ${dot(s)}`} />}
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-surfaceMuted/50 p-2.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <p className="text-[11px] text-textMain truncate flex-1">Product update thread</p>
          <span className="text-[10px] font-mono text-textSecondary">Thu 19:00</span>
        </div>
      </div>
    </MockWindow>
  );
}

/* ── 5. Reports ──────────────────────────────────────────────── */
export function ReportMock() {
  const formats = [
    { ext: "CSV", color: "var(--color-success)" },
    { ext: "PDF", color: "var(--color-error)" },
    { ext: "XML", color: "var(--color-primary)" },
  ];
  return (
    <MockWindow className="max-w-md">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-textMain">Weekly report</p>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">Auto · ready</span>
        </div>
        <div className="rounded-xl border border-border bg-surfaceMuted/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <LogoMark size="w-6 h-6" text="text-xs" />
            <div className="flex-1">
              <div className="h-2 w-24 rounded bg-textSecondary/30" />
              <div className="h-1.5 w-16 rounded bg-textSecondary/15 mt-1" />
            </div>
            <span className="text-[10px] font-mono text-textSecondary">Jun 1–7</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[["Reach", "312K"], ["Posts", "18"], ["Eng.", "7.9%"]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-surface border border-border p-2">
                <p className="text-[9px] text-textSecondary">{l}</p>
                <p className="text-xs font-semibold font-mono text-textMain">{v}</p>
              </div>
            ))}
          </div>
          <div className="h-10">
            <Bars values={[6, 9, 7, 11, 8, 12, 10]} color="var(--color-chart-1)" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {formats.map((f) => (
            <span key={f.ext} className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border bg-surface text-textMain">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: f.color }} />
              {f.ext}
            </span>
          ))}
          <span className="ml-auto text-[10px] text-textSecondary">Sent every Mon</span>
        </div>
      </div>
    </MockWindow>
  );
}

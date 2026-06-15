"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

// ─── types ───────────────────────────────────────────────────────────────────

interface Stats {
  total_users: string;
  active_7d: string;
  active_30d: string;
  new_7d: string;
  paid_users: string;
  active_promos: string;
  redemptions_30d: string;
  mrr: number;
}

interface PlanRow   { plan: string; count: string }
interface SignupRow { day: string;  count: string }
interface IntStats  { tg_linked: string; vk_communities: string; with_schedules: string }

interface OverviewData {
  stats:             Stats;
  plan_distribution: PlanRow[];
  signups_30d:       SignupRow[];
  integrations:      IntStats;
}

// ─── design tokens at runtime ────────────────────────────────────────────────
// CSS vars hold literal hex (e.g. #D97706), so recharts SVG attributes need the
// resolved values — read them from the document so charts respect theme + dark mode.

interface Tokens {
  primary: string; success: string; border: string; textSecondary: string;
  textMain: string; surface: string; chart1: string; chart2: string; chart3: string;
}

const FALLBACK: Tokens = {
  primary: "#D97706", success: "#15803D", border: "#E7E1D6", textSecondary: "#78716C",
  textMain: "#1C1917", surface: "#FFFFFF", chart1: "#D97706", chart2: "#0D9488", chart3: "#A16207",
};

function useTokens(): Tokens {
  const [tokens, setTokens] = useState<Tokens>(FALLBACK);
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
    setTokens({
      primary:       v("--color-primary", FALLBACK.primary),
      success:       v("--color-success", FALLBACK.success),
      border:        v("--color-border", FALLBACK.border),
      textSecondary: v("--color-text-secondary", FALLBACK.textSecondary),
      textMain:      v("--color-text-main", FALLBACK.textMain),
      surface:       v("--color-surface", FALLBACK.surface),
      chart1:        v("--color-chart-1", FALLBACK.chart1),
      chart2:        v("--color-chart-2", FALLBACK.chart2),
      chart3:        v("--color-chart-3", FALLBACK.chart3),
    });
  }, []);
  return tokens;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  free: "Free", pro: "Pro", agency: "Agency", ultimate: "Ultimate",
};

function planColor(plan: string, t: Tokens): string {
  switch (plan) {
    case "pro":      return t.chart1;
    case "agency":   return t.chart2;
    case "ultimate": return t.success;
    default:         return t.textSecondary; // free
  }
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl shadow-card p-4">
      <p className="text-xs text-textSecondary mb-1">{label}</p>
      <p className="text-2xl font-mono font-bold text-textMain tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-textSecondary mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl shadow-card p-4">
      <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-4">{title}</p>
      {children}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const t = useTokens();
  const [data, setData]     = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@/features/admin/api/adminService").then(({ adminService }) =>
      adminService.getOverview()
        .then(r => setData(r.data as OverviewData))
        .catch(() => setData(null))
        .finally(() => setLoading(false))
    );
  }, []);

  const s = data?.stats;
  const signups = (data?.signups_30d ?? []).map(r => ({
    day:   fmtDay(r.day),
    count: parseInt(r.count),
  }));
  const planDist = (data?.plan_distribution ?? []).map(r => ({
    plan:  PLAN_LABELS[r.plan] ?? r.plan,
    color: planColor(r.plan, t),
    value: parseInt(r.count),
  }));
  const intg = data?.integrations;

  const tooltipStyle = {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    fontSize: 12,
    color: t.textMain,
  };

  const totalUsers = s ? Math.max(1, parseInt(s.total_users)) : 1;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-textMain mb-1">Overview</h1>
        <p className="text-sm text-textSecondary">MetriqFlow admin console</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))
        ) : s ? (
          <>
            <StatCard label="Total users"      value={parseInt(s.total_users).toLocaleString()} />
            <StatCard
              label="Paid users"
              value={parseInt(s.paid_users).toLocaleString()}
              sub={`${Math.round(parseInt(s.paid_users) / totalUsers * 100)}% conversion`}
            />
            <StatCard label="Est. MRR" value={`₽${(s.mrr ?? 0).toLocaleString("ru-RU")}`} sub="pro + agency" />
            <StatCard label="Active 7d"        value={parseInt(s.active_7d).toLocaleString()} />
            <StatCard label="Active 30d"       value={parseInt(s.active_30d).toLocaleString()} />
            <StatCard label="New 7d"           value={parseInt(s.new_7d).toLocaleString()} />
            <StatCard label="Active promos"    value={parseInt(s.active_promos).toLocaleString()} />
            <StatCard label="Redemptions 30d"  value={parseInt(s.redemptions_30d).toLocaleString()} />
          </>
        ) : (
          <p className="col-span-full text-sm text-textSecondary">Failed to load stats.</p>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Signups 30d — area chart spanning 2 cols */}
        <div className="lg:col-span-2">
          <ChartCard title="New signups — last 30 days">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : signups.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-16">No signup data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={signups} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={t.primary} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={t.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: t.textSecondary }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: t.textSecondary }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ stroke: t.border }}
                    formatter={(v) => [v as number, "signups"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={t.primary}
                    strokeWidth={2}
                    fill="url(#sgGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: t.primary }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Plan distribution — pie */}
        <ChartCard title="Plan distribution">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : planDist.length === 0 ? (
            <p className="text-xs text-textSecondary text-center py-16">No data.</p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={planDist}
                    dataKey="value"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {planDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => [v as number, name as string]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                {planDist.map(p => (
                  <div key={p.plan} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-[11px] text-textSecondary">{p.plan} · {p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Integrations bar */}
      {!loading && intg && s && (
        <ChartCard title="Integrations connected">
          <div className="flex gap-6">
            {[
              { label: "Telegram accounts", value: parseInt(intg.tg_linked) },
              { label: "VK communities",    value: parseInt(intg.vk_communities) },
              { label: "With schedules",    value: parseInt(intg.with_schedules) },
            ].map(item => (
              <div key={item.label} className="flex-1">
                <p className="text-xs text-textSecondary mb-1">{item.label}</p>
                <p className="text-xl font-mono font-bold text-textMain tabular-nums">{item.value.toLocaleString()}</p>
                <div className="mt-1.5 h-1.5 bg-surfaceMuted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, Math.round(item.value / totalUsers * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-textSecondary mt-0.5">
                  {Math.round(item.value / totalUsers * 100)}% of users
                </p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </>
  );
}

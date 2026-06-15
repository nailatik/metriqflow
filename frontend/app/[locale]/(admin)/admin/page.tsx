"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { adminService } from "@/features/admin/api/adminService";

// ─── types ───────────────────────────────────────────────────────────────────

interface Stats {
  total_users: string;
  active_7d: string;
  active_30d: string;
  new_7d: string;
  paid_users: string;
  active_promos: string;
  redemptions_30d: string;
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

// ─── helpers ─────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free:     "hsl(var(--color-textSecondary) / 0.4)",
  pro:      "hsl(var(--color-primary))",
  agency:   "hsl(38 92% 50%)",
  ultimate: "hsl(var(--color-success))",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free", pro: "Pro", agency: "Agency", ultimate: "Ultimate",
};

function fmtDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

const TooltipStyle = {
  contentStyle: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 12,
    fontSize: 12,
    color: "var(--color-textMain)",
  },
  cursor: { stroke: "var(--color-border)" },
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const [data, setData]     = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getOverview()
      .then(r => setData(r.data as OverviewData))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const s = data?.stats;
  const signups = (data?.signups_30d ?? []).map(r => ({
    day:   fmtDay(r.day),
    count: parseInt(r.count),
  }));
  const planDist = (data?.plan_distribution ?? []).map(r => ({
    plan:  PLAN_LABELS[r.plan] ?? r.plan,
    color: PLAN_COLORS[r.plan] ?? "#888",
    value: parseInt(r.count),
  }));
  const intg = data?.integrations;

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
            <StatCard label="Paid users"       value={parseInt(s.paid_users).toLocaleString()} sub={`${Math.round(parseInt(s.paid_users) / Math.max(1, parseInt(s.total_users)) * 100)}% conversion`} />
            <StatCard label="Active 7d"        value={parseInt(s.active_7d).toLocaleString()} />
            <StatCard label="Active 30d"       value={parseInt(s.active_30d).toLocaleString()} />
            <StatCard label="New 7d"           value={parseInt(s.new_7d).toLocaleString()} />
            <StatCard label="Active promos"    value={parseInt(s.active_promos).toLocaleString()} />
            <StatCard label="Redemptions 30d"  value={parseInt(s.redemptions_30d).toLocaleString()} />
            {intg && (
              <StatCard label="TG linked"      value={parseInt(intg.tg_linked).toLocaleString()} sub={`${intg.vk_communities} VK · ${intg.with_schedules} sched`} />
            )}
          </>
        ) : (
          <p className="col-span-4 text-sm text-textSecondary">Failed to load stats.</p>
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
                      <stop offset="0%"   stopColor="hsl(var(--color-primary))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--color-primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "var(--color-textSecondary)" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-textSecondary)" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={TooltipStyle.contentStyle}
                    cursor={{ stroke: "var(--color-border)" }}
                    formatter={(v: number) => [v, "signups"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--color-primary))"
                    strokeWidth={2}
                    fill="url(#sgGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "hsl(var(--color-primary))" }}
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
                    contentStyle={TooltipStyle.contentStyle}
                    formatter={(v: number, name: string) => [v, name]}
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
      {!loading && intg && (
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
                {data && (
                  <div className="mt-1.5 h-1.5 bg-surfaceMuted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.round(item.value / Math.max(1, parseInt(s!.total_users)) * 100)}%` }}
                    />
                  </div>
                )}
                {data && (
                  <p className="text-[10px] text-textSecondary mt-0.5">
                    {Math.round(item.value / Math.max(1, parseInt(s!.total_users)) * 100)}% of users
                  </p>
                )}
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </>
  );
}

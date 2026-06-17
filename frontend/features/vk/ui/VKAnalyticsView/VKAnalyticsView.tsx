"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslations } from "next-intl";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { http } from "@/shared/lib/axios";
import { UpgradeBanner } from "@/features/billing/ui/UpgradeBanner/UpgradeBanner";
import { AiInsightsCard } from "@/features/analytics/ui/AiInsightsCard";
import { useCommunitiesStore, useBillingStore } from "@/shared/store/StoreProvider";
import type { Community } from "@/entities/community/types";

type Summary = {
  total_reach: number;
  total_views: number;
  total_visitors: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  member_count: number;
  engagement_rate: number;
};

type Growth = {
  reach:       number | null;
  views:       number | null;
  likes:       number | null;
  comments:    number | null;
  shares:      number | null;
  subscribers: number | null;
};

type StatDay = {
  date: string;
  reach: number;
  reach_subscribers: number;
  views: number;
  visitors: number;
  likes: number;
  comments: number;
  shares: number;
};

type Post = {
  id: number;
  text: string | null;
  date: string;
  likes: number;
  reposts: number;
  comments: number;
  views: number;
  has_media: boolean;
};

type HeatCell = { day_of_week: number; hour: number; avg_views: number; post_count: number };

type Analytics = {
  community: Community & { member_count: number };
  period: string;
  history_capped?: boolean;
  summary: Summary;
  growth: Growth;
  stats_by_day: StatDay[];
  top_posts: Post[];
  heatmap: HeatCell[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: "24h", label: "24h" },
  { value: "7d",  label: "7d"  },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
] as const;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AUTO_REFRESH_MS = 10 * 60 * 1000;

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GrowthBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const positive = value >= 0;
  const arrow    = positive ? "↑" : "↓";
  const color    = positive ? "text-success" : "text-error";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function StatCard({
  label, value, sub, growth,
}: {
  label: string; value: string; sub?: string; growth?: number | null;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl px-5 py-4">
      <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-textMain tabular-nums">{value}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {growth !== undefined && <GrowthBadge value={growth} />}
        {sub && <p className="text-xs text-textSecondary">{sub}</p>}
      </div>
    </div>
  );
}

function PostCard({ post, rank, communityId }: { post: Post; rank: number; communityId?: string }) {
  const preview = post.text
    ? post.text.slice(0, 80) + (post.text.length > 80 ? "…" : "")
    : post.has_media ? "📎 Media" : "—";
  const url = communityId ? `https://vk.com/wall-${communityId}_${post.id}` : null;
  const inner = (
    <>
      <span className="text-sm font-bold text-primary w-5 flex-shrink-0">#{rank}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${url ? "text-primary hover:underline" : "text-textMain"}`}>{preview}</p>
        <p className="text-xs text-textSecondary mt-0.5">
          {new Date(post.date).toLocaleDateString()} · ❤️ {fmt(post.likes)} · 🔁 {fmt(post.reposts)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-textMain">{fmt(post.views)}</p>
        <p className="text-xs text-textSecondary">views</p>
      </div>
    </>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex gap-3 items-start py-3 border-b border-border last:border-0">
      {inner}
    </a>
  ) : (
    <div className="flex gap-3 items-start py-3 border-b border-border last:border-0">{inner}</div>
  );
}

function Heatmap({ data, hint }: { data: HeatCell[]; hint: string }) {
  const maxViews = Math.max(...data.map((d) => d.avg_views), 1);
  const hours    = Array.from({ length: 24 }, (_, i) => i);

  const getCell = (day: number, hour: number) =>
    data.find((d) => d.day_of_week === day && d.hour === hour);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="flex mb-1 ml-10">
          {hours.filter((h) => h % 3 === 0).map((h) => (
            <div key={h} className="flex-1 text-center text-xs text-textSecondary">{h}:00</div>
          ))}
        </div>
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="flex items-center gap-1 mb-1">
            <span className="text-xs text-textSecondary w-8 flex-shrink-0">{day}</span>
            {hours.map((hour) => {
              const cell      = getCell(dayIdx, hour);
              const intensity = cell ? cell.avg_views / maxViews : 0;
              return (
                <div
                  key={hour}
                  title={cell ? `Avg ${fmt(cell.avg_views)} views · ${cell.post_count} posts` : "No data"}
                  className="flex-1 h-6 rounded-sm"
                  style={{ backgroundColor: "var(--color-primary)", opacity: 0.05 + intensity * 0.85 }}
                />
              );
            })}
          </div>
        ))}
        <p className="text-xs text-textSecondary mt-2">{hint}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const VKAnalyticsView = observer(function VKAnalyticsView() {
  const t = useTranslations("VKAnalytics");
  const communitiesStore = useCommunitiesStore();
  const billingStore     = useBillingStore();

  // Free plan caps history to 30d (backend silently downgrades "all" → "30d").
  // Lock the "All" button so the limit is visible instead of silent.
  const historyLocked = billingStore.limits.history_days !== null;

  const [selectedId,         setSelectedId]         = useState<number | null>(null);
  const [period,             setPeriod]             = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [analytics,          setAnalytics]          = useState<Analytics | null>(null);
  const [loading,            setLoading]            = useState(false);
  const [lastUpdated,        setLastUpdated]        = useState<Date | null>(null);
  const [minutesAgo,         setMinutesAgo]         = useState(0);
  const [fetchError,         setFetchError]         = useState<string | null>(null);

  const tickRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    communitiesStore.fetch();
  }, [communitiesStore]);

  const communities = communitiesStore.state.list;
  const communitiesLoading = !communitiesStore.state.loaded;

  useEffect(() => {
    if (selectedId === null && communities.length > 0) {
      setSelectedId(communities[0].id);
    }
  }, [communities, selectedId]);

  const fetchAnalytics = useCallback((signal?: AbortSignal) => {
    if (!selectedId) return;
    setLoading(true);
    setFetchError(null);
    http.get<Analytics>(`/vk/communities/${selectedId}/analytics?period=${period}`, { signal })
      .then((r) => {
        setAnalytics(r.data);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      })
      .catch((e: unknown) => {
        if ((e as { code?: string })?.code === "ERR_CANCELED") return;
        const payload = (e as { response?: { data?: { message?: string } } })?.response?.data;
        setFetchError(payload?.message ?? t("loadError"));
        setAnalytics(null);
      })
      .finally(() => setLoading(false));
  }, [selectedId, period, t]);

  useEffect(() => {
    setAnalytics(null);
    const controller = new AbortController();
    fetchAnalytics(controller.signal);
    return () => controller.abort();
  }, [fetchAnalytics]);

  // Auto-refresh every 10 min (mirrors Telegram analytics)
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(() => fetchAnalytics(), AUTO_REFRESH_MS);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [fetchAnalytics]);

  // "X min ago" ticker
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      if (lastUpdated) {
        setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60_000));
      }
    }, 30_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [lastUpdated]);

  // ── Early returns ─────────────────────────────────────────────────────────

  if (communitiesLoading) {
    return <p className="text-textSecondary text-sm">{t("loading")}</p>;
  }

  if (communities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-2">
        <p className="text-3xl">🏘️</p>
        <p className="text-textMain font-semibold">{t("noCommunities")}</p>
        <p className="text-sm text-textSecondary max-w-sm">{t("noCommunitiesDesc")}</p>
      </div>
    );
  }

  const s = analytics?.summary;
  const g = analytics?.growth;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-textMain">{t("title")}</h1>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-textMain outline-none focus:border-primary"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-textSecondary">
              {minutesAgo === 0 ? t("justUpdated") : t("lastUpdated", { min: minutesAgo })}
            </span>
          )}
          <button
            onClick={() => fetchAnalytics()}
            disabled={loading}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {t("refresh")}
          </button>
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
            {PERIODS.map((p) => {
              const locked = p.value === "all" && historyLocked;
              return (
                <button
                  key={p.value}
                  onClick={() => { if (!locked) setPeriod(p.value); }}
                  disabled={locked}
                  title={locked ? t("allLocked") : undefined}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                    locked
                      ? "text-textSecondary/40 cursor-not-allowed"
                      : period === p.value
                        ? "bg-primary text-onAccent"
                        : "text-textSecondary hover:text-textMain"
                  }`}
                >
                  {locked ? `🔒 ${p.label}` : p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {fetchError && !loading && (
        <div className="bg-error/5 border border-error/30 rounded-xl px-5 py-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-error">{t("loadError")}</p>
          <p className="text-sm text-textSecondary">{fetchError}</p>
        </div>
      )}

      {analytics?.history_capped && (
        <UpgradeBanner compact reason={t("historyCapped")} />
      )}

      {loading && !analytics && (
        <p className="text-textSecondary text-sm">{t("loadingData")}</p>
      )}

      {analytics && s && (
        <>
          {/* Member count */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 flex items-center gap-3">
            <span className="text-2xl font-bold text-primary tabular-nums">{fmt(s.member_count)}</span>
            <span className="text-sm text-textSecondary">{t("subscribers")}</span>
            {g?.subscribers !== null && g?.subscribers !== undefined && (
              <GrowthBadge value={g.subscribers} />
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label={t("views")}          value={fmt(s.total_views)}                growth={g?.views}    />
            <StatCard label={t("likes")}          value={fmt(s.total_likes)}                growth={g?.likes}    />
            <StatCard label={t("comments")}       value={fmt(s.total_comments)}             growth={g?.comments} />
            <StatCard label={t("shares")}         value={fmt(s.total_shares)}               growth={g?.shares}   />
            <StatCard label={t("engagementRate")} value={`${s.engagement_rate.toFixed(2)}%`} />
          </div>

          {/* Reach chart */}
          {analytics.stats_by_day.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-4">
                {t("viewsChart")}
              </p>
              <div className="h-[200px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height: 260 }}>
                <AreaChart data={analytics.stats_by_day} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--color-chart-1)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    tickFormatter={fmt}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(val) => [typeof val === "number" ? fmt(val) : ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#reachGrad)"
                    dot={false}
                    name={t("views")}
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top posts + Heatmap */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-xl p-6">
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">
                {t("topPosts")}
              </p>
              {analytics.top_posts.length === 0
                ? <p className="text-sm text-textSecondary">{t("noPostsInPeriod")}</p>
                : analytics.top_posts.map((post, i) => (
                    <PostCard key={post.id} post={post} rank={i + 1} communityId={analytics.community.community_id} />
                  ))
              }
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">
                {t("heatmap")}
              </p>
              {analytics.heatmap.length === 0
                ? <p className="text-sm text-textSecondary">{t("noHeatmapData")}</p>
                : <Heatmap data={analytics.heatmap} hint={t("heatmapHint")} />
              }
            </div>
          </div>

          {selectedId && (
            <AiInsightsCard network="vk" sourceId={selectedId} period={period} />
          )}
        </>
      )}
    </div>
  );
});

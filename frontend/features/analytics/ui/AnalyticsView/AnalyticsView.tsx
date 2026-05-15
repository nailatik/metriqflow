"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { http } from "@/shared/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = {
  id: number;
  channel_id: string;
  title: string;
  username: string | null;
  member_count: number | null;
  post_count: number;
  total_views: number;
  added_at: string;
};

type Summary = {
  post_count: number;
  total_views: number;
  avg_views: number;
  total_reactions: number;
  avg_reactions: number;
  total_forwards: number;
  avg_forwards: number;
  total_comments: number;
  avg_comments: number;
  engagement_rate: number;
};

type Growth = {
  views:       number | null;
  reactions:   number | null;
  forwards:    number | null;
  comments:    number | null;
  subscribers: number | null;
};

type ViewsByDay = { date: string; views: number; reactions: number; forwards: number; comments: number; posts: number };
type TopPost    = { message_id: number; text: string | null; views: number; reactions_total: number; forwards: number; comments: number; posted_at: string; has_media: boolean };
type HeatCell   = { day_of_week: number; hour: number; avg_views: number; post_count: number };

type Analytics = {
  channel: Channel;
  period: string;
  summary: Summary;
  growth: Growth;
  views_by_day: ViewsByDay[];
  top_posts: TopPost[];
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
const AUTO_REFRESH_MS  = 10 * 60 * 1000;
const NEW_CHANNEL_MS   = 30 * 60 * 1000;

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
  const color    = positive ? "text-green-500" : "text-red-500";
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
      <p className="text-2xl font-bold text-textMain">{value}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {growth !== undefined && <GrowthBadge value={growth} />}
        {sub && <p className="text-xs text-textSecondary">{sub}</p>}
      </div>
    </div>
  );
}

function TopPostCard({ post, rank, channelUsername }: { post: TopPost; rank: number; channelUsername?: string | null }) {
  const preview = post.text
    ? post.text.slice(0, 80) + (post.text.length > 80 ? "…" : "")
    : post.has_media ? "📎 Media post" : "—";
  const url = channelUsername ? `https://t.me/${channelUsername}/${post.message_id}` : null;
  const inner = (
    <>
      <span className="text-sm font-bold text-primary w-5 flex-shrink-0">#{rank}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${url ? "text-primary hover:underline" : "text-textMain"}`}>{preview}</p>
        <p className="text-xs text-textSecondary mt-0.5">
          {new Date(post.posted_at).toLocaleDateString()}
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
                  style={{ backgroundColor: `rgba(79,70,229,${0.05 + intensity * 0.85})` }}
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

export function AnalyticsView() {
  const t = useTranslations("Analytics");

  const [channels, setChannels]               = useState<Channel[]>([]);
  const [selectedId, setSelectedId]           = useState<number | null>(null);
  const [period, setPeriod]                   = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [analytics, setAnalytics]             = useState<Analytics | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [lastUpdated, setLastUpdated]         = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo]           = useState(0);

  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    http.get<Channel[]>("/integrations/telegram/channels")
      .then((r) => {
        setChannels(r.data);
        if (r.data.length > 0) setSelectedId(r.data[0].id);
      })
      .finally(() => setChannelsLoading(false));
  }, []);

  const fetchAnalytics = useCallback(() => {
    if (!selectedId) return;
    setLoading(true);
    http.get<Analytics>(`/integrations/telegram/channels/${selectedId}/analytics?period=${period}`)
      .then((r) => {
        setAnalytics(r.data);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      })
      .finally(() => setLoading(false));
  }, [selectedId, period]);

  useEffect(() => {
    setAnalytics(null);
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (period === "24h") {
      autoRefreshRef.current = setInterval(fetchAnalytics, AUTO_REFRESH_MS);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [period, fetchAnalytics]);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      if (lastUpdated) {
        setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60_000));
      }
    }, 30_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [lastUpdated]);

  // ── Early returns ────────────────────────────────────────────────────────

  if (channelsLoading) {
    return <p className="text-textSecondary text-sm">{t("loadingChannels")}</p>;
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-2">
        <p className="text-3xl">📺</p>
        <p className="text-textMain font-semibold">{t("noChannels")}</p>
        <p className="text-sm text-textSecondary max-w-sm">{t("noChannelsDesc")}</p>
      </div>
    );
  }

  const s            = analytics?.summary;
  const g            = analytics?.growth;
  const selectedCh   = channels.find((c) => c.id === selectedId);
  const isNewChannel = selectedCh
    ? Date.now() - new Date(selectedCh.added_at).getTime() < NEW_CHANNEL_MS
    : false;

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
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.username ? `@${ch.username}` : ch.title}
              </option>
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
            onClick={fetchAnalytics}
            disabled={loading}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {t("refresh")}
          </button>
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  period === p.value
                    ? "bg-primary text-white"
                    : "text-textSecondary hover:text-textMain"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {period === "24h" && (
        <div className="flex items-center gap-1.5 text-xs text-textSecondary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {t("autoRefresh")}
        </div>
      )}

      {isNewChannel && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-primary">{t("newChannelBanner")}</p>
          <p className="text-xs text-textSecondary mt-1">{t("newChannelBannerDesc")}</p>
        </div>
      )}

      {loading && !analytics && (
        <p className="text-textSecondary text-sm">{t("loadingData")}</p>
      )}

      {analytics && s && (
        <>
          {/* Subscriber count */}
          {analytics.channel.member_count != null && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-2xl font-bold text-primary">{fmt(analytics.channel.member_count)}</span>
              <span className="text-sm text-textSecondary">{t("subscribers")}</span>
              {g?.subscribers !== null && g?.subscribers !== undefined && (
                <GrowthBadge value={g.subscribers} />
              )}
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label={t("totalViews")}
              value={fmt(s.total_views)}
              sub={t("avgPerPost", { n: fmt(s.avg_views) })}
              growth={g?.views}
            />
            <StatCard
              label={t("reactions")}
              value={fmt(s.total_reactions)}
              sub={t("avgPerPost", { n: fmt(s.avg_reactions) })}
              growth={g?.reactions}
            />
            <StatCard
              label={t("forwards")}
              value={fmt(s.total_forwards)}
              sub={t("avgPerPost", { n: fmt(s.avg_forwards) })}
              growth={g?.forwards}
            />
            <StatCard
              label={t("engagementRate")}
              value={`${s.engagement_rate.toFixed(2)}%`}
              sub={t("postsCount", { n: s.post_count })}
            />
            <StatCard
              label={t("comments")}
              value={fmt(s.total_comments)}
              sub={t("avgPerPost", { n: fmt(s.avg_comments) })}
              growth={g?.comments}
            />
          </div>

          {/* Views chart */}
          {analytics.views_by_day.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-4">
                {t("viewsChart")}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analytics.views_by_day} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    tickFormatter={(v) => v.slice(5)}
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
                    stroke="#4F46E5"
                    strokeWidth={2}
                    fill="url(#viewsGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
                    <TopPostCard key={post.message_id} post={post} rank={i + 1} channelUsername={analytics.channel.username} />
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
        </>
      )}
    </div>
  );
}

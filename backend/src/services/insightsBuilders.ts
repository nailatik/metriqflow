import { query } from "../db";
import type { AiLocale, DataLevel, InsightsInput } from "../types/insights";
import { logger } from "../lib/logger";

const VK_SERVICE_TOKEN = process.env.VK_SERVICE_TOKEN ?? "";
const VK_API_V = "5.199";

// Per-period sufficiency thresholds — expected post volume scales with the window.
// A post_count below `.low` → "low" (предварительно); below `.high` → "medium"; else "high".
function dataLevel(period: string, postCount: number): DataLevel {
  const t =
    period === "24h" ? { low: 2, high: 5  } :
    period === "7d"  ? { low: 3, high: 10 } :
                       { low: 5, high: 20 }; // 30d, all
  if (postCount < t.low)  return "low";
  if (postCount < t.high) return "medium";
  return "high";
}

// best_time is only meaningful with enough posts AND time variation. Suppress it on
// low data or when the winning slot has a single post — keeps Claude from inventing
// confident "publish Monday 18:00" advice from noise.
function gateBestTime<T extends { avg_views: number }>(
  level: DataLevel,
  bestCellCount: number,
  bestTime: T | null,
): T | null {
  if (level === "low" || bestCellCount < 2) return null;
  return bestTime;
}

// ─── TG builder ──────────────────────────────────────────────────────────────

function tgPeriodFilter(period: string): string {
  switch (period) {
    case "24h": return "AND posted_at >= NOW() - INTERVAL '24 hours'";
    case "7d":  return "AND posted_at >= NOW() - INTERVAL '7 days'";
    case "30d": return "AND posted_at >= NOW() - INTERVAL '30 days'";
    default:    return "";
  }
}

function pct(cur: number, prev: number): number | null {
  return prev === 0 ? null : ((cur - prev) / prev) * 100;
}

export async function buildTelegramInput(
  channel: { channel_id: string; title: string; member_count: number | null },
  period: string,
  locale: AiLocale,
): Promise<InsightsInput> {
  const filter = tgPeriodFilter(period);

  const [summaryRes, heatmapRes, topRes] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int                                                  AS post_count,
         COALESCE(AVG(views), 0)::float                                 AS avg_views,
         COALESCE(
           AVG(CASE WHEN views > 0
             THEN (reactions_total + forwards)::float / views * 100
             ELSE 0 END
           ), 0
         )::float                                                       AS engagement_rate
       FROM telegram_posts
       WHERE channel_id = $1 ${filter}`,
      [channel.channel_id],
    ),
    query(
      `SELECT
         EXTRACT(DOW  FROM posted_at AT TIME ZONE 'UTC')::int AS day_of_week,
         EXTRACT(HOUR FROM posted_at AT TIME ZONE 'UTC')::int AS hour,
         ROUND(AVG(views))::int                               AS avg_views,
         COUNT(*)::int                                        AS post_count
       FROM telegram_posts
       WHERE channel_id = $1 ${filter}
       GROUP BY day_of_week, hour`,
      [channel.channel_id],
    ),
    query(
      `SELECT text, views, reactions_total, forwards
       FROM telegram_posts
       WHERE channel_id = $1 ${filter}
       ORDER BY views DESC LIMIT 3`,
      [channel.channel_id],
    ),
  ]);

  const s = summaryRes.rows[0] as {
    post_count: number;
    avg_views: number;
    engagement_rate: number;
  };

  // best_time — heatmap cell with max avg_views
  type HeatCell = { day_of_week: number; hour: number; avg_views: number; post_count: number };
  const heatmap = heatmapRes.rows as HeatCell[];
  const bestCell = heatmap.reduce<HeatCell | null>(
    (best, cell) => (best === null || cell.avg_views > best.avg_views ? cell : best),
    null,
  );

  // growth — compare current vs prev window
  let growth: Record<string, number | null> = { views: null, reactions: null, subscribers: null };
  if (period !== "all") {
    const intervalMap: Record<string, string> = {
      "24h": "24 hours",
      "7d":  "7 days",
      "30d": "30 days",
    };
    const interval = intervalMap[period] ?? "7 days";
    const growthRes = await query(
      `WITH
         cur  AS (SELECT COALESCE(SUM(views), 0)::bigint AS views, COALESCE(SUM(reactions_total), 0)::bigint AS react
                  FROM telegram_posts WHERE channel_id = $1 AND posted_at >= NOW() - INTERVAL '${interval}'),
         prev AS (SELECT COALESCE(SUM(views), 0)::bigint AS views, COALESCE(SUM(reactions_total), 0)::bigint AS react
                  FROM telegram_posts WHERE channel_id = $1
                    AND posted_at >= NOW() - INTERVAL '${interval}' * 2
                    AND posted_at <  NOW() - INTERVAL '${interval}')
       SELECT cur.views AS cv, prev.views AS pv, cur.react AS cr, prev.react AS pr FROM cur, prev`,
      [channel.channel_id],
    );
    if (growthRes.rows.length > 0) {
      const g = growthRes.rows[0] as { cv: number; pv: number; cr: number; pr: number };
      growth = {
        views:     pct(Number(g.cv), Number(g.pv)),
        reactions: pct(Number(g.cr), Number(g.pr)),
        subscribers: null,
      };
    }
  }

  type TopRow = { text: string | null; views: number; reactions_total: number; forwards: number };
  const top_posts = (topRes.rows as TopRow[]).map((r) => ({
    excerpt:    (r.text ?? "").slice(0, 120),
    views:      r.views,
    engagement: r.reactions_total + r.forwards,
  }));

  const level = dataLevel(period, s.post_count);

  return {
    network:   "telegram",
    locale,
    title:     channel.title,
    period,
    followers: channel.member_count,
    summary:   {
      post_count:      s.post_count,
      avg_views:       Math.round(s.avg_views),
      engagement_rate: Math.round(s.engagement_rate * 10) / 10,
    },
    data_quality: { level, post_count: s.post_count },
    growth,
    best_time: gateBestTime(
      level,
      bestCell?.post_count ?? 0,
      bestCell
        ? { day_of_week: bestCell.day_of_week, hour: bestCell.hour, avg_views: bestCell.avg_views }
        : null,
    ),
    top_posts,
  };
}

// ─── VK builder ──────────────────────────────────────────────────────────────

async function vkFetch<T>(
  method: string,
  params: Record<string, string | number>,
): Promise<T | null> {
  if (!VK_SERVICE_TOKEN) return null;
  const url = new URL(`https://api.vk.com/method/${method}`);
  url.searchParams.set("access_token", VK_SERVICE_TOKEN);
  url.searchParams.set("v", VK_API_V);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  try {
    const res  = await fetch(url.toString());
    const data = await res.json() as { response?: T; error?: unknown };
    if (data.error || data.response === undefined) return null;
    return data.response;
  } catch (err) {
    logger.error({ err }, "VK API fetch error in insightsBuilders");
    return null;
  }
}

type VkPost = {
  id: number;
  text: string;
  date: number;
  likes?:    { count: number };
  reposts?:  { count: number };
  comments?: { count: number };
  views?:    { count: number };
};

export async function buildVkInput(
  community: { community_id: string; name: string; member_count: number | null },
  period: string,
  locale: AiLocale,
): Promise<InsightsInput> {
  const groupId = Number(community.community_id);

  const wall = await vkFetch<{ items: VkPost[] }>("wall.get", {
    owner_id: -groupId,
    count:    100,
    filter:   "owner",
  });

  const allPosts = (wall?.items ?? []).map((p) => ({
    text:     p.text ?? "",
    date:     p.date,
    views:    p.views?.count    ?? 0,
    likes:    p.likes?.count    ?? 0,
    comments: p.comments?.count ?? 0,
    reposts:  p.reposts?.count  ?? 0,
  }));

  const nowSec = Math.floor(Date.now() / 1000);
  const DAY = 86400;
  const windowSec =
    period === "24h" ? 1  * DAY :
    period === "30d" ? 30 * DAY :
    period === "all" ? Infinity :
    7 * DAY;

  const current  = allPosts.filter((p) => p.date >= nowSec - windowSec);
  const previous = allPosts.filter(
    (p) => p.date < nowSec - windowSec && p.date >= nowSec - 2 * windowSec,
  );

  const sum = (posts: typeof current) =>
    posts.reduce(
      (acc, p) => ({
        views:    acc.views    + p.views,
        likes:    acc.likes    + p.likes,
        comments: acc.comments + p.comments,
        reposts:  acc.reposts  + p.reposts,
      }),
      { views: 0, likes: 0, comments: 0, reposts: 0 },
    );

  const curSum  = sum(current);
  const prevSum = sum(previous);

  const post_count      = current.length;
  const avg_views       = post_count > 0 ? Math.round(curSum.views / post_count) : 0;
  const engagementNum   = curSum.likes + curSum.comments + curSum.reposts;
  const engagement_rate =
    curSum.views > 0 ? Math.round((engagementNum / curSum.views) * 100 * 10) / 10 : 0;

  const growth: Record<string, number | null> = {
    views:    period !== "all" ? pct(curSum.views,   prevSum.views)   : null,
    likes:    period !== "all" ? pct(curSum.likes,   prevSum.likes)   : null,
    subscribers: null,
  };

  // VK best_time: derive from post unix timestamps
  const heatMap = new Map<string, { total: number; count: number }>();
  for (const p of current) {
    const d   = new Date(p.date * 1000);
    const key = `${d.getUTCDay()}:${d.getUTCHours()}`;
    const cell = heatMap.get(key) ?? { total: 0, count: 0 };
    cell.total += p.views;
    cell.count += 1;
    heatMap.set(key, cell);
  }
  let best_time: InsightsInput["best_time"] = null;
  let bestCellCount = 0;
  for (const [key, val] of heatMap.entries()) {
    const avg = val.count > 0 ? Math.round(val.total / val.count) : 0;
    if (best_time === null || avg > best_time.avg_views) {
      const parts = key.split(":");
      const dow = Number(parts[0]);
      const hr  = Number(parts[1]);
      best_time = { day_of_week: dow, hour: hr, avg_views: avg };
      bestCellCount = val.count;
    }
  }

  const top_posts = [...current]
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map((p) => ({
      excerpt:    p.text.slice(0, 120),
      views:      p.views,
      engagement: p.likes + p.comments + p.reposts,
    }));

  const level = dataLevel(period, post_count);

  return {
    network:   "vk",
    locale,
    title:     community.name,
    period,
    followers: community.member_count,
    summary:   { post_count, avg_views, engagement_rate },
    data_quality: { level, post_count },
    growth,
    best_time: gateBestTime(level, bestCellCount, best_time),
    top_posts,
  };
}

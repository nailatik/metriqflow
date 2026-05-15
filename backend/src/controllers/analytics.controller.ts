import { Request, Response } from "express";
import { query } from "../db";

const VALID_PERIODS = new Set(["24h", "7d", "30d", "all"]);
type Period = "24h" | "7d" | "30d" | "all";

function parsePeriod(raw: unknown): Period | null {
  if (typeof raw !== "string" || !VALID_PERIODS.has(raw)) return null;
  return raw as Period;
}

function parsePositiveInt(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function getPeriodFilter(period: Period): string {
  switch (period) {
    case "24h":  return "AND posted_at >= NOW() - INTERVAL '24 hours'";
    case "7d":   return "AND posted_at >= NOW() - INTERVAL '7 days'";
    case "30d":  return "AND posted_at >= NOW() - INTERVAL '30 days'";
    case "all":  return "";
  }
}

const H = 3_600_000;
const D = 86_400_000;

// Returns [curWindowMs, prevWindowMs] or null for "all"
function getGrowthIntervals(period: Period): [number, number] | null {
  switch (period) {
    case "24h": return [24 * H,  48 * H];
    case "7d":  return [ 7 * D,  14 * D];
    case "30d": return [30 * D,  60 * D];
    case "all": return null;
  }
}

function pct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

/* GET /integrations/telegram/channels */
export const getUserChannels = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await query(
      `SELECT
         tc.id, tc.channel_id, tc.title, tc.username, tc.member_count, tc.added_at,
         COUNT(tp.id)::int              AS post_count,
         COALESCE(SUM(tp.views), 0)::int AS total_views
       FROM telegram_channels tc
       LEFT JOIN telegram_posts tp ON tp.channel_id = tc.channel_id
       WHERE tc.user_id = $1 AND tc.is_active = TRUE
       GROUP BY tc.id
       ORDER BY tc.added_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET CHANNELS ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* GET /integrations/telegram/channels/:channelId/analytics?period=7d */
export const getChannelAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const channelId = parsePositiveInt(req.params.channelId);
    if (!channelId) return res.status(400).json({ message: "Invalid channelId" });

    const period = parsePeriod(req.query.period ?? "7d");
    if (!period) return res.status(400).json({ message: "Invalid period. Use: 24h, 7d, 30d, all" });

    const periodFilter = getPeriodFilter(period);
    const growthIntervals = getGrowthIntervals(period);

    const ownership = await query(
      `SELECT id, channel_id, title, username, member_count, added_at
       FROM telegram_channels
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
      [channelId, userId]
    );
    if (ownership.rows.length === 0) {
      return res.status(404).json({ message: "Channel not found" });
    }
    const channel = ownership.rows[0] as {
      id: number; channel_id: string; title: string;
      username: string | null; member_count: number | null; added_at: string;
    };

    const tgChannelId = channel.channel_id;

    const [summaryResult, viewsByDayResult, topPostsResult, heatmapResult] =
      await Promise.all([
        query(
          `SELECT
             COUNT(*)::int                                 AS post_count,
             COALESCE(SUM(views), 0)::int                  AS total_views,
             COALESCE(AVG(views), 0)::float                AS avg_views,
             COALESCE(SUM(reactions_total), 0)::int        AS total_reactions,
             COALESCE(AVG(reactions_total), 0)::float      AS avg_reactions,
             COALESCE(SUM(forwards), 0)::int               AS total_forwards,
             COALESCE(AVG(forwards), 0)::float             AS avg_forwards,
             COALESCE(SUM(comments), 0)::int               AS total_comments,
             COALESCE(AVG(comments), 0)::float             AS avg_comments,
             COALESCE(
               AVG(CASE WHEN views > 0
                 THEN (reactions_total + forwards)::float / views * 100
                 ELSE 0 END
               ), 0
             )::float                                      AS engagement_rate
           FROM telegram_posts
           WHERE channel_id = $1 ${periodFilter}`,
          [tgChannelId]
        ),
        query(
          `SELECT
             DATE(posted_at AT TIME ZONE 'UTC')::text   AS date,
             SUM(views)::int                            AS views,
             SUM(reactions_total)::int                  AS reactions,
             SUM(forwards)::int                         AS forwards,
             SUM(comments)::int                         AS comments,
             COUNT(*)::int                              AS posts
           FROM telegram_posts
           WHERE channel_id = $1 ${periodFilter}
           GROUP BY DATE(posted_at AT TIME ZONE 'UTC')
           ORDER BY date ASC`,
          [tgChannelId]
        ),
        query(
          `SELECT
             message_id, text, views, reactions_total, forwards, comments,
             has_media, posted_at
           FROM telegram_posts
           WHERE channel_id = $1 ${periodFilter}
           ORDER BY views DESC
           LIMIT 5`,
          [tgChannelId]
        ),
        query(
          `SELECT
             EXTRACT(DOW  FROM posted_at AT TIME ZONE 'UTC')::int  AS day_of_week,
             EXTRACT(HOUR FROM posted_at AT TIME ZONE 'UTC')::int  AS hour,
             ROUND(AVG(views))::int                                AS avg_views,
             COUNT(*)::int                                         AS post_count
           FROM telegram_posts
           WHERE channel_id = $1
           GROUP BY day_of_week, hour
           ORDER BY day_of_week, hour`,
          [tgChannelId]
        ),
      ] as const);

    // ── Growth ───────────────────────────────────────────────────────────────
    let growth: Record<string, number | null> = {
      views: null, reactions: null, forwards: null, comments: null, subscribers: null,
    };

    if (growthIntervals) {
      const [curMs, prevMs] = growthIntervals;
      const curFrom  = new Date(Date.now() - curMs);
      const prevFrom = new Date(Date.now() - prevMs);

      const [growthResult, subscriberGrowthResult] = await Promise.all([
        query(
          `WITH
             cur AS (
               SELECT
                 COALESCE(SUM(views), 0)::bigint           AS views,
                 COALESCE(SUM(reactions_total), 0)::bigint AS reactions,
                 COALESCE(SUM(forwards), 0)::bigint        AS forwards,
                 COALESCE(SUM(comments), 0)::bigint        AS comments
               FROM telegram_posts
               WHERE channel_id = $1 AND posted_at >= $2
             ),
             prev AS (
               SELECT
                 COALESCE(SUM(views), 0)::bigint           AS views,
                 COALESCE(SUM(reactions_total), 0)::bigint AS reactions,
                 COALESCE(SUM(forwards), 0)::bigint        AS forwards,
                 COALESCE(SUM(comments), 0)::bigint        AS comments
               FROM telegram_posts
               WHERE channel_id = $1 AND posted_at >= $3 AND posted_at < $2
             )
           SELECT
             cur.views       AS cur_views,  prev.views       AS prev_views,
             cur.reactions   AS cur_react,  prev.reactions   AS prev_react,
             cur.forwards    AS cur_fwd,    prev.forwards    AS prev_fwd,
             cur.comments    AS cur_cmts,   prev.comments    AS prev_cmts
           FROM cur, prev`,
          [tgChannelId, curFrom, prevFrom]
        ),
        query(
          `WITH
             latest AS (
               SELECT count FROM member_count_snapshots
               WHERE channel_id = $1
               ORDER BY recorded_at DESC LIMIT 1
             ),
             week_ago AS (
               SELECT count FROM member_count_snapshots
               WHERE channel_id = $1
                 AND recorded_at <= NOW() - INTERVAL '6 days'
               ORDER BY recorded_at DESC LIMIT 1
             )
           SELECT latest.count AS cur, week_ago.count AS prev
           FROM latest
           LEFT JOIN week_ago ON TRUE`,
          [tgChannelId]
        ),
      ]);

      if (growthResult.rows.length > 0) {
        const g = growthResult.rows[0] as {
          cur_views: number; prev_views: number;
          cur_react: number; prev_react: number;
          cur_fwd:   number; prev_fwd:   number;
          cur_cmts:  number; prev_cmts:  number;
        };
        growth = {
          views:     pct(Number(g.cur_views), Number(g.prev_views)),
          reactions: pct(Number(g.cur_react), Number(g.prev_react)),
          forwards:  pct(Number(g.cur_fwd),   Number(g.prev_fwd)),
          comments:  pct(Number(g.cur_cmts),  Number(g.prev_cmts)),
          subscribers: null,
        };
      }

      if (subscriberGrowthResult.rows.length > 0) {
        const sg = subscriberGrowthResult.rows[0] as { cur: number | null; prev: number | null };
        if (sg.cur !== null && sg.prev !== null) {
          growth.subscribers = pct(sg.cur, sg.prev);
        }
      }
    }

    return res.json({
      channel,
      period,
      summary: summaryResult.rows[0],
      views_by_day: viewsByDayResult.rows,
      top_posts: topPostsResult.rows,
      heatmap: heatmapResult.rows,
      growth,
    });
  } catch (err) {
    console.error("CHANNEL ANALYTICS ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* GET /integrations/analytics/summary?period=24h|7d|30d
 *
 * Cross-network totals for the combined "All" analytics tab. Only metrics
 * comparable across networks: followers, views, engagement, follower growth.
 * VK has no reach (stats.get is gated) so reach is intentionally absent.
 */
const VK_API_V = "5.199";
const VK_SERVICE_TOKEN = process.env.VK_SERVICE_TOKEN ?? "";

async function vkApi<T>(method: string, params: Record<string, string | number>): Promise<T | null> {
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
  } catch {
    return null;
  }
}

type NetSummary = {
  connected: boolean;
  followers: number;
  views: number;
  engagement_rate: number;
  followers_growth: number | null;
};

export const getCombinedSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const periodRaw = parsePeriod(req.query.period);
    const period: "24h" | "7d" | "30d" =
      periodRaw === "24h" || periodRaw === "30d" ? periodRaw : "7d";
    const days = period === "24h" ? 1 : period === "30d" ? 30 : 7;

    // ── Telegram ──────────────────────────────────────────────────────────────
    const [tgChannels, tgAgg, tgGrowth] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(member_count), 0)::int AS followers, COUNT(*)::int AS n
         FROM telegram_channels WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      ),
      query(
        `SELECT
           COALESCE(SUM(tp.views), 0)::int                              AS views,
           COALESCE(SUM(tp.reactions_total + tp.forwards), 0)::int       AS engagement_num
         FROM telegram_posts tp
         JOIN telegram_channels tc ON tc.channel_id = tp.channel_id
         WHERE tc.user_id = $1 AND tc.is_active = TRUE
           AND tp.posted_at >= NOW() - ($2::text || ' days')::interval`,
        [userId, days]
      ),
      query(
        `WITH chans AS (
           SELECT channel_id FROM telegram_channels WHERE user_id = $1 AND is_active = TRUE
         ),
         latest AS (
           SELECT DISTINCT ON (s.channel_id) s.channel_id, s.count
           FROM member_count_snapshots s JOIN chans c ON c.channel_id = s.channel_id
           ORDER BY s.channel_id, s.recorded_at DESC
         ),
         prev AS (
           SELECT DISTINCT ON (s.channel_id) s.channel_id, s.count
           FROM member_count_snapshots s JOIN chans c ON c.channel_id = s.channel_id
           WHERE s.recorded_at <= NOW() - ($2::text || ' days')::interval
           ORDER BY s.channel_id, s.recorded_at DESC
         )
         SELECT (SELECT COALESCE(SUM(count), 0) FROM latest) AS cur,
                (SELECT COALESCE(SUM(count), 0) FROM prev)   AS prev`,
        [userId, days]
      ),
    ]);

    const tgN = (tgChannels.rows[0] as { followers: number; n: number });
    const tgA = (tgAgg.rows[0] as { views: number; engagement_num: number });
    const tgG = (tgGrowth.rows[0] as { cur: string | number; prev: string | number });
    const telegram: NetSummary | null = tgN.n > 0 ? {
      connected: true,
      followers: tgN.followers,
      views: tgA.views,
      engagement_rate: tgA.views > 0 ? (tgA.engagement_num / tgA.views) * 100 : 0,
      followers_growth: pct(Number(tgG.cur), Number(tgG.prev)),
    } : null;

    // ── VK ────────────────────────────────────────────────────────────────────
    const vkCommunities = await query(
      `SELECT community_id, COALESCE(member_count, 0)::int AS member_count
       FROM vk_communities WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );
    const vkRows = vkCommunities.rows as { community_id: string; member_count: number }[];

    let vk: NetSummary | null = null;
    if (vkRows.length > 0) {
      const sinceSec = Math.floor(Date.now() / 1000) - days * 86400;
      type VkPost = {
        date: number;
        likes?: { count: number }; reposts?: { count: number };
        comments?: { count: number }; views?: { count: number };
      };
      let views = 0, eng = 0;
      for (const c of vkRows) {
        const wall = await vkApi<{ items: VkPost[] }>("wall.get", {
          owner_id: -Number(c.community_id), count: 100, filter: "owner",
        });
        if (!wall) continue;
        for (const p of wall.items) {
          if (p.date < sinceSec) continue;
          views += p.views?.count ?? 0;
          eng   += (p.likes?.count ?? 0) + (p.comments?.count ?? 0) + (p.reposts?.count ?? 0);
        }
      }

      const vkGrowth = await query(
        `WITH comms AS (
           SELECT community_id::bigint AS cid FROM vk_communities
           WHERE user_id = $1 AND is_active = TRUE
         ),
         latest AS (
           SELECT DISTINCT ON (s.community_id) s.community_id, s.member_count
           FROM vk_community_snapshots s JOIN comms c ON c.cid = s.community_id
           ORDER BY s.community_id, s.recorded_at DESC
         ),
         prev AS (
           SELECT DISTINCT ON (s.community_id) s.community_id, s.member_count
           FROM vk_community_snapshots s JOIN comms c ON c.cid = s.community_id
           WHERE s.recorded_at <= NOW() - ($2::text || ' days')::interval
           ORDER BY s.community_id, s.recorded_at DESC
         )
         SELECT (SELECT COALESCE(SUM(member_count), 0) FROM latest) AS cur,
                (SELECT COALESCE(SUM(member_count), 0) FROM prev)   AS prev`,
        [userId, days]
      );
      const vkG = vkGrowth.rows[0] as { cur: string | number; prev: string | number };
      const vkFollowers = vkRows.reduce((acc, r) => acc + r.member_count, 0);

      vk = {
        connected: true,
        followers: vkFollowers,
        views,
        engagement_rate: views > 0 ? (eng / views) * 100 : 0,
        followers_growth: pct(Number(vkG.cur), Number(vkG.prev)),
      };
    }

    // ── Combined ──────────────────────────────────────────────────────────────
    const tgFollowers = telegram?.followers ?? 0;
    const vkFollowers = vk?.followers ?? 0;
    const tgViews = telegram?.views ?? 0;
    const vkViews = vk?.views ?? 0;
    const tgEngNum = tgA.engagement_num;
    const vkEngNum = vk ? Math.round((vk.engagement_rate / 100) * vk.views) : 0;
    const totalViews = tgViews + vkViews;

    const combined = {
      followers: tgFollowers + vkFollowers,
      views: totalViews,
      engagement_rate: totalViews > 0 ? ((tgEngNum + vkEngNum) / totalViews) * 100 : 0,
      networks: (telegram ? 1 : 0) + (vk ? 1 : 0),
    };

    return res.json({ period, combined, telegram, vk });
  } catch (err) {
    console.error("COMBINED SUMMARY ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

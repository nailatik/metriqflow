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

// Returns [current_interval, prev_interval] or null for "all"
function getGrowthIntervals(period: Period): [string, string] | null {
  switch (period) {
    case "24h": return ["24 hours", "48 hours"];
    case "7d":  return ["7 days",   "14 days" ];
    case "30d": return ["30 days",  "60 days" ];
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
      const [curInterval, prevInterval] = growthIntervals;

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
               WHERE channel_id = $1
                 AND posted_at >= NOW() - INTERVAL '${curInterval}'
             ),
             prev AS (
               SELECT
                 COALESCE(SUM(views), 0)::bigint           AS views,
                 COALESCE(SUM(reactions_total), 0)::bigint AS reactions,
                 COALESCE(SUM(forwards), 0)::bigint        AS forwards,
                 COALESCE(SUM(comments), 0)::bigint        AS comments
               FROM telegram_posts
               WHERE channel_id = $1
                 AND posted_at >= NOW() - INTERVAL '${prevInterval}'
                 AND posted_at <  NOW() - INTERVAL '${curInterval}'
             )
           SELECT
             cur.views       AS cur_views,  prev.views       AS prev_views,
             cur.reactions   AS cur_react,  prev.reactions   AS prev_react,
             cur.forwards    AS cur_fwd,    prev.forwards    AS prev_fwd,
             cur.comments    AS cur_cmts,   prev.comments    AS prev_cmts
           FROM cur, prev`,
          [tgChannelId]
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

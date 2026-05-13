import { Request, Response } from "express";
import { query } from "../db";

const VK_API_V  = "5.131";
const VK_BASE   = "https://api.vk.com/method";

const COMMUNITY_LIMIT = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function vkCall<T>(
  method: string,
  params: Record<string, string | number>,
  token: string
): Promise<T> {
  const url = new URL(`${VK_BASE}/${method}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("v", VK_API_V);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res  = await fetch(url.toString());
  const data = await res.json() as { response?: T; error?: { error_msg: string; error_code: number } };
  if (data.error) throw new Error(data.error.error_msg);
  return data.response!;
}

function parseVkDate(v: number | string): string {
  if (typeof v === "number") return new Date(v * 1000).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// ─── Add community ────────────────────────────────────────────────────────────

/* POST /vk/communities  body: { community_token } */
export const addVkCommunity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { community_token } = req.body as { community_token?: string };
    if (!community_token?.trim()) {
      return res.status(400).json({ message: "community_token is required" });
    }
    const token = community_token.trim();

    // Enforce limit
    const countRes = await query(
      "SELECT COUNT(*) FROM vk_communities WHERE user_id = $1 AND is_active = TRUE",
      [userId]
    );
    const count = parseInt((countRes.rows[0] as { count: string }).count, 10);
    if (count >= COMMUNITY_LIMIT) {
      return res.status(400).json({ message: `Community limit reached (${COMMUNITY_LIMIT} max)` });
    }

    // Validate token — calling without group_ids returns the community the token belongs to
    type VkGroupInfo = {
      id: number;
      name: string;
      screen_name: string;
      photo_50?: string;
      members_count?: number;
    };

    let group: VkGroupInfo;
    try {
      const result = await vkCall<VkGroupInfo[]>(
        "groups.getById",
        { fields: "members_count" },
        token
      );
      if (!result || result.length === 0) throw new Error("empty");
      group = result[0]!;
    } catch {
      return res.status(400).json({ message: "Invalid token or insufficient community permissions" });
    }

    // Upsert
    const existing = await query(
      "SELECT id FROM vk_communities WHERE user_id = $1 AND community_id = $2",
      [userId, group.id]
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE vk_communities
         SET community_token = $1, name = $2, screen_name = $3,
             photo_url = $4, member_count = $5, is_active = TRUE
         WHERE user_id = $6 AND community_id = $7`,
        [token, group.name, group.screen_name, group.photo_50 ?? null, group.members_count ?? null, userId, group.id]
      );
    } else {
      await query(
        `INSERT INTO vk_communities
           (user_id, community_id, name, screen_name, photo_url, member_count, community_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, group.id, group.name, group.screen_name, group.photo_50 ?? null, group.members_count ?? null, token]
      );
    }

    const row = await query(
      "SELECT id FROM vk_communities WHERE user_id = $1 AND community_id = $2",
      [userId, group.id]
    );

    return res.json({
      id:           (row.rows[0] as { id: number }).id,
      community_id: String(group.id),
      name:         group.name,
      screen_name:  group.screen_name,
      photo_url:    group.photo_50 ?? null,
      member_count: group.members_count ?? null,
    });
  } catch (err) {
    console.error("VK ADD COMMUNITY ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* DELETE /vk/communities/:id */
export const removeVkCommunity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    await query(
      "UPDATE vk_communities SET is_active = FALSE WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return res.json({ message: "Removed" });
  } catch (err) {
    console.error("VK REMOVE COMMUNITY ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* GET /vk/communities */
export const getVkCommunities = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await query(
      `SELECT id, community_id, name, screen_name, photo_url, member_count, added_at
       FROM vk_communities
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY added_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("VK COMMUNITIES ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* GET /vk/communities/:communityId/analytics?period=7d|30d|3m|all */
const VALID_PERIODS = new Set(["7d", "30d", "3m", "all"]);

export const getVkCommunityAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const communityId = parseInt(req.params.communityId as string, 10);
    if (!Number.isInteger(communityId) || communityId <= 0) {
      return res.status(400).json({ message: "Invalid communityId" });
    }

    const period = typeof req.query.period === "string" ? req.query.period : "7d";
    if (!VALID_PERIODS.has(period)) {
      return res.status(400).json({ message: "Invalid period" });
    }

    const row = await query(
      `SELECT community_id, name, screen_name, photo_url, member_count, community_token
       FROM vk_communities
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
      [communityId, userId]
    );

    if (row.rows.length === 0) {
      return res.status(404).json({ message: "Community not found" });
    }

    const community = row.rows[0] as {
      community_id: string;
      name: string;
      screen_name: string;
      photo_url: string | null;
      member_count: number | null;
      community_token: string;
    };

    const { community_token } = community;
    const groupId = Number(community.community_id);

    let interval: "day" | "month" = "day";
    let intervals_count = 7;
    let growth_count    = 0;
    switch (period) {
      case "7d":  interval = "day";   intervals_count = 7;  growth_count = 7;  break;
      case "30d": interval = "day";   intervals_count = 30; growth_count = 30; break;
      case "3m":  interval = "month"; intervals_count = 3;  break;
      case "all": interval = "month"; intervals_count = 12; break;
    }

    type VkStatDay = {
      period_from: number | string;
      visitors?: { views?: number; visitors?: number };
      reach?: { reach?: number; reach_subscribers?: number };
      activity?: { likes?: number; comments?: number; share?: number };
    };
    type VkGroupInfo = { members_count?: number };
    type VkPost = {
      id: number;
      text: string;
      date: number;
      likes?: { count: number };
      reposts?: { count: number };
      comments?: { count: number };
      views?: { count: number };
      attachments?: unknown[];
    };

    const fetchCount = intervals_count + growth_count;

    const [allStats, groupInfoArr, wallData] = await Promise.all([
      vkCall<VkStatDay[]>(
        "stats.get",
        { group_id: groupId, interval, intervals_count: fetchCount },
        community_token
      ),
      vkCall<VkGroupInfo[]>(
        "groups.getById",
        { group_ids: groupId, fields: "members_count" },
        community_token
      ),
      vkCall<{ items: VkPost[] }>(
        "wall.get",
        { owner_id: -groupId, count: 100, filter: "owner" },
        community_token
      ),
    ]);

    const currentMemberCount = groupInfoArr[0]?.members_count ?? community.member_count ?? 0;

    const prevStatsRaw = growth_count > 0 ? allStats.slice(0, growth_count) : [];
    const curStatsRaw  = growth_count > 0 ? allStats.slice(growth_count)    : allStats;

    const mapStat = (d: VkStatDay) => ({
      date:              parseVkDate(d.period_from),
      reach:             d.reach?.reach             ?? 0,
      reach_subscribers: d.reach?.reach_subscribers ?? 0,
      views:             d.visitors?.views           ?? 0,
      visitors:          d.visitors?.visitors        ?? 0,
      likes:             d.activity?.likes           ?? 0,
      comments:          d.activity?.comments        ?? 0,
      shares:            d.activity?.share           ?? 0,
    });

    const statsByDay = curStatsRaw.map(mapStat);

    const sumStats = (rows: typeof statsByDay) =>
      rows.reduce(
        (acc, d) => ({
          total_reach:    acc.total_reach    + d.reach,
          total_views:    acc.total_views    + d.views,
          total_visitors: acc.total_visitors + d.visitors,
          total_likes:    acc.total_likes    + d.likes,
          total_comments: acc.total_comments + d.comments,
          total_shares:   acc.total_shares   + d.shares,
        }),
        { total_reach: 0, total_views: 0, total_visitors: 0, total_likes: 0, total_comments: 0, total_shares: 0 }
      );

    const summary = sumStats(statsByDay);

    const engagement_rate = summary.total_reach > 0
      ? ((summary.total_likes + summary.total_comments + summary.total_shares) / summary.total_reach) * 100
      : 0;

    const pct = (cur: number, prev: number): number | null =>
      prev === 0 ? null : ((cur - prev) / prev) * 100;

    type GrowthMap = Record<string, number | null>;
    let growth: GrowthMap = {
      reach: null, views: null, likes: null, comments: null, shares: null, subscribers: null,
    };

    if (growth_count > 0 && prevStatsRaw.length > 0) {
      const prev = sumStats(prevStatsRaw.map(mapStat));
      growth = {
        reach:    pct(summary.total_reach,    prev.total_reach),
        views:    pct(summary.total_views,    prev.total_views),
        likes:    pct(summary.total_likes,    prev.total_likes),
        comments: pct(summary.total_comments, prev.total_comments),
        shares:   pct(summary.total_shares,   prev.total_shares),
        subscribers: null,
      };
    }

    const communityIdNum = parseInt(community.community_id, 10);
    try {
      await query(
        `INSERT INTO vk_community_snapshots (community_id, member_count)
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM vk_community_snapshots
           WHERE community_id = $1
             AND recorded_at >= date_trunc('hour', NOW())
         )`,
        [communityIdNum, currentMemberCount]
      );

      const snapResult = await query(
        `WITH
           latest AS (
             SELECT member_count FROM vk_community_snapshots
             WHERE community_id = $1
             ORDER BY recorded_at DESC LIMIT 1
           ),
           week_ago AS (
             SELECT member_count FROM vk_community_snapshots
             WHERE community_id = $1
               AND recorded_at <= NOW() - INTERVAL '6 days'
             ORDER BY recorded_at DESC LIMIT 1
           )
         SELECT latest.member_count AS cur, week_ago.member_count AS prev
         FROM latest LEFT JOIN week_ago ON TRUE`,
        [communityIdNum]
      );

      if (snapResult.rows.length > 0) {
        const s = snapResult.rows[0] as { cur: number | null; prev: number | null };
        if (s.cur !== null && s.prev !== null) {
          growth.subscribers = pct(s.cur, s.prev);
        }
      }
    } catch {
      // snapshots table may not exist yet — non-fatal
    }

    const allPosts = wallData.items.map((p) => ({
      id:        p.id,
      text:      p.text || null,
      date:      new Date(p.date * 1000).toISOString(),
      likes:     p.likes?.count    ?? 0,
      reposts:   p.reposts?.count  ?? 0,
      comments:  p.comments?.count ?? 0,
      views:     p.views?.count    ?? 0,
      has_media: !!(p.attachments?.length),
      _ts:       p.date,
    }));

    const topPosts = [...allPosts]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(({ _ts: _, ...rest }) => rest);

    const heatMap = new Map<string, { total: number; count: number }>();
    for (const p of wallData.items) {
      const d   = new Date(p.date * 1000);
      const key = `${d.getUTCDay()}:${d.getUTCHours()}`;
      const cell = heatMap.get(key) ?? { total: 0, count: 0 };
      cell.total += p.views?.count ?? 0;
      cell.count += 1;
      heatMap.set(key, cell);
    }
    const heatmap = Array.from(heatMap.entries()).map(([key, val]) => {
      const [day, hour] = key.split(":").map(Number);
      return {
        day_of_week: day,
        hour,
        avg_views:  val.count > 0 ? Math.round(val.total / val.count) : 0,
        post_count: val.count,
      };
    });

    return res.json({
      community: {
        id:           communityId,
        community_id: community.community_id,
        name:         community.name,
        screen_name:  community.screen_name,
        photo_url:    community.photo_url,
        member_count: currentMemberCount,
      },
      period,
      summary: { ...summary, member_count: currentMemberCount, engagement_rate },
      stats_by_day: statsByDay,
      top_posts: topPosts,
      heatmap,
      growth,
    });
  } catch (err) {
    console.error("VK ANALYTICS ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

import { Request, Response } from "express";
import { query } from "../db";
import crypto from "crypto";

const VK_APP_ID        = process.env.VK_APP_ID!;
const VK_CLIENT_SECRET = process.env.VK_CLIENT_SECRET!;
const VK_REDIRECT_URI  = process.env.VK_REDIRECT_URI  ?? "http://localhost:8000/vk/callback";
const FRONTEND_URL     = process.env.FRONTEND_URL     ?? "http://localhost:3000";
const VK_API_V         = "5.131";
const VK_BASE          = "https://api.vk.com/method";
// Separate secret for OAuth state HMAC — keeps JWT_SECRET isolated
const VK_STATE_SECRET  = process.env.VK_STATE_SECRET ?? process.env.JWT_SECRET!;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createState(userId: number): string {
  const ts   = Date.now();
  const hmac = crypto
    .createHmac("sha256", VK_STATE_SECRET)
    .update(`${userId}:${ts}`)
    .digest("hex");
  return Buffer.from(`${userId}:${ts}:${hmac}`).toString("base64url");
}

function verifyState(state: string): number | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    const parts   = decoded.split(":");
    if (parts.length !== 3) return null;
    const userIdStr = parts[0]!;
    const tsStr     = parts[1]!;
    const hmac      = parts[2]!;
    const userId = parseInt(userIdStr, 10);
    const ts     = parseInt(tsStr, 10);
    if (isNaN(userId) || isNaN(ts)) return null;
    if (Date.now() - ts > 15 * 60 * 1000) return null;
    const expected = crypto
      .createHmac("sha256", VK_STATE_SECRET)
      .update(`${userId}:${ts}`)
      .digest("hex");
    if (hmac !== expected) return null;
    return userId;
  } catch {
    return null;
  }
}

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
  const data = await res.json() as { response?: T; error?: { error_msg: string } };
  if (data.error) throw new Error(data.error.error_msg);
  return data.response!;
}

function parseVkDate(v: number | string): string {
  if (typeof v === "number") return new Date(v * 1000).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

/* GET /vk/auth-url  (auth required) */
export const getVkAuthUrl = (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const state = createState(userId);
  const url   = new URL("https://oauth.vk.com/authorize");
  url.searchParams.set("client_id",     VK_APP_ID);
  url.searchParams.set("display",       "page");
  url.searchParams.set("redirect_uri",  VK_REDIRECT_URI);
  url.searchParams.set("scope",         "stats,groups,wall,offline");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("v",             VK_API_V);
  url.searchParams.set("state",         state);

  return res.json({ url: url.toString() });
};

/* GET /vk/callback  (no auth — VK redirects here) */
export const handleVkCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query as Record<string, string>;

    if (error || !code || !state) {
      return res.redirect(`${FRONTEND_URL}/app/integrations?vk=error`);
    }

    const userId = verifyState(state);
    if (!userId) return res.redirect(`${FRONTEND_URL}/app/integrations?vk=error`);

    // Exchange code → access_token
    const tokenUrl = new URL("https://oauth.vk.com/access_token");
    tokenUrl.searchParams.set("client_id",     VK_APP_ID);
    tokenUrl.searchParams.set("client_secret", VK_CLIENT_SECRET);
    tokenUrl.searchParams.set("redirect_uri",  VK_REDIRECT_URI);
    tokenUrl.searchParams.set("code",          code);

    const tokenRes  = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json() as {
      access_token?: string;
      user_id?: number;
      error?: string;
    };

    if (!tokenData.access_token || !tokenData.user_id) {
      return res.redirect(`${FRONTEND_URL}/app/integrations?vk=error`);
    }

    const { access_token, user_id: vkUserId } = tokenData;

    // Upsert integration row
    const intRes = await query(
      `INSERT INTO vk_integrations (user_id, vk_user_id, access_token)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
         SET vk_user_id = $2, access_token = $3, created_at = NOW()
       RETURNING id`,
      [userId, vkUserId, access_token]
    );
    const integrationId = (intRes.rows[0] as { id: number }).id;

    // Fetch communities the user manages
    type VkGroup = {
      id: number;
      name: string;
      screen_name: string;
      photo_50?: string;
      members_count?: number;
    };
    const groups = await vkCall<{ count: number; items: VkGroup[] }>(
      "groups.get",
      { filter: "admin,editor,moder", extended: 1, fields: "members_count", count: 100 },
      access_token
    );

    for (const g of groups.items) {
      await query(
        `INSERT INTO vk_communities
           (user_id, vk_integration_id, community_id, name, screen_name, photo_url, member_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, community_id) DO UPDATE
           SET name = $4, screen_name = $5, photo_url = $6, member_count = $7, is_active = TRUE`,
        [userId, integrationId, g.id, g.name, g.screen_name, g.photo_50 ?? null, g.members_count ?? null]
      );
    }

    return res.redirect(`${FRONTEND_URL}/app/integrations?vk=connected`);
  } catch (err) {
    console.error("VK CALLBACK ERROR:", err);
    return res.redirect(`${FRONTEND_URL}/app/integrations?vk=error`);
  }
};

/* GET /vk/status */
export const getVkStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await query(
      "SELECT vk_user_id, created_at FROM vk_integrations WHERE user_id = $1",
      [userId]
    );

    return res.json({ linked: result.rows.length > 0 });
  } catch (err) {
    console.error("VK STATUS ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* DELETE /vk/disconnect */
export const disconnectVk = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await query("DELETE FROM vk_integrations WHERE user_id = $1", [userId]);
    return res.json({ message: "Disconnected" });
  } catch (err) {
    console.error("VK DISCONNECT ERROR:", err);
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
      `SELECT vc.community_id, vc.name, vc.screen_name, vc.photo_url, vc.member_count,
              vi.access_token
       FROM vk_communities vc
       JOIN vk_integrations vi ON vi.id = vc.vk_integration_id
       WHERE vc.id = $1 AND vc.user_id = $2 AND vc.is_active = TRUE`,
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
      access_token: string;
    };

    const { access_token } = community;
    const groupId = Number(community.community_id);

    let interval: "day" | "month" = "day";
    let intervals_count = 7;
    let growth_count    = 0; // extra intervals for prev-period growth
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
        access_token
      ),
      vkCall<VkGroupInfo[]>(
        "groups.getById",
        { group_ids: groupId, fields: "members_count" },
        access_token
      ),
      vkCall<{ items: VkPost[] }>(
        "wall.get",
        { owner_id: -groupId, count: 100, filter: "owner" },
        access_token
      ),
    ]);

    const currentMemberCount = groupInfoArr[0]?.members_count ?? community.member_count ?? 0;

    // VK returns oldest → newest; split into prev + current portions
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

    // Growth %: compare current vs previous period
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

    // Save member_count snapshot (upsert — max 1 per hour)
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

      // Subscriber growth from snapshots
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
      // Snapshot table may not exist yet (pre-migration); non-fatal
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

    // Heatmap: group by (day_of_week, hour) using post.date unix timestamp
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

import { Request, Response } from "express";
import { query } from "../db";
import { getUserPlan } from "../lib/getUserPlan";
import { getLimits } from "../config/plans";
import { logger } from "../lib/logger";

const VK_API_V  = "5.199";
const VK_BASE   = "https://api.vk.com/method";

/* Single app-wide service token. Reads public community data (wall.get,
 * groups.getById). VK disabled all user-token OAuth flows on 2024-06-25, and
 * community tokens fail stats/wall with error 27 — the service token is the
 * only key that still works for an external integration. */
const VK_SERVICE_TOKEN = process.env.VK_SERVICE_TOKEN ?? "";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export class VkApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "VkApiError";
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
  const data = await res.json() as { response?: T; error?: { error_msg: string; error_code: number } };
  if (data.error) throw new VkApiError(data.error.error_code, data.error.error_msg);
  return data.response!;
}

function vkErrorMessage(err: unknown): { status: number; message: string; code?: number } {
  if (err instanceof VkApiError) {
    switch (err.code) {
      case 5:    return { status: 400, code: 5,    message: "VK token invalid or expired. Get a new user token." };
      case 15:   return { status: 400, code: 15,   message: "Access denied. Your VK account is not an admin of this community." };
      case 17:   return { status: 400, code: 17,   message: "VK requires re-validation. Open the auth URL again in the same browser." };
      case 27:   return { status: 400, code: 27,   message: "This is a community token. Use a user token (Implicit Flow): get it from oauth.vk.com." };
      case 28:   return { status: 400, code: 28,   message: "This is an application token, not a user token. Use Implicit Flow." };
      case 100:  return { status: 400, code: 100,  message: "Invalid community ID or parameters." };
      case 113:  return { status: 400, code: 113,  message: "Community ID is invalid." };
      case 203:  return { status: 400, code: 203,  message: "Access to community denied. Make sure your VK account is an admin." };
      case 1051: return { status: 400, code: 1051, message: "Statistics are not available for this community type (needs 100+ subscribers, must be a public group, not an event)." };
      default:   return { status: 400, code: err.code, message: `VK API error ${err.code}: ${err.message}` };
    }
  }
  return { status: 500, message: "Internal server error" };
}

/** Parse user input ("12345", "metriqflow", "https://vk.com/metriqflow") → identifier for groups.getById */
function parseGroupInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // URL forms
  const urlMatch = s.match(/^(?:https?:\/\/)?(?:m\.|www\.)?vk\.com\/([A-Za-z0-9._-]+)\/?$/);
  if (urlMatch) {
    const tail = urlMatch[1]!;
    const clubMatch = tail.match(/^(?:club|public|event)(\d+)$/);
    if (clubMatch) return clubMatch[1]!;
    return tail;
  }

  // Bare numeric
  if (/^\d+$/.test(s)) return s;

  // Screen name
  if (/^[A-Za-z0-9._-]+$/.test(s)) return s;

  return null;
}

// ─── Add community ────────────────────────────────────────────────────────────

/* POST /vk/communities  body: { group_id }
 *
 * group_id: numeric id, screen name, or vk.com/<…> URL of a PUBLIC community.
 * Resolved with the app-wide service token — no per-user auth. Internal stats
 * (reach/visitors/demographics) are unavailable: VK gates stats.get behind a
 * user token, and all user-token OAuth flows were disabled 2024-06-25.
 */
export const addVkCommunity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!VK_SERVICE_TOKEN) {
      logger.error("VK ADD COMMUNITY: VK_SERVICE_TOKEN not configured");
      return res.status(500).json({ message: "VK integration is not configured on the server" });
    }

    const body = req.body as { group_id?: string };
    const groupInputRaw = (body.group_id ?? "").trim();
    if (!groupInputRaw) {
      return res.status(400).json({ message: "group_id is required" });
    }

    const groupIdentifier = parseGroupInput(groupInputRaw);
    if (!groupIdentifier) {
      return res.status(400).json({ message: "Could not parse community ID. Use numeric id, screen name, or vk.com URL." });
    }

    // Enforce plan limit
    const plan   = await getUserPlan(userId);
    const limits = getLimits(plan);
    if (limits.vk_communities !== null) {
      const countRes = await query(
        "SELECT COUNT(*) FROM vk_communities WHERE user_id = $1 AND is_active = TRUE",
        [userId]
      );
      const count = parseInt((countRes.rows[0] as { count: string }).count, 10);
      if (count >= limits.vk_communities) {
        return res.status(403).json({ message: "limit", upgrade: true, limit: limits.vk_communities });
      }
    }

    // Resolve community meta. v5.199 groups.getById → { groups: [...] }
    type VkGroupInfo = {
      id: number;
      name: string;
      screen_name: string;
      photo_50?: string;
      members_count?: number;
      is_closed?: number;
    };

    let group: VkGroupInfo;
    try {
      const result = await vkCall<{ groups: VkGroupInfo[] }>(
        "groups.getById",
        { group_ids: groupIdentifier, fields: "members_count" },
        VK_SERVICE_TOKEN
      );
      const groups = result?.groups ?? [];
      if (groups.length === 0) {
        return res.status(400).json({ message: "Community not found" });
      }
      group = groups[0]!;
    } catch (err) {
      const mapped = vkErrorMessage(err);
      logger.error({ err }, "VK ADD COMMUNITY (groups.getById):");
      return res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
    }

    if (group.is_closed) {
      return res.status(400).json({
        message: "This community is private. Only public communities can be analyzed with VK's available API.",
        code: 15,
      });
    }

    // Upsert. community_token column kept for schema compat — stores the
    // service token (analytics reads VK_SERVICE_TOKEN directly anyway).
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
        [VK_SERVICE_TOKEN, group.name, group.screen_name, group.photo_50 ?? null, group.members_count ?? null, userId, group.id]
      );
    } else {
      await query(
        `INSERT INTO vk_communities
           (user_id, community_id, name, screen_name, photo_url, member_count, community_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, group.id, group.name, group.screen_name, group.photo_50 ?? null, group.members_count ?? null, VK_SERVICE_TOKEN]
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
    logger.error({ err }, "VK ADD COMMUNITY ERROR:");
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
    logger.error({ err }, "VK REMOVE COMMUNITY ERROR:");
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
    logger.error({ err }, "VK COMMUNITIES ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* GET /vk/communities/:communityId/analytics?period=7d|30d|3m|all */
const VALID_PERIODS = new Set(["24h", "7d", "30d", "all"]);

export const getVkCommunityAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const communityId = parseInt(req.params.communityId as string, 10);
    if (!Number.isInteger(communityId) || communityId <= 0) {
      return res.status(400).json({ message: "Invalid communityId" });
    }

    const rawPeriod = typeof req.query.period === "string" ? req.query.period : "7d";
    if (!VALID_PERIODS.has(rawPeriod)) {
      return res.status(400).json({ message: "Invalid period" });
    }

    const planLimits = getLimits(await getUserPlan(userId));
    const historyCapped = planLimits.history_days !== null && rawPeriod === "all";
    const period = historyCapped ? "30d" : rawPeriod;

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

    const groupId = Number(community.community_id);

    // Rolling window (seconds). "all" = every fetched post (last 100, VK hard cap).
    const DAY = 86400;
    const windowSec: number =
      period === "24h" ? 1  * DAY :
      period === "30d" ? 30 * DAY :
      period === "all" ? Infinity :
      /* 7d */           7  * DAY;

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

    // v5.199: groups.getById → { groups: [...] }. wall.get returns the latest
    // 100 posts (VK hard cap per call) — sufficient for recent-activity MVP.
    let groupInfo: { groups: VkGroupInfo[] };
    let wallData: { items: VkPost[] };
    try {
      [groupInfo, wallData] = await Promise.all([
        vkCall<{ groups: VkGroupInfo[] }>(
          "groups.getById",
          { group_ids: groupId, fields: "members_count" },
          VK_SERVICE_TOKEN
        ),
        vkCall<{ items: VkPost[] }>(
          "wall.get",
          { owner_id: -groupId, count: 100, filter: "owner" },
          VK_SERVICE_TOKEN
        ),
      ]);
    } catch (err) {
      const mapped = vkErrorMessage(err);
      logger.error({ err }, "VK ANALYTICS (vk api):");
      return res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
    }

    const currentMemberCount = groupInfo.groups?.[0]?.members_count ?? community.member_count ?? 0;

    const nowSec = Math.floor(Date.now() / 1000);
    const inCurrent = (ts: number) => ts >= nowSec - windowSec;
    const inPrevious = (ts: number) =>
      ts < nowSec - windowSec && ts >= nowSec - 2 * windowSec;

    const mapPost = (p: VkPost) => ({
      id:        p.id,
      text:      p.text || null,
      date:      new Date(p.date * 1000).toISOString(),
      likes:     p.likes?.count    ?? 0,
      reposts:   p.reposts?.count  ?? 0,
      comments:  p.comments?.count ?? 0,
      views:     p.views?.count    ?? 0,
      has_media: !!(p.attachments?.length),
      _ts:       p.date,
    });

    const allPosts     = wallData.items.map(mapPost);
    const currentPosts = allPosts.filter((p) => inCurrent(p._ts));
    const previousPosts = allPosts.filter((p) => inPrevious(p._ts));

    // Per-day aggregation of post engagement. reach/visitors are unavailable
    // (stats.get is gated) — kept at 0 to preserve the response shape.
    const byDay = new Map<string, { views: number; likes: number; comments: number; shares: number }>();
    for (const p of currentPosts) {
      const day  = p.date.slice(0, 10);
      const cell = byDay.get(day) ?? { views: 0, likes: 0, comments: 0, shares: 0 };
      cell.views    += p.views;
      cell.likes    += p.likes;
      cell.comments += p.comments;
      cell.shares   += p.reposts;
      byDay.set(day, cell);
    }
    const statsByDay = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, c]) => ({
        date,
        reach: 0,
        reach_subscribers: 0,
        views: c.views,
        visitors: 0,
        likes: c.likes,
        comments: c.comments,
        shares: c.shares,
      }));

    const sumPosts = (rows: typeof currentPosts) =>
      rows.reduce(
        (acc, p) => ({
          total_reach:    0,
          total_views:    acc.total_views    + p.views,
          total_visitors: 0,
          total_likes:    acc.total_likes    + p.likes,
          total_comments: acc.total_comments + p.comments,
          total_shares:   acc.total_shares   + p.reposts,
        }),
        { total_reach: 0, total_views: 0, total_visitors: 0, total_likes: 0, total_comments: 0, total_shares: 0 }
      );

    const summary = sumPosts(currentPosts);

    const engagement_rate = summary.total_views > 0
      ? ((summary.total_likes + summary.total_comments + summary.total_shares) / summary.total_views) * 100
      : 0;

    const pct = (cur: number, prev: number): number | null =>
      prev === 0 ? null : ((cur - prev) / prev) * 100;

    const growth: Record<string, number | null> = {
      reach: null, views: null, likes: null, comments: null, shares: null, subscribers: null,
    };

    if (previousPosts.length > 0) {
      const prev = sumPosts(previousPosts);
      growth.views    = pct(summary.total_views,    prev.total_views);
      growth.likes    = pct(summary.total_likes,    prev.total_likes);
      growth.comments = pct(summary.total_comments, prev.total_comments);
      growth.shares   = pct(summary.total_shares,   prev.total_shares);
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

    const topPosts = [...currentPosts]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(({ _ts: _, ...rest }) => rest);

    const heatMap = new Map<string, { total: number; count: number }>();
    for (const p of currentPosts) {
      const d   = new Date(p._ts * 1000);
      const key = `${d.getUTCDay()}:${d.getUTCHours()}`;
      const cell = heatMap.get(key) ?? { total: 0, count: 0 };
      cell.total += p.views;
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
      history_capped: historyCapped,
      summary: { ...summary, member_count: currentMemberCount, engagement_rate },
      stats_by_day: statsByDay,
      top_posts: topPosts,
      heatmap,
      growth,
    });
  } catch (err) {
    logger.error({ err }, "VK ANALYTICS ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* GET /vk/communities/:communityId/posts-search
 * Fetches last 100 posts (VK hard cap), filters/sorts/paginates in memory. */
export const searchVkPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const communityId = parseInt(req.params.communityId as string, 10);
    if (!Number.isInteger(communityId) || communityId <= 0) {
      return res.status(400).json({ message: "Invalid communityId" });
    }

    const row = await query(
      `SELECT community_id, name, screen_name
       FROM vk_communities
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
      [communityId, userId]
    );
    if (row.rows.length === 0) return res.status(404).json({ message: "Community not found" });

    const community = row.rows[0] as { community_id: string; name: string; screen_name: string };
    const groupId = Number(community.community_id);

    type RawVkPost = {
      id: number; text: string; date: number;
      likes?: { count: number }; reposts?: { count: number };
      comments?: { count: number }; views?: { count: number };
      attachments?: unknown[];
    };

    let wallData: { items: RawVkPost[] };
    try {
      wallData = await vkCall<{ items: RawVkPost[] }>(
        "wall.get",
        { owner_id: -groupId, count: 100, filter: "owner" },
        VK_SERVICE_TOKEN
      );
    } catch (err) {
      const mapped = vkErrorMessage(err);
      logger.error({ err }, "VK POSTS SEARCH (vk api):");
      return res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
    }

    const q    = typeof req.query.q    === "string" ? req.query.q.trim().toLowerCase() : "";
    const from = typeof req.query.from === "string" && req.query.from ? req.query.from : null;
    const to   = typeof req.query.to   === "string" && req.query.to   ? req.query.to   : null;
    const sort = req.query.sort === "views" ? "views" : "date";
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);

    let posts = wallData.items.map((p) => ({
      id:        p.id,
      text:      p.text || null,
      views:     p.views?.count    ?? 0,
      likes:     p.likes?.count    ?? 0,
      reposts:   p.reposts?.count  ?? 0,
      comments:  p.comments?.count ?? 0,
      has_media: !!(p.attachments?.length),
      posted_at: new Date(p.date * 1000).toISOString(),
      _ts:       p.date,
    }));

    if (q)    posts = posts.filter((p) => (p.text ?? "").toLowerCase().includes(q));
    if (from) { const ts = new Date(from).getTime() / 1000;         posts = posts.filter((p) => p._ts >= ts); }
    if (to)   { const ts = new Date(to).getTime()   / 1000 + 86400; posts = posts.filter((p) => p._ts <  ts); }

    posts.sort(sort === "views"
      ? (a, b) => b.views - a.views
      : (a, b) => b._ts   - a._ts
    );

    const total     = posts.length;
    const offset    = (page - 1) * limit;
    const pagePosts = posts.slice(offset, offset + limit).map(({ _ts, ...rest }) => rest);

    return res.json({
      posts:        pagePosts,
      total,
      page,
      limit,
      pages:        Math.ceil(total / limit),
      community_id: community.community_id,
    });
  } catch (err) {
    logger.error({ err }, "VK POSTS SEARCH ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

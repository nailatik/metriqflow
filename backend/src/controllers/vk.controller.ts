import { Request, Response } from "express";
import { query } from "../db";

const VK_API_V  = "5.131";
const VK_BASE   = "https://api.vk.com/method";

const COMMUNITY_LIMIT = 5;

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

function parseVkDate(v: number | string): string {
  if (typeof v === "number") return new Date(v * 1000).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// ─── Add community ────────────────────────────────────────────────────────────

/* POST /vk/communities  body: { access_token, group_id }
 *
 * access_token: VK USER token obtained via Implicit Flow (oauth.vk.com/authorize ...
 *   response_type=token, scope=stats,groups,wall,offline). Community tokens are
 *   rejected — stats.get returns error 27 for them.
 * group_id: numeric id, screen name, or vk.com/<…> URL.
 */
export const addVkCommunity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const body = req.body as { access_token?: string; group_id?: string; community_token?: string };
    const accessToken = (body.access_token ?? body.community_token ?? "").trim();
    const groupInputRaw = (body.group_id ?? "").trim();

    if (!accessToken) {
      return res.status(400).json({ message: "access_token is required" });
    }
    if (!groupInputRaw) {
      return res.status(400).json({ message: "group_id is required" });
    }

    const groupIdentifier = parseGroupInput(groupInputRaw);
    if (!groupIdentifier) {
      return res.status(400).json({ message: "Could not parse community ID. Use numeric id, screen name, or vk.com URL." });
    }

    // Enforce limit
    const countRes = await query(
      "SELECT COUNT(*) FROM vk_communities WHERE user_id = $1 AND is_active = TRUE",
      [userId]
    );
    const count = parseInt((countRes.rows[0] as { count: string }).count, 10);
    if (count >= COMMUNITY_LIMIT) {
      return res.status(400).json({ message: `Community limit reached (${COMMUNITY_LIMIT} max)` });
    }

    // Resolve community meta
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
        { group_ids: groupIdentifier, fields: "members_count" },
        accessToken
      );
      if (!result || result.length === 0) {
        return res.status(400).json({ message: "Community not found" });
      }
      group = result[0]!;
    } catch (err) {
      const mapped = vkErrorMessage(err);
      console.error("VK ADD COMMUNITY (groups.getById):", err);
      return res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
    }

    // Validate token works for stats — this is what actually matters for analytics.
    // 1051 (stats unavailable for community type) is a community-config issue, not
    // a token issue — let it through with a warning so the user sees the community
    // saved but is told analytics won't work.
    let statsWarning: string | null = null;
    try {
      await vkCall(
        "stats.get",
        { group_id: group.id, interval: "day", intervals_count: 1 },
        accessToken
      );
    } catch (err) {
      const mapped = vkErrorMessage(err);
      console.error("VK ADD COMMUNITY (stats.get):", err);
      if (err instanceof VkApiError && err.code === 1051) {
        statsWarning = mapped.message;
      } else {
        return res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
      }
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
        [accessToken, group.name, group.screen_name, group.photo_50 ?? null, group.members_count ?? null, userId, group.id]
      );
    } else {
      await query(
        `INSERT INTO vk_communities
           (user_id, community_id, name, screen_name, photo_url, member_count, community_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, group.id, group.name, group.screen_name, group.photo_50 ?? null, group.members_count ?? null, accessToken]
      );
    }

    const row = await query(
      "SELECT id FROM vk_communities WHERE user_id = $1 AND community_id = $2",
      [userId, group.id]
    );

    return res.json({
      id:            (row.rows[0] as { id: number }).id,
      community_id:  String(group.id),
      name:          group.name,
      screen_name:   group.screen_name,
      photo_url:     group.photo_50 ?? null,
      member_count:  group.members_count ?? null,
      stats_warning: statsWarning,
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

    let allStats: VkStatDay[];
    let groupInfoArr: VkGroupInfo[];
    let wallData: { items: VkPost[] };
    try {
      [allStats, groupInfoArr, wallData] = await Promise.all([
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
    } catch (err) {
      const mapped = vkErrorMessage(err);
      console.error("VK ANALYTICS (vk api):", err);
      // 27/28/5 → token is the wrong kind or expired → mark community as needing reauth
      if (err instanceof VkApiError && (err.code === 27 || err.code === 28 || err.code === 5)) {
        return res.status(409).json({
          error: "token_invalid",
          code: err.code,
          message: mapped.message,
          message_ru: "Токен сообщества больше не подходит. Удалите сообщество и добавьте заново, используя пользовательский токен (Implicit Flow).",
        });
      }
      return res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
    }

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

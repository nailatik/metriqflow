import { Request, Response } from "express";
import { query } from "../db";
import { getUserPlan } from "../lib/getUserPlan";
import { getLimits } from "../config/plans";
import { logger } from "../lib/logger";
import { fetchTmeChannel } from "../lib/tmeScrape";

const VK_API_V        = "5.199";
const VK_BASE         = "https://api.vk.com/method";
const VK_SERVICE_TOKEN = process.env.VK_SERVICE_TOKEN ?? "";

// In-flight dedup: if 10 users hit the same new competitor simultaneously,
// only one fetch happens — the rest await the same Promise.
const inFlight = new Map<string, Promise<CompareMetrics>>();

// ─── Types ────────────────────────────────────────────────────────────────────

type CompareMetrics = {
  subscribers:   number | null;
  avg_views:     number | null;
  er:            number | null;
  er_basis:      "full" | "reactions_only" | "na";
  post_freq:     number | null;
  posts_sampled: number;
};

// ─── VK helpers ───────────────────────────────────────────────────────────────

async function vkCall<T>(method: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${VK_BASE}/${method}`);
  url.searchParams.set("access_token", VK_SERVICE_TOKEN);
  url.searchParams.set("v", VK_API_V);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res  = await fetch(url.toString());
  const data = await res.json() as { response?: T; error?: { error_msg: string; error_code: number } };
  if (data.error) throw new Error(`VK ${data.error.error_code}: ${data.error.error_msg}`);
  return data.response!;
}

function parseGroupInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const urlMatch = s.match(/^(?:https?:\/\/)?(?:m\.|www\.)?vk\.com\/([A-Za-z0-9._-]+)\/?$/);
  if (urlMatch) {
    const tail     = urlMatch[1]!;
    const clubMatch = tail.match(/^(?:club|public|event)(\d+)$/);
    if (clubMatch) return clubMatch[1]!;
    return tail;
  }
  if (/^\d+$/.test(s)) return s;
  if (/^[A-Za-z0-9._-]+$/.test(s)) return s;
  return null;
}

// ─── Metrics helpers ──────────────────────────────────────────────────────────

function computeVkMetrics(
  posts: { date: number; likes?: { count: number }; reposts?: { count: number }; comments?: { count: number }; views?: { count: number } }[],
  periodDays: number,
  memberCount: number | null
): CompareMetrics {
  const sinceSec = Math.floor(Date.now() / 1000) - periodDays * 86400;
  const inWindow = posts.filter((p) => p.date >= sinceSec);

  let totalViews = 0, totalEng = 0;
  const viewedPosts: number[] = [];

  for (const p of inWindow) {
    const v = p.views?.count ?? 0;
    totalViews += v;
    totalEng   += (p.likes?.count ?? 0) + (p.reposts?.count ?? 0) + (p.comments?.count ?? 0);
    if (v > 0) viewedPosts.push(v);
  }

  return {
    subscribers:   memberCount,
    avg_views:     viewedPosts.length > 0 ? Math.round(totalViews / viewedPosts.length) : null,
    er:            totalViews > 0 ? (totalEng / totalViews) * 100 : null,
    er_basis:      "full",
    post_freq:     periodDays > 0 ? (inWindow.length / (periodDays / 7)) : null,
    posts_sampled: inWindow.length,
  };
}

function computeTgMetrics(
  posts: { msg_id: number; views: number | null; reactions: number | null; date: Date }[],
  periodDays: number,
  subscribers: number | null
): CompareMetrics {
  const since = new Date(Date.now() - periodDays * 86400 * 1000);
  const inWindow = posts.filter((p) => p.date >= since);

  let totalViews = 0, totalReactions = 0;
  let hasReactions = false;
  const viewedPosts: number[] = [];

  for (const p of inWindow) {
    const v = p.views ?? 0;
    totalViews += v;
    if (v > 0) viewedPosts.push(v);
    if (p.reactions !== null) {
      totalReactions += p.reactions;
      hasReactions    = true;
    }
  }

  const er_basis: "reactions_only" | "na" = hasReactions ? "reactions_only" : "na";
  const er = hasReactions && totalViews > 0
    ? (totalReactions / totalViews) * 100
    : null;

  return {
    subscribers,
    avg_views:     viewedPosts.length > 0 ? Math.round(totalViews / viewedPosts.length) : null,
    er,
    er_basis,
    post_freq:     periodDays > 0 ? (inWindow.length / (periodDays / 7)) : null,
    posts_sampled: inWindow.length,
  };
}

// ─── Snapshot cache ───────────────────────────────────────────────────────────

const CACHE_TTL_HOURS = 6;

async function getCachedSnapshot(competitorId: number, periodDays: number): Promise<CompareMetrics | null> {
  const res = await query(
    `SELECT subscribers, avg_views, er, er_basis, post_freq, posts_sampled
     FROM competitor_snapshots
     WHERE competitor_id = $1 AND period_days = $2
       AND fetched_at >= NOW() - INTERVAL '${CACHE_TTL_HOURS} hours'
     ORDER BY fetched_at DESC LIMIT 1`,
    [competitorId, periodDays]
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0] as {
    subscribers: number | null; avg_views: number | null;
    er: number | null; er_basis: string;
    post_freq: number | null; posts_sampled: number;
  };
  return {
    subscribers:   r.subscribers,
    avg_views:     r.avg_views,
    er:            r.er,
    er_basis:      r.er_basis as "full" | "reactions_only" | "na",
    post_freq:     r.post_freq,
    posts_sampled: r.posts_sampled,
  };
}

async function saveSnapshot(competitorId: number, periodDays: number, m: CompareMetrics): Promise<void> {
  await query(
    `INSERT INTO competitor_snapshots
       (competitor_id, period_days, subscribers, avg_views, er, er_basis, post_freq, posts_sampled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [competitorId, periodDays, m.subscribers, m.avg_views, m.er, m.er_basis, m.post_freq, m.posts_sampled]
  );
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/* POST /competitors  { platform, identifier } */
export const addCompetitor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const body = req.body as { platform?: string; identifier?: string };
    const platform = (body.platform ?? "").trim().toLowerCase();
    if (platform !== "tg" && platform !== "vk") {
      return res.status(400).json({ message: "platform must be 'tg' or 'vk'" });
    }

    const rawIdentifier = (body.identifier ?? "").trim();
    if (!rawIdentifier) {
      return res.status(400).json({ message: "identifier is required" });
    }

    // Plan limit
    const plan   = await getUserPlan(userId);
    const limits = getLimits(plan);
    if (limits.competitors !== null) {
      const countRes = await query(
        "SELECT COUNT(*) FROM competitors WHERE user_id = $1 AND is_active = TRUE",
        [userId]
      );
      const count = parseInt((countRes.rows[0] as { count: string }).count, 10);
      if (count >= limits.competitors) {
        return res.status(403).json({ message: "limit", upgrade: true, limit: limits.competitors });
      }
    }

    let identifier: string;
    let title:       string | null = null;
    let photo_url:   string | null = null;
    let subscriber_count: number | null = null;

    if (platform === "vk") {
      if (!VK_SERVICE_TOKEN) {
        return res.status(500).json({ message: "VK integration not configured" });
      }
      const parsed = parseGroupInput(rawIdentifier);
      if (!parsed) {
        return res.status(400).json({ message: "Cannot parse VK community ID. Use numeric id, screen name, or vk.com URL." });
      }

      type VkGroup = { id: number; name: string; photo_50?: string; members_count?: number; is_closed?: number };
      let group: VkGroup;
      try {
        const result = await vkCall<{ groups: VkGroup[] }>("groups.getById", {
          group_ids: parsed, fields: "members_count,photo_50",
        });
        const groups = result?.groups ?? [];
        if (groups.length === 0) return res.status(400).json({ message: "VK community not found" });
        group = groups[0]!;
      } catch (err) {
        logger.error({ err }, "COMPETITORS addCompetitor vk groups.getById:");
        return res.status(400).json({ message: "VK community not found or API error" });
      }

      if (group.is_closed) {
        return res.status(400).json({ message: "This VK community is private. Only public communities can be analyzed." });
      }

      identifier      = String(group.id);
      title           = group.name;
      photo_url       = group.photo_50 ?? null;
      subscriber_count = group.members_count ?? null;

    } else {
      // TG: normalize username
      let username = rawIdentifier;
      username = username.replace(/^@/, "");
      const urlMatch = username.match(/^(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]{4,32})$/);
      if (urlMatch) username = urlMatch[1]!;

      if (!/^[A-Za-z0-9_]{4,32}$/.test(username)) {
        return res.status(400).json({ message: "Invalid Telegram username. Use @username, t.me/username, or bare username (4-32 chars)." });
      }

      const channel = await fetchTmeChannel(username, { pages: 1 });
      if (!channel.preview_ok) {
        return res.status(400).json({ message: "Channel is private or has web-preview disabled" });
      }

      identifier       = username;
      title            = channel.title;
      photo_url        = channel.photo_url;
      subscriber_count = channel.subscribers;
    }

    // Upsert
    await query(
      `INSERT INTO competitors (user_id, platform, identifier, title, photo_url, subscriber_count)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, platform, identifier) DO UPDATE
         SET title = EXCLUDED.title,
             photo_url = EXCLUDED.photo_url,
             subscriber_count = EXCLUDED.subscriber_count,
             is_active = TRUE`,
      [userId, platform, identifier, title, photo_url, subscriber_count]
    );

    const row = await query(
      "SELECT id, platform, identifier, title, photo_url, subscriber_count, added_at FROM competitors WHERE user_id = $1 AND platform = $2 AND identifier = $3",
      [userId, platform, identifier]
    );

    return res.json(row.rows[0]);
  } catch (err) {
    logger.error({ err }, "COMPETITORS addCompetitor ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* GET /competitors */
export const getCompetitors = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await query(
      `SELECT id, platform, identifier, title, photo_url, subscriber_count, added_at
       FROM competitors
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY added_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    logger.error({ err }, "COMPETITORS getCompetitors ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* DELETE /competitors/:id  (soft delete) */
export const removeCompetitor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    await query(
      "UPDATE competitors SET is_active = FALSE WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return res.json({ message: "Removed" });
  } catch (err) {
    logger.error({ err }, "COMPETITORS removeCompetitor ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* GET /competitors/:id/compare?period=7d|30d&own_channel_id=<id> */
export const getCompetitorCompare = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const periodRaw = typeof req.query.period === "string" ? req.query.period : "7d";
    const periodDays = periodRaw === "30d" ? 30 : 7;

    const ownChannelId = typeof req.query.own_channel_id === "string"
      ? parseInt(req.query.own_channel_id, 10)
      : null;

    const compRow = await query(
      "SELECT id, platform, identifier, title, photo_url, subscriber_count FROM competitors WHERE id = $1 AND user_id = $2 AND is_active = TRUE",
      [id, userId]
    );
    if (compRow.rows.length === 0) {
      return res.status(404).json({ message: "Competitor not found" });
    }
    const comp = compRow.rows[0] as {
      id: number; platform: string; identifier: string;
      title: string | null; photo_url: string | null; subscriber_count: number | null;
    };

    // ── Rival metrics (cached) ──
    let rival: CompareMetrics;
    const cached = await getCachedSnapshot(comp.id, periodDays);
    let fetchedAt: string;

    if (cached) {
      rival     = cached;
      const snap = await query(
        "SELECT fetched_at FROM competitor_snapshots WHERE competitor_id = $1 AND period_days = $2 ORDER BY fetched_at DESC LIMIT 1",
        [comp.id, periodDays]
      );
      fetchedAt = (snap.rows[0] as { fetched_at: string }).fetched_at;
    } else {
      // Fetch fresh — deduplicate concurrent requests for the same competitor
      const dedupKey = `${comp.platform}:${comp.identifier}:${periodDays}`;
      const existing = inFlight.get(dedupKey);

      const fetchWork = existing ?? (async (): Promise<CompareMetrics> => {
        if (comp.platform === "vk") {
          if (!VK_SERVICE_TOKEN) throw new Error("VK_NOT_CONFIGURED");
          const groupId = Number(comp.identifier);
          type VkPost = { date: number; likes?: { count: number }; reposts?: { count: number }; comments?: { count: number }; views?: { count: number } };
          type VkGroup = { members_count?: number };
          const [groupInfo, wallData] = await Promise.all([
            vkCall<{ groups: VkGroup[] }>("groups.getById", { group_ids: groupId, fields: "members_count" }),
            vkCall<{ items: VkPost[] }>("wall.get", { owner_id: -groupId, count: 100, filter: "owner" }),
          ]);
          const memberCount = groupInfo.groups?.[0]?.members_count ?? comp.subscriber_count ?? null;
          return computeVkMetrics(wallData.items, periodDays, memberCount);
        } else {
          const channel = await fetchTmeChannel(comp.identifier, { pages: 5 });
          if (!channel.preview_ok) throw new Error("TG_NOT_PUBLIC");
          // Refresh photo_url in DB if it changed
          if (channel.photo_url && channel.photo_url !== comp.photo_url) {
            query("UPDATE competitors SET photo_url = $1 WHERE id = $2", [channel.photo_url, comp.id]).catch(() => {});
          }
          return computeTgMetrics(channel.posts, periodDays, channel.subscribers ?? comp.subscriber_count);
        }
      })();

      if (!existing) {
        inFlight.set(dedupKey, fetchWork);
        fetchWork.finally(() => inFlight.delete(dedupKey));
      }

      try {
        rival = await fetchWork;
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === "VK_NOT_CONFIGURED") return res.status(500).json({ message: "VK integration not configured" });
        if (msg === "TG_NOT_PUBLIC")    return res.status(400).json({ message: "Channel is no longer public or preview was disabled" });
        logger.error({ err }, "COMPETITORS compare fetch:");
        return res.status(502).json({ message: "Failed to fetch data" });
      }

      // Double-check: another in-flight request may have just saved a snapshot
      const raceCheck = await getCachedSnapshot(comp.id, periodDays);
      if (!raceCheck) {
        await saveSnapshot(comp.id, periodDays, rival);
      }
      fetchedAt = new Date().toISOString();
    }

    // Update subscriber_count on competitors row
    if (rival.subscribers !== null && rival.subscribers !== comp.subscriber_count) {
      await query(
        "UPDATE competitors SET subscriber_count = $1, last_synced_at = NOW() WHERE id = $2",
        [rival.subscribers, comp.id]
      );
    }

    // ── Own metrics ──
    let own: CompareMetrics | null = null;
    let own_channel: { id: number; name: string } | null = null;
    const since = new Date(Date.now() - periodDays * 86400 * 1000);

    if (comp.platform === "tg") {
      // If own_channel_id provided, filter to that channel; else aggregate all
      const tgWhere = ownChannelId && !isNaN(ownChannelId)
        ? "AND tc.id = $3"
        : "";
      const tgParams: unknown[] = ownChannelId && !isNaN(ownChannelId)
        ? [userId, since, ownChannelId]
        : [userId, since];
      const tgSubParams: unknown[] = ownChannelId && !isNaN(ownChannelId)
        ? [userId, ownChannelId]
        : [userId];
      const tgSubWhere = ownChannelId && !isNaN(ownChannelId)
        ? "AND id = $2"
        : "";

      const [aggRow, subRow] = await Promise.all([
        query(
          `SELECT
             COALESCE(SUM(tp.views), 0)::bigint                              AS total_views,
             COALESCE(SUM(tp.reactions_total + tp.forwards), 0)::bigint       AS total_eng,
             COUNT(tp.id)::int                                                AS post_count,
             COALESCE(AVG(CASE WHEN tp.views > 0 THEN tp.views ELSE NULL END),0)::float AS avg_views_nz
           FROM telegram_posts tp
           JOIN telegram_channels tc ON tc.channel_id = tp.channel_id
           WHERE tc.user_id = $1 AND tc.is_active = TRUE
             AND tp.posted_at >= $2 ${tgWhere}`,
          tgParams
        ),
        query(
          `SELECT COALESCE(SUM(member_count),0)::int AS subscribers
           FROM telegram_channels
           WHERE user_id = $1 AND is_active = TRUE ${tgSubWhere}`,
          tgSubParams
        ),
      ]);
      const a  = aggRow.rows[0] as { total_views: string; total_eng: string; post_count: number; avg_views_nz: number };
      const s  = subRow.rows[0] as { subscribers: number };
      const tv = Number(a.total_views);
      if (a.post_count > 0 || s.subscribers > 0) {
        own = {
          subscribers:   s.subscribers || null,
          avg_views:     a.avg_views_nz > 0 ? Math.round(a.avg_views_nz) : null,
          er:            tv > 0 ? (Number(a.total_eng) / tv) * 100 : null,
          er_basis:      "full",
          post_freq:     periodDays > 0 ? (a.post_count / (periodDays / 7)) : null,
          posts_sampled: a.post_count,
        };
      }

      if (ownChannelId && !isNaN(ownChannelId)) {
        const chRow = await query(
          "SELECT id, title AS name FROM telegram_channels WHERE id = $1 AND user_id = $2 AND is_active = TRUE",
          [ownChannelId, userId]
        );
        if (chRow.rows.length > 0) own_channel = chRow.rows[0] as { id: number; name: string };
      }

    } else {
      // VK own
      const vkWhere = ownChannelId && !isNaN(ownChannelId) ? "AND id = $2" : "";
      const vkListParams: unknown[] = ownChannelId && !isNaN(ownChannelId)
        ? [userId, ownChannelId]
        : [userId];

      const vkCommunities = await query(
        `SELECT id, community_id, COALESCE(member_count,0)::int AS member_count, name
         FROM vk_communities WHERE user_id = $1 AND is_active = TRUE ${vkWhere}`,
        vkListParams
      );
      const vkRows = vkCommunities.rows as { id: number; community_id: string; member_count: number; name: string }[];
      if (vkRows.length > 0 && VK_SERVICE_TOKEN) {
        type VkPost = { date: number; likes?: { count: number }; reposts?: { count: number }; comments?: { count: number }; views?: { count: number } };
        const sinceSec = Math.floor(Date.now() / 1000) - periodDays * 86400;
        let totalViews = 0, totalEng = 0, postCount = 0;
        const totalSubscribers = vkRows.reduce((acc, r) => acc + r.member_count, 0);

        for (const c of vkRows) {
          try {
            const wall = await vkCall<{ items: VkPost[] }>("wall.get", {
              owner_id: -Number(c.community_id), count: 100, filter: "owner",
            });
            for (const p of wall.items) {
              if (p.date < sinceSec) continue;
              const v = p.views?.count ?? 0;
              totalViews += v;
              totalEng   += (p.likes?.count ?? 0) + (p.reposts?.count ?? 0) + (p.comments?.count ?? 0);
              postCount++;
            }
          } catch {
            // skip failing community
          }
        }
        own = {
          subscribers:   totalSubscribers || null,
          avg_views:     postCount > 0 ? Math.round(totalViews / postCount) : null,
          er:            totalViews > 0 ? (totalEng / totalViews) * 100 : null,
          er_basis:      "full",
          post_freq:     periodDays > 0 ? (postCount / (periodDays / 7)) : null,
          posts_sampled: postCount,
        };

        if (ownChannelId && !isNaN(ownChannelId) && vkRows.length === 1) {
          own_channel = { id: vkRows[0]!.id, name: vkRows[0]!.name };
        }
      }
    }

    return res.json({
      competitor: {
        id:               comp.id,
        platform:         comp.platform,
        title:            comp.title,
        identifier:       comp.identifier,
        photo_url:        comp.photo_url,
        subscriber_count: comp.subscriber_count,
      },
      period_days: periodDays,
      own,
      own_channel,
      rival,
      fetched_at: fetchedAt,
    });
  } catch (err) {
    logger.error({ err }, "COMPETITORS getCompetitorCompare ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

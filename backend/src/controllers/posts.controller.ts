import { Request, Response } from "express";
import { query } from "../db";
import { logger } from "../lib/logger";

const VALID_SORT = new Set(["views", "date"]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseNonNegInt(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/* GET /posts/search?channelId=&q=&from=&to=&sort=views|date&page=1&limit=20 */
export const searchPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const channelId = parsePositiveInt(req.query.channelId);
    if (!channelId) return res.status(400).json({ message: "Invalid channelId" });

    const ownership = await query(
      `SELECT channel_id FROM telegram_channels
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
      [channelId, userId]
    );
    if (ownership.rows.length === 0) {
      return res.status(404).json({ message: "Channel not found" });
    }
    const tgChannelId: string = (ownership.rows[0] as { channel_id: string }).channel_id;

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const from = typeof req.query.from === "string" ? req.query.from : null;
    const to   = typeof req.query.to   === "string" ? req.query.to   : null;
    const sort = typeof req.query.sort === "string" && VALID_SORT.has(req.query.sort)
      ? req.query.sort
      : "date";
    const page  = parseNonNegInt(req.query.page)  ?? 1;
    const limit = Math.min(parsePositiveInt(req.query.limit) ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (Math.max(page, 1) - 1) * limit;

    const params: unknown[] = [tgChannelId];
    const conditions: string[] = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`text ILIKE $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`posted_at >= $${params.length}::timestamptz`);
    }
    if (to) {
      params.push(to);
      conditions.push(`posted_at < ($${params.length}::date + interval '1 day')`);
    }

    const where = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
    const orderBy = sort === "views" ? "views DESC NULLS LAST" : "posted_at DESC";

    const [postsResult, countResult] = await Promise.all([
      query(
        `SELECT id, message_id, text, views, reactions_total, forwards, comments, has_media, posted_at
         FROM telegram_posts
         WHERE channel_id = $1 ${where}
         ORDER BY ${orderBy}
         LIMIT ${limit} OFFSET ${offset}`,
        params
      ),
      query(
        `SELECT COUNT(*)::int AS total
         FROM telegram_posts
         WHERE channel_id = $1 ${where}`,
        params
      ),
    ]);

    const total: number = (countResult.rows[0] as { total: number }).total;

    return res.json({
      posts: postsResult.rows,
      total,
      page: Math.max(page, 1),
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error({ err }, "GET POSTS SEARCH ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

import { Request, Response } from "express";
import { query } from "../db";
import { logger } from "../lib/logger";

function parseId(raw: unknown): number | null {
  const n = parseInt(String(raw), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

type PostStatus   = "draft" | "scheduled" | "sending" | "sent" | "failed";
type PostPlatform = "tg" | "vk";

// ─── GET /content-posts ───────────────────────────────────────────────────────

export const getPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await query(
      `SELECT id, platform, channel_id, channel_title, scheduled_at, text,
              media_urls, status, error_message, sent_at, created_at, updated_at
       FROM planned_posts
       WHERE user_id = $1
       ORDER BY scheduled_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    logger.error({ err }, "GET CONTENT POSTS ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── GET /content-posts/best-time ────────────────────────────────────────────

export const getBestTime = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { channel_id, platform } = req.query as { channel_id?: string; platform?: string };
    if (!channel_id || !platform) {
      return res.status(400).json({ message: "channel_id and platform required" });
    }

    if (platform === "tg") {
      // Verify ownership
      const ch = await query(
        `SELECT id FROM telegram_channels WHERE channel_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [channel_id, userId]
      );
      if (ch.rowCount === 0) return res.status(404).json({ message: "Channel not found" });

      // Heatmap over last 90 days — enough data without being too broad
      const heat = await query(
        `SELECT
           EXTRACT(DOW  FROM posted_at AT TIME ZONE 'UTC')::int AS day_of_week,
           EXTRACT(HOUR FROM posted_at AT TIME ZONE 'UTC')::int AS hour,
           ROUND(AVG(views))::int                               AS avg_views,
           COUNT(*)::int                                        AS post_count
         FROM telegram_posts
         WHERE channel_id = $1
           AND posted_at >= NOW() - INTERVAL '90 days'
           AND views > 0
         GROUP BY day_of_week, hour
         ORDER BY avg_views DESC
         LIMIT 1`,
        [channel_id]
      );

      if (heat.rowCount === 0 || !heat.rows[0]) {
        return res.json(null);
      }
      const row = heat.rows[0] as { day_of_week: number; hour: number; avg_views: number; post_count: number };
      if (row.post_count < 3) return res.json(null);

      return res.json({ day_of_week: row.day_of_week, hour: row.hour, avg_views: row.avg_views });
    }

    // VK: no DB table, best_time is computed from live API — not supported in this endpoint
    return res.json(null);
  } catch (err) {
    logger.error({ err }, "GET BEST TIME ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── POST /content-posts ──────────────────────────────────────────────────────

export const createPost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { platform, channel_id, channel_title, scheduled_at, text, media_urls, status } = req.body as {
      platform: PostPlatform;
      channel_id: string;
      channel_title?: string;
      scheduled_at: string;
      text?: string;
      media_urls?: string[];
      status?: PostStatus;
    };

    if (!platform || !["tg", "vk"].includes(platform)) {
      return res.status(400).json({ message: "platform must be 'tg' or 'vk'" });
    }
    if (!channel_id) return res.status(400).json({ message: "channel_id required" });
    if (!scheduled_at) return res.status(400).json({ message: "scheduled_at required" });

    const postStatus: PostStatus = status ?? "draft";
    if (!["draft", "scheduled"].includes(postStatus)) {
      return res.status(400).json({ message: "status must be draft or scheduled" });
    }

    if (postStatus === "scheduled" && new Date(scheduled_at) <= new Date()) {
      return res.status(400).json({ message: "scheduled_at must be in the future for scheduled posts" });
    }

    // Verify channel ownership
    if (platform === "tg") {
      const ch = await query(
        `SELECT id FROM telegram_channels WHERE channel_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [channel_id, userId]
      );
      if (ch.rowCount === 0) return res.status(404).json({ message: "Telegram channel not found" });
    } else {
      const cm = await query(
        `SELECT id FROM vk_communities WHERE community_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [channel_id, userId]
      );
      if (cm.rowCount === 0) return res.status(404).json({ message: "VK community not found" });
    }

    const result = await query(
      `INSERT INTO planned_posts
         (user_id, platform, channel_id, channel_title, scheduled_at, text, media_urls, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        platform,
        channel_id,
        channel_title ?? null,
        new Date(scheduled_at).toISOString(),
        text ?? "",
        media_urls ?? [],
        postStatus,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "CREATE CONTENT POST ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── PATCH /content-posts/:id ─────────────────────────────────────────────────

export const updatePost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const existing = await query(
      `SELECT id, status FROM planned_posts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rowCount === 0) return res.status(404).json({ message: "Post not found" });

    const current = existing.rows[0] as { id: number; status: PostStatus };
    if (["sending", "sent"].includes(current.status)) {
      return res.status(400).json({ message: "Cannot edit a post that is already sending or sent" });
    }

    const { scheduled_at, text, media_urls, status, channel_title } = req.body as {
      scheduled_at?: string;
      text?: string;
      media_urls?: string[];
      status?: PostStatus;
      channel_title?: string;
    };

    if (status && !["draft", "scheduled"].includes(status)) {
      return res.status(400).json({ message: "status must be draft or scheduled" });
    }

    const newStatus = status ?? current.status;
    const newScheduledAt = scheduled_at ? new Date(scheduled_at).toISOString() : undefined;

    if (newStatus === "scheduled" && newScheduledAt && new Date(newScheduledAt) <= new Date()) {
      return res.status(400).json({ message: "scheduled_at must be in the future" });
    }

    const fields: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let idx = 1;

    if (scheduled_at)    { fields.push(`scheduled_at = $${idx++}`);  values.push(newScheduledAt); }
    if (text !== undefined) { fields.push(`text = $${idx++}`);       values.push(text); }
    if (media_urls)      { fields.push(`media_urls = $${idx++}`);    values.push(media_urls); }
    if (status)          { fields.push(`status = $${idx++}`);        values.push(status); }
    if (channel_title !== undefined) { fields.push(`channel_title = $${idx++}`); values.push(channel_title); }

    values.push(id, userId);
    const result = await query(
      `UPDATE planned_posts SET ${fields.join(", ")}
       WHERE id = $${idx++} AND user_id = $${idx++}
       RETURNING *`,
      values
    );

    return res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "UPDATE CONTENT POST ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── DELETE /content-posts/:id ────────────────────────────────────────────────

export const deletePost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const existing = await query(
      `SELECT status FROM planned_posts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rowCount === 0) return res.status(404).json({ message: "Post not found" });

    const { status } = existing.rows[0] as { status: PostStatus };
    if (status === "sending") {
      return res.status(400).json({ message: "Cannot delete a post currently being sent" });
    }

    await query(`DELETE FROM planned_posts WHERE id = $1 AND user_id = $2`, [id, userId]);
    return res.status(204).send();
  } catch (err) {
    logger.error({ err }, "DELETE CONTENT POST ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

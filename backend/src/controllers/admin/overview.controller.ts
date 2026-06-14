import { Request, Response } from "express";
import { query } from "../../db";
import { logger } from "../../lib/logger";

export const getOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const [usersStats, planDist, signups30d, integrations] = await Promise.all([
      query(`
        SELECT
          COUNT(*)                                              AS total_users,
          COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '7 days')  AS active_7d,
          COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '30 days') AS active_30d,
          COUNT(*) FILTER (WHERE created_at    > NOW() - INTERVAL '7 days')   AS new_7d,
          COUNT(*) FILTER (WHERE plan <> 'free')                               AS paid_users
        FROM users
        WHERE is_admin = false OR is_admin IS NULL
      `),
      query(`
        SELECT plan, COUNT(*) AS count
        FROM users
        WHERE is_admin = false OR is_admin IS NULL
        GROUP BY plan
        ORDER BY count DESC
      `),
      query(`
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS count
        FROM users
        WHERE created_at > NOW() - INTERVAL '30 days'
          AND (is_admin = false OR is_admin IS NULL)
        GROUP BY day
        ORDER BY day
      `),
      query(`
        SELECT
          (SELECT COUNT(*) FROM telegram_users)                    AS tg_linked,
          (SELECT COUNT(*) FROM vk_communities WHERE active = true) AS vk_communities,
          (SELECT COUNT(DISTINCT user_id) FROM report_schedules)   AS with_schedules
      `),
    ]);

    const stats = usersStats.rows[0] as Record<string, unknown>;
    const promoStats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE active = true AND (expires_at IS NULL OR expires_at > NOW()) AND used_count < max_uses) AS active_promos,
        COALESCE(SUM(used_count) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) AS redemptions_30d
      FROM promo_codes
    `);

    res.json({
      stats: {
        ...stats,
        ...(promoStats.rows[0] as Record<string, unknown>),
      },
      plan_distribution: planDist.rows,
      signups_30d:       signups30d.rows,
      integrations:      integrations.rows[0],
    });
  } catch (err) {
    logger.error({ err }, "admin overview error");
    res.status(500).json({ message: "Internal server error" });
  }
};

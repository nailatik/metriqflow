import { Request, Response } from "express";
import { query } from "../../db";
import { logger } from "../../lib/logger";
import { PLAN_PRICES } from "../../config/plans";

// Real customers only: exclude admins and soft-deleted tombstones.
const REAL_USERS = "(is_admin = false OR is_admin IS NULL) AND deleted_at IS NULL";

export const getOverview = async (_req: Request, res: Response): Promise<void> => {
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
        WHERE ${REAL_USERS}
      `),
      query(`
        SELECT plan, COUNT(*) AS count
        FROM users
        WHERE ${REAL_USERS}
        GROUP BY plan
        ORDER BY count DESC
      `),
      query(`
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS count
        FROM users
        WHERE created_at > NOW() - INTERVAL '30 days'
          AND ${REAL_USERS}
        GROUP BY day
        ORDER BY day
      `),
      query(`
        SELECT
          (SELECT COUNT(*) FROM telegram_users)                       AS tg_linked,
          (SELECT COUNT(*) FROM vk_communities WHERE is_active = true) AS vk_communities,
          (SELECT COUNT(DISTINCT user_id) FROM report_schedules)      AS with_schedules
      `),
    ]);

    const stats = usersStats.rows[0] as Record<string, unknown>;
    const promoStats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE active = true AND (expires_at IS NULL OR expires_at > NOW()) AND used_count < max_uses) AS active_promos,
        COALESCE(SUM(used_count) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) AS redemptions_30d
      FROM promo_codes
    `);

    // MRR = Σ (active paid plan count × monthly price). Built from plan_distribution
    // so it stays consistent with the donut and uses the single PLAN_PRICES source.
    const mrr = planDist.rows.reduce((sum, row) => {
      const plan  = String((row as { plan: string }).plan) as keyof typeof PLAN_PRICES;
      const count = parseInt(String((row as { count: string }).count), 10) || 0;
      return sum + (PLAN_PRICES[plan] ?? 0) * count;
    }, 0);

    res.json({
      stats: {
        ...stats,
        ...(promoStats.rows[0] as Record<string, unknown>),
        mrr,
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

import { Request, Response } from "express";
import { query } from "../../db";
import { logger } from "../../lib/logger";

export const getBillingEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(String(req.query["page"]  ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query["limit"] ?? "50"), 10)));
    const offset = (page - 1) * limit;

    // Union: promo redemptions + admin plan changes + payments
    const rows = await query(
      `SELECT *
       FROM (
         SELECT
           'promo'          AS event_type,
           pr.redeemed_at   AS created_at,
           u.id             AS user_id,
           u.email          AS user_email,
           pc.code          AS reference,
           pc.grants_plan   AS plan,
           pc.grants_duration_days::text AS detail,
           NULL::text       AS amount
         FROM promo_redemptions pr
         JOIN users u ON u.id = pr.user_id
         JOIN promo_codes pc ON pc.code = pr.code

         UNION ALL

         SELECT
           'plan_change'        AS event_type,
           aal.created_at,
           aal.target_id::int   AS user_id,
           u.email              AS user_email,
           aal.target_id        AS reference,
           aal.meta->>'plan'    AS plan,
           aal.meta->>'plan_expires_at' AS detail,
           NULL::text           AS amount
         FROM admin_audit_log aal
         JOIN users u ON u.id = aal.target_id::int
         WHERE aal.action = 'user.plan_change'
           AND aal.target_id ~ '^\d+$'

         UNION ALL

         SELECT
           'payment'        AS event_type,
           p.created_at,
           p.user_id,
           u.email          AS user_email,
           p.provider_id    AS reference,
           p.plan,
           p.status         AS detail,
           (p.amount_minor::float / 100)::text AS amount
         FROM payments p
         JOIN users u ON u.id = p.user_id
       ) events
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const countRes = await query(`
      SELECT (
        (SELECT COUNT(*) FROM promo_redemptions) +
        (SELECT COUNT(*) FROM admin_audit_log WHERE action = 'user.plan_change') +
        (SELECT COUNT(*) FROM payments)
      ) AS total
    `);

    res.json({
      events: rows.rows,
      total:  parseInt(String(countRes.rows[0]?.["total"] ?? "0"), 10),
      page,
      limit,
    });
  } catch (err) {
    logger.error({ err }, "admin billing events error");
    res.status(500).json({ message: "Internal server error" });
  }
};

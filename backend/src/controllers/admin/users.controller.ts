import { Request, Response } from "express";
import { z } from "zod";
import { query } from "../../db";
import { audit } from "../../lib/audit";
import { logger } from "../../lib/logger";

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(String(req.query["page"]  ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query["limit"] ?? "25"), 10)));
    const search = String(req.query["search"] ?? "").trim();
    const plan   = String(req.query["plan"]   ?? "").trim();
    const offset = (page - 1) * limit;

    const verified = String(req.query["verified"] ?? "").trim();

    const conditions: string[] = [
      "(u.is_admin = false OR u.is_admin IS NULL)",
      "u.deleted_at IS NULL",
    ];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(lower(u.email) LIKE $${params.length} OR lower(u.full_name) LIKE $${params.length})`);
    }
    if (plan) {
      params.push(plan);
      conditions.push(`u.plan = $${params.length}`);
    }
    if (verified === "true" || verified === "false") {
      conditions.push(`u.email_verified = ${verified === "true"}`);
    }

    const where = conditions.join(" AND ");

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
      params,
    );

    params.push(limit);
    params.push(offset);

    const rows = await query(
      `SELECT
         u.id, u.email, u.full_name, u.plan, u.plan_expires_at,
         u.email_verified, u.created_at,
         (SELECT COUNT(*) FROM telegram_users tu WHERE tu.user_id = u.id)     AS tg_linked,
         (SELECT COUNT(*) FROM vk_integrations vi WHERE vi.user_id = u.id)    AS vk_linked,
         (SELECT COUNT(*) FROM report_schedules rs WHERE rs.user_id = u.id)   AS schedules_count,
         (SELECT COUNT(*) FROM promo_redemptions pr WHERE pr.user_id = u.id)  AS promos_used
       FROM users u
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({
      users: rows.rows,
      total: parseInt(String(countRes.rows[0]?.["total"] ?? "0"), 10),
      page,
      limit,
    });
  } catch (err) {
    logger.error({ err }, "admin list users error");
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params["id"] ?? ""), 10);
    if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }

    const userRes = await query(
      `SELECT id, email, full_name, plan, plan_expires_at, email_verified,
              created_at, last_active_at, birth_date, is_profile_completed,
              organization, phone
       FROM users WHERE id = $1 AND (is_admin = false OR is_admin IS NULL) AND deleted_at IS NULL`,
      [id],
    );
    if (!userRes.rows[0]) { res.status(404).json({ message: "User not found" }); return; }

    const [tgRes, vkRes, schedulesRes, redemptionsRes] = await Promise.all([
      query(
        // telegram_users has one row per user; channels join on user_id (telegram_channels
        // references users.id, not telegram_users.telegram_id).
        `SELECT tu.telegram_id, tu.telegram_username AS username, tu.linked_at,
                array_agg(
                  json_build_object('id', tc.channel_id, 'title', tc.title, 'username', tc.username)
                ) FILTER (WHERE tc.channel_id IS NOT NULL) AS channels
         FROM telegram_users tu
         LEFT JOIN telegram_channels tc ON tc.user_id = tu.user_id
         WHERE tu.user_id = $1
         GROUP BY tu.telegram_id, tu.telegram_username, tu.linked_at`,
        [id],
      ),
      query(
        `SELECT vi.id, vi.created_at AS linked_at,
                array_agg(
                  json_build_object('id', vc.community_id, 'name', vc.name, 'screen_name', vc.screen_name, 'active', vc.is_active)
                ) FILTER (WHERE vc.community_id IS NOT NULL) AS communities
         FROM vk_integrations vi
         LEFT JOIN vk_communities vc ON vc.vk_integration_id = vi.id
         WHERE vi.user_id = $1
         GROUP BY vi.id, vi.created_at`,
        [id],
      ),
      query(
        `SELECT rs.id, rs.title AS name, rs.format, rs.enabled, rs.created_at, rs.next_send_at
         FROM report_schedules rs
         WHERE rs.user_id = $1
         ORDER BY rs.created_at DESC`,
        [id],
      ),
      query(
        `SELECT pr.redeemed_at, pc.code, pc.grants_plan, pc.grants_duration_days
         FROM promo_redemptions pr
         JOIN promo_codes pc ON pc.code = pr.code
         WHERE pr.user_id = $1
         ORDER BY pr.redeemed_at DESC`,
        [id],
      ),
    ]);

    res.json({
      user: userRes.rows[0],
      telegram:    tgRes.rows,
      vk:          vkRes.rows,
      schedules:   schedulesRes.rows,
      redemptions: redemptionsRes.rows,
    });
  } catch (err) {
    logger.error({ err }, "admin get user error");
    res.status(500).json({ message: "Internal server error" });
  }
};

const patchPlanSchema = z.object({
  plan:           z.enum(["free", "pro", "agency", "ultimate"]),
  plan_expires_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export const patchUserPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params["id"] ?? ""), 10);
    if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }

    const parsed = patchPlanSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ errors: parsed.error.flatten() }); return; }

    const { plan, plan_expires_at } = parsed.data;

    const result = await query(
      `UPDATE users SET plan = $1, plan_expires_at = $2
       WHERE id = $3 AND (is_admin = false OR is_admin IS NULL) AND deleted_at IS NULL
       RETURNING id, email, plan, plan_expires_at`,
      [plan, plan_expires_at ?? null, id],
    );

    if (!result.rows[0]) { res.status(404).json({ message: "User not found" }); return; }

    const adminId = (req as Request & { user?: { id: number } }).user!.id;
    await audit(adminId, "user.plan_change", "user", String(id), {
      plan,
      plan_expires_at: plan_expires_at ?? null,
    });

    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "admin patch user plan error");
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyUserEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params["id"] ?? ""), 10);
    if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }

    const result = await query(
      `UPDATE users
       SET email_verified = true,
           email_verification_token = NULL,
           email_verification_expires_at = NULL
       WHERE id = $1 AND (is_admin = false OR is_admin IS NULL) AND deleted_at IS NULL
       RETURNING id, email, email_verified`,
      [id],
    );

    if (!result.rows[0]) { res.status(404).json({ message: "User not found" }); return; }

    const adminId = (req as Request & { user?: { id: number } }).user!.id;
    await audit(adminId, "user.verify_email", "user", String(id), {
      email: result.rows[0]["email"],
    });

    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "admin verify email error");
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params["id"] ?? ""), 10);
    if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }

    const adminId = (req as Request & { user?: { id: number } }).user!.id;
    if (id === adminId) {
      res.status(400).json({ message: "Cannot delete your own account" });
      return;
    }

    // Soft-delete: tombstone + anonymize PII, but keep the row so FK references in
    // reports / promo_redemptions / payments stay intact. Refuse to delete admins.
    const result = await query(
      `UPDATE users
       SET deleted_at = NOW(),
           email = 'deleted+' || id || '@deleted.local',
           full_name = NULL,
           phone = NULL,
           organization = NULL,
           email_verification_token = NULL
       WHERE id = $1 AND (is_admin = false OR is_admin IS NULL) AND deleted_at IS NULL
       RETURNING id`,
      [id],
    );

    if (!result.rows[0]) { res.status(404).json({ message: "User not found or already deleted" }); return; }

    // Invalidate sessions: drop refresh tokens so the account cannot stay signed in.
    await query("DELETE FROM refresh_tokens WHERE user_id = $1", [id]).catch(() => {});

    await audit(adminId, "user.delete", "user", String(id), { soft: true });

    res.json({ ok: true, id });
  } catch (err) {
    logger.error({ err }, "admin delete user error");
    res.status(500).json({ message: "Internal server error" });
  }
};

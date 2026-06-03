import { Request, Response } from "express";
import { pool } from "../db";
import { logger } from "../lib/logger";

export const redeemPromo = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { code } = req.body as { code?: string };
  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return res.status(400).json({ message: "code required" });
  }
  const normalizedCode = code.trim().toUpperCase();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Try to record redemption — ON CONFLICT DO NOTHING = idempotent
    const insertResult = await client.query<{ user_id: number }>(
      `INSERT INTO promo_redemptions (code, user_id)
       VALUES ($1, $2)
       ON CONFLICT (code, user_id) DO NOTHING
       RETURNING user_id`,
      [normalizedCode, userId]
    );

    // 2. Already redeemed by this user
    if (insertResult.rowCount === 0) {
      const userRow = await client.query<{ plan: string; plan_expires_at: string | null }>(
        "SELECT plan, plan_expires_at FROM users WHERE id = $1",
        [userId]
      );
      await client.query("COMMIT");
      return res.json({
        already: true,
        plan: userRow.rows[0]?.plan ?? "free",
        plan_expires_at: userRow.rows[0]?.plan_expires_at ?? null,
      });
    }

    // 3. Atomically consume one use (race-safe via WHERE)
    const promoResult = await client.query<{ grants_plan: string; grants_duration_days: number | null }>(
      `UPDATE promo_codes
       SET used_count = used_count + 1
       WHERE code = $1
         AND active = TRUE
         AND used_count < max_uses
         AND (expires_at IS NULL OR expires_at > NOW())
       RETURNING grants_plan, grants_duration_days`,
      [normalizedCode]
    );

    if (promoResult.rowCount === 0 || !promoResult.rows[0]) {
      // Code exhausted, expired, or inactive — undo the redemption insert
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "code_invalid" });
    }

    const grants_plan         = promoResult.rows[0].grants_plan;
    const grants_duration_days = promoResult.rows[0].grants_duration_days;

    // 4. Update user plan
    const updateSql = grants_duration_days
      ? `UPDATE users SET plan = $2, plan_expires_at = NOW() + ($1 || ' days')::interval WHERE id = $3 RETURNING plan, plan_expires_at`
      : `UPDATE users SET plan = $1, plan_expires_at = NULL WHERE id = $2 RETURNING plan, plan_expires_at`;

    const params: unknown[] = grants_duration_days
      ? [grants_duration_days.toString(), grants_plan, userId]
      : [grants_plan, userId];

    const userResult = await client.query<{ plan: string; plan_expires_at: string | null }>(
      updateSql,
      params
    );

    if (!userResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(500).json({ message: "Internal server error" });
    }

    await client.query("COMMIT");

    logger.info({ userId, code: normalizedCode, grants_plan }, "Promo redeemed");
    return res.json({
      plan: userResult.rows[0].plan,
      plan_expires_at: userResult.rows[0].plan_expires_at,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "REDEEM PROMO ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

import { Request, Response } from "express";
import { z } from "zod";
import { pool, query } from "../../db";
import { logger } from "../../lib/logger";
import { audit } from "../../lib/audit";

const PLANS = ["free", "pro", "agency", "ultimate"] as const;

/* ---- helpers ---- */
function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `METRIQ-${seg(4)}-${seg(4)}`;
}

/* ---- LIST ---- */
export const listPromos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT
        code,
        label,
        grants_plan,
        grants_duration_days,
        max_uses,
        used_count,
        max_uses - used_count          AS remaining,
        active,
        expires_at,
        created_at,
        created_by,
        CASE
          WHEN NOT active                                              THEN 'disabled'
          WHEN used_count >= max_uses                                  THEN 'exhausted'
          WHEN expires_at IS NOT NULL AND expires_at <= NOW()          THEN 'expired'
          ELSE 'active'
        END                            AS status
      FROM promo_codes
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error({ err }, "admin listPromos error");
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ---- REDEMPTIONS for a code ---- */
export const getRedemptions = async (req: Request, res: Response): Promise<void> => {
  const code = String(req.params["code"] ?? "").toUpperCase();
  try {
    const result = await query(`
      SELECT r.user_id, u.email, r.redeemed_at
      FROM promo_redemptions r
      JOIN users u ON u.id = r.user_id
      WHERE r.code = $1
      ORDER BY r.redeemed_at DESC
    `, [code]);
    res.json(result.rows);
  } catch (err) {
    logger.error({ err }, "admin getRedemptions error");
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ---- CREATE ---- */
const createSchema = z.object({
  code:                 z.string().min(3).max(40).optional(),
  label:                z.string().max(120).optional(),
  grants_plan:          z.enum(PLANS),
  grants_duration_days: z.number().int().positive().optional().nullable(),
  max_uses:             z.number().int().positive().max(100_000),
  expires_at:           z.string().datetime().optional().nullable(),
});

export const createPromo = async (req: Request, res: Response): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }

  const adminId = req.user!.id;
  const { label, grants_plan, grants_duration_days, max_uses, expires_at } = parsed.data;
  const code = (parsed.data.code ?? randomCode()).trim().toUpperCase();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      INSERT INTO promo_codes (code, label, grants_plan, grants_duration_days, max_uses, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *,
        max_uses - used_count AS remaining,
        'active' AS status
    `, [code, label ?? null, grants_plan, grants_duration_days ?? null, max_uses, expires_at ?? null, adminId]);

    await client.query("COMMIT");
    await audit(adminId, "promo.create", "promo", code, { grants_plan, max_uses, expires_at });
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "23505") {
      res.status(409).json({ message: "Code already exists" });
      return;
    }
    logger.error({ err }, "admin createPromo error");
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

/* ---- PATCH ---- */
const patchSchema = z.object({
  active:     z.boolean().optional(),
  max_uses:   z.number().int().positive().max(100_000).optional(),
  expires_at: z.string().datetime().optional().nullable(),
  label:      z.string().max(120).optional().nullable(),
});

export const patchPromo = async (req: Request, res: Response): Promise<void> => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }

  const adminId = req.user!.id;
  const code = String(req.params["code"] ?? "").toUpperCase();
  const updates = parsed.data;

  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (updates.active     !== undefined) { sets.push(`active = $${idx++}`);     params.push(updates.active); }
  if (updates.max_uses   !== undefined) { sets.push(`max_uses = $${idx++}`);   params.push(updates.max_uses); }
  if ("expires_at" in updates)          { sets.push(`expires_at = $${idx++}`); params.push(updates.expires_at ?? null); }
  if ("label" in updates)               { sets.push(`label = $${idx++}`);      params.push(updates.label ?? null); }

  if (sets.length === 0) {
    res.status(400).json({ message: "Nothing to update" });
    return;
  }

  params.push(code);
  try {
    const result = await query(
      `UPDATE promo_codes SET ${sets.join(", ")} WHERE code = $${idx}
       RETURNING *,
         max_uses - used_count AS remaining,
         CASE
           WHEN NOT active                                     THEN 'disabled'
           WHEN used_count >= max_uses                         THEN 'exhausted'
           WHEN expires_at IS NOT NULL AND expires_at <= NOW() THEN 'expired'
           ELSE 'active'
         END                   AS status`,
      params
    );
    if (result.rowCount === 0) {
      res.status(404).json({ message: "Promo not found" });
      return;
    }
    await audit(adminId, "promo.patch", "promo", code, updates as Record<string, unknown>);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "admin patchPromo error");
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ---- DELETE ---- */
export const deletePromo = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user!.id;
  const code = String(req.params["code"] ?? "").toUpperCase();

  try {
    const check = await query(
      "SELECT used_count FROM promo_codes WHERE code = $1",
      [code]
    );
    if (check.rowCount === 0) {
      res.status(404).json({ message: "Promo not found" });
      return;
    }
    if ((check.rows[0] as { used_count: number }).used_count > 0) {
      res.status(409).json({ message: "has_redemptions — disable instead" });
      return;
    }
    await query("DELETE FROM promo_codes WHERE code = $1", [code]);
    await audit(adminId, "promo.delete", "promo", code);
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "admin deletePromo error");
    res.status(500).json({ message: "Internal server error" });
  }
};

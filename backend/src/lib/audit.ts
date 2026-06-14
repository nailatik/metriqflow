import { query } from "../db";
import { logger } from "./logger";

export async function audit(
  adminId: number,
  action: string,
  targetType?: string,
  targetId?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, targetType ?? null, targetId ?? null, meta ? meta : null]
    );
  } catch (err) {
    logger.error({ err, action, adminId }, "audit log write failed");
  }
}

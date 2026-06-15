import { Request, Response } from "express";
import { query } from "../../db";
import { logger } from "../../lib/logger";

export const getAuditLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt(String(req.query["page"]   ?? "1"), 10));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query["limit"] ?? "50"), 10)));
    const action = String(req.query["action"] ?? "").trim();
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (action) {
      params.push(`${action}%`);
      conditions.push(`aal.action LIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM admin_audit_log aal ${where}`,
      params,
    );

    params.push(limit);
    params.push(offset);

    const rows = await query(
      `SELECT
         aal.id, aal.action, aal.target_type, aal.target_id, aal.meta, aal.created_at,
         u.email AS admin_email
       FROM admin_audit_log aal
       JOIN users u ON u.id = aal.admin_id
       ${where}
       ORDER BY aal.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({
      events: rows.rows,
      total:  parseInt(String(countRes.rows[0]?.["total"] ?? "0"), 10),
      page,
      limit,
    });
  } catch (err) {
    logger.error({ err }, "admin audit log error");
    res.status(500).json({ message: "Internal server error" });
  }
};

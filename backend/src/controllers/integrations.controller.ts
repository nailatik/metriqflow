import { Request, Response } from "express";
// req.user is available via global Express namespace augmentation in types/express.d.ts
import crypto from "crypto";
import { query } from "../db";

export const generateTelegramToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Return existing valid token if one exists
    const existing = await query(
      `SELECT token, expires_at FROM telegram_link_tokens
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0] as { token: string; expires_at: Date };
      return res.json({ token: row.token, expiresAt: row.expires_at });
    }

    // Clean up expired / used tokens for this user
    await query(
      `DELETE FROM telegram_link_tokens
       WHERE user_id = $1 AND (used_at IS NOT NULL OR expires_at <= NOW())`,
      [userId]
    );

    const token    = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await query(
      `INSERT INTO telegram_link_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    return res.json({ token, expiresAt });
  } catch (err) {
    console.error("TELEGRAM TOKEN ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const unlinkTelegram = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await query("DELETE FROM telegram_users WHERE user_id = $1", [userId]);
    // Invalidate any pending tokens too
    await query(
      "DELETE FROM telegram_link_tokens WHERE user_id = $1",
      [userId]
    );

    return res.json({ message: "Unlinked" });
  } catch (err) {
    console.error("UNLINK ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getTelegramStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await query(
      `SELECT tu.telegram_id, tu.telegram_username, tu.first_name, tu.linked_at
       FROM telegram_users tu
       WHERE tu.user_id = $1`,
      [userId]
    );

    const linked = result.rows[0] ?? null;
    return res.json({ linked: !!linked, account: linked });
  } catch (err) {
    console.error("TELEGRAM STATUS ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

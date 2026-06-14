import { query } from "../db";
import { logger } from "./logger";

export async function seedAdmins(): Promise<void> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) return;

  try {
    const result = await query(
      `UPDATE users SET is_admin = true WHERE lower(email) = ANY($1::text[])`,
      [emails]
    );
    if ((result.rowCount ?? 0) > 0) {
      logger.info({ emails, count: result.rowCount }, "Admin users seeded");
    }
  } catch (err) {
    logger.error({ err }, "seedAdmins failed");
  }
}

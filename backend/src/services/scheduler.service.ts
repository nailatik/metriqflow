import cron from "node-cron";
import path from "path";
import fs from "fs";
import { query, pool } from "../db";
import { sendReportViaTelegram, sendReportViaEmail, sendPostToChannel } from "./delivery.service";
import { logger } from "../lib/logger";

// Reuse generators from reports controller by importing shared logic
import { generateScheduledReport } from "../controllers/reports.controller";

type ScheduleRow = {
  id: number;
  user_id: number;
  title: string;
  source: string;
  format: string;
  frequency_days: number;
  locale: string;
  send_hour: number;
  timezone: string;
};

type ChannelRow = {
  channel: string;
  email: string | null;
  enabled: boolean;
};

type UserRow = {
  email: string;
  telegram_id: number | null;
};

// Keep the cron task references so we can stop them during graceful shutdown.
let schedulerTask: ReturnType<typeof cron.schedule> | null = null;
let postingTask:   ReturnType<typeof cron.schedule> | null = null;

export function startScheduler(): void {
  if (schedulerTask) return; // idempotent — protects against double-start
  // Run every minute
  schedulerTask = cron.schedule("* * * * *", async () => {
    try {
      const due = await query(
        `SELECT id, user_id, title, source, format, frequency_days, locale, send_hour, timezone
         FROM report_schedules
         WHERE enabled = TRUE AND paused = FALSE AND next_send_at <= NOW()
         LIMIT 20`,
        []
      );

      for (const sched of due.rows as ScheduleRow[]) {
        await processSchedule(sched).catch((err) => {
          logger.error({ err }, `SCHEDULER: failed schedule ${sched.id}:`);
        });
      }
    } catch (err) {
      logger.error({ err }, "SCHEDULER TICK ERROR:");
    }
  });

  postingTask = cron.schedule("* * * * *", async () => {
    try {
      await processContentPosts();
    } catch (err) {
      logger.error({ err }, "POSTING TICK ERROR:");
    }
  });

  logger.info("📅 Report scheduler started");
  logger.info("📤 Content posting scheduler started");
}

export function stopScheduler(): void {
  if (schedulerTask) { schedulerTask.stop(); schedulerTask = null; }
  if (postingTask)   { postingTask.stop();   postingTask   = null; }
  logger.info("📅 Schedulers stopped");
}

// ─── Content post auto-publisher ─────────────────────────────────────────────

type PlannedPostRow = {
  id: number;
  platform: "tg" | "vk";
  channel_id: string;
  text: string;
  media_urls: string[];
};

async function processContentPosts(): Promise<void> {
  const due = await query(
    `UPDATE planned_posts
     SET status = 'sending', updated_at = NOW()
     WHERE id IN (
       SELECT id FROM planned_posts
       WHERE status = 'scheduled' AND scheduled_at <= NOW()
       LIMIT 10
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, platform, channel_id, text, media_urls`,
    []
  );
  if (due.rowCount === 0) return;

  for (const post of due.rows as PlannedPostRow[]) {
    await publishPost(post).catch((err) => {
      logger.error({ err }, `POSTING: failed post ${post.id}`);
    });
  }
}

async function publishPost(post: PlannedPostRow): Promise<void> {
  if (post.platform === "vk") {
    // VK OAuth is disabled since 2024-06-25 — service token cannot post
    await query(
      `UPDATE planned_posts SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
      ["VK auto-posting not yet supported", post.id]
    );
    return;
  }

  try {
    await sendPostToChannel(post.channel_id, post.text, post.media_urls ?? []);
    await query(
      `UPDATE planned_posts SET status = 'sent', sent_at = NOW(), error_message = NULL, updated_at = NOW() WHERE id = $1`,
      [post.id]
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await query(
      `UPDATE planned_posts SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
      [msg, post.id]
    );
    logger.error({ err }, `POSTING: TG send failed for post ${post.id}`);
  }
}

async function processSchedule(sched: ScheduleRow): Promise<void> {
  // Lock this schedule row to prevent double-processing
  // Advance next_send_at by frequency_days at the same send_hour in the stored timezone
  const lock = await query(
    `UPDATE report_schedules
     SET next_send_at = (
           DATE_TRUNC('day', NOW() AT TIME ZONE $1) +
           make_interval(days => $2::int) +
           make_interval(hours => $3::int)
         ) AT TIME ZONE $1,
         last_sent_at = NOW(),
         last_status  = 'pending'
     WHERE id = $4 AND next_send_at <= NOW()
     RETURNING id`,
    [sched.timezone, sched.frequency_days, sched.send_hour, sched.id]
  );
  if (lock.rowCount === 0) return; // Already processed by another instance

  const channels = await query(
    "SELECT channel, email, enabled FROM schedule_channels WHERE schedule_id = $1 AND enabled = TRUE",
    [sched.id]
  );
  if (channels.rows.length === 0) {
    await query("UPDATE report_schedules SET last_status = 'no_channels' WHERE id = $1", [sched.id]);
    return;
  }

  // Get user info
  const userResult = await query(
    `SELECT u.email, tu.telegram_id
     FROM users u
     LEFT JOIN telegram_users tu ON tu.user_id = u.id
     WHERE u.id = $1`,
    [sched.user_id]
  );
  if (userResult.rows.length === 0) return;
  const user = userResult.rows[0] as UserRow;

  // Generate the file
  let filePath: string;
  let reportId: number;
  try {
    const result = await generateScheduledReport(
      sched.user_id,
      sched.source as "all" | "telegram" | "vk",
      sched.format as "csv" | "pdf" | "xml",
      sched.frequency_days,
      sched.title,
      sched.locale,
      sched.id
    );
    filePath = result.filePath;
    reportId = result.reportId;
  } catch (err) {
    await query("UPDATE report_schedules SET last_status = 'failed' WHERE id = $1", [sched.id]);
    throw err;
  }

  const filename = `${sched.title.replace(/[^a-zA-Z0-9_\-\.А-ЯЁа-яё]/g, "_")}.${sched.format}`;
  const isRu = sched.locale === "ru";

  let delivered = 0;

  for (const ch of channels.rows as ChannelRow[]) {
    try {
      if (ch.channel === "telegram" && user.telegram_id) {
        const caption = isRu
          ? `📊 <b>Авторепорт готов</b>\n${sched.title}`
          : `📊 <b>Scheduled report ready</b>\n${sched.title}`;
        await sendReportViaTelegram(user.telegram_id, filePath, filename, caption);
        delivered++;
      } else if (ch.channel === "email") {
        const emailTo = ch.email ?? user.email;
        const subject = isRu ? `MetriqFlow: ${sched.title}` : `MetriqFlow report: ${sched.title}`;
        const body = isRu
          ? `<p>Ваш авторепорт готов: <b>${sched.title}</b></p><p>Период: последние ${sched.frequency_days} дней.</p>`
          : `<p>Your scheduled report is ready: <b>${sched.title}</b></p><p>Period: last ${sched.frequency_days} days.</p>`;
        await sendReportViaEmail(emailTo, filePath, filename, subject, body);
        delivered++;
      }
    } catch (err) {
      logger.error({ err }, `SCHEDULER: delivery via ${ch.channel} failed for schedule ${sched.id}:`);
    }
  }

  await query(
    "UPDATE report_schedules SET last_status = $1 WHERE id = $2",
    [delivered > 0 ? "delivered" : "failed", sched.id]
  );
}

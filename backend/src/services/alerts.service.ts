import cron from "node-cron";
import { query } from "../db";
import { logger } from "../lib/logger";
import { generateAlertCopy } from "./ai.service";
import { sendTelegramMessage, sendAlertEmail } from "./delivery.service";

const DEAD_AFTER_DAYS = 60;
const ALERT_COOLDOWN_DAYS = 7;
const REENGAGEMENT_COOLDOWN_DAYS = 30;

const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://metriqflow.com";

let alertTask: ReturnType<typeof cron.schedule> | null = null;

export function startAlertScheduler(): void {
  if (alertTask) return;
  alertTask = cron.schedule("0 9 * * 1", async () => {
    logger.info("ALERTS: weekly run starting");
    try {
      await runAlerts();
    } catch (err) {
      logger.error({ err }, "ALERTS: weekly run failed");
    }
  });
  logger.info("🔔 Alert scheduler started");
}

export function stopAlertScheduler(): void {
  if (!alertTask) return;
  alertTask.stop();
  alertTask = null;
  logger.info("🔔 Alert scheduler stopped");
}

async function runAlerts(): Promise<void> {
  const usersResult = await query(
    `SELECT
       u.id,
       u.email,
       u.last_active_at,
       tu.telegram_id,
       COALESCE(
         (SELECT locale FROM report_schedules WHERE user_id = u.id ORDER BY id DESC LIMIT 1),
         'ru'
       ) AS locale
     FROM users u
     LEFT JOIN telegram_users tu ON tu.user_id = u.id
     WHERE u.alerts_enabled = TRUE`,
    []
  );

  for (const user of usersResult.rows as AlertUser[]) {
    await processUser(user).catch((err) => {
      logger.error({ err, userId: user.id }, "ALERTS: processUser failed");
    });
  }
}

type AlertUser = {
  id: number;
  email: string;
  last_active_at: Date | null;
  telegram_id: number | null;
  locale: string;
};

async function processUser(user: AlertUser): Promise<void> {
  const isDead =
    !user.last_active_at ||
    user.last_active_at < new Date(Date.now() - DEAD_AFTER_DAYS * 86_400_000);

  if (isDead) {
    await handleDeadUser(user);
  } else {
    await handleActiveUser(user);
  }
}

async function handleDeadUser(user: AlertUser): Promise<void> {
  const cooldown = await query(
    `SELECT 1 FROM alert_log
     WHERE user_id = $1 AND kind = 'reengagement'
       AND sent_at > NOW() - (INTERVAL '1 day' * $2)
     LIMIT 1`,
    [user.id, REENGAGEMENT_COOLDOWN_DAYS]
  );
  if ((cooldown.rowCount ?? 0) > 0) return;

  const isRu = user.locale !== "en";
  const subject = isRu
    ? "Вы давно не заглядывали в MetriqFlow"
    : "It's been a while — your channels miss you";
  const bodyHtml = isRu ? reengagementHtmlRu(user.email) : reengagementHtmlEn(user.email);

  await deliver(user, subject, bodyHtml);

  await query(
    "INSERT INTO alert_log (user_id, channel_pk, kind) VALUES ($1, NULL, 'reengagement')",
    [user.id]
  );
  logger.info({ userId: user.id }, "ALERTS: reengagement sent");
}

async function handleActiveUser(user: AlertUser): Promise<void> {
  const channelsResult = await query(
    "SELECT id, channel_id, title FROM telegram_channels WHERE user_id = $1 AND is_active = TRUE",
    [user.id]
  );

  for (const ch of channelsResult.rows as ChannelRow[]) {
    await processChannel(user, ch).catch((err) => {
      logger.error({ err, userId: user.id, channelPk: ch.id }, "ALERTS: channel alert failed");
    });
  }
}

type ChannelRow = { id: number; channel_id: string; title: string };

async function processChannel(user: AlertUser, ch: ChannelRow): Promise<void> {
  const cooldown = await query(
    `SELECT 1 FROM alert_log
     WHERE channel_pk = $1 AND kind IN ('drop', 'ok')
       AND sent_at > NOW() - (INTERVAL '1 day' * $2)
     LIMIT 1`,
    [ch.id, ALERT_COOLDOWN_DAYS]
  );
  if ((cooldown.rowCount ?? 0) > 0) return;

  const erResult = await query(
    `WITH
       cur AS (
         SELECT
           COUNT(*)::int AS post_count,
           COALESCE(AVG(CASE WHEN views > 0
             THEN (reactions_total + forwards)::float / views * 100 ELSE 0 END), 0) AS er
         FROM telegram_posts
         WHERE channel_id = $1 AND posted_at >= NOW() - INTERVAL '7 days'
       ),
       prev AS (
         SELECT
           COUNT(*)::int AS post_count,
           COALESCE(AVG(CASE WHEN views > 0
             THEN (reactions_total + forwards)::float / views * 100 ELSE 0 END), 0) AS er
         FROM telegram_posts
         WHERE channel_id = $1
           AND posted_at >= NOW() - INTERVAL '14 days'
           AND posted_at <  NOW() - INTERVAL '7 days'
       )
     SELECT cur.er AS cur_er, cur.post_count AS cur_posts,
            prev.er AS prev_er, prev.post_count AS prev_posts
     FROM cur, prev`,
    [ch.channel_id]
  );

  if (erResult.rows.length === 0) return;
  const { cur_er, cur_posts, prev_er, prev_posts } = erResult.rows[0] as {
    cur_er: number; cur_posts: number; prev_er: number; prev_posts: number;
  };

  if (prev_posts < 2 || cur_posts < 1) return;

  const dropPct = prev_er > 0 ? ((prev_er - cur_er) / prev_er) * 100 : 0;
  const kind: "drop" | "ok" = dropPct > 20 ? "drop" : "ok";

  let subject: string;
  let bodyHtml: string;
  try {
    const copy = await generateAlertCopy({
      locale:       user.locale as "ru" | "en",
      channelTitle: ch.title,
      curER:        cur_er,
      prevER:       prev_er,
      dropPct:      kind === "drop" ? dropPct : null,
      kind,
    });
    subject  = copy.subject;
    bodyHtml = appendAnalyticsLink(copy.bodyHtml, user.locale);
  } catch (err) {
    logger.warn({ err, channelPk: ch.id }, "ALERTS: AI copy failed, using template");
    const isRu = user.locale !== "en";
    ({ subject, bodyHtml } =
      kind === "drop"
        ? fallbackDropTemplate(ch.title, cur_er, prev_er, dropPct, isRu)
        : fallbackOkTemplate(ch.title, cur_er, isRu));
  }

  await deliver(user, subject, bodyHtml);

  await query(
    `INSERT INTO alert_log (user_id, channel_pk, kind, cur_er, prev_er, drop_pct)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, ch.id, kind, cur_er, prev_er, kind === "drop" ? dropPct : null]
  );
  logger.info({ userId: user.id, channelPk: ch.id, kind, dropPct }, "ALERTS: sent");
}

async function deliver(user: AlertUser, subject: string, bodyHtml: string): Promise<void> {
  if (user.telegram_id) {
    await sendTelegramMessage(user.telegram_id, `<b>${subject}</b>\n\n${stripToTg(bodyHtml)}`);
  } else {
    await sendAlertEmail(user.email, subject, bodyHtml);
  }
}

function appendAnalyticsLink(bodyHtml: string, locale: string): string {
  const isRu = locale !== "en";
  const href = `${FRONTEND_URL}/${isRu ? "ru" : "en"}/app/analytics`;
  const linkHtml = isRu
    ? `<p><a href="${href}" style="color:#6366f1">Открыть аналитику →</a></p>`
    : `<p><a href="${href}" style="color:#6366f1">Open analytics →</a></p>`;
  return bodyHtml.replace(/(<p style="color:#888[^"]*">— MetriqFlow<\/p>)/, `${linkHtml}$1`);
}

function stripToTg(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Templates ──────────────────────────────────────────────────────────────────

function fallbackDropTemplate(
  title: string, curER: number, prevER: number, dropPct: number, isRu: boolean
): { subject: string; bodyHtml: string } {
  const locale = isRu ? "ru" : "en";
  const href   = `${FRONTEND_URL}/${locale}/app/analytics`;
  if (isRu) {
    return {
      subject: `⚠️ Вовлечённость «${title}» упала на ${Math.round(dropPct)}%`,
      bodyHtml: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#f59e0b">⚠️ Снижение вовлечённости</h2>
        <p>За последние 7 дней вовлечённость канала <b>${title}</b> снизилась с
          <b>${prevER.toFixed(1)}%</b> до <b>${curER.toFixed(1)}%</b> (−${Math.round(dropPct)}%).</p>
        <p>Проверьте частоту и формат публикаций — именно там чаще всего кроется причина.</p>
        <p><a href="${href}" style="color:#6366f1">Открыть аналитику →</a></p>
        <p style="color:#888;font-size:13px">— MetriqFlow</p>
      </div>`,
    };
  }
  return {
    subject: `⚠️ Engagement for «${title}» dropped ${Math.round(dropPct)}%`,
    bodyHtml: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#f59e0b">⚠️ Engagement drop detected</h2>
      <p>Over the last 7 days, engagement for <b>${title}</b> fell from
        <b>${prevER.toFixed(1)}%</b> to <b>${curER.toFixed(1)}%</b> (−${Math.round(dropPct)}%).</p>
      <p>Review posting frequency and content format — that's usually where the answer is.</p>
      <p><a href="${href}" style="color:#6366f1">Open analytics →</a></p>
      <p style="color:#888;font-size:13px">— MetriqFlow</p>
    </div>`,
  };
}

function fallbackOkTemplate(
  title: string, curER: number, isRu: boolean
): { subject: string; bodyHtml: string } {
  const locale = isRu ? "ru" : "en";
  const href   = `${FRONTEND_URL}/${locale}/app/analytics`;
  if (isRu) {
    return {
      subject: `✅ «${title}» — вовлечённость в норме`,
      bodyHtml: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#22c55e">✅ Отличные результаты!</h2>
        <p>Вовлечённость канала <b>${title}</b> за последние 7 дней — <b>${curER.toFixed(1)}%</b>.</p>
        <p>Значительного падения нет. Продолжайте в том же духе!</p>
        <p><a href="${href}" style="color:#6366f1">Открыть аналитику →</a></p>
        <p style="color:#888;font-size:13px">— MetriqFlow</p>
      </div>`,
    };
  }
  return {
    subject: `✅ «${title}» — engagement is looking good`,
    bodyHtml: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#22c55e">✅ Great results!</h2>
      <p>Engagement for <b>${title}</b> over the last 7 days: <b>${curER.toFixed(1)}%</b>.</p>
      <p>No significant drop detected. Keep it up!</p>
      <p><a href="${href}" style="color:#6366f1">Open analytics →</a></p>
      <p style="color:#888;font-size:13px">— MetriqFlow</p>
    </div>`,
  };
}

function reengagementHtmlRu(email: string): string {
  const href = `${FRONTEND_URL}/ru/app/analytics`;
  const settingsHref = `${FRONTEND_URL}/ru/app/settings`;
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
    <h2 style="color:#6366f1">Ваши каналы скучают по вам!</h2>
    <p>Кажется, вы давно не заглядывали в MetriqFlow. А между тем, ваши социальные сети продолжают работать — и там накопилось немало интересного.</p>
    <p>Загляните в аналитику — возможно, именно сейчас подходящий момент для нового рывка.</p>
    <a href="${href}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
      Посмотреть аналитику
    </a>
    <p style="color:#888;font-size:13px">Вы получаете это письмо как пользователь MetriqFlow (${email}). Отключить уведомления — в <a href="${settingsHref}" style="color:#6366f1">настройках</a>.</p>
  </div>`;
}

function reengagementHtmlEn(email: string): string {
  const href = `${FRONTEND_URL}/en/app/analytics`;
  const settingsHref = `${FRONTEND_URL}/en/app/settings`;
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
    <h2 style="color:#6366f1">Your channels miss you!</h2>
    <p>It looks like you haven't checked MetriqFlow in a while. Your social channels have been active — there's plenty to catch up on.</p>
    <p>Take a look at your analytics — this might be the perfect moment for a fresh push.</p>
    <a href="${href}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
      View analytics
    </a>
    <p style="color:#888;font-size:13px">You're receiving this as a MetriqFlow user (${email}). Manage alerts in your <a href="${settingsHref}" style="color:#6366f1">settings</a>.</p>
  </div>`;
}

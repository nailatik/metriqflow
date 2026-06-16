import cron from "node-cron";
import { query } from "../db";
import { logger } from "../lib/logger";
import { generateAlertCopy } from "./ai.service";
import { sendTelegramMessage, sendAlertEmail, brandedEmail } from "./delivery.service";

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

export async function triggerAlertsRun(forUserId?: number, force = false): Promise<void> {
  return runAlerts(forUserId, force);
}

async function runAlerts(forUserId?: number, force = false): Promise<void> {
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
     WHERE u.alerts_enabled = TRUE
       ${forUserId !== undefined ? "AND u.id = $1" : ""}`,
    forUserId !== undefined ? [forUserId] : []
  );

  for (const user of usersResult.rows as AlertUser[]) {
    await processUser(user, force).catch((err) => {
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

async function processUser(user: AlertUser, force = false): Promise<void> {
  const isDead =
    !user.last_active_at ||
    user.last_active_at < new Date(Date.now() - DEAD_AFTER_DAYS * 86_400_000);

  if (isDead && !force) {
    await handleDeadUser(user);
  } else {
    await handleActiveUser(user, force);
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
    ? "Вы давно не заглядывали в Metriq Flow"
    : "It's been a while — your channels miss you";
  const bodyHtml = isRu ? reengagementHtmlRu(user.email) : reengagementHtmlEn(user.email);

  await deliver(user, subject, bodyHtml);

  await query(
    "INSERT INTO alert_log (user_id, channel_pk, kind) VALUES ($1, NULL, 'reengagement')",
    [user.id]
  );
  logger.info({ userId: user.id }, "ALERTS: reengagement sent");
}

async function handleActiveUser(user: AlertUser, force = false): Promise<void> {
  const channelsResult = await query(
    "SELECT id, channel_id, title FROM telegram_channels WHERE user_id = $1 AND is_active = TRUE",
    [user.id]
  );

  for (const ch of channelsResult.rows as ChannelRow[]) {
    await processChannel(user, ch, force).catch((err) => {
      logger.error({ err, userId: user.id, channelPk: ch.id }, "ALERTS: channel alert failed");
    });
  }
}

type ChannelRow = { id: number; channel_id: string; title: string };

async function processChannel(user: AlertUser, ch: ChannelRow, force = false): Promise<void> {
  if (!force) {
    const cooldown = await query(
      `SELECT 1 FROM alert_log
       WHERE channel_pk = $1 AND kind IN ('drop', 'ok')
         AND sent_at > NOW() - (INTERVAL '1 day' * $2)
       LIMIT 1`,
      [ch.id, ALERT_COOLDOWN_DAYS]
    );
    if ((cooldown.rowCount ?? 0) > 0) return;
  }

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

  if (!force && (prev_posts < 2 || cur_posts < 1)) return;

  // force mode with no real data: use synthetic values so delivery is testable
  const effectiveCurER  = cur_posts >= 1 ? cur_er  : 3.2;
  const effectivePrevER = prev_posts >= 2 ? prev_er : 8.5;

  const dropPct = effectivePrevER > 0 ? ((effectivePrevER - effectiveCurER) / effectivePrevER) * 100 : 0;
  const kind: "drop" | "ok" = dropPct > 20 ? "drop" : "ok";

  let subject: string;
  let bodyHtml: string;
  try {
    const copy = await generateAlertCopy({
      locale:       user.locale as "ru" | "en",
      channelTitle: ch.title,
      curER:        effectiveCurER,
      prevER:       effectivePrevER,
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
        ? fallbackDropTemplate(ch.title, effectiveCurER, effectivePrevER, dropPct, isRu)
        : fallbackOkTemplate(ch.title, effectiveCurER, isRu));
  }

  await deliver(user, subject, bodyHtml);

  if (!force) {
    await query(
      `INSERT INTO alert_log (user_id, channel_pk, kind, cur_er, prev_er, drop_pct)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, ch.id, kind, effectiveCurER, effectivePrevER, kind === "drop" ? dropPct : null]
    );
  }
  logger.info({ userId: user.id, channelPk: ch.id, kind, dropPct }, "ALERTS: sent");
}

async function deliver(user: AlertUser, subject: string, bodyHtml: string): Promise<void> {
  if (user.telegram_id) {
    // Telegram gets the raw content (no shell) — stripToTg flattens it to text.
    await sendTelegramMessage(user.telegram_id, `<b>${subject}</b>\n\n${stripToTg(bodyHtml)}`);
  } else {
    // Email gets the branded Warm Amber shell wrapped around the same content.
    const html = brandedEmail({
      preheader: subject,
      lang: user.locale === "en" ? "en" : "ru",
      contentHtml: bodyHtml,
    });
    await sendAlertEmail(user.email, subject, html);
  }
}

function appendAnalyticsLink(bodyHtml: string, locale: string): string {
  const isRu = locale !== "en";
  const href = `${FRONTEND_URL}/${isRu ? "ru" : "en"}/app/analytics`;
  const linkHtml = isRu
    ? `<p style="margin:0 0 16px"><a href="${href}" style="color:#B45309;font-weight:600">Открыть аналитику →</a></p>`
    : `<p style="margin:0 0 16px"><a href="${href}" style="color:#B45309;font-weight:600">Open analytics →</a></p>`;
  return bodyHtml.replace(/(<p style="color:#888[^"]*">— Metriq Flow<\/p>)/, `${linkHtml}$1`);
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

// Templates below return CLEAN inner content only (no <html>/font wrapper, no
// footer) — deliver() wraps it in the branded Warm Amber shell for email, and
// stripToTg() flattens it for Telegram. Keep links amber (#B45309), no emoji in
// the body (DESIGN.md: no emoji as icons); subject-line emoji are fine.
function fallbackDropTemplate(
  title: string, curER: number, prevER: number, dropPct: number, isRu: boolean
): { subject: string; bodyHtml: string } {
  const locale = isRu ? "ru" : "en";
  const href   = `${FRONTEND_URL}/${locale}/app/analytics`;
  if (isRu) {
    return {
      subject: `⚠️ Вовлечённость «${title}» упала на ${Math.round(dropPct)}%`,
      bodyHtml: `<h2 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#B45309">Снижение вовлечённости</h2>
        <p style="margin:0 0 14px">За последние 7 дней вовлечённость канала <b>${title}</b> снизилась с <b>${prevER.toFixed(1)}%</b> до <b>${curER.toFixed(1)}%</b> (−${Math.round(dropPct)}%).</p>
        <p style="margin:0 0 16px">Проверьте частоту и формат публикаций — именно там чаще всего кроется причина.</p>
        <p style="margin:0"><a href="${href}" style="color:#B45309;font-weight:600">Открыть аналитику →</a></p>`,
    };
  }
  return {
    subject: `⚠️ Engagement for «${title}» dropped ${Math.round(dropPct)}%`,
    bodyHtml: `<h2 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#B45309">Engagement drop detected</h2>
      <p style="margin:0 0 14px">Over the last 7 days, engagement for <b>${title}</b> fell from <b>${prevER.toFixed(1)}%</b> to <b>${curER.toFixed(1)}%</b> (−${Math.round(dropPct)}%).</p>
      <p style="margin:0 0 16px">Review posting frequency and content format — that's usually where the answer is.</p>
      <p style="margin:0"><a href="${href}" style="color:#B45309;font-weight:600">Open analytics →</a></p>`,
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
      bodyHtml: `<h2 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#15803D">Отличные результаты</h2>
        <p style="margin:0 0 14px">Вовлечённость канала <b>${title}</b> за последние 7 дней — <b>${curER.toFixed(1)}%</b>.</p>
        <p style="margin:0 0 16px">Значительного падения нет. Продолжайте в том же духе!</p>
        <p style="margin:0"><a href="${href}" style="color:#B45309;font-weight:600">Открыть аналитику →</a></p>`,
    };
  }
  return {
    subject: `✅ «${title}» — engagement is looking good`,
    bodyHtml: `<h2 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#15803D">Great results</h2>
      <p style="margin:0 0 14px">Engagement for <b>${title}</b> over the last 7 days: <b>${curER.toFixed(1)}%</b>.</p>
      <p style="margin:0 0 16px">No significant drop detected. Keep it up!</p>
      <p style="margin:0"><a href="${href}" style="color:#B45309;font-weight:600">Open analytics →</a></p>`,
  };
}

function reengagementHtmlRu(email: string): string {
  const href = `${FRONTEND_URL}/ru/app/analytics`;
  const settingsHref = `${FRONTEND_URL}/ru/app/settings`;
  return `<h2 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#1C1917">Ваши каналы скучают по вам</h2>
    <p style="margin:0 0 14px">Кажется, вы давно не заглядывали в Metriq&nbsp;Flow. А между тем ваши соцсети продолжают работать — и там накопилось немало интересного.</p>
    <p style="margin:0 0 4px">Загляните в аналитику — возможно, именно сейчас подходящий момент для нового рывка.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0">
      <tr><td align="center" bgcolor="#D97706" style="border-radius:10px">
        <a href="${href}" target="_blank" style="display:inline-block;padding:13px 28px;font-weight:600;color:#1C1917;border-radius:10px">Посмотреть аналитику</a>
      </td></tr>
    </table>
    <p style="margin:8px 0 0;font-size:13px;color:#78716C">Вы получаете это письмо как пользователь Metriq&nbsp;Flow (${email}). Отключить уведомления — в <a href="${settingsHref}" style="color:#B45309;font-weight:600">настройках</a>.</p>`;
}

function reengagementHtmlEn(email: string): string {
  const href = `${FRONTEND_URL}/en/app/analytics`;
  const settingsHref = `${FRONTEND_URL}/en/app/settings`;
  return `<h2 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#1C1917">Your channels miss you</h2>
    <p style="margin:0 0 14px">It looks like you haven't checked Metriq&nbsp;Flow in a while. Your social channels have been active — there's plenty to catch up on.</p>
    <p style="margin:0 0 4px">Take a look at your analytics — this might be the perfect moment for a fresh push.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0">
      <tr><td align="center" bgcolor="#D97706" style="border-radius:10px">
        <a href="${href}" target="_blank" style="display:inline-block;padding:13px 28px;font-weight:600;color:#1C1917;border-radius:10px">View analytics</a>
      </td></tr>
    </table>
    <p style="margin:8px 0 0;font-size:13px;color:#78716C">You're receiving this as a Metriq&nbsp;Flow user (${email}). Manage alerts in your <a href="${settingsHref}" style="color:#B45309;font-weight:600">settings</a>.</p>`;
}

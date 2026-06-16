import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import FormData from "form-data";
import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

const BOT_TOKEN = process.env.BOT_TOKEN ?? "";
// Optional egress relay base (e.g. Cloudflare Worker) for hosts where
// api.telegram.org is unreachable (RU). Empty = direct. No trailing slash.
const TG_BASE = (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");

// ─── Telegram ─────────────────────────────────────────────────────────────────

export async function sendReportViaTelegram(
  telegramId: number,
  filePath: string,
  filename: string,
  caption: string
): Promise<void> {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN not configured");
  if (!fs.existsSync(filePath)) throw new Error("File not found: " + filePath);

  const form = new FormData();
  form.append("chat_id", String(telegramId));
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  form.append("document", fs.createReadStream(filePath), { filename });

  await new Promise<void>((resolve, reject) => {
    const url = new URL(`${TG_BASE}/bot${BOT_TOKEN}/sendDocument`);
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname,
        method:   "POST",
        headers:  form.getHeaders(),
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          const parsed = JSON.parse(body) as { ok: boolean; description?: string };
          if (!parsed.ok) reject(new Error(`Telegram API error: ${parsed.description}`));
          else resolve();
        });
      }
    );
    req.on("error", reject);
    form.pipe(req);
  });
}

// ─── Telegram channel posting (for content planner) ─────────────────────────

async function tgApiJson<T>(method: string, payload: unknown): Promise<T> {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN not configured");
  const body = JSON.stringify(payload);
  return new Promise<T>((resolve, reject) => {
    const url = new URL(`${TG_BASE}/bot${BOT_TOKEN}/${method}`);
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname,
        method:   "POST",
        headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const parsed = JSON.parse(data) as { ok: boolean; result?: T; description?: string };
          if (!parsed.ok) reject(new Error(`Telegram API: ${parsed.description}`));
          else resolve(parsed.result as T);
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

type TgMessage = { message_id: number; date: number };

export async function sendPostToChannel(
  channelId: string,
  text: string,
  mediaUrls: string[],
): Promise<TgMessage> {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN not configured");

  if (mediaUrls.length === 0) {
    return tgApiJson<TgMessage>("sendMessage", {
      chat_id:    channelId,
      text:       text || ".",
      parse_mode: "HTML",
    });
  }

  if (mediaUrls.length === 1) {
    return tgApiJson<TgMessage>("sendPhoto", {
      chat_id:    channelId,
      photo:      mediaUrls[0],
      caption:    text,
      parse_mode: "HTML",
    });
  }

  // Multiple media — sendMediaGroup returns array; first item has caption
  const media = mediaUrls.map((url, i) => ({
    type:       "photo",
    media:      url,
    ...(i === 0 && text ? { caption: text, parse_mode: "HTML" } : {}),
  }));
  const messages = await tgApiJson<TgMessage[]>("sendMediaGroup", { chat_id: channelId, media });
  if (!messages[0]) throw new Error("sendMediaGroup returned empty array");
  return messages[0];
}

// ─── Email ────────────────────────────────────────────────────────────────────

// Mail is "configured" as soon as a host is set. With an own MTA (the compose
// Postfix relay at mailer:25) there are no credentials, so we gate on
// SMTP_HOST rather than SMTP_USER.
function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function smtpFrom(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@metriqflow.com";
}

function createTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    // Auth omitted for own-MTA relay (compose Postfix). Set SMTP_USER/PASS
    // only when pointing at an authenticated provider (Yandex/Resend/etc).
    ...(user ? { auth: { user, pass } } : {}),
    // Own MTA presents a self-signed STARTTLS cert over the private compose
    // network — don't verify it (no MITM surface, traffic stays on the host).
    // Authenticated providers keep strict cert validation.
    ...(user ? {} : { tls: { rejectUnauthorized: false } }),
  });
}

// Branded transactional email shell — "Warm Amber" design language
// (frontend/DESIGN.md). Table-based + inline styles for client compatibility
// (Outlook/Gmail/Apple Mail); the bulletproof button uses a bgcolor <td> so it
// survives Outlook's word rendering. Web fonts load with a graceful system
// fallback. Amber is a light hue → dark text on amber (white fails WCAG).
// Brand wordmark is "Metriq Flow" (two words) per DESIGN.md.
type EmailCta = { label: string; url: string; variant?: "primary" | "danger" };

export function brandedEmail(opts: {
  preheader: string;
  lang?: "ru" | "en";
  kicker?: string;
  heading?: string;
  intro?: string;        // lead paragraph (html allowed)
  contentHtml?: string;  // arbitrary inner block (e.g. alert/report body)
  cta?: EmailCta;
  footnote?: string;
}): string {
  const { preheader, kicker, heading, intro, contentHtml, cta, footnote } = opts;
  const lang = opts.lang ?? "ru";
  const isRu = lang === "ru";
  // Warm Amber tokens (light mode) from DESIGN.md
  const c = {
    bg: "#FAF8F4",
    surface: "#FFFFFF",
    surfaceMuted: "#F4F1EA",
    textMain: "#1C1917",
    textSecondary: "#78716C",
    border: "#E7E1D6",
    primary: "#D97706",
    onAccent: "#1C1917",
    accent: "#B45309",
    error: "#DC2626",
  };
  const sans =
    "'Plus Jakarta Sans','Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const mono = "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

  const ctaBg   = cta?.variant === "danger" ? c.error : c.primary;
  const ctaText = cta?.variant === "danger" ? "#FFFFFF" : c.onAccent;
  const linkClr = cta?.variant === "danger" ? c.error : c.accent;

  const kickerHtml = kicker
    ? `<p style="margin:0 0 14px;font-family:${sans};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${ctaBg};">${kicker}</p>`
    : "";
  const headingHtml = heading
    ? `<h1 style="margin:0 0 14px;font-family:${sans};font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${c.textMain};">${heading}</h1>`
    : "";
  const introHtml = intro
    ? `<p style="margin:0 0 26px;font-family:${sans};font-size:15px;line-height:1.6;color:${c.textSecondary};">${intro}</p>`
    : "";
  // Inner content (alert/report bodies) — normalize the default paragraph look so
  // any incoming <p>/<b>/<a> inherits the brand type without per-template styling.
  const contentBlock = contentHtml
    ? `<div style="font-family:${sans};font-size:15px;line-height:1.6;color:${c.textSecondary};">${contentHtml}</div>`
    : "";
  const ctaHtml = cta
    ? `
              <!-- bulletproof CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;">
                <tr>
                  <td align="center" bgcolor="${ctaBg}" style="border-radius:10px;">
                    <a href="${cta.url}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${sans};font-size:15px;font-weight:600;color:${ctaText};border-radius:10px;">${cta.label}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-family:${sans};font-size:13px;color:${c.textSecondary};">${isRu ? "Кнопка не&nbsp;работает? Скопируйте ссылку в&nbsp;браузер:" : "Button not working? Copy the link into your browser:"}</p>
              <p style="margin:0 0 4px;font-family:${mono};font-size:12px;line-height:1.5;color:${linkClr};word-break:break-all;">${cta.url}</p>`
    : "";
  const footnoteHtml = footnote
    ? `
              <div style="height:1px;background:${c.border};line-height:1px;font-size:1px;margin-top:26px;">&nbsp;</div>
              <p style="margin:22px 0 0;font-family:${sans};font-size:13px;line-height:1.6;color:${c.textSecondary};">${footnote}</p>`
    : "";

  const footerTag = isRu
    ? "Metriq Flow — аналитика соцсетей без боли."
    : "Metriq Flow — social analytics without the pain.";
  const footerAuto = isRu
    ? `© ${new Date().getFullYear()} Metriq Flow. Это автоматическое письмо, отвечать на&nbsp;него не&nbsp;нужно.`
    : `© ${new Date().getFullYear()} Metriq Flow. Automated message — no need to reply.`;

  return `<!DOCTYPE html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light only">
  <title>Metriq Flow</title>
  <!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    body { margin:0; padding:0; background:${c.bg}; }
    a { text-decoration:none; }
    .content a { color:${c.accent}; font-weight:500; }
    @media (max-width:480px) {
      .card { padding:28px 22px !important; }
      .px { padding-left:18px !important; padding-right:18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${c.bg};">
  <!-- preheader: shows in inbox preview, hidden in body -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${c.bg};font-size:1px;line-height:1px;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;">

          <!-- wordmark -->
          <tr>
            <td class="px" style="padding:4px 8px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="display:inline-block;width:30px;height:30px;background:${c.primary};border-radius:8px;color:${c.onAccent};font-family:${sans};font-size:17px;font-weight:700;line-height:30px;text-align:center;">M</span>
                  </td>
                  <td style="vertical-align:middle;padding-left:10px;">
                    <span style="font-family:${sans};font-size:17px;font-weight:700;letter-spacing:-0.02em;color:${c.textMain};">Metriq <span style="color:${c.primary};">Flow</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- card -->
          <tr>
            <td class="card content" style="background:${c.surface};border:1px solid ${c.border};border-radius:16px;padding:36px 34px;">
              ${kickerHtml}${headingHtml}${introHtml}${contentBlock}${ctaHtml}${footnoteHtml}
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td class="px" style="padding:24px 8px 8px;">
              <p style="margin:0 0 4px;font-family:${sans};font-size:12px;line-height:1.5;color:${c.textSecondary};">${footerTag}</p>
              <p style="margin:0;font-family:${sans};font-size:12px;color:#A8A29E;">${footerAuto}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendReportViaEmail(
  toEmail: string,
  filePath: string,
  filename: string,
  subject: string,
  bodyHtml: string,
  locale: "ru" | "en" = "ru"
): Promise<void> {
  if (!mailConfigured()) throw new Error("SMTP not configured");
  if (!fs.existsSync(filePath)) throw new Error("File not found: " + filePath);

  const isRu = locale === "ru";
  const html = brandedEmail({
    preheader: subject,
    lang: locale,
    kicker: isRu ? "Отчёт готов" : "Report ready",
    contentHtml: bodyHtml,
    footnote: isRu
      ? `Файл <strong style="color:#57534E">${filename}</strong> прикреплён к&nbsp;этому письму.`
      : `The file <strong style="color:#57534E">${filename}</strong> is attached to this email.`,
  });

  const transport = createTransport();

  await transport.sendMail({
    from:    `"Metriq Flow" <${smtpFrom()}>`,
    to:      toEmail,
    subject,
    html,
    attachments: [
      { filename, path: filePath },
    ],
  });
}

export async function sendAlertEmail(to: string, subject: string, html: string): Promise<void> {
  return sendSimpleEmail(to, subject, html);
}

export async function sendTelegramMessage(telegramId: number, html: string): Promise<void> {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN not configured");

  const body = JSON.stringify({ chat_id: String(telegramId), text: html, parse_mode: "HTML" });

  await new Promise<void>((resolve, reject) => {
    const url = new URL(`${TG_BASE}/bot${BOT_TOKEN}/sendMessage`);
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname,
        method:   "POST",
        headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const parsed = JSON.parse(data) as { ok: boolean; description?: string };
          if (!parsed.ok) reject(new Error(`Telegram API error: ${parsed.description}`));
          else resolve();
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function sendSimpleEmail(to: string, subject: string, html: string): Promise<void> {
  if (!mailConfigured()) {
    logger.debug({ to, subject, html }, "[DEV] Email");
    return;
  }
  const transport = createTransport();
  await transport.sendMail({
    from: `"Metriq Flow" <${smtpFrom()}>`,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(toEmail: string, token: string, locale = "ru"): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const link = `${frontendUrl}/${locale}/verify-email?token=${token}`;
  if (!mailConfigured()) {
    // eslint-disable-next-line no-console
    console.log("\n[DEV] Verify link:", link, "\n");
  }
  const isRu = locale !== "en";
  const html = isRu
    ? brandedEmail({
        preheader: "Подтвердите адрес, чтобы активировать аккаунт Metriq Flow. Ссылка живёт 24 часа.",
        lang: "ru",
        kicker: "Подтверждение email",
        heading: "Остался один шаг",
        intro:
          "Спасибо за регистрацию в&nbsp;Metriq Flow. Нажмите кнопку ниже, чтобы подтвердить адрес и&nbsp;открыть доступ к&nbsp;аналитике.",
        cta: { label: "Подтвердить email", url: link },
        footnote:
          "Ссылка действительна <strong style=\"color:#57534E\">24&nbsp;часа</strong>. Если вы не&nbsp;регистрировались в&nbsp;Metriq Flow — просто проигнорируйте это письмо, ничего не&nbsp;произойдёт.",
      })
    : brandedEmail({
        preheader: "Confirm your address to activate your Metriq Flow account. Link valid for 24 hours.",
        lang: "en",
        kicker: "Email verification",
        heading: "One last step",
        intro:
          "Thanks for signing up for Metriq&nbsp;Flow. Click the button below to confirm your address and unlock your analytics.",
        cta: { label: "Confirm email", url: link },
        footnote:
          "This link is valid for <strong style=\"color:#57534E\">24&nbsp;hours</strong>. If you didn't sign up for Metriq&nbsp;Flow, just ignore this email — nothing will happen.",
      });
  const subject = isRu ? "Подтвердите ваш email — Metriq Flow" : "Confirm your email — Metriq Flow";
  await sendSimpleEmail(toEmail, subject, html);
}

export async function sendDeleteConfirmationEmail(toEmail: string, confirmUrl: string): Promise<void> {
  const html = brandedEmail({
    preheader: "Запрос на удаление аккаунта Metriq Flow. Ссылка живёт 1 час.",
    lang: "ru",
    kicker: "Удаление аккаунта",
    heading: "Подтвердите удаление",
    intro:
      "Мы получили запрос на удаление вашего аккаунта Metriq Flow. Чтобы продолжить, нажмите кнопку ниже — <strong style=\"color:#57534E\">это действие необратимо</strong>, все данные и&nbsp;отчёты будут стёрты.",
    cta: { label: "Удалить аккаунт навсегда", url: confirmUrl, variant: "danger" },
    footnote:
      "Ссылка действительна <strong style=\"color:#57534E\">1&nbsp;час</strong>. Если вы не&nbsp;запрашивали удаление — просто проигнорируйте это письмо, аккаунт останется в&nbsp;целости.",
  });
  await sendSimpleEmail(toEmail, "Подтверждение удаления аккаунта — Metriq Flow", html);
}

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import FormData from "form-data";
import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

const BOT_TOKEN = process.env.BOT_TOKEN ?? "";

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
    const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`);
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
    const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`);
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

export async function sendPostToChannel(
  channelId: string,
  text: string,
  mediaUrls: string[],
): Promise<void> {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN not configured");

  if (mediaUrls.length === 0) {
    await tgApiJson("sendMessage", {
      chat_id:    channelId,
      text:       text || ".",
      parse_mode: "HTML",
    });
    return;
  }

  if (mediaUrls.length === 1) {
    await tgApiJson("sendPhoto", {
      chat_id:    channelId,
      photo:      mediaUrls[0],
      caption:    text,
      parse_mode: "HTML",
    });
    return;
  }

  // Multiple media — sendMediaGroup (captions supported only on first item)
  const media = mediaUrls.map((url, i) => ({
    type:       "photo",
    media:      url,
    ...(i === 0 && text ? { caption: text, parse_mode: "HTML" } : {}),
  }));
  await tgApiJson("sendMediaGroup", { chat_id: channelId, media });
}

// ─── Email ────────────────────────────────────────────────────────────────────

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? "smtp.gmail.com",
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });
}

export async function sendReportViaEmail(
  toEmail: string,
  filePath: string,
  filename: string,
  subject: string,
  bodyHtml: string
): Promise<void> {
  if (!process.env.SMTP_USER) throw new Error("SMTP not configured");
  if (!fs.existsSync(filePath)) throw new Error("File not found: " + filePath);

  const transport = createTransport();

  await transport.sendMail({
    from:    `"MetriqFlow" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to:      toEmail,
    subject,
    html:    bodyHtml,
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
    const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`);
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
  const smtpUser = process.env.SMTP_USER;
  if (!smtpUser) {
    logger.debug({ to, subject, html }, "[DEV] Email");
    return;
  }
  const transport = createTransport();
  await transport.sendMail({
    from: `"MetriqFlow" <${process.env.SMTP_FROM ?? smtpUser}>`,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(toEmail: string, token: string, locale = "ru"): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const link = `${frontendUrl}/${locale}/verify-email?token=${token}`;
  if (!process.env.SMTP_USER) {
    // eslint-disable-next-line no-console
    console.log("\n[DEV] Verify link:", link, "\n");
  }
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#6366f1">Подтвердите email</h2>
      <p>Нажмите кнопку ниже, чтобы подтвердить ваш адрес электронной почты в MetriqFlow.</p>
      <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Подтвердить email
      </a>
      <p style="color:#888;font-size:13px">Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.</p>
    </div>
  `;
  await sendSimpleEmail(toEmail, "Подтвердите ваш email — MetriqFlow", html);
}

export async function sendDeleteConfirmationEmail(toEmail: string, confirmUrl: string): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#ef4444">Удаление аккаунта</h2>
      <p>Мы получили запрос на удаление вашего аккаунта MetriqFlow.</p>
      <p>Если вы действительно хотите удалить аккаунт — нажмите кнопку ниже. <strong>Это действие необратимо.</strong></p>
      <a href="${confirmUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Удалить аккаунт навсегда
      </a>
      <p style="color:#888;font-size:13px">Ссылка действительна 1 час. Если вы не запрашивали удаление — просто проигнорируйте это письмо.</p>
    </div>
  `;
  await sendSimpleEmail(toEmail, "Подтверждение удаления аккаунта — MetriqFlow", html);
}

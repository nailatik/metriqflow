import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import FormData from "form-data";
import nodemailer from "nodemailer";

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

import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import { query } from "../db";
import { logger } from "../lib/logger";

const STORAGE_ROOT = path.resolve(__dirname, "../../storage/reports");

// Bundled font supporting Unicode/Cyrillic. Falls back to system paths for production Linux.
const FONT_CANDIDATES = [
  path.resolve(__dirname, "../../assets/fonts/ArialUnicode.ttf"),
  process.env.PDF_FONT_PATH ?? "",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/freefont/FreeSerif.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
];

const UNICODE_FONT = FONT_CANDIDATES.find((p) => p && fs.existsSync(p)) ?? null;

type ReportSource = "all" | "telegram" | "vk";
type ReportFormat = "csv" | "pdf" | "xml";
type ReportStatus = "pending" | "ready" | "failed";
type Locale = "en" | "ru";

function parseId(raw: unknown): number | null {
  const n = parseInt(String(raw), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── i18n ────────────────────────────────────────────────────────────────────

type I18nDict = {
  reportTitle: string;
  period: string;
  generated: string;
  noData: string;
  tgSection: string;
  vkSection: string;
  tgHeaders: string[];
  vkHeaders: string[];
  tgCsvComment: string;
  vkCsvComment: string;
  lastDays: (n: number) => string;
};

const I18N: Record<Locale, I18nDict> = {
  en: {
    reportTitle: "MetriqFlow Report",
    period: "Period",
    generated: "Generated",
    noData: "No data for the selected period.",
    tgSection: "Telegram",
    vkSection: "VK Communities",
    tgHeaders: ["Date", "Views", "Reactions", "Forwards", "Comments", "Posts"],
    vkHeaders: ["Date", "Views", "Likes", "Comments", "Reposts", "Posts"],
    tgCsvComment: "# Telegram",
    vkCsvComment: "# VK Communities",
    lastDays: (n) => n === 1 ? "Last 24h" : `Last ${n} days`,
  },
  ru: {
    reportTitle: "Отчёт MetriqFlow",
    period: "Период",
    generated: "Сформирован",
    noData: "Нет данных за выбранный период.",
    tgSection: "Telegram",
    vkSection: "Сообщества VK",
    tgHeaders: ["Дата", "Просмотры", "Реакции", "Репосты", "Комментарии", "Посты"],
    vkHeaders: ["Дата", "Просмотры", "Лайки", "Комментарии", "Репосты", "Посты"],
    tgCsvComment: "# Telegram",
    vkCsvComment: "# Сообщества VK",
    lastDays: (n) => n === 1 ? "Последние 24ч" : `Последние ${n} дней`,
  },
};

function getI18n(locale: string): I18nDict {
  return I18N[locale as Locale] ?? I18N.en;
}

// ─── VK API (service token, public data only) ────────────────────────────────

const VK_API_V = "5.199";
const VK_SERVICE_TOKEN = process.env.VK_SERVICE_TOKEN ?? "";

async function vkApi<T>(method: string, params: Record<string, string | number>): Promise<T | null> {
  if (!VK_SERVICE_TOKEN) return null;
  const url = new URL(`https://api.vk.com/method/${method}`);
  url.searchParams.set("access_token", VK_SERVICE_TOKEN);
  url.searchParams.set("v", VK_API_V);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  try {
    const res  = await fetch(url.toString());
    const data = await res.json() as { response?: T; error?: unknown };
    if (data.error || data.response === undefined) return null;
    return data.response;
  } catch {
    return null;
  }
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

type TgRow = {
  date: string; views: number; reactions: number; forwards: number; comments: number; posts: number;
};
type VkRow = {
  date: string; views: number; likes: number; comments: number; reposts: number; posts: number;
};

async function fetchTelegramData(userId: number, periodDays: number): Promise<TgRow[]> {
  const result = await query(
    `SELECT
       DATE(tp.posted_at AT TIME ZONE 'UTC')::text       AS date,
       SUM(tp.views)::int                                AS views,
       SUM(tp.reactions_total)::int                      AS reactions,
       SUM(tp.forwards)::int                             AS forwards,
       SUM(tp.comments)::int                             AS comments,
       COUNT(tp.id)::int                                 AS posts
     FROM telegram_posts tp
     JOIN telegram_channels tc ON tc.channel_id = tp.channel_id
     WHERE tc.user_id = $1
       AND tc.is_active = TRUE
       AND tp.posted_at >= NOW() - ($2::text || ' days')::interval
     GROUP BY DATE(tp.posted_at AT TIME ZONE 'UTC')
     ORDER BY date ASC`,
    [userId, periodDays]
  );
  return result.rows as TgRow[];
}

async function fetchVkData(userId: number, periodDays: number): Promise<VkRow[]> {
  const communities = await query(
    `SELECT community_id FROM vk_communities
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  const ids = (communities.rows as { community_id: string }[]).map((r) => Number(r.community_id));
  if (ids.length === 0) return [];

  const windowStart = Math.floor(Date.now() / 1000) - periodDays * 86400;

  type VkPost = {
    date: number;
    likes?: { count: number };
    reposts?: { count: number };
    comments?: { count: number };
    views?: { count: number };
  };

  const byDay = new Map<string, Omit<VkRow, "date">>();

  for (const gid of ids) {
    const wall = await vkApi<{ items: VkPost[] }>("wall.get", {
      owner_id: -gid, count: 100, filter: "owner",
    });
    if (!wall) continue;
    for (const p of wall.items) {
      if (p.date < windowStart) continue;
      const day  = new Date(p.date * 1000).toISOString().slice(0, 10);
      const cell = byDay.get(day) ?? { views: 0, likes: 0, comments: 0, reposts: 0, posts: 0 };
      cell.views    += p.views?.count    ?? 0;
      cell.likes    += p.likes?.count    ?? 0;
      cell.comments += p.comments?.count ?? 0;
      cell.reposts  += p.reposts?.count  ?? 0;
      cell.posts    += 1;
      byDay.set(day, cell);
    }
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, c]) => ({ date, ...c }));
}

// ─── File generators ──────────────────────────────────────────────────────────

function generateCsv(
  source: ReportSource,
  tgRows: TgRow[],
  vkRows: VkRow[],
  t: I18nDict
): string {
  const lines: string[] = [];

  if (source === "all" || source === "telegram") {
    lines.push(t.tgCsvComment);
    lines.push(t.tgHeaders.map((h) => `"${h}"`).join(","));
    for (const r of tgRows) {
      lines.push(`${r.date},${r.views},${r.reactions},${r.forwards},${r.comments},${r.posts}`);
    }
    if (source === "all") lines.push("");
  }

  if (source === "all" || source === "vk") {
    lines.push(t.vkCsvComment);
    lines.push(t.vkHeaders.map((h) => `"${h}"`).join(","));
    for (const r of vkRows) {
      lines.push(`${r.date},${r.views},${r.likes},${r.comments},${r.reposts},${r.posts}`);
    }
  }

  return lines.join("\n");
}

function generateXml(
  source: ReportSource,
  tgRows: TgRow[],
  vkRows: VkRow[],
  title: string,
  periodDays: number,
  t: I18nDict
): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<report title="${esc(title)}" period="${t.lastDays(periodDays)}" generated_at="${new Date().toISOString()}">`,
  ];

  if (source === "all" || source === "telegram") {
    lines.push(`  <section name="${t.tgSection}">`);
    for (const r of tgRows) {
      lines.push(
        `    <day date="${r.date}" views="${r.views}" reactions="${r.reactions}" forwards="${r.forwards}" comments="${r.comments}" posts="${r.posts}"/>`
      );
    }
    lines.push("  </section>");
  }

  if (source === "all" || source === "vk") {
    lines.push(`  <section name="${esc(t.vkSection)}">`);
    for (const r of vkRows) {
      lines.push(
        `    <day date="${r.date}" views="${r.views}" likes="${r.likes}" comments="${r.comments}" reposts="${r.reposts}" posts="${r.posts}"/>`
      );
    }
    lines.push("  </section>");
  }

  lines.push("</report>");
  return lines.join("\n");
}

function generatePdf(
  source: ReportSource,
  tgRows: TgRow[],
  vkRows: VkRow[],
  title: string,
  periodDays: number,
  filePath: string,
  t: I18nDict
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    // Register Unicode font if available; fall back to built-in Helvetica (Latin only)
    const fontReg  = UNICODE_FONT ?? "Helvetica";
    const fontBold = UNICODE_FONT ?? "Helvetica-Bold";
    if (UNICODE_FONT) {
      doc.registerFont("UniReg",  UNICODE_FONT);
      doc.registerFont("UniBold", UNICODE_FONT);
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const dateStr = new Date().toLocaleDateString(source === "all" ? "en-US" : "ru-RU");

    // Header
    doc.fontSize(20).font(fontBold).text(t.reportTitle, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(13).font(fontReg).text(title, { align: "center" });
    doc.fontSize(10).fillColor("#888").text(
      `${t.period}: ${t.lastDays(periodDays)}  ·  ${t.generated}: ${dateStr}`,
      { align: "center" }
    );
    doc.fillColor("#000").moveDown(1.5);

    const drawTable = (headers: string[], rows: string[][], sectionTitle: string) => {
      doc.fontSize(14).font(fontBold).text(sectionTitle);
      doc.moveDown(0.4);

      const colWidth = (doc.page.width - 80) / headers.length;
      const rowH = 18;
      const startX = 40;
      let y = doc.y;

      // Header row
      doc.rect(startX, y, doc.page.width - 80, rowH).fill("#334155");
      headers.forEach((h, i) => {
        doc.fontSize(9).font(fontBold).fillColor("#fff")
          .text(h, startX + i * colWidth + 4, y + 4, { width: colWidth - 8, align: "left" });
      });
      y += rowH;

      // Data rows
      rows.forEach((row, ri) => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 40;
        }
        const bg = ri % 2 === 0 ? "#f8fafc" : "#ffffff";
        doc.rect(startX, y, doc.page.width - 80, rowH).fill(bg);
        row.forEach((cell, i) => {
          doc.fontSize(8).font(fontReg).fillColor("#1e293b")
            .text(cell, startX + i * colWidth + 4, y + 4, { width: colWidth - 8, align: "left" });
        });
        y += rowH;
      });

      doc.y = y + 16;
      doc.fillColor("#000");
      doc.moveDown(1);
    };

    if ((source === "all" || source === "telegram") && tgRows.length > 0) {
      drawTable(
        t.tgHeaders,
        tgRows.map((r) => [r.date, String(r.views), String(r.reactions), String(r.forwards), String(r.comments), String(r.posts)]),
        t.tgSection
      );
    }

    if ((source === "all" || source === "vk") && vkRows.length > 0) {
      drawTable(
        t.vkHeaders,
        vkRows.map((r) => [r.date, String(r.views), String(r.likes), String(r.comments), String(r.reposts), String(r.posts)]),
        t.vkSection
      );
    }

    const isEmpty =
      (source === "telegram" && tgRows.length === 0) ||
      (source === "vk"       && vkRows.length === 0) ||
      (source === "all"      && tgRows.length === 0 && vkRows.length === 0);

    if (isEmpty) {
      doc.fontSize(12).font(fontReg).fillColor("#888").text(t.noData, { align: "center" });
    }

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ─── File generation orchestrator ────────────────────────────────────────────

async function generateFile(
  reportId: number,
  userId: number,
  source: ReportSource,
  format: ReportFormat,
  periodDays: number,
  title: string,
  locale: string
): Promise<void> {
  const year = new Date().getFullYear().toString();
  const dir = path.join(STORAGE_ROOT, String(userId), year);
  ensureDir(dir);

  const filePath = path.join(dir, `${reportId}.${format}`);
  const t = getI18n(locale);

  const [tgRows, vkRows] = await Promise.all([
    (source === "all" || source === "telegram") ? fetchTelegramData(userId, periodDays) : Promise.resolve([]),
    (source === "all" || source === "vk")       ? fetchVkData(userId, periodDays)       : Promise.resolve([]),
  ]);

  if (format === "pdf") {
    await generatePdf(source, tgRows, vkRows, title, periodDays, filePath, t);
  } else if (format === "xml") {
    fs.writeFileSync(filePath, generateXml(source, tgRows, vkRows, title, periodDays, t), "utf8");
  } else {
    fs.writeFileSync(filePath, generateCsv(source, tgRows, vkRows, t), "utf8");
  }

  await query(
    "UPDATE reports SET status = 'ready', file_path = $1 WHERE id = $2",
    [filePath, reportId]
  );
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export const getReports = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await query(
      `SELECT id, title, source, format, period_days, status, locale, created_at, expires_at
       FROM reports WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    logger.error({ err }, "GET REPORTS ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      title: rawTitle,
      source: rawSource = "all",
      format: rawFormat = "csv",
      period_days: rawPeriod = 7,
      locale: rawLocale = "en",
    } = req.body as { title?: string; source?: string; format?: string; period_days?: number; locale?: string };

    const validSources = new Set<string>(["all", "telegram", "vk"]);
    const validFormats = new Set<string>(["csv", "pdf", "xml"]);
    const validLocales = new Set<string>(["en", "ru"]);

    const source    = validSources.has(rawSource) ? (rawSource as ReportSource) : "all";
    const format    = validFormats.has(rawFormat) ? (rawFormat as ReportFormat) : "csv";
    const periodDays = [1, 7, 30].includes(Number(rawPeriod)) ? Number(rawPeriod) : 7;
    const locale    = validLocales.has(rawLocale) ? rawLocale : "en";

    const t = getI18n(locale);
    const dateStr = new Date().toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
      day: "numeric", month: "short", year: "numeric",
    });
    const srcLabel = source === "all" ? (locale === "ru" ? "Все" : "All")
      : source === "telegram" ? "Telegram" : "VK";
    const autoTitle = rawTitle?.trim() || `${srcLabel} · ${periodDays}d · ${dateStr}`;

    if (autoTitle.length > 255) return res.status(400).json({ message: "Title too long" });

    const insert = await query(
      `INSERT INTO reports (title, user_id, source, format, period_days, locale, status, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW() + INTERVAL '1 year', NOW())
       RETURNING id, title, source, format, period_days, locale, status, created_at, expires_at`,
      [autoTitle, userId, source, format, periodDays, locale]
    );

    const report = insert.rows[0] as {
      id: number; title: string; source: string; format: string;
      period_days: number; locale: string; status: ReportStatus;
    };

    try {
      await generateFile(report.id, userId, source, format, periodDays, report.title, locale);
      const updated = await query(
        "SELECT id, title, source, format, period_days, locale, status, created_at, expires_at FROM reports WHERE id = $1",
        [report.id]
      );
      return res.status(201).json(updated.rows[0]);
    } catch (genErr) {
      logger.error({ err: genErr }, "REPORT GENERATION ERROR:");
      await query("UPDATE reports SET status = 'failed' WHERE id = $1", [report.id]);
      return res.status(201).json({ ...report, status: "failed" });
    }
  } catch (err) {
    logger.error({ err }, "CREATE REPORT ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const downloadReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: "Invalid report id" });

    const result = await query(
      "SELECT title, format, file_path, status FROM reports WHERE id = $1 AND user_id = $2",
      [reportId, userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Report not found" });

    const report = result.rows[0] as { title: string; format: string; file_path: string | null; status: string };

    if (report.status !== "ready" || !report.file_path) {
      return res.status(409).json({ message: "Report not ready" });
    }

    if (!fs.existsSync(report.file_path)) {
      return res.status(404).json({ message: "File not found" });
    }

    const mimeTypes: Record<string, string> = {
      csv: "text/csv",
      pdf: "application/pdf",
      xml: "application/xml",
    };

    const filename = `${report.title.replace(/[^a-zA-Z0-9_\-\.А-ЯЁа-яё]/g, "_")}.${report.format}`;
    res.setHeader("Content-Type", mimeTypes[report.format] ?? "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    fs.createReadStream(report.file_path).pipe(res);
  } catch (err) {
    logger.error({ err }, "DOWNLOAD REPORT ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: "Invalid report id" });

    const result = await query(
      "DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING id, file_path",
      [reportId, userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Report not found" });

    const filePath = (result.rows[0] as { file_path: string | null }).file_path;
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.json({ message: "Report deleted" });
  } catch (err) {
    logger.error({ err }, "DELETE REPORT ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Exported for scheduler ───────────────────────────────────────────────────

export async function generateScheduledReport(
  userId: number,
  source: ReportSource,
  format: ReportFormat,
  periodDays: number,
  title: string,
  locale: string,
  scheduleId: number
): Promise<{ reportId: number; filePath: string }> {
  const insert = await query(
    `INSERT INTO reports (title, user_id, source, format, period_days, locale, status, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW() + INTERVAL '1 year', NOW())
     RETURNING id`,
    [title, userId, source, format, periodDays, locale]
  );
  const reportId = (insert.rows[0] as { id: number }).id;

  await generateFile(reportId, userId, source, format, periodDays, title, locale);

  const year = new Date().getFullYear().toString();
  const filePath = path.join(STORAGE_ROOT, String(userId), year, `${reportId}.${format}`);

  return { reportId, filePath };
}

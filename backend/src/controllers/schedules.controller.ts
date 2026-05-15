import { Request, Response } from "express";
import { query } from "../db";

function parseId(raw: unknown): number | null {
  const n = parseInt(String(raw), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

type ChannelInput = { channel: "telegram" | "email"; email?: string; enabled?: boolean };

// ─── GET /report-schedules ────────────────────────────────────────────────────

export const getSchedules = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const schedules = await query(
      `SELECT id, title, source, format, frequency_days, locale, send_hour, timezone,
              enabled, paused, next_send_at, last_sent_at, last_status, created_at
       FROM report_schedules WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const ids = (schedules.rows as { id: number }[]).map((r) => r.id);
    if (ids.length === 0) return res.json([]);

    const channels = await query(
      `SELECT schedule_id, channel, email, enabled
       FROM schedule_channels WHERE schedule_id = ANY($1)`,
      [ids]
    );

    const chMap = new Map<number, typeof channels.rows>();
    for (const ch of channels.rows as { schedule_id: number }[]) {
      if (!chMap.has(ch.schedule_id)) chMap.set(ch.schedule_id, []);
      chMap.get(ch.schedule_id)!.push(ch);
    }

    const result = (schedules.rows as { id: number }[]).map((s) => ({
      ...s,
      channels: chMap.get(s.id) ?? [],
    }));

    return res.json(result);
  } catch (err) {
    console.error("GET SCHEDULES ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── POST /report-schedules ───────────────────────────────────────────────────

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      title: rawTitle,
      source: rawSource = "all",
      format: rawFormat = "csv",
      frequency_days: rawFreq = 7,
      locale: rawLocale = "en",
      send_hour: rawHour = 9,
      timezone: rawTz = "UTC",
      channels: rawChannels = [],
    } = req.body as {
      title?: string; source?: string; format?: string;
      frequency_days?: number; locale?: string;
      send_hour?: number; timezone?: string;
      channels?: ChannelInput[];
    };

    const validSources = new Set(["all", "telegram", "vk"]);
    const validFormats = new Set(["csv", "pdf", "xml"]);
    const validLocales = new Set(["en", "ru"]);
    const validFreqs   = new Set([1, 7, 30]);

    const source   = validSources.has(rawSource) ? rawSource : "all";
    const format   = validFormats.has(rawFormat) ? rawFormat : "csv";
    const locale   = validLocales.has(rawLocale) ? rawLocale : "en";
    const freq     = validFreqs.has(Number(rawFreq)) ? Number(rawFreq) : 7;
    const sendHour = Math.min(23, Math.max(0, Math.floor(Number(rawHour) || 9)));

    // Validate IANA timezone — PostgreSQL will throw if invalid, we catch below
    const timezone = typeof rawTz === "string" && rawTz.trim().length > 0 ? rawTz.trim() : "UTC";

    const title = rawTitle?.trim() || `${source} · ${freq}d auto`;
    if (title.length > 255) return res.status(400).json({ message: "Title too long" });

    const existing = await query(
      "SELECT id FROM report_schedules WHERE user_id = $1 AND source = $2",
      [userId, source]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Schedule for this source already exists" });
    }

    // $7 = sendHour (column), $8 = timezone (column + AT TIME ZONE), $9 = sendHour (CASE calc)
    // Split sendHour into two params to avoid PostgreSQL "inconsistent types" error
    const insert = await query(
      `INSERT INTO report_schedules
         (user_id, title, source, format, frequency_days, locale, send_hour, timezone, next_send_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
         CASE
           WHEN EXTRACT(HOUR FROM NOW() AT TIME ZONE $8) >= $9
             THEN (DATE_TRUNC('day', NOW() AT TIME ZONE $8) + INTERVAL '1 day' + make_interval(hours => $9::int)) AT TIME ZONE $8
           ELSE
             (DATE_TRUNC('day', NOW() AT TIME ZONE $8) + make_interval(hours => $9::int)) AT TIME ZONE $8
         END
       )
       RETURNING id, title, source, format, frequency_days, locale, send_hour, timezone,
                 enabled, paused, next_send_at, last_sent_at, last_status, created_at`,
      [userId, title, source, format, freq, locale, sendHour, timezone, sendHour]
    );
    const schedule = insert.rows[0] as { id: number };

    const channelRows: Record<string, unknown>[] = [];
    for (const ch of rawChannels as ChannelInput[]) {
      if (!["telegram", "email"].includes(ch.channel)) continue;
      const row = await query(
        `INSERT INTO schedule_channels (schedule_id, channel, email, enabled)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (schedule_id, channel) DO UPDATE SET email = $3, enabled = $4
         RETURNING channel, email, enabled`,
        [schedule.id, ch.channel, ch.email ?? null, ch.enabled !== false]
      );
      if (row.rows[0]) channelRows.push(row.rows[0]);
    }

    return res.status(201).json({ ...schedule, channels: channelRows });
  } catch (err) {
    console.error("CREATE SCHEDULE ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── PATCH /report-schedules/:id ─────────────────────────────────────────────

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const scheduleId = parseId(req.params.id);
    if (!scheduleId) return res.status(400).json({ message: "Invalid id" });

    const {
      enabled, paused, title, send_hour, frequency_days,
      channels: rawChannels,
    } = req.body as {
      enabled?: boolean; paused?: boolean; title?: string;
      send_hour?: number; frequency_days?: number;
      channels?: ChannelInput[];
    };

    const sets: string[] = [];
    const vals: unknown[] = [scheduleId, userId];

    if (enabled          !== undefined) { vals.push(enabled);                      sets.push(`enabled = $${vals.length}`);          }
    if (paused           !== undefined) { vals.push(paused);                       sets.push(`paused = $${vals.length}`);           }
    if (title)                          { vals.push(title.trim().slice(0, 255));    sets.push(`title = $${vals.length}`);            }
    if (frequency_days   !== undefined) { vals.push(frequency_days);               sets.push(`frequency_days = $${vals.length}`);   }
    if (send_hour        !== undefined) {
      vals.push(send_hour);
      sets.push(`send_hour = $${vals.length}`);
      vals.push(send_hour);
      const sh = vals.length;
      sets.push(`next_send_at = CASE
        WHEN EXTRACT(HOUR FROM NOW() AT TIME ZONE timezone) >= $${sh}
          THEN (DATE_TRUNC('day', NOW() AT TIME ZONE timezone) + INTERVAL '1 day' + make_interval(hours => $${sh}::int)) AT TIME ZONE timezone
          ELSE (DATE_TRUNC('day', NOW() AT TIME ZONE timezone) + make_interval(hours => $${sh}::int)) AT TIME ZONE timezone
        END`);
    }

    if (sets.length > 0) {
      const result = await query(
        `UPDATE report_schedules SET ${sets.join(", ")}
         WHERE id = $1 AND user_id = $2 RETURNING id`,
        vals
      );
      if (result.rowCount === 0) return res.status(404).json({ message: "Schedule not found" });
    }

    if (rawChannels) {
      for (const ch of rawChannels as ChannelInput[]) {
        if (!["telegram", "email"].includes(ch.channel)) continue;
        await query(
          `INSERT INTO schedule_channels (schedule_id, channel, email, enabled)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (schedule_id, channel) DO UPDATE SET email = $3, enabled = $4`,
          [scheduleId, ch.channel, ch.email ?? null, ch.enabled !== false]
        );
      }
    }

    const updated = await query(
      `SELECT rs.id, rs.title, rs.source, rs.format, rs.frequency_days, rs.locale,
              rs.send_hour, rs.timezone,
              rs.enabled, rs.paused, rs.next_send_at, rs.last_sent_at, rs.last_status, rs.created_at,
              json_agg(json_build_object('channel', sc.channel, 'email', sc.email, 'enabled', sc.enabled))
                FILTER (WHERE sc.id IS NOT NULL) AS channels
       FROM report_schedules rs
       LEFT JOIN schedule_channels sc ON sc.schedule_id = rs.id
       WHERE rs.id = $1 AND rs.user_id = $2
       GROUP BY rs.id`,
      [scheduleId, userId]
    );

    return res.json(updated.rows[0] ?? {});
  } catch (err) {
    console.error("UPDATE SCHEDULE ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── DELETE /report-schedules/:id ────────────────────────────────────────────

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const scheduleId = parseId(req.params.id);
    if (!scheduleId) return res.status(400).json({ message: "Invalid id" });

    const result = await query(
      "DELETE FROM report_schedules WHERE id = $1 AND user_id = $2 RETURNING id",
      [scheduleId, userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Schedule not found" });

    return res.json({ message: "Schedule deleted" });
  } catch (err) {
    console.error("DELETE SCHEDULE ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── PATCH /report-schedules/:id/channels/:channel — for bot sync ─────────────

export const toggleScheduleChannel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const scheduleId = parseId(req.params.id);
    const channel    = String(req.params.channel ?? "");
    if (!scheduleId || !["telegram", "email"].includes(channel)) {
      return res.status(400).json({ message: "Invalid params" });
    }

    const { enabled } = req.body as { enabled: boolean };

    await query(
      `INSERT INTO schedule_channels (schedule_id, channel, enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (schedule_id, channel) DO UPDATE SET enabled = $3`,
      [scheduleId, channel, !!enabled]
    );

    return res.json({ message: "Updated" });
  } catch (err) {
    console.error("TOGGLE CHANNEL ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

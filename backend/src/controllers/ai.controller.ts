import type { Request, Response } from "express";
import { query } from "../db";
import { getUserPlan } from "../lib/getUserPlan";
import { getLimits } from "../config/plans";
import { logger } from "../lib/logger";
import { generateInsights, AiServiceError } from "../services/ai.service";
import { buildTelegramInput, buildVkInput } from "../services/insightsBuilders";
import { insightsBodySchema } from "../schemas/insights.schemas";
import type { InsightsInput, InsightsPayload } from "../types/insights";

async function runInsights(
  res: Response,
  opts: {
    userId:     number;
    network:    "telegram" | "vk";
    sourceId:   string;
    period:     string;
    buildInput: () => Promise<InsightsInput>;
  },
): Promise<void> {
  const { userId, network, sourceId, period, buildInput } = opts;

  // 1. Cache lookup — hits skip quota
  const cached = await query(
    `SELECT payload FROM ai_cache
     WHERE network = $1 AND source_id = $2 AND period = $3
       AND created_at > NOW() - INTERVAL '6 hours'
     ORDER BY created_at DESC LIMIT 1`,
    [network, sourceId, period],
  );
  if (cached.rows.length > 0) {
    const payload = (cached.rows[0] as { payload: InsightsPayload }).payload;
    res.json({ cached: true, ...payload });
    return;
  }

  // 2. Plan gate
  const plan  = await getUserPlan(userId);
  const limit = getLimits(plan).ai_daily;
  if (limit === 0) {
    res.status(403).json({ message: "AI-инсайты доступны на платных тарифах", code: "upgrade_required" });
    return;
  }
  if (limit !== null) {
    const usageRes = await query(
      `SELECT count FROM ai_usage WHERE user_id = $1 AND used_on = CURRENT_DATE`,
      [userId],
    );
    const used = usageRes.rows.length > 0
      ? (usageRes.rows[0] as { count: number }).count
      : 0;
    if (used >= limit) {
      res.status(429).json({ message: "Дневной лимит AI-генераций исчерпан", code: "quota_exceeded" });
      return;
    }
  }

  // 3. Build input + generate
  let payload: InsightsPayload;
  try {
    const input = await buildInput();
    payload = await generateInsights(input);
  } catch (err) {
    if (err instanceof AiServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    throw err;
  }

  // 4. Persist cache + usage
  await query(
    `INSERT INTO ai_cache (network, source_id, period, payload) VALUES ($1, $2, $3, $4)`,
    [network, sourceId, period, JSON.stringify(payload)],
  );
  await query(
    `INSERT INTO ai_usage (user_id, used_on, count) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, used_on) DO UPDATE SET count = ai_usage.count + 1`,
    [userId],
  );

  res.json({ cached: false, ...payload });
}

// POST /integrations/telegram/channels/:channelId/ai-insights
export const aiInsightsTelegram = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const channelId = parseInt(String(req.params.channelId), 10);
    if (!Number.isInteger(channelId) || channelId <= 0) {
      return res.status(400).json({ message: "Invalid channelId" });
    }

    const parsed = insightsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid period. Use: 24h, 7d, 30d, all" });
    }
    const { period } = parsed.data;

    const ownerRes = await query(
      `SELECT channel_id, title, member_count
       FROM telegram_channels
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
      [channelId, userId],
    );
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ message: "Channel not found" });
    }
    const ch = ownerRes.rows[0] as {
      channel_id: string;
      title: string;
      member_count: number | null;
    };

    await runInsights(res, {
      userId,
      network:  "telegram",
      sourceId: ch.channel_id,
      period,
      buildInput: () => buildTelegramInput(ch, period),
    });
  } catch (err) {
    logger.error({ err }, "AI INSIGHTS TG ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /vk/communities/:communityId/ai-insights
export const aiInsightsVk = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const communityId = parseInt(String(req.params.communityId), 10);
    if (!Number.isInteger(communityId) || communityId <= 0) {
      return res.status(400).json({ message: "Invalid communityId" });
    }

    const parsed = insightsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid period. Use: 24h, 7d, 30d, all" });
    }
    const { period } = parsed.data;

    const ownerRes = await query(
      `SELECT community_id, name, member_count
       FROM vk_communities
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
      [communityId, userId],
    );
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ message: "Community not found" });
    }
    const comm = ownerRes.rows[0] as {
      community_id: string;
      name: string;
      member_count: number | null;
    };

    await runInsights(res, {
      userId,
      network:  "vk",
      sourceId: comm.community_id,
      period,
      buildInput: () => buildVkInput(comm, period),
    });
  } catch (err) {
    logger.error({ err }, "AI INSIGHTS VK ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

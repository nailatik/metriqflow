import Anthropic from "@anthropic-ai/sdk";
import type { InsightsInput, InsightsPayload } from "../types/insights";
import { logger } from "../lib/logger";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — опытный SMM-аналитик с глубоким знанием особенностей продвижения в Telegram и ВКонтакте.

Твоя задача: проанализировать статистику канала/сообщества и дать 3-4 конкретные практические рекомендации на русском языке.

Правила вывода:
1. Отвечай СТРОГО в формате JSON: {"recommendations":[{"title":"...","text":"..."}]}
2. Ровно 3-4 рекомендации — не меньше, не больше
3. Каждая рекомендация: title (3-7 слов) + text (2-4 предложения, конкретно и практично)
4. Никаких комментариев вне JSON — только объект JSON

Данные для анализа (в user-сообщении):
- network: платформа (telegram / vk)
- summary.avg_views: средние просмотры на пост
- summary.engagement_rate: % вовлечённости (реакции+репосты / просмотры)
- growth: динамика за период (null = нет данных)
- best_time: лучший день/час публикаций (day_of_week 0=вс, avg_views)
- top_posts: топ посты с числом просмотров и вовлечённостью

Как использовать данные:
- Если best_time != null — дай конкретный совет по времени публикаций с числами
- Если engagement_rate < 2% — фокус на вовлечённости (призывы, форматы, темы)
- Если engagement_rate > 5% — акцент на масштабировании охвата
- Если growth.views < 0 — причина и что изменить
- Для telegram: реакции, репосты, комментарии — основные метрики
- Для vk: лайки, комментарии, репосты — основные метрики

Дни недели: 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб

Примеры хороших рекомендаций:
{"title":"Публикуйте в четверг в 19:00","text":"Тепловая карта показывает, что посты в четверг в 19:00 собирают максимальные просмотры. Запланируйте ключевой контент на это время. Используйте отложенные публикации."}
{"title":"Работайте над вовлечённостью","text":"Вовлечённость 1.2% — ниже среднего. Добавляйте вопросы к постам, проводите голосования, отвечайте на комментарии. Цель — 3% ER."}

Плохой пример (не используй):
{"title":"Улучшите контент","text":"Старайтесь делать более качественный контент."}`;

export class AiServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export async function generateInsights(input: InsightsInput): Promise<InsightsPayload> {
  const userPayload = JSON.stringify({
    network:    input.network,
    title:      input.title,
    period:     input.period,
    followers:  input.followers,
    summary:    input.summary,
    growth:     input.growth,
    best_time:  input.best_time,
    top_posts:  input.top_posts.slice(0, 3),
  });

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 1024,
      system: [
        {
          type:          "text",
          text:          SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role:    "user",
          content: `Данные канала/сообщества:\n${userPayload}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new AiServiceError(502, "Empty response from AI");
    }

    const raw = textBlock.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed: { recommendations: { title: string; text: string }[] };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      logger.error({ raw }, "AI response JSON parse failed");
      throw new AiServiceError(502, "AI returned invalid JSON");
    }

    if (!Array.isArray(parsed.recommendations) || parsed.recommendations.length === 0) {
      throw new AiServiceError(502, "AI returned unexpected structure");
    }

    return {
      recommendations: parsed.recommendations.map((r) => ({
        title: String(r.title ?? ""),
        text:  String(r.text ?? ""),
      })),
      generated_at: new Date().toISOString(),
      period:       input.period,
    };
  } catch (err) {
    if (err instanceof AiServiceError) throw err;

    if (err instanceof Anthropic.RateLimitError) {
      throw new AiServiceError(429, "AI service rate limit exceeded");
    }
    if (err instanceof Anthropic.InternalServerError) {
      throw new AiServiceError(503, "AI service unavailable");
    }
    if (err instanceof Anthropic.APIError && err.status >= 500) {
      throw new AiServiceError(503, "AI service error");
    }

    logger.error({ err }, "AI service unexpected error");
    throw new AiServiceError(503, "AI service failed");
  }
}

import Anthropic from "@anthropic-ai/sdk";
import type { AiLocale, Confidence, InsightsInput, InsightsPayload } from "../types/insights";
import { logger } from "../lib/logger";

export type AlertCopyInput = {
  locale: "ru" | "en";
  channelTitle: string;
  curER: number;
  prevER: number;
  dropPct: number | null;
  kind: "drop" | "ok";
};

export type AlertCopy = {
  subject: string;
  bodyHtml: string;
};

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Optional egress relay (e.g. Cloudflare Worker) for hosts where
  // api.anthropic.com is unreachable (RU). Empty = direct call.
  baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
});

const SYSTEM_PROMPT_RU = `Ты — опытный SMM-аналитик с глубоким знанием продвижения в Telegram и ВКонтакте.

Задача: проанализировать статистику канала/сообщества и дать главный вывод + 3-4 конкретные рекомендации на русском языке.

Формат вывода — СТРОГО JSON, без текста вне объекта:
{"headline":"...","recommendations":[{"title":"...","text":"...","priority":1,"confidence":"high"}]}

Правила:
1. headline — одно предложение: самый важный вывод по этим данным.
2. Ровно 3-4 рекомендации.
3. Каждая: title (3-7 слов), text (2-4 предложения, конкретно), priority (1=делать первым, 2, 3), confidence ("high"|"medium"|"low").
4. priority уникальны и осмысленны: 1 — даёт наибольший эффект.
5. Не повторяй одну мысль в двух рекомендациях.
6. Только JSON, без markdown-обёртки.

Данные (в user-сообщении):
- data_quality.level: надёжность данных ("low"|"medium"|"high") и post_count
- summary.avg_views, summary.engagement_rate (% = (реакции+репосты)/просмотры)
- growth: динамика за период (null = нет данных)
- best_time: лучший день/час (может быть null)
- top_posts: топ-посты

КАЛИБРОВКА ПО data_quality.level (критично):
- "low": данных мало, выводы предварительны. Пиши осторожно ("вероятно", "на ограниченных данных"). confidence не выше "low". НЕ давай советов про лучшее время постинга. Фокус: базовые вещи — наращивание аудитории, структура контента, призывы к действию.
- "medium": умеренная уверенность, confidence до "medium". Время постинга — только если best_time != null.
- "high": полный анализ, тренды, можно "high" confidence.

Доп. правила:
- best_time == null → НЕ упоминай конкретные дни/часы публикаций.
- engagement_rate низкий → фокус на вовлечённости (вопросы, опросы, форматы).
- engagement_rate высокий И данных достаточно → акцент на охвате/масштабировании.
- growth.views < 0 → причина и что изменить.

Дни недели: 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб.

Хорошо: {"title":"Наращивайте аудиторию","text":"При 3 подписчиках метрики ещё не репрезентативны. Сфокусируйтесь на первых 100-500 подписчиках через тематические чаты и сообщества.","priority":1,"confidence":"low"}
Плохо: {"title":"Улучшите контент","text":"Делайте контент лучше.","priority":1,"confidence":"high"}`;

const SYSTEM_PROMPT_EN = `You are an experienced SMM analyst with deep expertise in Telegram and VK growth.

Task: analyze channel/community statistics and produce one headline takeaway + 3-4 concrete recommendations in English.

Output — STRICT JSON, nothing outside the object:
{"headline":"...","recommendations":[{"title":"...","text":"...","priority":1,"confidence":"high"}]}

Rules:
1. headline — one sentence: the single most important takeaway from this data.
2. Exactly 3-4 recommendations.
3. Each: title (3-7 words), text (2-4 sentences, concrete), priority (1=do first, 2, 3), confidence ("high"|"medium"|"low").
4. priority values are distinct and meaningful: 1 has the biggest impact.
5. Do not repeat the same idea across recommendations.
6. JSON only, no markdown wrapper.

Data (in the user message):
- data_quality.level: data reliability ("low"|"medium"|"high") and post_count
- summary.avg_views, summary.engagement_rate (% = (reactions+reposts)/views)
- growth: change over the period (null = no data)
- best_time: best day/hour (may be null)
- top_posts: top posts

CALIBRATION BY data_quality.level (critical):
- "low": little data, conclusions are preliminary. Use cautious wording ("likely", "on limited data"). confidence no higher than "low". Do NOT give best-posting-time advice. Focus: fundamentals — audience growth, content structure, calls to action.
- "medium": moderate certainty, confidence up to "medium". Posting-time advice only if best_time != null.
- "high": full analysis, trends, "high" confidence allowed.

Extra rules:
- best_time == null → do NOT mention specific posting days/hours.
- low engagement_rate → focus on engagement (questions, polls, formats).
- high engagement_rate AND enough data → focus on reach/scaling.
- growth.views < 0 → cause and what to change.

Weekdays: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.

Good: {"title":"Grow your audience first","text":"With 3 subscribers the metrics aren't representative yet. Focus on the first 100-500 followers via niche chats and communities.","priority":1,"confidence":"low"}
Bad: {"title":"Improve content","text":"Make better content.","priority":1,"confidence":"high"}`;

function promptFor(locale: AiLocale): string {
  return locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_RU;
}

function normConfidence(v: unknown): Confidence {
  return v === "high" || v === "medium" || v === "low" ? v : "medium";
}

function clampPriority(v: unknown, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 3 ? n : fallback;
}

const ALERT_SYSTEM_RU = `Ты — SMM-аналитик MetriqFlow. Пишешь короткое email-уведомление об изменении вовлечённости Telegram-канала.

Формат вывода — СТРОГО JSON без текста вне объекта:
{"subject":"...","bodyHtml":"..."}

Правила:
- subject: до 80 символов. Emoji в начале: ⚠️ если падение, ✅ если всё хорошо.
- bodyHtml: HTML, max 200 слов. Стиль: дружелюбный, конкретный. 2-3 абзаца.
- kind="drop": одна гипотеза причины + 1 конкретный совет.
- kind="ok": похвали результат + 1 совет для дальнейшего роста.
- В конце добавь: <p style="color:#888;font-size:13px">— MetriqFlow</p>
- Только JSON, без markdown.`;

const ALERT_SYSTEM_EN = `You are an SMM analyst for MetriqFlow. Write a short email notification about a Telegram channel's engagement change.

Output format — STRICT JSON, nothing outside the object:
{"subject":"...","bodyHtml":"..."}

Rules:
- subject: max 80 chars. Leading emoji: ⚠️ for drop, ✅ for good news.
- bodyHtml: HTML, max 200 words. Tone: friendly, concrete. 2-3 paragraphs.
- kind="drop": one hypothesis for the cause + 1 concrete tip.
- kind="ok": praise the result + 1 tip to push further.
- End with: <p style="color:#888;font-size:13px">— MetriqFlow</p>
- JSON only, no markdown.`;

export async function generateAlertCopy(input: AlertCopyInput): Promise<AlertCopy> {
  const systemPrompt = input.locale === "en" ? ALERT_SYSTEM_EN : ALERT_SYSTEM_RU;
  const payload = JSON.stringify({
    channelTitle: input.channelTitle,
    curER:        `${input.curER.toFixed(2)}%`,
    prevER:       `${input.prevER.toFixed(2)}%`,
    dropPct:      input.dropPct !== null ? `${input.dropPct.toFixed(1)}%` : null,
    kind:         input.kind,
  });

  const response = await client.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 512,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: payload }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new AiServiceError(502, "Empty alert copy response");
  }

  const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  let parsed: { subject?: string; bodyHtml?: string };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new AiServiceError(502, "AI returned invalid alert copy JSON");
  }

  if (!parsed.subject || !parsed.bodyHtml) {
    throw new AiServiceError(502, "AI alert copy missing subject or bodyHtml");
  }

  return { subject: String(parsed.subject), bodyHtml: String(parsed.bodyHtml) };
}

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
    network:      input.network,
    title:        input.title,
    period:       input.period,
    followers:    input.followers,
    summary:      input.summary,
    data_quality: input.data_quality,
    growth:       input.growth,
    best_time:    input.best_time,
    top_posts:    input.top_posts.slice(0, 3),
  });

  const userLead = input.locale === "en"
    ? `Channel/community data:\n${userPayload}`
    : `Данные канала/сообщества:\n${userPayload}`;

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 1024,
      system: [
        {
          type:          "text",
          text:          promptFor(input.locale),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userLead }],
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

    let parsed: {
      headline?: string;
      recommendations: { title: string; text: string; priority?: unknown; confidence?: unknown }[];
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      logger.error({ raw }, "AI response JSON parse failed");
      throw new AiServiceError(502, "AI returned invalid JSON");
    }

    if (!Array.isArray(parsed.recommendations) || parsed.recommendations.length === 0) {
      throw new AiServiceError(502, "AI returned unexpected structure");
    }

    const recommendations = parsed.recommendations.map((r, i) => ({
      title:      String(r.title ?? ""),
      text:       String(r.text ?? ""),
      priority:   clampPriority(r.priority, i + 1),
      confidence: normConfidence(r.confidence),
    }));
    recommendations.sort((a, b) => a.priority - b.priority);

    return {
      headline:        String(parsed.headline ?? ""),
      recommendations,
      data_quality:    input.data_quality,   // authoritative — computed deterministically, not by AI
      generated_at:    new Date().toISOString(),
      period:          input.period,
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

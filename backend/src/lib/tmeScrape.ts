import { parse } from "node-html-parser";

export type TmePost = {
  msg_id:    number;
  views:     number | null;
  reactions: number | null;
  date:      Date;
};

export type TmeChannel = {
  username:    string;
  title:       string | null;
  photo_url:   string | null;
  subscribers: number | null;
  posts:       TmePost[];
  preview_ok:  boolean;
};

/** Parse "1.2K" → 1200, "3M" → 3_000_000, "950" → 950 */
function parseHumanInt(s: string): number | null {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return null;
  const m = t.match(/^([\d.]+)([KkMm]?)$/);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  if (isNaN(n)) return null;
  const suffix = m[2]!.toUpperCase();
  if (suffix === "K") return Math.round(n * 1_000);
  if (suffix === "M") return Math.round(n * 1_000_000);
  return Math.round(n);
}

export async function fetchTmeChannel(
  username: string,
  opts?: { before?: number; pages?: number }
): Promise<TmeChannel> {
  const maxPages  = opts?.pages ?? 5;
  const allPosts: TmePost[] = [];
  let   title:       string | null = null;
  let   photo_url:   string | null = null;
  let   subscribers: number | null = null;
  let   preview_ok = false;
  let   beforeId   = opts?.before;

  const base    = `https://t.me/s/${encodeURIComponent(username)}`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  for (let page = 0; page < maxPages; page++) {
    const url = beforeId ? `${base}?before=${beforeId}` : base;
    let html: string;
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) break;
      html = await res.text();
    } catch {
      break;
    }

    const root = parse(html);

    // Parse channel meta only on first page
    if (page === 0) {
      const titleEl = root.querySelector(".tgme_channel_info_header_title");
      if (titleEl) title = titleEl.text.trim() || null;

      const photoEl = root.querySelector(".tgme_page_photo_image img");
      if (photoEl) photo_url = photoEl.getAttribute("src") ?? null;

      const counters = root.querySelectorAll(".tgme_channel_info_counter");
      for (const c of counters) {
        const typeText = c.querySelector(".counter_type")?.text?.trim()?.toLowerCase() ?? "";
        if (typeText.startsWith("subscriber") || typeText.startsWith("подписчик")) {
          const valText = c.querySelector(".counter_value")?.text?.trim() ?? "";
          subscribers = parseHumanInt(valText);
          break;
        }
      }
    }

    const messages = root.querySelectorAll(".tgme_widget_message");
    if (messages.length === 0) break;

    preview_ok = true;

    let oldestId: number | null = null;

    for (const msg of messages) {
      const dataPost = msg.getAttribute("data-post") ?? "";
      const parts    = dataPost.split("/");
      const msgId    = parseInt(parts[parts.length - 1] ?? "", 10);
      if (isNaN(msgId)) continue;

      const viewsText = msg.querySelector(".tgme_widget_message_views")?.text?.trim() ?? "";
      const views     = viewsText ? parseHumanInt(viewsText) : null;

      const dateAttr = msg.querySelector(".tgme_widget_message_date time[datetime]")?.getAttribute("datetime") ?? "";
      const date     = dateAttr ? new Date(dateAttr) : null;
      if (!date || isNaN(date.getTime())) continue;

      const reactionNodes = msg.querySelectorAll(".tgme_reaction");
      let reactions: number | null = null;
      if (reactionNodes.length > 0) {
        let sum = 0;
        for (const r of reactionNodes) {
          // Text content is like "10.3K" after the icon/emoji element — strip non-numeric prefix
          const raw  = r.text.trim();
          // Remove leading emoji/icon chars: find the last segment that looks like a number/K/M
          const match = raw.match(/([\d.]+[KkMm]?)$/);
          if (match) {
            const n = parseHumanInt(match[1]!);
            if (n !== null) sum += n;
          }
        }
        if (sum > 0) reactions = sum;
      }

      allPosts.push({ msg_id: msgId, views, reactions, date });
      if (oldestId === null || msgId < oldestId) oldestId = msgId;
    }

    // Stop paginating if we got fewer than ~5 posts (sparse channel) or no oldest id
    if (oldestId === null || messages.length < 5) break;

    beforeId = oldestId;
  }

  return { username, title, photo_url, subscribers, posts: allPosts, preview_ok };
}

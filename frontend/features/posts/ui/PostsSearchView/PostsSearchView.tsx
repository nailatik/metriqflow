"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { http } from "@/shared/lib/axios";
import { TelegramIcon, VKIcon } from "@/shared/ui/PlatformIcon/PlatformIcon";
import { postsService } from "@/entities/post/api/postsService";
import type {
  TelegramPost, VkPost,
  TgSearchResult, VkSearchResult,
} from "@/entities/post/types";
import type { TgChannel } from "@/entities/integration/types";
import type { Community } from "@/entities/community/types";

type Platform = "tg" | "vk";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function calcER(views: number, a: number, b: number): string | null {
  if (!views) return null;
  return `${((a + b) / views * 100).toFixed(2)}%`;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-surfaceMuted border border-border min-w-[72px]">
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-sm font-bold text-textMain tabular-nums">{value}</span>
      <span className="text-[9px] font-semibold text-textSecondary uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ─── PostModal ────────────────────────────────────────────────────────────────

type ModalPost =
  | { platform: "tg"; post: TelegramPost; channelTitle: string; channelUsername: string | null }
  | { platform: "vk"; post: VkPost; communityName: string; communityId: string; screenName: string | null };

function PostModal({ data, onClose, t }: {
  data: ModalPost;
  onClose: () => void;
  t: ReturnType<typeof useTranslations<"PostsSearch">>;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const isTg = data.platform === "tg";

  const title = isTg ? data.channelTitle : data.communityName;
  const text  = isTg ? data.post.text   : data.post.text;
  const postedAt = isTg ? data.post.posted_at : data.post.posted_at;
  const hasMedia = isTg ? data.post.has_media  : data.post.has_media;

  const views = isTg ? (data.post.views ?? 0)          : data.post.views;
  const react  = isTg ? (data.post.reactions_total ?? 0): data.post.likes;
  const fwd    = isTg ? (data.post.forwards ?? 0)       : data.post.reposts;
  const cmts   = isTg ? (data.post.comments ?? 0)       : data.post.comments;
  const er     = calcER(views, react, fwd);

  let link: string | null = null;
  if (isTg && data.channelUsername) {
    link = `https://t.me/${data.channelUsername}/${data.post.message_id}`;
  } else if (!isTg) {
    link = `https://vk.com/wall-${data.communityId}_${data.post.id}`;
  }

  const accentGradient = isTg
    ? "from-sky-500/20 via-sky-500/5 to-transparent"
    : "from-blue-600/20 via-blue-600/5 to-transparent";

  const platformBadge = isTg
    ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-500 border border-sky-500/25"><TelegramIcon className="w-3 h-3" /> Telegram</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/15 text-blue-500 border border-blue-600/25"><VKIcon className="w-3 h-3" /> VK</span>;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-surface rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className={`bg-gradient-to-b ${accentGradient} px-5 pt-5 pb-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {platformBadge}
                {hasMedia && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                    📎 {t("hasMedia")}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-textSecondary mt-0.5">{t("modalChannel")}</p>
              <p className="text-base font-bold text-textMain truncate">{title}</p>
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 p-1.5 rounded-xl hover:bg-border/60 text-textSecondary transition shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Date under header */}
          <p className="text-[11px] text-textSecondary mt-2 flex items-center gap-1.5">
            <span>🕐</span>{fmtDateLong(postedAt)}
          </p>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 px-5 pb-5 overflow-y-auto">
          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            <StatTile icon="👁" label={t("statViews")}     value={fmtNum(views)} />
            <StatTile icon={isTg ? "❤️" : "👍"} label={isTg ? t("statReactions") : t("statLikes")} value={fmtNum(react)} />
            <StatTile icon="↗"  label={isTg ? t("statForwards") : t("statReposts")} value={fmtNum(fwd)} />
            <StatTile icon="💬" label={t("statComments")}  value={fmtNum(cmts)} />
            {er && <StatTile icon="📊" label={t("statER")} value={er} />}
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Text */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-widest">{t("modalText")}</p>
            {text?.trim() ? (
              <p className="text-sm text-textMain leading-relaxed whitespace-pre-wrap break-words">
                {text.trim()}
              </p>
            ) : (
              <p className="text-sm text-textSecondary italic">{t("noText")}</p>
            )}
          </div>

          {/* Link */}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <span>🔗</span>
              <span>{isTg ? t("openTelegram") : t("openVk")}</span>
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── PostRow ──────────────────────────────────────────────────────────────────

function PostRow({
  text, views, secondary, date, hasMedia, onClick,
}: {
  text: string | null;
  views: number | null | undefined;
  secondary?: { icon: string; value: number }[];
  date: string;
  hasMedia: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex flex-col gap-2 p-4 rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-card transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-textMain leading-snug line-clamp-3 flex-1 min-w-0">
          {text?.trim() || <span className="text-textSecondary italic">—</span>}
        </p>
        <div className="flex flex-col items-end gap-1 shrink-0 text-[11px] text-textSecondary whitespace-nowrap">
          <span className="font-medium text-textMain">👁 {fmtNum(views)}</span>
          {secondary?.filter((s) => s.value > 0).map((s) => (
            <span key={s.icon}>{s.icon} {fmtNum(s.value)}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-textSecondary">{fmtDateShort(date)}</p>
        {hasMedia && <span className="text-[10px] text-textSecondary">📎</span>}
      </div>
    </button>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const start = Math.max(1, page - 2);
  const end   = Math.min(pages, page + 2);
  const nums  = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const btn = (label: string | number, target: number, disabled: boolean, active = false) => (
    <button
      key={label}
      disabled={disabled}
      onClick={() => onChange(target)}
      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
        active    ? "bg-primary text-onAccent"
        : disabled ? "text-textSecondary opacity-40 cursor-not-allowed"
        : "hover:bg-surfaceMuted text-textSecondary"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      {btn("‹", page - 1, page <= 1)}
      {start > 1 && <>{btn(1, 1, false)}{start > 2 && <span className="text-textSecondary text-sm px-1">…</span>}</>}
      {nums.map((n) => btn(n, n, false, n === page))}
      {end < pages && <>{end < pages - 1 && <span className="text-textSecondary text-sm px-1">…</span>}{btn(pages, pages, false)}</>}
      {btn("›", page + 1, page >= pages)}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const EMPTY_FILTERS = { q: "", from: "", to: "", sort: "date" as "views" | "date" };

export function PostsSearchView() {
  const t = useTranslations("PostsSearch");

  const [platform, setPlatform] = useState<Platform>("tg");

  // TG
  const [tgChannels, setTgChannels]   = useState<TgChannel[]>([]);
  const [channelId, setChannelId]     = useState<number | null>(null);
  const [tgLoading, setTgLoading]     = useState(true);

  // VK
  const [vkCommunities, setVkCommunities] = useState<Community[]>([]);
  const [communityId, setCommunityId]     = useState<number | null>(null);
  const [vkLoading, setVkLoading]         = useState(true);

  // Shared filters
  const [q, setQ]       = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo]     = useState("");
  const [sort, setSort] = useState<"views" | "date">("date");
  const [page, setPage] = useState(1);

  // Results
  const [tgResult, setTgResult] = useState<TgSearchResult | null>(null);
  const [vkResult, setVkResult] = useState<VkSearchResult | null>(null);
  const [loading, setLoading]   = useState(false);

  // Modal
  const [modal, setModal] = useState<ModalPost | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilters = q !== "" || from !== "" || to !== "" || sort !== "date";
  const resetFilters = () => { setQ(""); setFrom(""); setTo(""); setSort("date"); setPage(1); };

  // Load TG channels
  useEffect(() => {
    http.get<TgChannel[]>("/integrations/telegram/channels")
      .then((r) => { setTgChannels(r.data); if (r.data.length > 0) setChannelId(r.data[0].id); })
      .catch(() => {})
      .finally(() => setTgLoading(false));
  }, []);

  // Load VK communities
  useEffect(() => {
    http.get<Community[]>("/vk/communities")
      .then((r) => { setVkCommunities(r.data); if (r.data.length > 0) setCommunityId(r.data[0].id); })
      .catch(() => {})
      .finally(() => setVkLoading(false));
  }, []);

  const fetchTg = useCallback((id: number, filters: typeof EMPTY_FILTERS, pg: number) => {
    setLoading(true);
    postsService.searchTg({
      channelId: id,
      q: filters.q || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      sort: filters.sort,
      page: pg, limit: 20,
    })
      .then((r) => setTgResult(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchVk = useCallback((id: number, filters: typeof EMPTY_FILTERS, pg: number) => {
    setLoading(true);
    postsService.searchVk({
      communityId: id,
      q: filters.q || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      sort: filters.sort,
      page: pg, limit: 20,
    })
      .then((r) => setVkResult(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = q ? 400 : 0;

    if (platform === "tg" && channelId) {
      debounceRef.current = setTimeout(() => fetchTg(channelId, { q, from, to, sort }, page), delay);
    } else if (platform === "vk" && communityId) {
      debounceRef.current = setTimeout(() => fetchVk(communityId, { q, from, to, sort }, page), delay);
    }

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [platform, channelId, communityId, q, from, to, sort, page, fetchTg, fetchVk]);

  const onFilter = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value); setPage(1);
  };

  const inputCls = "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textSecondary focus:outline-none focus:border-primary transition";

  const activeTgChannel   = tgChannels.find((c) => c.id === channelId) ?? null;
  const activeCommunity   = vkCommunities.find((c) => c.id === communityId) ?? null;
  const result            = platform === "tg" ? tgResult : vkResult;
  const sourceLoading     = platform === "tg" ? tgLoading : vkLoading;
  const hasSource         = platform === "tg" ? tgChannels.length > 0 : vkCommunities.length > 0;
  const activeId          = platform === "tg" ? channelId : communityId;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      {/* Title + platform toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>
        <div className="flex gap-1 p-1 rounded-xl bg-border/40">
          {(["tg", "vk"] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPlatform(p); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                platform === p ? "bg-surface text-textMain shadow-sm" : "text-textSecondary hover:text-textMain"
              }`}
            >
              {p === "tg"
                ? <span className="flex items-center gap-1.5"><TelegramIcon className="w-3.5 h-3.5 text-sky-500" /> Telegram</span>
                : <span className="flex items-center gap-1.5"><VKIcon className="w-3.5 h-3.5 text-blue-500" /> VK</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Source selector */}
        {platform === "tg" ? (
          <select
            value={channelId ?? ""}
            onChange={(e) => { setChannelId(Number(e.target.value)); setPage(1); }}
            disabled={sourceLoading || !hasSource}
            className={`${inputCls} max-w-[220px]`}
          >
            {sourceLoading && <option>{t("loadingChannels")}</option>}
            {!sourceLoading && !hasSource && <option>{t("noChannels")}</option>}
            {tgChannels.map((ch) => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
          </select>
        ) : (
          <select
            value={communityId ?? ""}
            onChange={(e) => { setCommunityId(Number(e.target.value)); setPage(1); }}
            disabled={sourceLoading || !hasSource}
            className={`${inputCls} max-w-[220px]`}
          >
            {sourceLoading && <option>{t("loadingChannels")}</option>}
            {!sourceLoading && !hasSource && <option>{t("noCommunities")}</option>}
            {vkCommunities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={q}
          onChange={onFilter(setQ)}
          className={`${inputCls} flex-1 min-w-[160px]`}
        />

        {/* Date from */}
        <label className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-surface focus-within:border-primary transition cursor-pointer">
          <span className="text-xs font-medium text-textSecondary whitespace-nowrap">{t("from")}</span>
          <input type="date" value={from} onChange={onFilter(setFrom)} className="bg-transparent text-sm text-textMain focus:outline-none w-[120px]" />
        </label>

        {/* Date to */}
        <label className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-surface focus-within:border-primary transition cursor-pointer">
          <span className="text-xs font-medium text-textSecondary whitespace-nowrap">{t("to")}</span>
          <input type="date" value={to} onChange={onFilter(setTo)} className="bg-transparent text-sm text-textMain focus:outline-none w-[120px]" />
        </label>

        {/* Sort */}
        <select value={sort} onChange={(e) => { setSort(e.target.value as "views" | "date"); setPage(1); }} className={`${inputCls} w-[160px]`}>
          <option value="date">{t("sortDate")}</option>
          <option value="views">{t("sortViews")}</option>
        </select>

        {/* Reset */}
        {hasFilters && (
          <button onClick={resetFilters} className="px-3 py-2 rounded-lg text-sm text-textSecondary hover:bg-border hover:text-textMain transition whitespace-nowrap">
            × {t("resetFilters")}
          </button>
        )}
      </div>

      {/* No source */}
      {!sourceLoading && !hasSource && (
        <p className="text-textSecondary text-sm">
          {platform === "tg" ? t("noChannelsHint") : t("noCommunitiesHint")}
        </p>
      )}

      {/* Note for VK */}
      {platform === "vk" && hasSource && (
        <p className="text-[11px] text-textSecondary bg-border/30 rounded-lg px-3 py-2">
          {t("vkNote")}
        </p>
      )}

      {/* Results */}
      {activeId && (
        <>
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-border/40 animate-pulse" />)}
            </div>
          )}

          {!loading && result && result.posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-textSecondary gap-2">
              <span className="text-4xl">🔍</span>
              <p className="text-sm">{t("noResults")}</p>
            </div>
          )}

          {!loading && result && result.posts.length > 0 && (
            <>
              <p className="text-xs text-textSecondary">{t("totalResults", { total: result.total })}</p>
              <div className="flex flex-col gap-3">
                {platform === "tg"
                  ? (result as TgSearchResult).posts.map((post) => (
                      <PostRow
                        key={post.id}
                        text={post.text}
                        views={post.views}
                        secondary={[
                          { icon: "❤️", value: post.reactions_total ?? 0 },
                          { icon: "↗",  value: post.forwards ?? 0 },
                        ]}
                        date={post.posted_at}
                        hasMedia={post.has_media}
                        onClick={() => setModal({
                          platform: "tg", post,
                          channelTitle:    activeTgChannel?.title    ?? "",
                          channelUsername: activeTgChannel?.username ?? null,
                        })}
                      />
                    ))
                  : (result as VkSearchResult).posts.map((post) => (
                      <PostRow
                        key={post.id}
                        text={post.text}
                        views={post.views}
                        secondary={[
                          { icon: "👍", value: post.likes },
                          { icon: "↗",  value: post.reposts },
                        ]}
                        date={post.posted_at}
                        hasMedia={post.has_media}
                        onClick={() => setModal({
                          platform: "vk", post,
                          communityName: activeCommunity?.name       ?? "",
                          communityId:   (result as VkSearchResult).community_id,
                          screenName:    activeCommunity?.screen_name ?? null,
                        })}
                      />
                    ))
                }
              </div>
              <Pagination page={result.page} pages={result.pages} onChange={setPage} />
            </>
          )}
        </>
      )}

      {modal && <PostModal data={modal} onClose={() => setModal(null)} t={t} />}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { http } from "@/shared/lib/axios";
import { postsService } from "@/entities/post/api/postsService";
import type { TelegramPost, PostsSearchResult } from "@/entities/post/types";
import type { TgChannel } from "@/entities/integration/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1_000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ─── PostRow ──────────────────────────────────────────────────────────────────

function PostRow({ post }: { post: TelegramPost }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl border border-border bg-surface hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-textMain leading-snug line-clamp-3 flex-1 min-w-0">
          {post.text?.trim() || <span className="text-textSecondary italic">—</span>}
        </p>
        <div className="flex flex-col items-end gap-1 shrink-0 text-[11px] text-textSecondary whitespace-nowrap">
          <span>👁 {fmtNum(post.views)}</span>
          {(post.reactions_total ?? 0) > 0 && <span>❤️ {fmtNum(post.reactions_total)}</span>}
          {(post.forwards ?? 0) > 0 && <span>↗ {fmtNum(post.forwards)}</span>}
        </div>
      </div>
      <p className="text-[11px] text-textSecondary">{fmtDate(post.posted_at)}</p>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;

  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const btn = (label: string | number, target: number, disabled: boolean, active = false) => (
    <button
      key={label}
      disabled={disabled}
      onClick={() => onChange(target)}
      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-primary text-white"
          : disabled
          ? "text-textSecondary opacity-40 cursor-not-allowed"
          : "hover:bg-border text-textSecondary"
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

export function PostsSearchView() {
  const t = useTranslations("PostsSearch");

  const [channels, setChannels] = useState<TgChannel[]>([]);
  const [channelId, setChannelId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"views" | "date">("date");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<PostsSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    http
      .get<TgChannel[]>("/integrations/telegram/channels")
      .then((res) => {
        setChannels(res.data);
        if (res.data.length > 0) setChannelId(res.data[0].id);
      })
      .catch(() => {})
      .finally(() => setChannelsLoading(false));
  }, []);

  const fetchPosts = useCallback(
    (opts: {
      channelId: number;
      q: string;
      from: string;
      to: string;
      sort: "views" | "date";
      page: number;
    }) => {
      setLoading(true);
      postsService
        .search({
          channelId: opts.channelId,
          q: opts.q || undefined,
          from: opts.from || undefined,
          to: opts.to || undefined,
          sort: opts.sort,
          page: opts.page,
          limit: 20,
        })
        .then((res) => setResult(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    if (!channelId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPosts({ channelId, q, from, to, sort, page });
    }, q ? 400 : 0);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [channelId, q, from, to, sort, page, fetchPosts]);

  const handleChannelChange = (id: number) => {
    setChannelId(id);
    setPage(1);
  };

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const inputCls = "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textSecondary focus:outline-none focus:border-primary transition";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Channel selector */}
        <select
          value={channelId ?? ""}
          onChange={(e) => handleChannelChange(Number(e.target.value))}
          disabled={channelsLoading || channels.length === 0}
          className={`${inputCls} max-w-[220px]`}
        >
          {channelsLoading && <option>{t("loadingChannels")}</option>}
          {!channelsLoading && channels.length === 0 && <option>{t("noChannels")}</option>}
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.title}
            </option>
          ))}
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={q}
          onChange={handleFilterChange(setQ)}
          className={`${inputCls} flex-1 min-w-[160px]`}
        />

        {/* Date from */}
        <input
          type="date"
          value={from}
          onChange={handleFilterChange(setFrom)}
          title={t("from")}
          className={`${inputCls} w-[148px]`}
        />

        {/* Date to */}
        <input
          type="date"
          value={to}
          onChange={handleFilterChange(setTo)}
          title={t("to")}
          className={`${inputCls} w-[148px]`}
        />

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as "views" | "date"); setPage(1); }}
          className={`${inputCls} w-[160px]`}
        >
          <option value="date">{t("sortDate")}</option>
          <option value="views">{t("sortViews")}</option>
        </select>
      </div>

      {/* No channels */}
      {!channelsLoading && channels.length === 0 && (
        <p className="text-textSecondary text-sm">{t("noChannelsHint")}</p>
      )}

      {/* Results */}
      {channelId && (
        <>
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-border/40 animate-pulse" />
              ))}
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
              <p className="text-xs text-textSecondary">
                {t("totalResults", { total: result.total })}
              </p>
              <div className="flex flex-col gap-3">
                {result.posts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
              <Pagination
                page={result.page}
                pages={result.pages}
                onChange={(p) => setPage(p)}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

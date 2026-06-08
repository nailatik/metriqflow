"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { http } from "@/shared/lib/axios";
import { TelegramIcon, VKIcon } from "@/shared/ui/PlatformIcon/PlatformIcon";
import { PostForm, type PlannedPost, type ChannelOption } from "../PostForm/PostForm";
import type { TgChannel } from "@/entities/integration/types";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-textSecondary/10 text-textSecondary",
  scheduled: "bg-primary/10 text-primary",
  sending:   "bg-primary/10 text-primary",
  sent:      "bg-success/10 text-success",
  failed:    "bg-error/10 text-error",
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
      {label}
    </span>
  );
}

// ─── Week calendar helpers ────────────────────────────────────────────────────

function getWeekDays(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const dow = start.getDay();
  const monday = (dow === 0 ? -6 : 1) - dow;
  start.setDate(start.getDate() + monday);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function fmt(utcIso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(utcIso).toLocaleString(undefined, opts);
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  statusLabel,
  onClick,
}: {
  post: PlannedPost;
  statusLabel: string;
  onClick: () => void;
}) {
  const platformIcon = post.platform === "tg"
    ? <TelegramIcon className="w-3.5 h-3.5 text-sky-500" />
    : <VKIcon className="w-3.5 h-3.5 text-blue-500" />;
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center">{platformIcon}</span>
          <span className="text-xs font-medium text-textSecondary truncate">{post.channel_title ?? post.channel_id}</span>
        </div>
        <StatusBadge status={post.status} label={statusLabel} />
      </div>
      {post.text && (
        <p className="text-sm text-textMain line-clamp-2 leading-snug">{post.text}</p>
      )}
      <p className="text-[11px] text-textSecondary">
        {fmt(post.scheduled_at, { hour: "2-digit", minute: "2-digit" })}
        {post.media_urls.length > 0 && ` · 🖼 ${post.media_urls.length}`}
      </p>
      {post.status === "failed" && post.error_message && (
        <p className="text-[10px] text-error truncate">{post.error_message}</p>
      )}
    </button>
  );
}

// ─── CalendarView (desktop lg+) ───────────────────────────────────────────────

function CalendarView({
  posts,
  weekBase,
  statusLabels,
  onPostClick,
  onDayClick,
  dayLabels,
}: {
  posts: PlannedPost[];
  weekBase: Date;
  statusLabels: Record<string, string>;
  onPostClick: (post: PlannedPost) => void;
  onDayClick: (date: Date) => void;
  dayLabels: string[];
}) {
  const days = getWeekDays(weekBase);
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, i) => {
        const isToday = sameDay(day, today);
        const dayPosts = posts.filter((p) => sameDay(new Date(p.scheduled_at), day));
        return (
          <div key={i} className="flex flex-col gap-1.5 min-h-[120px]">
            <button
              onClick={() => onDayClick(day)}
              className={`flex flex-col items-center py-1 rounded-lg transition-colors ${
                isToday ? "bg-primary/10" : "hover:bg-surfaceMuted"
              }`}
            >
              <span className="text-[10px] text-textSecondary uppercase tracking-wide">{dayLabels[day.getDay()]}</span>
              <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-textMain"}`}>
                {day.getDate()}
              </span>
            </button>
            <div className="flex flex-col gap-1">
              {dayPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  statusLabel={statusLabels[p.status] ?? p.status}
                  onClick={() => onPostClick(p)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AgendaView (phone/tablet < lg) ──────────────────────────────────────────

function AgendaView({
  posts,
  weekBase,
  statusLabels,
  onPostClick,
  onDayClick,
  dayLabels,
  t,
}: {
  posts: PlannedPost[];
  weekBase: Date;
  statusLabels: Record<string, string>;
  onPostClick: (post: PlannedPost) => void;
  onDayClick: (date: Date) => void;
  dayLabels: string[];
  t: ReturnType<typeof useTranslations<"ContentPlanner">>;
}) {
  const days = getWeekDays(weekBase);
  const today = new Date();

  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const todayInWeek = days.find((d) => sameDay(d, today));
    return todayInWeek ?? days[0];
  });

  // Reset selected day when week changes
  useEffect(() => {
    const freshDays = getWeekDays(weekBase);
    const now = new Date();
    const todayInWeek = freshDays.find((d) => sameDay(d, now));
    setSelectedDay(todayInWeek ?? freshDays[0]);
  }, [weekBase]);

  const dayPosts = posts.filter((p) => sameDay(new Date(p.scheduled_at), selectedDay));

  return (
    <div className="flex flex-col gap-4">
      {/* Horizontally-scrollable day-picker strip */}
      <div className="overflow-x-auto -mx-5 px-5">
        <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
          {days.map((day, i) => {
            const isToday    = sameDay(day, today);
            const isSelected = sameDay(day, selectedDay);
            const count      = posts.filter((p) => sameDay(new Date(p.scheduled_at), day)).length;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 min-h-11 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  isSelected
                    ? "bg-primary text-onAccent"
                    : isToday
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-surfaceMuted text-textMain"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide leading-none">
                  {(dayLabels[day.getDay()] ?? "").slice(0, 3)}
                </span>
                <span className="text-sm font-bold leading-snug">{day.getDate()}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-primary/20 text-primary"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day posts + add button */}
      <div className="flex flex-col gap-2">
        {dayPosts.length === 0 && (
          <p className="text-sm text-textSecondary text-center py-6">{t("noPosts")}</p>
        )}
        {dayPosts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            statusLabel={statusLabels[p.status] ?? p.status}
            onClick={() => onPostClick(p)}
          />
        ))}
        <button
          onClick={() => onDayClick(selectedDay)}
          className="w-full py-2.5 rounded-lg border border-dashed border-border text-sm text-textSecondary hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          + {t("newPost")}
        </button>
      </div>
    </div>
  );
}

// ─── ListView ─────────────────────────────────────────────────────────────────

function ListView({
  posts,
  statusLabels,
  onPostClick,
  t,
}: {
  posts: PlannedPost[];
  statusLabels: Record<string, string>;
  onPostClick: (post: PlannedPost) => void;
  t: ReturnType<typeof useTranslations<"ContentPlanner">>;
}) {
  if (posts.length === 0) {
    return <p className="text-sm text-textSecondary text-center py-12">{t("noPosts")}</p>;
  }

  const sorted = [...posts].sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
  );

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((post) => (
        <div key={post.id} className="flex items-start gap-4">
          <div className="w-24 flex-shrink-0 text-right pt-3">
            <p className="text-xs font-medium text-textMain">
              {fmt(post.scheduled_at, { month: "short", day: "numeric" })}
            </p>
            <p className="text-[11px] text-textSecondary">
              {fmt(post.scheduled_at, { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <PostCard
              post={post}
              statusLabel={statusLabels[post.status] ?? post.status}
              onClick={() => onPostClick(post)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ContentPlannerView() {
  const t = useTranslations("ContentPlanner");

  const [posts,     setPosts]     = useState<PlannedPost[]>([]);
  const [channels,  setChannels]  = useState<ChannelOption[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [view,      setView]      = useState<"calendar" | "list">("calendar");
  const [weekBase,  setWeekBase]  = useState(() => new Date());
  const [formPost,  setFormPost]  = useState<PlannedPost | null | "new">(null);
  const [formDate,  setFormDate]  = useState<Date | null>(null);

  const statusLabels: Record<string, string> = {
    draft:     t("statuses.draft"),
    scheduled: t("statuses.scheduled"),
    sending:   t("statuses.sending"),
    sent:      t("statuses.sent"),
    failed:    t("statuses.failed"),
  };

  const dayLabels = t.raw("days") as string[];

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postsRes, tgRes] = await Promise.all([
        http.get<PlannedPost[]>("/content-posts"),
        http.get<TgChannel[]>("/integrations/telegram/channels").catch(() => ({ data: [] as TgChannel[] })),
      ]);
      setPosts(postsRes.data);

      const opts: ChannelOption[] = tgRes.data.map((c) => ({
        platform: "tg" as const,
        channel_id: c.channel_id,
        title: c.title,
      }));
      setChannels(opts);
    } catch {
      setError(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const handleSave = (saved: PlannedPost) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setFormPost(null);
    setFormDate(null);
  };

  const handleDelete = (id: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setFormPost(null);
    setFormDate(null);
  };

  const prevWeek = () => {
    setWeekBase((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  };
  const nextWeek = () => {
    setWeekBase((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  };
  const goToday = () => setWeekBase(new Date());

  const weekDays = getWeekDays(weekBase);
  const weekLabel = `${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const openNew = (date?: Date) => {
    setFormDate(date ?? null);
    setFormPost("new");
  };

  const syntheticInitialPost: PlannedPost | null =
    formPost === "new" && formDate
      ? ({
          id: 0,
          platform: channels[0]?.platform ?? "tg",
          channel_id: channels[0]?.channel_id ?? "",
          channel_title: channels[0]?.title ?? null,
          scheduled_at: (() => {
            const d = new Date(formDate);
            d.setHours(10, 0, 0, 0);
            return d.toISOString();
          })(),
          text: "",
          media_urls: [],
          status: "scheduled",
          error_message: null,
          sent_at: null,
          created_at: "",
          updated_at: "",
        } as PlannedPost)
      : null;

  const actualFormPost = formPost === "new"
    ? (formDate ? syntheticInitialPost : null)
    : formPost;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-textMain">{t("title")}</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View toggle — desktop only (phone always shows agenda) */}
          <div className="hidden lg:flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-2.5 sm:py-1.5 text-sm font-medium transition-colors ${
                view === "calendar" ? "bg-primary text-onAccent" : "text-textSecondary hover:bg-surfaceMuted"
              }`}
            >
              {t("calendarView")}
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2.5 sm:py-1.5 text-sm font-medium transition-colors ${
                view === "list" ? "bg-primary text-onAccent" : "text-textSecondary hover:bg-surfaceMuted"
              }`}
            >
              {t("listView")}
            </button>
          </div>
          <button
            onClick={() => openNew()}
            disabled={channels.length === 0}
            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg bg-primary text-onAccent text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            + {t("newPost")}
          </button>
        </div>
      </div>

      {/* No channels */}
      {!loading && channels.length === 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
          <p className="text-sm text-textSecondary">{t("noChannels")}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-error/5 border border-error/30 rounded-xl px-5 py-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && !error && (
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
          {/* Week nav — always on phone (agenda), desktop: calendar view only */}
          <div className={`flex items-center justify-between ${view !== "calendar" ? "lg:hidden" : ""}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={prevWeek}
                className="p-2 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-surfaceMuted text-textSecondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Previous week"
              >
                ‹
              </button>
              <button
                onClick={nextWeek}
                className="p-2 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-surfaceMuted text-textSecondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Next week"
              >
                ›
              </button>
              <span className="text-sm font-medium text-textMain">{weekLabel}</span>
            </div>
            <button
              onClick={goToday}
              className="text-xs text-primary hover:underline font-medium min-h-11 px-2 flex items-center"
            >
              {t("week")}
            </button>
          </div>

          {/* Desktop: calendar grid or list */}
          <div className="hidden lg:block">
            {view === "calendar" ? (
              <CalendarView
                posts={posts}
                weekBase={weekBase}
                statusLabels={statusLabels}
                onPostClick={(p) => setFormPost(p)}
                onDayClick={(date) => openNew(date)}
                dayLabels={dayLabels}
              />
            ) : (
              <ListView
                posts={posts}
                statusLabels={statusLabels}
                onPostClick={(p) => setFormPost(p)}
                t={t}
              />
            )}
          </div>

          {/* Phone/tablet: agenda view */}
          <div className="lg:hidden">
            <AgendaView
              posts={posts}
              weekBase={weekBase}
              statusLabels={statusLabels}
              onPostClick={(p) => setFormPost(p)}
              onDayClick={(date) => openNew(date)}
              dayLabels={dayLabels}
              t={t}
            />
          </div>
        </div>
      )}

      {/* Post form modal */}
      {formPost !== null && (
        <PostForm
          post={actualFormPost}
          channels={channels}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setFormPost(null); setFormDate(null); }}
        />
      )}
    </div>
  );
}

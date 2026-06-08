"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { http } from "@/shared/lib/axios";
import { TelegramIcon } from "@/shared/ui/PlatformIcon/PlatformIcon";

export type PlannedPost = {
  id: number;
  platform: "tg";
  channel_id: string;
  channel_title: string | null;
  scheduled_at: string;
  text: string;
  media_urls: string[];
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChannelOption = {
  platform: "tg";
  channel_id: string;
  title: string;
};

type Props = {
  post: PlannedPost | null;
  channels: ChannelOption[];
  onSave: (post: PlannedPost) => void;
  onDelete?: (id: number) => void;
  onClose: () => void;
};

function toLocalInputValue(utcIso: string): string {
  const d = new Date(utcIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDefaultDatetime(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PostForm({ post, channels, onSave, onDelete, onClose }: Props) {
  const t = useTranslations("ContentPlanner");

  const defaultChannel = channels[0] ?? null;
  const [channelId,     setChannelId]     = useState(post?.channel_id ?? defaultChannel?.channel_id ?? "");
  const [scheduledAt,   setScheduledAt]   = useState(post ? toLocalInputValue(post.scheduled_at) : getDefaultDatetime());
  const [text,          setText]          = useState(post?.text ?? "");
  const [mediaRaw,      setMediaRaw]      = useState((post?.media_urls ?? []).join("\n"));
  const [status,        setStatus]        = useState<"draft" | "scheduled">(
    post && (post.status === "draft" || post.status === "scheduled") ? post.status : "scheduled"
  );
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [bestTimeHint,  setBestTimeHint]  = useState<string | null>(null);
  const [loadingBest,   setLoadingBest]   = useState(false);

  const isEditing = !!post;
  const isReadonly = !!post && ["sending", "sent"].includes(post.status);

  useEffect(() => {
    if (!channels.find((c) => c.channel_id === channelId)) {
      setChannelId(channels[0]?.channel_id ?? "");
    }
  }, [channels, channelId]);

  const fetchBestTime = async () => {
    if (!channelId) {
      setBestTimeHint(t("bestTimeNotEnough"));
      return;
    }
    setLoadingBest(true);
    setBestTimeHint(null);
    try {
      const res = await http.get<{ day_of_week: number; hour: number; avg_views: number } | null>(
        `/content-posts/best-time?channel_id=${channelId}&platform=tg`
      );
      if (!res.data) {
        setBestTimeHint(t("bestTimeNotEnough"));
        return;
      }
      const { day_of_week, hour } = res.data;
      // Find the next occurrence of this weekday from today
      const now = new Date();
      const daysUntil = (day_of_week - now.getDay() + 7) % 7 || 7;
      const target = new Date(now);
      target.setDate(target.getDate() + daysUntil);
      target.setHours(hour, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      const val = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
      setScheduledAt(val);
      setBestTimeHint(`${t("bestTimeApplied")}: ${DAY_EN[day_of_week]} ${hour}:00`);
    } catch {
      setBestTimeHint(t("bestTimeNotEnough"));
    } finally {
      setLoadingBest(false);
    }
  };

  const BACKEND_ERROR_MAP: Record<string, string> = {
    "scheduled_at must be in the future for scheduled posts": t("errorPastDate"),
    "scheduled_at must be in the future": t("errorPastDate"),
  };

  const handleSave = async () => {
    setError(null);

    if (!text.trim()) {
      setError(t("errorTextRequired"));
      return;
    }
    if (new Date(scheduledAt) <= new Date()) {
      setError(t("errorPastDate"));
      return;
    }

    setSaving(true);
    try {
      const mediaUrls = mediaRaw.split("\n").map((s) => s.trim()).filter(Boolean);
      const selectedChannel = channels.find((c) => c.channel_id === channelId);
      const payload = {
        platform: "tg" as const,
        channel_id: channelId,
        channel_title: selectedChannel?.title ?? null,
        scheduled_at: new Date(scheduledAt).toISOString(),
        text: text.trim(),
        media_urls: mediaUrls,
        status,
      };

      let saved: PlannedPost;
      if (isEditing) {
        const res = await http.patch<PlannedPost>(`/content-posts/${post.id}`, payload);
        saved = res.data;
      } else {
        const res = await http.post<PlannedPost>("/content-posts", payload);
        saved = res.data;
      }
      onSave(saved);
    } catch (e: unknown) {
      const raw = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError((raw && BACKEND_ERROR_MAP[raw]) ?? raw ?? t("errorSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !onDelete) return;
    setDeleting(true);
    try {
      await http.delete(`/content-posts/${post.id}`);
      onDelete(post.id);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t("errorDelete"));
      setDeleting(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-border bg-surface">
          <h2 className="text-lg font-semibold text-textMain">
            {isEditing ? t("editPost") : t("createPost")}
          </h2>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
            <TelegramIcon className="w-3.5 h-3.5" /> Telegram
          </span>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {isReadonly && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm text-textSecondary">
              {post?.status === "sent" ? t("statuses.sent") : t("statuses.sending")}
            </div>
          )}

          {/* Channel */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textSecondary">{t("channel")}</label>
            <select
              disabled={isReadonly || isEditing}
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg text-textMain px-3 py-2 text-sm disabled:opacity-60"
            >
              {channels.length === 0 && (
                <option value="">{t("noChannels")}</option>
              )}
              {channels.map((c) => (
                <option key={c.channel_id} value={c.channel_id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date/time + best time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textSecondary">{t("scheduledAt")}</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                disabled={isReadonly}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-border bg-bg text-textMain px-3 py-2 text-sm disabled:opacity-60"
              />
              {!isReadonly && (
                <button
                  onClick={fetchBestTime}
                  disabled={loadingBest || !channelId}
                  title={t("bestTimeHint")}
                  className="px-3 py-2 rounded-lg border border-border text-textSecondary hover:bg-surfaceMuted text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {loadingBest ? "..." : `⚡ ${t("bestTime")}`}
                </button>
              )}
            </div>
            {bestTimeHint && (
              <p className="text-xs text-textSecondary">{bestTimeHint}</p>
            )}
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textSecondary">{t("text")}</label>
            <textarea
              disabled={isReadonly}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-border bg-bg text-textMain px-3 py-2 text-sm resize-y disabled:opacity-60"
            />
          </div>

          {/* Media URLs */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textSecondary">{t("mediaUrls")}</label>
            <textarea
              disabled={isReadonly}
              value={mediaRaw}
              onChange={(e) => setMediaRaw(e.target.value)}
              rows={3}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-bg text-textMain px-3 py-2 text-sm font-mono resize-y disabled:opacity-60"
            />
          </div>

          {/* Status toggle */}
          {!isReadonly && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStatus(status === "draft" ? "scheduled" : "draft")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  status === "scheduled" ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    status === "scheduled" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-textSecondary">
                {status === "scheduled" ? t("statuses.scheduled") : t("statuses.draft")}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-error/5 border border-error/30 rounded-xl px-4 py-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              {isEditing && onDelete && !isReadonly && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                >
                  {deleting ? "..." : t("delete")}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-textSecondary hover:bg-textSecondary/10 transition-colors"
              >
                {t("cancel")}
              </button>
              {!isReadonly && (
                <button
                  onClick={handleSave}
                  disabled={saving || !channelId}
                  className="px-4 py-2 rounded-lg bg-primary text-onAccent text-sm font-medium hover:bg-primaryHover transition-colors disabled:opacity-50"
                >
                  {saving ? "..." : t("save")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

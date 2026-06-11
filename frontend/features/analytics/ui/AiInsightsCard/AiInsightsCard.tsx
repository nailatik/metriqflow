"use client";

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { useUiStore, useAnalyticsStore } from "@/shared/store/StoreProvider";
import type { Confidence } from "@/shared/store/analyticsStore/types";

type Props = {
  network:  "telegram" | "vk";
  sourceId: number | string;
  period:   string;
};

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

function resetTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  high:   "bg-success/10 text-success",
  medium: "bg-primary/10 text-primary",
  low:    "bg-textSecondary/10 text-textSecondary",
};

export const AiInsightsCard = observer(function AiInsightsCard({ network, sourceId, period }: Props) {
  const t              = useTranslations("aiInsights");
  const locale         = useLocale();
  const uiStore        = useUiStore();
  const analyticsStore = useAnalyticsStore();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const key = `${network}:${sourceId}:${period}`;
  const entry = analyticsStore.state.insights.get(key) ?? {
    loading: false, payload: null, cached: false, metriqs: null, error: null,
  };
  const { loading, payload, cached, metriqs, error } = entry;

  const endpoint =
    network === "telegram"
      ? `/integrations/telegram/channels/${sourceId}/ai-insights`
      : `/vk/communities/${sourceId}/ai-insights`;

  const generate = async (force: boolean) => {
    await analyticsStore.generate(key, endpoint, period, locale, force);
    const updated = analyticsStore.state.insights.get(key);
    if (updated?.metriqs && !updated.cached) {
      uiStore.showToast(t("metriqSpent", { remaining: updated.metriqs.remaining }), "success");
    }
  };

  const onPrimary = () => {
    if (payload) setConfirmOpen(true);
    else void generate(false);
  };

  const confirmRefresh = () => {
    setConfirmOpen(false);
    void generate(true);
  };

  const isLowData  = payload?.data_quality.level === "low";
  const outOfQuota = metriqs?.remaining === 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-base font-semibold text-textMain">{t("title")}</h3>
        </div>
        <div className="flex items-center gap-3">
          {metriqs && (
            <span className="text-xs font-medium text-textSecondary">
              {t("metriqsLeft", { remaining: metriqs.remaining })}
            </span>
          )}
          {payload && (
            <span className="text-xs text-textSecondary">
              {cached
                ? t("fromCache", { min: minutesAgo(payload.generated_at) })
                : t("generated")}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {!payload && !loading && !error && (
        <p className="text-sm text-textSecondary">{t("description")}</p>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-textSecondary">{t("loading")}</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-error/5 border border-error/30 rounded-xl px-4 py-3">
          {error.code === "upgrade_required" ? (
            <p className="text-sm text-textSecondary">
              {t("upgradeRequired")}{" "}
              <a href="/app/billing" className="text-primary hover:underline font-medium">
                {t("upgradeLink")}
              </a>
            </p>
          ) : error.code === "quota_exceeded" ? (
            <p className="text-sm text-textSecondary">
              {t("quotaExceeded")}
              {metriqs && <> {t("quotaResetAt", { time: resetTime(metriqs.resets_at, locale) })}</>}
            </p>
          ) : (
            <p className="text-sm text-error">{error.message}</p>
          )}
        </div>
      )}

      {payload && !loading && (
        <div className="flex flex-col gap-4">
          {/* Low-data banner */}
          {isLowData && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex gap-2.5">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <p className="text-xs text-textSecondary leading-relaxed">
                {t("dataLow", { count: payload.data_quality.post_count })}
                {period === "24h" && <> {t("dataLowNudge")}</>}
              </p>
            </div>
          )}

          {/* Headline */}
          {payload.headline && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">
                {t("keyTakeaway")}
              </p>
              <p className="text-sm font-medium text-textMain leading-relaxed">{payload.headline}</p>
            </div>
          )}

          {/* Recommendations (backend already sorts by priority) */}
          <ol className="flex flex-col gap-3">
            {payload.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-textMain">{rec.title}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${CONFIDENCE_STYLES[rec.confidence]}`}>
                      {t(`confidence.${rec.confidence}`)}
                    </span>
                  </div>
                  <p className="text-sm text-textSecondary leading-relaxed">{rec.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Action */}
      <div className="flex flex-col gap-1.5 items-start">
        <button
          onClick={onPrimary}
          disabled={loading || (!!payload && outOfQuota)}
          className="self-start px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t("generating") : payload ? t("regenerate") : t("generate")}
        </button>
        {payload && outOfQuota && metriqs && (
          <p className="text-xs text-textSecondary">
            {t("metriqsEmpty", { time: resetTime(metriqs.resets_at, locale) })}
          </p>
        )}
      </div>

      {/* Confirm modal */}
      {confirmOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-surface rounded-2xl shadow-xl p-6 flex flex-col gap-4 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-textMain">{t("confirmTitle")}</h2>
            <p className="text-sm text-textSecondary leading-relaxed">
              {t("confirmBody", { remaining: metriqs?.remaining ?? 0 })}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-textSecondary hover:bg-textSecondary/10 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={confirmRefresh}
                className="px-4 py-2 rounded-lg bg-primary text-onAccent text-sm font-medium hover:bg-primaryHover transition-colors"
              >
                {t("confirmYes")}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
});

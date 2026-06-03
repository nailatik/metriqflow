"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { http } from "@/shared/lib/axios";
import type { InsightsPayload } from "./types";

type Props = {
  network:  "telegram" | "vk";
  sourceId: number | string;
  period:   string;
};

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

export function AiInsightsCard({ network, sourceId, period }: Props) {
  const t = useTranslations("aiInsights");

  const [loading,  setLoading]  = useState(false);
  const [payload,  setPayload]  = useState<InsightsPayload | null>(null);
  const [cached,   setCached]   = useState(false);
  const [error,    setError]    = useState<{ message: string; code?: string } | null>(null);

  const endpoint =
    network === "telegram"
      ? `/integrations/telegram/channels/${sourceId}/ai-insights`
      : `/vk/communities/${sourceId}/ai-insights`;

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await http.post<InsightsPayload & { cached: boolean }>(endpoint, { period });
      const { cached: isCached, ...rest } = res.data;
      setCached(isCached);
      setPayload(rest as InsightsPayload);
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: { message?: string; code?: string } } })?.response?.data;
      setError({ message: resp?.message ?? t("error"), code: resp?.code });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-base font-semibold text-textPrimary">{t("title")}</h3>
        </div>
        {payload && (
          <span className="text-xs text-textSecondary">
            {cached
              ? t("fromCache", { min: minutesAgo(payload.generated_at) })
              : t("generated")}
          </span>
        )}
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
            <p className="text-sm text-textSecondary">{t("quotaExceeded")}</p>
          ) : (
            <p className="text-sm text-error">{error.message}</p>
          )}
        </div>
      )}

      {payload && !loading && (
        <ol className="flex flex-col gap-3">
          {payload.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-textPrimary">{rec.title}</p>
                <p className="text-sm text-textSecondary leading-relaxed">{rec.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Action */}
      <button
        onClick={generate}
        disabled={loading}
        className="self-start px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t("generating") : payload ? t("regenerate") : t("generate")}
      </button>
    </div>
  );
}

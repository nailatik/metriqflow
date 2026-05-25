"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { http } from "@/shared/lib/axios";

// Lazy-load recharts views — see AnalyticsTabView for rationale.
const AnalyticsView = dynamic(
  () => import("../AnalyticsView/AnalyticsView").then((m) => m.AnalyticsView),
  { ssr: false },
);
const VKAnalyticsView = dynamic(
  () => import("@/features/vk/ui/VKAnalyticsView/VKAnalyticsView").then((m) => m.VKAnalyticsView),
  { ssr: false },
);

type Props = {
  hasTelegram: boolean;
  hasVk: boolean;
};

type Net = {
  connected: boolean;
  followers: number;
  views: number;
  engagement_rate: number;
  followers_growth: number | null;
} | null;

type Summary = {
  period: string;
  combined: { followers: number; views: number; engagement_rate: number; networks: number };
  telegram: Net;
  vk: Net;
};

const PERIODS = [
  { value: "24h", label: "24h" },
  { value: "7d",  label: "7d"  },
  { value: "30d", label: "30d" },
] as const;

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

function GrowthBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const positive = value >= 0;
  return (
    <span className={`text-xs font-medium ${positive ? "text-green-500" : "text-red-500"}`}>
      {positive ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function BigStat({ label, value, growth }: { label: string; value: string; growth?: number | null }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-5 py-4">
      <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-textMain">{value}</p>
      {growth !== undefined && <div className="mt-0.5"><GrowthBadge value={growth} /></div>}
    </div>
  );
}

function CombinedSummary() {
  const t = useTranslations("Analytics");
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("7d");
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchSummary = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    http.get<Summary>(`/integrations/analytics/summary?period=${period}`)
      .then((r) => { setData(r.data); })
      .catch(() => { setData(null); setFetchError(true); })
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-textMain">{t("combinedTitle")}</h2>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                period === p.value ? "bg-primary text-white" : "text-textSecondary hover:text-textMain"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data && <p className="text-textSecondary text-sm">{t("loadingData")}</p>}

      {!loading && fetchError && (
        <p className="text-sm text-error">{t("loadError")}</p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <BigStat label={t("totalFollowers")} value={fmt(data.combined.followers)} />
            <BigStat label={t("totalViews")}     value={fmt(data.combined.views)} />
            <BigStat label={t("engagementRate")} value={`${data.combined.engagement_rate.toFixed(2)}%`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.telegram && (
              <div className="bg-surface border border-border rounded-xl px-5 py-4 flex flex-col gap-1">
                <p className="text-sm font-semibold text-textMain">✈️ Telegram</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-textSecondary">
                  <span>{t("subscribers")}: <b className="text-textMain">{fmt(data.telegram.followers)}</b></span>
                  <GrowthBadge value={data.telegram.followers_growth} />
                  <span>{t("totalViews")}: <b className="text-textMain">{fmt(data.telegram.views)}</b></span>
                  <span>{t("engagementRate")}: <b className="text-textMain">{data.telegram.engagement_rate.toFixed(1)}%</b></span>
                </div>
              </div>
            )}
            {data.vk && (
              <div className="bg-surface border border-border rounded-xl px-5 py-4 flex flex-col gap-1">
                <p className="text-sm font-semibold text-textMain">🔵 VKontakte</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-textSecondary">
                  <span>{t("members")}: <b className="text-textMain">{fmt(data.vk.followers)}</b></span>
                  <GrowthBadge value={data.vk.followers_growth} />
                  <span>{t("totalViews")}: <b className="text-textMain">{fmt(data.vk.views)}</b></span>
                  <span>{t("engagementRate")}: <b className="text-textMain">{data.vk.engagement_rate.toFixed(1)}%</b></span>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-textSecondary">{t("combinedHint")}</p>
        </>
      )}
    </div>
  );
}

function PlatformSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-textSecondary uppercase tracking-widest">
          {label}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

export function AllAnalyticsView({ hasTelegram, hasVk }: Props) {
  return (
    <div className="flex flex-col gap-10">
      <CombinedSummary />

      {hasTelegram && (
        <PlatformSection icon="✈️" label="Telegram">
          <AnalyticsView />
        </PlatformSection>
      )}

      {hasVk && (
        <PlatformSection icon="🔵" label="VKontakte">
          <VKAnalyticsView />
        </PlatformSection>
      )}
    </div>
  );
}

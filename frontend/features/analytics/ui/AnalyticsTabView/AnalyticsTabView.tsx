"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { http } from "@/shared/lib/axios";
import { AnalyticsView } from "../AnalyticsView/AnalyticsView";
import { AllAnalyticsView } from "../AllAnalyticsView/AllAnalyticsView";
import { VKAnalyticsView } from "@/features/vk/ui/VKAnalyticsView/VKAnalyticsView";
import { CreateReportModal } from "@/features/reports/ui/CreateReportModal/CreateReportModal";
import type { ReportSource } from "@/entities/report/types";

type Tab = "all" | "telegram" | "vk";

export function AnalyticsTabView() {
  const t = useTranslations("Analytics");
  const locale = useLocale();

  const [tab, setTab]             = useState<Tab>("all");
  const [hasTelegram, setHasTg]   = useState(false);
  const [hasVk, setHasVk]         = useState(false);
  const [statusLoaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<ReportSource>("all");

  useEffect(() => {
    Promise.all([
      http.get<{ linked: boolean }>("/integrations/telegram/status")
        .then((r) => setHasTg(r.data.linked))
        .catch(() => {}),
      http.get<{ id: number }[]>("/vk/communities")
        .then((r) => setHasVk(r.data.length > 0))
        .catch(() => {}),
    ]).finally(() => setLoaded(true));
  }, []);

  const openModal = (source: ReportSource) => {
    setModalSource(source);
    setModalOpen(true);
  };

  const hasAny = hasTelegram || hasVk;

  if (!statusLoaded) {
    return <div className="text-textSecondary text-sm">{t("loading")}</div>;
  }

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <p className="text-textSecondary text-base">{t("noIntegrations")}</p>
        <Link
          href={`/${locale}/app/integrations`}
          className="text-primary hover:underline text-sm font-medium"
        >
          {t("goToIntegrations")}
        </Link>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; enabled: boolean }[] = [
    { id: "all",      label: t("tabAll"),      enabled: true        },
    { id: "telegram", label: "Telegram",        enabled: hasTelegram },
    { id: "vk",       label: "VK",             enabled: hasVk       },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
        {TABS.map((tabItem) => (
          <div key={tabItem.id} className="relative group">
            <button
              onClick={() => tabItem.enabled && setTab(tabItem.id)}
              disabled={!tabItem.enabled}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === tabItem.id && tabItem.enabled
                  ? "bg-primary text-white"
                  : tabItem.enabled
                  ? "text-textSecondary hover:text-textMain"
                  : "text-textSecondary/40 cursor-not-allowed"
              }`}
            >
              {tabItem.label}
            </button>
            {!tabItem.enabled && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-textMain text-bg text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                {t("connectFirst")}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {tab === "all"      && <AllAnalyticsView hasTelegram={hasTelegram} hasVk={hasVk} />}
      {tab === "telegram" && hasTelegram && <AnalyticsView />}
      {tab === "vk"       && hasVk       && <VKAnalyticsView />}

      {/* Create report button */}
      <div className="flex justify-start pt-2 border-t border-border">
        <button
          onClick={() => openModal(tab === "all" ? "all" : tab === "telegram" ? "telegram" : "vk")}
          className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition"
        >
          {t("createReport")}
        </button>
      </div>

      <CreateReportModal
        open={modalOpen}
        defaultSource={modalSource}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

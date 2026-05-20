"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { useReportsStore, useUiStore } from "@/shared/store/StoreProvider";
import { reportsService } from "@/entities/report/api/reportsService";
import { CreateReportModal } from "../CreateReportModal/CreateReportModal";
import type { Report, ReportSource, ReportFormat, ReportStatus } from "@/entities/report/types";

const SOURCE_LABEL: Record<ReportSource, string> = {
  all: "All",
  telegram: "Telegram",
  vk: "VK",
};

const FORMAT_COLOR: Record<ReportFormat, string> = {
  csv: "bg-green-500/15 text-green-600",
  pdf: "bg-red-500/15 text-red-600",
  xml: "bg-blue-500/15 text-blue-600",
};

const STATUS_CONFIG: Record<ReportStatus, { color: string; dotColor: string }> = {
  ready:   { color: "text-green-600",    dotColor: "bg-green-500"  },
  pending: { color: "text-yellow-600",   dotColor: "bg-yellow-400" },
  failed:  { color: "text-red-500",      dotColor: "bg-red-500"    },
};

function ReportCard({ report, onDelete, t }: { report: Report; onDelete: (id: number) => void; t: ReturnType<typeof useTranslations> }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = STATUS_CONFIG[report.status];

  const handleDownload = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = reportsService.downloadUrl(report.id);
    // Open with auth header isn't possible via anchor; use fetch + blob
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${report.title}.${report.format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition">
      {/* Title + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-textMain text-sm leading-snug">{report.title}</h3>
          <span className="text-xs text-textSecondary/60">#{report.id}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
          {t(`status_${report.status}` as Parameters<typeof t>[0])}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-textSecondary">
          {SOURCE_LABEL[report.source]}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FORMAT_COLOR[report.format]}`}>
          .{report.format.toUpperCase()}
        </span>
        <span className="text-xs text-textSecondary">
          {report.period_days === 1 ? t("periodDay") : t("periodDays", { days: report.period_days })}
        </span>
      </div>

      {/* Date */}
      <p className="text-xs text-textSecondary">
        {t("createdAt")} {new Date(report.created_at).toLocaleDateString()}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1 border-t border-border">
        {report.status === "ready" && (
          <button
            onClick={handleDownload}
            className="text-sm text-primary font-medium hover:underline"
          >
            {t("download")}
          </button>
        )}

        {confirmDelete ? (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-textSecondary">{t("confirmDelete")}</span>
            <button onClick={() => onDelete(report.id)} className="text-xs text-error font-medium hover:underline">
              {t("delete")}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-textSecondary hover:underline">
              {t("cancel")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-textSecondary hover:text-error transition ml-auto"
          >
            {t("delete")}
          </button>
        )}
      </div>
    </div>
  );
}

export const ReportsList = observer(() => {
  const t = useTranslations("Reports");
  const reportsStore = useReportsStore();
  const uiStore = useUiStore();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    reportsStore.fetch();
  }, [reportsStore]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition"
        >
          {t("create")}
        </button>
      </div>

      {uiStore.loading && reportsStore.list.length === 0 && (
        <p className="text-textSecondary text-sm">{t("loading")}</p>
      )}

      {!uiStore.loading && reportsStore.list.length === 0 && (
        <div className="text-center py-16">
          <p className="text-textSecondary">{t("empty")}</p>
          <p className="text-textSecondary/60 text-sm mt-1">{t("emptyHint")}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {reportsStore.list.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onDelete={(id) => reportsStore.remove(id)}
            t={t}
          />
        ))}
      </div>

      <CreateReportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
});

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { observer } from "mobx-react-lite";
import { useReportsStore } from "@/shared/store/StoreProvider";
import type { ReportSource, ReportFormat } from "@/entities/report/types";
import { Button } from "@/shared/ui/Button/Button";

interface Props {
  open: boolean;
  defaultSource?: ReportSource;
  onClose: () => void;
}

const SOURCES: { id: ReportSource; labelKey: string }[] = [
  { id: "all",      labelKey: "sourceAll"      },
  { id: "telegram", labelKey: "sourceTelegram" },
  { id: "vk",       labelKey: "sourceVk"       },
];

const FORMATS: { id: ReportFormat; labelKey: string; recommended?: boolean }[] = [
  { id: "csv", labelKey: "formatCsv", recommended: true },
  { id: "pdf", labelKey: "formatPdf" },
  { id: "xml", labelKey: "formatXml" },
];

const PERIODS = [1, 7, 30] as const;

function autoTitle(source: ReportSource, days: number): string {
  const src = source === "all" ? "All" : source === "telegram" ? "Telegram" : "VK";
  const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  return `${src} · ${days}d · ${date}`;
}

export const CreateReportModal = observer(({ open, defaultSource = "all", onClose }: Props) => {
  const t = useTranslations("Reports");
  const locale = useLocale();
  const router = useRouter();
  const reportsStore = useReportsStore();

  const [source, setSource]   = useState<ReportSource>(defaultSource);
  const [format, setFormat]   = useState<ReportFormat>("csv");
  const [period, setPeriod]   = useState<1 | 7 | 30>(7);
  const [title, setTitle]     = useState(() => autoTitle(defaultSource, 7));
  const [loading, setLoading] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSource(defaultSource);
      setTitle(autoTitle(defaultSource, period));
    }
  }, [open, defaultSource]);

  useEffect(() => {
    setTitle(autoTitle(source, period));
  }, [source, period]);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    const report = await reportsStore.createReport({ title, source, format, period_days: period, locale });
    setLoading(false);
    if (report) {
      onClose();
      router.push(`/${locale}/app/reports`);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-bg border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-textMain">{t("modalTitle")}</h2>
          <button onClick={onClose} className="text-textSecondary hover:text-textMain transition text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Source */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelSource")}</p>
            <div className="flex gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    source === s.id
                      ? "bg-primary text-white border-primary"
                      : "border-border text-textSecondary hover:border-primary hover:text-primary"
                  }`}
                >
                  {t(s.labelKey as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelFormat")}</p>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition relative ${
                    format === f.id
                      ? "bg-primary text-white border-primary"
                      : "border-border text-textSecondary hover:border-primary hover:text-primary"
                  }`}
                >
                  {f.id.toUpperCase()}
                  {f.recommended && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-green-500 text-white px-1.5 rounded-full leading-4">
                      {t("recommended")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelPeriod")}</p>
            <div className="flex gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    period === p
                      ? "bg-primary text-white border-primary"
                      : "border-border text-textSecondary hover:border-primary hover:text-primary"
                  }`}
                >
                  {p === 1 ? t("periodDay") : t("periodDays", { days: p })}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelTitle")}</p>
            <input
              className="w-full px-4 py-2 border border-border rounded-xl outline-none focus:border-primary bg-surface text-textMain text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t("cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="flex-1"
          >
            {loading ? t("generating") : t("generate")}
          </Button>
        </div>
      </div>
    </div>
  );
});

"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { observer } from "mobx-react-lite";
import { useSchedulesStore, useUserStore } from "@/shared/store/StoreProvider";
import type { ReportSource, ReportFormat } from "@/entities/report/types";
import type { ScheduleFrequency } from "@/entities/schedule/types";
import { Button } from "@/shared/ui/Button/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const SOURCES: { id: ReportSource; key: string }[] = [
  { id: "all",      key: "sourceAll"      },
  { id: "telegram", key: "sourceTelegram" },
  { id: "vk",       key: "sourceVk"       },
];

const FORMATS: { id: ReportFormat; recommended?: boolean }[] = [
  { id: "csv", recommended: true },
  { id: "pdf" },
  { id: "xml" },
];

const FREQS: { days: ScheduleFrequency; key: string }[] = [
  { days: 1,  key: "freq1"  },
  { days: 7,  key: "freq7"  },
  { days: 30, key: "freq30" },
];

export const CreateScheduleModal = observer(({ open, onClose, onCreated }: Props) => {
  const t = useTranslations("Schedules");
  const locale = useLocale();
  const schedulesStore = useSchedulesStore();
  const userStore = useUserStore();

  const [source, setSource]     = useState<ReportSource>("all");
  const [format, setFormat]     = useState<ReportFormat>("csv");
  const [freq, setFreq]         = useState<ScheduleFrequency>(7);
  const [title, setTitle]       = useState("");
  const [tgEnabled, setTg]      = useState(false);
  const [emailEnabled, setEmail] = useState(false);
  const [emailAddr, setEmailAddr] = useState("");
  const [loading, setLoading]   = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const src = source === "all" ? (locale === "ru" ? "Все" : "All") : source === "telegram" ? "Telegram" : "VK";
      setTitle(`${src} · ${freq}d auto`);
      setEmailAddr(userStore.user?.email ?? "");
    }
  }, [open, source, freq, locale]);

  if (!open) return null;

  const handleSubmit = async () => {
    const channels = [];
    if (tgEnabled)    channels.push({ channel: "telegram" as const, enabled: true });
    if (emailEnabled) channels.push({ channel: "email" as const, email: emailAddr, enabled: true });

    if (channels.length === 0) return;

    setLoading(true);
    const result = await schedulesStore.createSchedule({
      title: title.trim() || undefined,
      source, format, frequency_days: freq, locale,
      channels,
    });
    setLoading(false);
    if (result) { onCreated?.(); onClose(); }
  };

  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const noChannel = !tgEnabled && !emailEnabled;

  return (
    <div ref={overlayRef} onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-bg border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-textMain">{t("modalTitle")}</h2>
          <button onClick={onClose} className="text-textSecondary hover:text-textMain text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Source */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelSource")}</p>
            <div className="flex gap-2">
              {SOURCES.map((s) => (
                <button key={s.id} onClick={() => setSource(s.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    source === s.id ? "bg-primary text-white border-primary"
                      : "border-border text-textSecondary hover:border-primary hover:text-primary"
                  }`}>
                  {t(s.key as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelFormat")}</p>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button key={f.id} onClick={() => setFormat(f.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition relative ${
                    format === f.id ? "bg-primary text-white border-primary"
                      : "border-border text-textSecondary hover:border-primary hover:text-primary"
                  }`}>
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

          {/* Frequency */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelFrequency")}</p>
            <div className="flex gap-2">
              {FREQS.map((f) => (
                <button key={f.days} onClick={() => setFreq(f.days)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    freq === f.days ? "bg-primary text-white border-primary"
                      : "border-border text-textSecondary hover:border-primary hover:text-primary"
                  }`}>
                  {t(f.key as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery channels */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-3">{t("labelDelivery")}</p>
            <div className="space-y-3">
              {/* Telegram */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={tgEnabled} onChange={(e) => setTg(e.target.checked)}
                  className="w-4 h-4 accent-primary" />
                <span className="text-sm text-textMain">Telegram</span>
                <span className="text-xs text-textSecondary ml-auto">{t("tgHint")}</span>
              </label>

              {/* Email */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmail(e.target.checked)}
                    className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-textMain">Email</span>
                </label>
                {emailEnabled && (
                  <input
                    type="email"
                    value={emailAddr}
                    onChange={(e) => setEmailAddr(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-2 w-full px-3 py-2 border border-border rounded-xl text-sm bg-surface outline-none focus:border-primary text-textMain"
                  />
                )}
              </div>
            </div>
            {noChannel && (
              <p className="text-xs text-error mt-2">{t("noChannelWarning")}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelTitle")}</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255}
              className="w-full px-4 py-2 border border-border rounded-xl text-sm bg-surface outline-none focus:border-primary text-textMain" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t("cancel")}</Button>
          <Button variant="primary" onClick={handleSubmit}
            disabled={loading || noChannel || !title.trim()}
            className="flex-1">
            {loading ? t("saving") : t("create")}
          </Button>
        </div>
      </div>
    </div>
  );
});

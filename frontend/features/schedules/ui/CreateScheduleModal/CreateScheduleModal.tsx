"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { observer } from "mobx-react-lite";
import { useSchedulesStore, useUserStore } from "@/shared/store/StoreProvider";
import type { ReportSource, ReportFormat } from "@/entities/report/types";
import type { ScheduleFrequency } from "@/entities/schedule/types";
import { Button } from "@/shared/ui/Button/Button";
import { UpgradeBanner } from "@/features/billing/ui/UpgradeBanner/UpgradeBanner";
import { usePlan } from "@/shared/hooks/usePlan";

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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pad(n: number) { return String(n).padStart(2, "0"); }

function getBrowserTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; }
}

export const CreateScheduleModal = observer(({ open, onClose, onCreated }: Props) => {
  const t = useTranslations("Schedules");
  const locale = useLocale();
  const schedulesStore = useSchedulesStore();
  const userStore = useUserStore();
  const { canExportFormat } = usePlan();

  const usedSources = new Set(schedulesStore.state.list.map((s) => s.source));
  const firstFreeSource = (["all", "telegram", "vk"] as ReportSource[]).find((s) => !usedSources.has(s)) ?? "all";

  const [source, setSource]       = useState<ReportSource>(firstFreeSource);
  const [format, setFormat]       = useState<ReportFormat>("csv");
  const [freq, setFreq]           = useState<ScheduleFrequency>(7);
  const [sendHour, setSendHour]   = useState(9);
  const [timezone]                = useState(() => getBrowserTimezone());
  const [title, setTitle]         = useState("");
  const [tgEnabled, setTg]        = useState(false);
  const [emailEnabled, setEmail]  = useState(false);
  const [emailAddr, setEmailAddr] = useState("");
  const [loading, setLoading]     = useState(false);
  const [planLimitHit, setPlanLimitHit] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const free = (["all", "telegram", "vk"] as ReportSource[]).find((s) => !usedSources.has(s)) ?? "all";
      setSource(free);
      const src = free === "all" ? (locale === "ru" ? "Все" : "All") : free === "telegram" ? "Telegram" : "VK";
      setTitle(`${src} · ${freq}d auto`);
      setEmailAddr(userStore.state.user?.email ?? "");
    }
  }, [open]);

  if (!open) return null;

  const isSourceTaken = usedSources.has(source);

  const handleSubmit = async () => {
    const channels = [];
    if (tgEnabled)    channels.push({ channel: "telegram" as const, enabled: true });
    if (emailEnabled) channels.push({ channel: "email" as const, email: emailAddr, enabled: true });

    if (channels.length === 0) return;

    setLoading(true);
    const result = await schedulesStore.create({
      title: title.trim() || undefined,
      source, format, frequency_days: freq, locale,
      send_hour: sendHour, timezone,
      channels,
    });
    setLoading(false);
    if (result && !("upgrade" in result)) { onCreated?.(); onClose(); }
    if (result && "upgrade" in result) { setPlanLimitHit(true); }
  };

  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const noChannel = !tgEnabled && !emailEnabled;

  return createPortal(
    <div ref={overlayRef} onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-bg border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-textMain">{t("modalTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-textSecondary hover:text-textMain text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {planLimitHit && (
            <UpgradeBanner reason={t("limitAutoreports" as Parameters<typeof t>[0])} />
          )}

          {/* Source */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelSource")}</p>
            <div className="flex gap-2">
              {SOURCES.map((s) => {
                const taken = usedSources.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => !taken && setSource(s.id)}
                    disabled={taken}
                    title={taken ? t("sourceUsed" as Parameters<typeof t>[0]) : undefined}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition relative ${
                      taken
                        ? "border-border text-textSecondary/40 bg-surface cursor-not-allowed opacity-50"
                        : source === s.id
                          ? "bg-primary text-onAccent border-primary"
                          : "border-border text-textSecondary hover:border-primary hover:text-primary"
                    }`}
                  >
                    {t(s.key as Parameters<typeof t>[0])}
                    {taken && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-border text-textSecondary px-1.5 rounded-full leading-4 whitespace-nowrap">
                        {t("sourceUsed" as Parameters<typeof t>[0])}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelFormat")}</p>
            <div className="flex gap-2">
              {FORMATS.map((f) => {
                const allowed = canExportFormat(f.id);
                return (
                  <button key={f.id} onClick={() => allowed && setFormat(f.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition relative ${
                      !allowed
                        ? "border-border text-textSecondary/40 cursor-not-allowed"
                        : format === f.id
                          ? "bg-primary text-onAccent border-primary"
                          : "border-border text-textSecondary hover:border-primary hover:text-primary"
                    }`}>
                    {f.id.toUpperCase()}
                    {f.recommended && allowed && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-success text-white px-1.5 rounded-full leading-4">
                        {t("recommended")}
                      </span>
                    )}
                    {!allowed && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-textSecondary/50 text-white px-1.5 rounded-full leading-4">
                        Pro
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!canExportFormat(format) && (
              <div className="mt-3">
                <UpgradeBanner compact reason={t("exportLocked" as Parameters<typeof t>[0])} />
              </div>
            )}
          </div>

          {/* Frequency */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelFrequency")}</p>
            <div className="flex gap-2">
              {FREQS.map((f) => (
                <button key={f.days} onClick={() => setFreq(f.days)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    freq === f.days ? "bg-primary text-onAccent border-primary"
                      : "border-border text-textSecondary hover:border-primary hover:text-primary"
                  }`}>
                  {t(f.key as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>

          {/* Send time */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelTime" as Parameters<typeof t>[0])}</p>
            <div className="flex items-center gap-3">
              <select
                value={sendHour}
                onChange={(e) => setSendHour(Number(e.target.value))}
                className="px-3 py-2 border border-border rounded-xl text-sm bg-surface text-textMain outline-none focus:border-primary"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>{pad(h)}:00</option>
                ))}
              </select>
              <span className="text-xs text-textSecondary">
                {timezone} · {t("timezoneDetected" as Parameters<typeof t>[0])}
              </span>
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
            disabled={loading || noChannel || !title.trim() || isSourceTaken || !canExportFormat(format)}
            className="flex-1">
            {loading ? t("saving") : t("create")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
});

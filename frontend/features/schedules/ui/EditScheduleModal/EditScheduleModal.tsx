"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { useSchedulesStore, useUserStore } from "@/shared/store/StoreProvider";
import type { Schedule, ScheduleFrequency } from "@/entities/schedule/types";
import { Button } from "@/shared/ui/Button/Button";

interface Props {
  open: boolean;
  schedule: Schedule | null;
  onClose: () => void;
}

const FREQS: { days: ScheduleFrequency; key: string }[] = [
  { days: 1,  key: "freq1"  },
  { days: 7,  key: "freq7"  },
  { days: 30, key: "freq30" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pad(n: number) { return String(n).padStart(2, "0"); }

const SOURCE_LABEL: Record<string, string> = {
  all: "All",
  telegram: "Telegram",
  vk: "VK",
};

export const EditScheduleModal = observer(({ open, schedule, onClose }: Props) => {
  const t = useTranslations("Schedules");
  const schedulesStore = useSchedulesStore();
  const userStore = useUserStore();

  const [title, setTitle]         = useState("");
  const [freq, setFreq]           = useState<ScheduleFrequency>(7);
  const [sendHour, setSendHour]   = useState(9);
  const [tgEnabled, setTg]        = useState(false);
  const [emailEnabled, setEmail]  = useState(false);
  const [emailAddr, setEmailAddr] = useState("");
  const [loading, setLoading]     = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!schedule) return;
    setTitle(schedule.title);
    setFreq(schedule.frequency_days);
    setSendHour(schedule.send_hour);
    const tgCh    = schedule.channels.find((c) => c.channel === "telegram");
    const emailCh = schedule.channels.find((c) => c.channel === "email");
    setTg(tgCh?.enabled ?? false);
    setEmail(emailCh?.enabled ?? false);
    setEmailAddr(emailCh?.email ?? userStore.state.user?.email ?? "");
  }, [schedule, open]);

  if (!open || !schedule) return null;

  const noChannel = !tgEnabled && !emailEnabled;

  const handleSave = async () => {
    if (noChannel) return;
    setLoading(true);

    const channels: { channel: "telegram" | "email"; email?: string; enabled: boolean }[] = [
      { channel: "telegram", enabled: tgEnabled },
      { channel: "email", email: emailAddr, enabled: emailEnabled },
    ];

    await schedulesStore.update({
      id: schedule.id,
      title: title.trim() || schedule.title,
      frequency_days: freq,
      send_hour: sendHour,
      channels,
    });

    setLoading(false);
    onClose();
  };

  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-bg border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-textMain">{t("editModalTitle" as Parameters<typeof t>[0])}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {SOURCE_LABEL[schedule.source] ?? schedule.source}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-border text-textSecondary">
                .{schedule.format.toUpperCase()}
              </span>
            </div>
          </div>
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
          {/* Title */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelTitle")}</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              className="w-full px-4 py-2 border border-border rounded-xl text-sm bg-surface outline-none focus:border-primary text-textMain"
            />
          </div>

          {/* Frequency */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-2">{t("labelFrequency")}</p>
            <div className="flex gap-2">
              {FREQS.map((f) => (
                <button
                  key={f.days}
                  onClick={() => setFreq(f.days)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    freq === f.days
                      ? "bg-primary text-onAccent border-primary"
                      : "border-border text-textSecondary hover:border-primary hover:text-primary"
                  }`}
                >
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
                {schedule.timezone} · {t("timezoneDetected" as Parameters<typeof t>[0])}
              </span>
            </div>
          </div>

          {/* Delivery channels */}
          <div>
            <p className="text-sm font-medium text-textSecondary mb-3">{t("labelDelivery")}</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tgEnabled}
                  onChange={(e) => setTg(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-textMain">Telegram</span>
                <span className="text-xs text-textSecondary ml-auto">{t("tgHint")}</span>
              </label>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmail(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
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
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t("cancel")}</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading || noChannel || !title.trim()}
            className="flex-1"
          >
            {loading ? t("saving") : t("save" as Parameters<typeof t>[0])}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
});

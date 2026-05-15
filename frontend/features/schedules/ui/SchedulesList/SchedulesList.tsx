"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { useSchedulesStore } from "@/shared/store/StoreProvider";
import { CreateScheduleModal } from "../CreateScheduleModal/CreateScheduleModal";
import { EditScheduleModal } from "../EditScheduleModal/EditScheduleModal";
import type { Schedule } from "@/entities/schedule/types";

function pad(n: number) { return String(n).padStart(2, "0"); }

const FREQ_LABEL: Record<number, string> = {
  1:  "Daily",
  7:  "Weekly",
  30: "Monthly",
};

const STATUS_DOT: Record<string, string> = {
  delivered:   "bg-green-500",
  failed:      "bg-red-500",
  no_channels: "bg-yellow-400",
  pending:     "bg-yellow-400",
};

function ScheduleCard({
  schedule,
  onToggle,
  onPause,
  onDelete,
  onEdit,
  t,
}: {
  schedule: Schedule;
  onToggle: (id: number, enabled: boolean) => void;
  onPause: (id: number, paused: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (s: Schedule) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tgCh  = schedule.channels.find((c) => c.channel === "telegram");
  const emailCh = schedule.channels.find((c) => c.channel === "email");

  const nextDate  = schedule.next_send_at  ? new Date(schedule.next_send_at).toLocaleDateString()  : "—";
  const lastDate  = schedule.last_sent_at  ? new Date(schedule.last_sent_at).toLocaleDateString()  : "—";
  const statusDot = schedule.last_status ? STATUS_DOT[schedule.last_status] ?? "bg-border" : "bg-border";

  return (
    <div className={`bg-surface border rounded-xl p-5 flex flex-col gap-3 transition hover:shadow-md ${
      !schedule.enabled || schedule.paused ? "opacity-60" : "border-border"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-textMain text-sm leading-snug">{schedule.title}</h3>
          <span className="text-xs text-textSecondary/60">#{schedule.id}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {schedule.last_status && (
            <span className={`w-2 h-2 rounded-full ${statusDot}`} title={schedule.last_status} />
          )}
          {schedule.paused && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-600 font-medium">
              {t("paused")}
            </span>
          )}
          {!schedule.enabled && !schedule.paused && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-border text-textSecondary font-medium">
              {t("disabled")}
            </span>
          )}
        </div>
      </div>

      {/* Meta badges */}
      {(() => {
        const SOURCE_MAP: Record<string, string> = {
          all: t("sourceAll"),
          telegram: t("sourceTelegram"),
          vk: t("sourceVk"),
        };
        return (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {SOURCE_MAP[schedule.source] ?? schedule.source}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-textSecondary">.{schedule.format.toUpperCase()}</span>
            <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-textSecondary">
              {FREQ_LABEL[schedule.frequency_days] ?? `${schedule.frequency_days}d`}
            </span>
          </div>
        );
      })()}

      {/* Channels */}
      {(tgCh || emailCh) && (
        <div className="text-xs text-textSecondary space-y-1">
          <span className="font-medium">{t("labelDelivery")}:</span>
          <div className="flex gap-4">
            {tgCh && (
              <span className={tgCh.enabled ? "text-primary" : "line-through"}>
                ✈️ {t("tgDelivery")}
              </span>
            )}
            {emailCh && (
              <span className={emailCh.enabled ? "text-primary" : "line-through"}>
                ✉️ {emailCh.email ?? t("email")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Timing */}
      <div className="text-xs text-textSecondary space-y-0.5">
        <p>
          {pad(schedule.send_hour)}:00
          <span className="text-textSecondary/50 ml-1">({schedule.timezone})</span>
        </p>
        <p>{t("nextSend")}: <span className="text-textMain">{nextDate}</span></p>
        {schedule.last_sent_at && (
          <p>{t("lastSent")}: <span className="text-textMain">{lastDate}</span></p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1 border-t border-border flex-wrap">
        <button
          onClick={() => onToggle(schedule.id, !schedule.enabled)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {schedule.enabled ? t("disable") : t("enable")}
        </button>
        <button
          onClick={() => onPause(schedule.id, !schedule.paused)}
          className="text-xs font-medium text-textSecondary hover:underline"
        >
          {schedule.paused ? t("resume") : t("pause")}
        </button>
        <button
          onClick={() => onEdit(schedule)}
          className="text-xs font-medium text-textSecondary hover:text-primary transition hover:underline"
        >
          {t("edit" as Parameters<typeof t>[0])}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-textSecondary">{t("confirmDelete")}</span>
            <button onClick={() => onDelete(schedule.id)} className="text-xs text-error font-medium hover:underline">{t("delete")}</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-textSecondary hover:underline">{t("cancel")}</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-textSecondary hover:text-error transition ml-auto">
            {t("delete")}
          </button>
        )}
      </div>
    </div>
  );
}

export const SchedulesList = observer(() => {
  const t = useTranslations("Schedules");
  const schedulesStore = useSchedulesStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);

  useEffect(() => { schedulesStore.fetchSchedules(); }, [schedulesStore]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-textSecondary mt-0.5">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition"
        >
          {t("create")}
        </button>
      </div>

      {schedulesStore.list.length === 0 && (
        <div className="text-center py-16">
          <p className="text-textSecondary">{t("empty")}</p>
          <p className="text-textSecondary/60 text-sm mt-1">{t("emptyHint")}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {schedulesStore.list.map((s) => (
          <ScheduleCard
            key={s.id}
            schedule={s}
            t={t}
            onToggle={(id, enabled) => schedulesStore.updateSchedule({ id, enabled })}
            onPause={(id, paused) => schedulesStore.updateSchedule({ id, paused })}
            onDelete={(id) => schedulesStore.deleteSchedule(id)}
            onEdit={(s) => setEditTarget(s)}
          />
        ))}
      </div>

      <CreateScheduleModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <EditScheduleModal
        open={!!editTarget}
        schedule={editTarget}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
});

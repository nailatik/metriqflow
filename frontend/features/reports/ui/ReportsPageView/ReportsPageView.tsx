"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ReportsList } from "../ReportsList/ReportsList";
import { SchedulesList } from "@/features/schedules/ui/SchedulesList/SchedulesList";

type Tab = "reports" | "schedules";

export function ReportsPageView() {
  const t = useTranslations("Reports");
  const [tab, setTab] = useState<Tab>("reports");

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
        {(["reports", "schedules"] as Tab[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              tab === id
                ? "bg-primary text-onAccent"
                : "text-textSecondary hover:text-textMain"
            }`}
          >
            {id === "reports" ? t("title") : t("schedulesTab")}
          </button>
        ))}
      </div>

      {tab === "reports"   && <ReportsList />}
      {tab === "schedules" && <SchedulesList />}
    </div>
  );
}

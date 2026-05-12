"use client";

import { useState } from "react";
import { AnalyticsView } from "../AnalyticsView/AnalyticsView";
import { VKAnalyticsView } from "@/features/vk/ui/VKAnalyticsView/VKAnalyticsView";

const TABS = [
  { id: "telegram", label: "Telegram" },
  { id: "vk",       label: "VK"       },
] as const;

type Tab = typeof TABS[number]["id"];

export function AnalyticsTabView() {
  const [tab, setTab] = useState<Tab>("telegram");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              tab === t.id
                ? "bg-primary text-white"
                : "text-textSecondary hover:text-textMain"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "telegram" ? <AnalyticsView /> : <VKAnalyticsView />}
    </div>
  );
}

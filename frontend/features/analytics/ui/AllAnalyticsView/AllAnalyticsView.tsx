"use client";

import { AnalyticsView } from "../AnalyticsView/AnalyticsView";
import { VKAnalyticsView } from "@/features/vk/ui/VKAnalyticsView/VKAnalyticsView";

type Props = {
  hasTelegram: boolean;
  hasVk: boolean;
};

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

"use client";

import dynamic from "next/dynamic";

// Lazy-loaded so recharts isn't in the entry bundle for users who never hit /vk.
const VKAnalyticsView = dynamic(
  () => import("@/features/vk/ui/VKAnalyticsView/VKAnalyticsView").then((m) => m.VKAnalyticsView),
  { ssr: false },
);

export default function VKPage() {
  return <VKAnalyticsView />;
}

"use client";

import dynamic from "next/dynamic";

const CompetitorsView = dynamic(
  () => import("@/features/competitors/ui/CompetitorsView/CompetitorsView").then((m) => m.CompetitorsView),
  { ssr: false },
);

export default function CompetitorsPage() {
  return <CompetitorsView />;
}

import type { Metadata } from "next";
import { ReportsList } from "@/features/reports/ui/ReportsList/ReportsList";

export const metadata: Metadata = {
  title: "Reports",
  description: "Manage your analytics reports.",
};

export default function ReportsPage() {
  return <ReportsList />;
}

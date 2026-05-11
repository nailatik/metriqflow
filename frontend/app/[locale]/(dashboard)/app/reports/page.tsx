import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReportsList } from "@/features/reports/ui/ReportsList/ReportsList";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Reports" });
  return { title: t("title") };
}

export default function ReportsPage() {
  return <ReportsList />;
}

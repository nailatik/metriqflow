import type { Metadata } from "next";
import { getTranslator } from "@/i18n/getTranslator";
import { ReportsPageView } from "@/features/reports/ui/ReportsPageView/ReportsPageView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale, "Reports");
  return { title: t("title") };
}

export default function ReportsPage() {
  return <ReportsPageView />;
}

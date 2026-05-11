import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { IntegrationsView } from "@/features/integrations/ui/IntegrationsView/IntegrationsView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Integrations" });
  return { title: t("title") };
}

export default function IntegrationsPage() {
  return <IntegrationsView />;
}

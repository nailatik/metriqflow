import type { Metadata } from "next";
import { getTranslator } from "@/i18n/getTranslator";
import { IntegrationsView } from "@/features/integrations/ui/IntegrationsView/IntegrationsView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale, "Integrations");
  return { title: t("title") };
}

export default function IntegrationsPage() {
  return <IntegrationsView />;
}

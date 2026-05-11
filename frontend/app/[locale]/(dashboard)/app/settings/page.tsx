import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SettingsView } from "@/features/settings/ui/SettingsView/SettingsView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settings" });
  return { title: t("title") };
}

export default function SettingsPage() {
  return <SettingsView />;
}

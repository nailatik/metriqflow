import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslator } from "@/i18n/getTranslator";
import { SettingsView } from "@/features/settings/ui/SettingsView/SettingsView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale, "Settings");
  return { title: t("title") };
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}

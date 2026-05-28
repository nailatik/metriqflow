import type { Metadata } from "next";
import { getTranslator } from "@/i18n/getTranslator";
import { ProfileView } from "@/features/profile/ui/ProfileView/ProfileView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale, "Profile");
  return { title: t("title") };
}

export default function ProfilePage() {
  return <ProfileView />;
}

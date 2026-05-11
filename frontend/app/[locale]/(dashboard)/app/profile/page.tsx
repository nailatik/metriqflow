import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileView } from "@/features/profile/ui/ProfileView/ProfileView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });
  return { title: t("title") };
}

export default function ProfilePage() {
  return <ProfileView />;
}

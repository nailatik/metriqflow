import type { Metadata } from "next";
import { ProfileView } from "@/features/profile/ui/ProfileView/ProfileView";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your personal account and profile details.",
};

export default function ProfilePage() {
  return <ProfileView />;
}

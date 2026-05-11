import type { Metadata } from "next";
import { SettingsView } from "@/features/settings/ui/SettingsView/SettingsView";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Metriq Flow account settings.",
};

export default function SettingsPage() {
  return <SettingsView />;
}

import type { Metadata } from "next";
import { IntegrationsView } from "@/features/integrations/ui/IntegrationsView/IntegrationsView";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Connect your social media platforms.",
};

export default function IntegrationsPage() {
  return <IntegrationsView />;
}

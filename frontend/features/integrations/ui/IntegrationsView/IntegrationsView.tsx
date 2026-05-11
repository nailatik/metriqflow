"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/Button/Button";

const integrations = [
  { id: 1, name: "Telegram", connected: false },
  { id: 2, name: "Instagram", connected: false },
  { id: 3, name: "YouTube", connected: false },
  { id: 4, name: "TikTok", connected: false },
  { id: 5, name: "VK", connected: false },
] as const;

export function IntegrationsView() {
  const t = useTranslations("Integrations");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>

      <div className="grid md:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              <h3 className="font-semibold text-lg text-textMain">{item.name}</h3>
              <p className="text-sm mt-2 text-textSecondary">
                {item.connected ? t("connected") : t("notConnected")}
              </p>
            </div>
            <div className="mt-4">
              <Button variant={item.connected ? "secondary" : "primary"}>
                {item.connected ? t("manage") : t("connect")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

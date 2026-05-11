"use client";

import { Button } from "@/shared/ui/Button/Button";

const integrations = [
  { id: 1, name: "Telegram", connected: false },
  { id: 2, name: "Instagram", connected: false },
  { id: 3, name: "YouTube", connected: false },
  { id: 4, name: "TikTok", connected: false },
  { id: 5, name: "VK", connected: false },
] as const;

export function IntegrationsView() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Integrations</h1>

      <div className="grid md:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-border rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <p className="text-sm mt-2 text-textSecondary">
                {item.connected ? "Connected" : "Not connected"}
              </p>
            </div>
            <div className="mt-4">
              <Button variant={item.connected ? "secondary" : "primary"}>
                {item.connected ? "Manage" : "Connect"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

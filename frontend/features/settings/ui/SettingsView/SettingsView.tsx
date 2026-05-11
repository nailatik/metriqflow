"use client";

import { observer } from "mobx-react-lite";
import { useUserStore } from "@/shared/store/StoreProvider";

export const SettingsView = observer(() => {
  const userStore = useUserStore();
  const user = userStore.user;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <div className="space-y-4 text-textSecondary">
          <div>
            <p className="text-sm font-medium text-textMain">Email</p>
            <p className="mt-1">{user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-textMain">Full name</p>
            <p className="mt-1">{user?.full_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-textMain">Organization</p>
            <p className="mt-1">{user?.organization ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-textMain">Phone</p>
            <p className="mt-1">{user?.phone ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Preferences</h2>
        <p className="text-textSecondary text-sm">Settings management coming soon.</p>
      </div>
    </div>
  );
});

"use client";

import type { Metadata } from "next";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";
import { Button } from "@/shared/ui/Button/Button";

export default observer(function DashboardPage() {
  const router = useRouter();
  const userStore = useUserStore();
  const user = userStore.user;
  const userName = user?.full_name?.split(" ")[0] ?? "";

  const handleLogout = () => {
    userStore.logout();
    router.push("/login");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-textMain">Dashboard</h1>
          <p className="text-textSecondary mt-1">
            {userName ? `Welcome, ${userName}` : "Welcome back"}
          </p>
        </div>
        <Button variant="secondary" onClick={handleLogout}>Logout</Button>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Account info</h2>
        <div className="space-y-2 text-textSecondary">
          <p><span className="font-medium text-textMain">Name:</span> {user?.full_name ?? "—"}</p>
          <p><span className="font-medium text-textMain">Email:</span> {user?.email ?? "—"}</p>
          <p><span className="font-medium text-textMain">ID:</span> {user?.id ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-textSecondary text-sm">Reports</p>
          <p className="text-2xl font-semibold mt-2">-</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-textSecondary text-sm">Integrations</p>
          <p className="text-2xl font-semibold mt-2">-</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-textSecondary text-sm">Activity</p>
          <p className="text-2xl font-semibold mt-2">Active</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">Recent activity</h2>
        <p className="text-textSecondary">No recent activity yet</p>
      </div>
    </div>
  );
});

"use client";

import { observer } from "mobx-react-lite";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/shared/store/StoreProvider";
import { Button } from "@/shared/ui/Button/Button";

export default observer(function DashboardPage() {
  const router = useRouter();
  const t = useTranslations("Dashboard");
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
          <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>
          <p className="text-textSecondary mt-1">
            {userName ? t("welcome", { name: userName }) : t("welcomeBack")}
          </p>
        </div>
        <Button variant="secondary" onClick={handleLogout}>{t("logout")}</Button>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">{t("accountInfo.title")}</h2>
        <div className="space-y-2 text-textSecondary">
          <p><span className="font-medium text-textMain">{t("accountInfo.name")}:</span> {user?.full_name ?? "—"}</p>
          <p><span className="font-medium text-textMain">{t("accountInfo.email")}:</span> {user?.email ?? "—"}</p>
          <p><span className="font-medium text-textMain">{t("accountInfo.id")}:</span> {user?.id ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-textSecondary text-sm">{t("stats.reports")}</p>
          <p className="text-2xl font-semibold mt-2">-</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-textSecondary text-sm">{t("stats.integrations")}</p>
          <p className="text-2xl font-semibold mt-2">-</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-textSecondary text-sm">{t("stats.activity")}</p>
          <p className="text-2xl font-semibold mt-2">{t("stats.active")}</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">{t("recentActivity.title")}</h2>
        <p className="text-textSecondary">{t("recentActivity.empty")}</p>
      </div>
    </div>
  );
});

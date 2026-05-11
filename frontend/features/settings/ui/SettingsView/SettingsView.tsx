"use client";

import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { useUserStore } from "@/shared/store/StoreProvider";

export const SettingsView = observer(() => {
  const t = useTranslations("Settings");
  const userStore = useUserStore();
  const user = userStore.user;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-textMain mb-4">{t("account.title")}</h2>
        <div className="space-y-4 text-textSecondary">
          <div>
            <p className="text-sm font-medium text-textMain">{t("account.email")}</p>
            <p className="mt-1">{user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-textMain">{t("account.fullName")}</p>
            <p className="mt-1">{user?.full_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-textMain">{t("account.organization")}</p>
            <p className="mt-1">{user?.organization ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-textMain">{t("account.phone")}</p>
            <p className="mt-1">{user?.phone ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-textMain mb-4">{t("preferences.title")}</h2>
        <p className="text-textSecondary text-sm">{t("preferences.comingSoon")}</p>
      </div>
    </div>
  );
});

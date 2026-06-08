"use client";

import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { useUserStore } from "@/shared/store/StoreProvider";
import { Link } from "@/i18n/navigation";
import { usePlan } from "@/shared/hooks/usePlan";
import { PLAN_NAMES } from "@/shared/lib/plans";

export const ProfileView = observer(() => {
  const t = useTranslations("Profile");
  const userStore = useUserStore();
  const user = userStore.state.user;
  const { plan } = usePlan();

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-card flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primaryHover flex items-center justify-center text-onAccent text-2xl font-semibold flex-shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-textMain">{user?.full_name ?? "—"}</h2>
          <p className="text-textSecondary mt-1">{user?.email ?? "—"}</p>
          {user?.organization && (
            <p className="text-textSecondary text-sm mt-1">{user.organization}</p>
          )}
          <Link
            href="/app/billing"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/15 transition-colors"
          >
            {t("subscription")}: {PLAN_NAMES[plan]}
            <span className="opacity-60">→</span>
          </Link>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
        <h2 className="text-lg font-semibold text-textMain mb-4">{t("personalInfo")}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-sm text-textSecondary">{t("fullName")}</p>
              <p className="font-medium text-textMain mt-1">{user?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-textSecondary">{t("email")}</p>
              <p className="font-medium text-textMain mt-1">{user?.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-textSecondary">{t("phone")}</p>
              <p className="font-medium text-textMain mt-1">{user?.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-textSecondary">{t("birthDate")}</p>
              <p className="font-medium text-textMain mt-1">{user?.birth_date ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-textSecondary">{t("organization")}</p>
              <p className="font-medium text-textMain mt-1">{user?.organization ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-textSecondary">{t("accountId")}</p>
              <p className="font-medium text-textMain mt-1">{user?.id ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

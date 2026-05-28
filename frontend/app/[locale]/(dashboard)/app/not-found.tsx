"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function DashboardNotFound() {
  const t = useTranslations("Common.notFound");
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-bold text-textMain">{t("code")}</h1>
      <h2 className="text-xl font-semibold mt-4 text-textMain">{t("title")}</h2>
      <p className="text-textSecondary mt-2">{t("dashboardDesc")}</p>
      <Link href="/app" className="mt-6 px-4 py-2 rounded-xl bg-primary text-white hover:bg-indigo-700 transition inline-block">
        {t("dashboardButton")}
      </Link>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LoginError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("Common.error");
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4 text-center">
      <h2 className="text-2xl font-semibold text-red-600 mb-4">{t("title")}</h2>
      <p className="text-textSecondary mb-6">{error.message}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-indigo-700 transition">{t("tryAgain")}</button>
        <Link href="/" className="px-4 py-2 rounded-xl bg-gray-100 text-textMain hover:bg-gray-200 transition">{t("goHome")}</Link>
      </div>
    </div>
  );
}

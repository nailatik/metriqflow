"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/Button/Button";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("Common.error");
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-2xl font-semibold text-red-600 mb-4">{t("title")}</h2>
      <p className="text-textSecondary mb-6">{error.message}</p>
      <Button variant="primary" onClick={reset}>{t("tryAgain")}</Button>
    </div>
  );
}

"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  reason?: string;
  compact?: boolean;
};

export function UpgradeBanner({ reason, compact = false }: Props) {
  const t = useTranslations("Billing");
  const locale = useLocale();

  if (compact) {
    return (
      <p className="text-xs text-textSecondary">
        {reason ?? t("limitReached")}{" "}{t("canUpgrade")}{" "}
        <Link href={`/${locale}/app/billing`} className="text-primary hover:underline font-medium">
          {t("upgradeLink")}
        </Link>
        {t("canUpgradeSuffix")}
      </p>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-textMain">{reason ?? t("limitReached")}</p>
        <p className="text-xs text-textSecondary mt-0.5">{t("upgradeDesc")}</p>
      </div>
      <Link
        href={`/${locale}/app/billing`}
        className="flex-shrink-0 px-4 py-2 bg-primary text-onAccent text-sm font-medium rounded-lg hover:bg-primaryHover transition"
      >
        {t("upgrade")}
      </Link>
    </div>
  );
}

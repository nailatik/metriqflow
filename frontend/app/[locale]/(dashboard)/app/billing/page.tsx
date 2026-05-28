"use client";

import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { useUserStore } from "@/shared/store/StoreProvider";
import { PLAN_LIMITS, PLAN_NAMES } from "@/shared/lib/plans";
import type { Plan } from "@/entities/user/types";

const VISIBLE_PLANS: Plan[] = ["free", "pro", "agency"];

const PRICES: Record<Plan, string | null> = {
  free:      null,
  pro:       "590",
  agency:    "1 990",
  unlimited: null,
};

const TAGLINE_KEYS: Record<string, "taglineFree" | "taglinePro" | "taglineAgency"> = {
  free:   "taglineFree",
  pro:    "taglinePro",
  agency: "taglineAgency",
};

function Feature({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className={`mt-px shrink-0 font-bold ${ok ? "text-primary" : "text-textSecondary/25"}`}>
        {ok ? "✓" : "—"}
      </span>
      <span className={ok ? "text-textMain" : "text-textSecondary/50"}>{label}</span>
    </div>
  );
}

export default observer(function BillingPage() {
  const t = useTranslations("Billing");
  const userStore = useUserStore();
  const currentPlan: Plan = (userStore.state.user?.plan as Plan) ?? "free";

  return (
    <div className="flex flex-col gap-10 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-textMain">{t("title")}</h1>
        <p className="text-textSecondary text-sm mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {VISIBLE_PLANS.map((plan) => {
          const limits    = PLAN_LIMITS[plan];
          const price     = PRICES[plan];
          const isCurrent = plan === currentPlan;
          const isPopular = plan === "pro";

          const features = [
            {
              ok: true,
              label: limits.tg_channels === null
                ? t("feat.tgUnlimited")
                : t("feat.tgN", { n: limits.tg_channels }),
            },
            {
              ok: true,
              label: limits.vk_communities === null
                ? t("feat.vkUnlimited")
                : t("feat.vkN", { n: limits.vk_communities }),
            },
            {
              ok: limits.history_days === null,
              label: limits.history_days === null
                ? t("feat.historyFull")
                : t("feat.historyN", { n: limits.history_days }),
            },
            {
              ok: limits.autoreports === null,
              label: limits.autoreports === null
                ? t("feat.autoUnlimited")
                : t("feat.autoN", { n: limits.autoreports }),
            },
            {
              ok: (limits.ai_daily ?? 0) > 0 || limits.ai_daily === null,
              label: t("feat.ai"),
            },
            {
              ok: limits.export,
              label: t("feat.export"),
            },
          ];

          return (
            <div
              key={plan}
              className={`relative flex flex-col overflow-hidden rounded-2xl bg-surface transition-shadow ${
                isPopular && !isCurrent
                  ? "border-2 border-primary shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
                  : isCurrent
                    ? "border-2 border-primary/50"
                    : "border border-border"
              }`}
            >
              {/* Top stripe */}
              {isCurrent ? (
                <div className="bg-primary/10 text-primary text-xs font-semibold text-center py-1.5 tracking-wide border-b border-primary/20">
                  {t("current")}
                </div>
              ) : isPopular ? (
                <div className="bg-primary text-white text-xs font-semibold text-center py-1.5 tracking-wide">
                  {t("popular")}
                </div>
              ) : (
                <div className="py-1.5" />
              )}

              <div className="p-6 flex flex-col gap-5 flex-1">
                {/* Name + tagline */}
                <div>
                  <h3 className="font-semibold text-lg text-textMain">{PLAN_NAMES[plan]}</h3>
                  <p className="text-xs text-textSecondary mt-0.5">{t(TAGLINE_KEYS[plan])}</p>
                </div>

                {/* Price */}
                <div className="flex items-end gap-1.5">
                  {price ? (
                    <>
                      <span className="text-3xl font-bold text-textMain leading-none">{price}</span>
                      <span className="text-sm text-textSecondary pb-0.5">{t("perMonth")}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-textMain leading-none">{t("free")}</span>
                  )}
                </div>

                <div className="h-px bg-border" />

                {/* Features */}
                <div className="flex flex-col gap-2.5 flex-1">
                  {features.map((f, i) => (
                    <Feature key={i} ok={f.ok} label={f.label} />
                  ))}
                </div>

                {/* CTA */}
                <div className="pt-1">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl border border-border text-textSecondary text-sm cursor-default"
                    >
                      {t("currentPlan")}
                    </button>
                  ) : plan !== "free" ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl bg-primary text-white text-sm font-medium opacity-50 cursor-not-allowed"
                    >
                      {t("comingSoon")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-textSecondary">{t("paymentNote")}</p>
    </div>
  );
});

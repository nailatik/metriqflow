"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { useUserStore, useBillingStore } from "@/shared/store/StoreProvider";
import { PLAN_LIMITS, PLAN_NAMES } from "@/shared/lib/plans";
import type { Plan } from "@/entities/user/types";

const VISIBLE_PLANS: Plan[] = ["free", "pro", "agency"];

const PRICES: Record<Plan, string | null> = {
  free:     null,
  pro:      "590",
  agency:   "1 990",
  ultimate: null,
};

const TAGLINE_KEYS: Record<string, "taglineFree" | "taglinePro" | "taglineAgency" | "taglineUltimate"> = {
  free:     "taglineFree",
  pro:      "taglinePro",
  agency:   "taglineAgency",
  ultimate: "taglineUltimate",
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

function PromoSection() {
  const t = useTranslations("Billing");
  const billingStore = useBillingStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "already" | "invalid" | "error"; plan?: string } | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await billingStore.redeem(code.trim());
    setLoading(false);
    if (res.ok) {
      setResult({ type: res.already ? "already" : "success", plan: res.plan });
      setCode("");
    } else if (res.error === "code_invalid") {
      setResult({ type: "invalid" });
    } else {
      setResult({ type: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-textMain">{t("promoTitle")}</h2>
      <p className="text-sm text-textSecondary">{t("promoDesc")}</p>
      <div className="flex gap-2 max-w-sm">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
          placeholder={t("promoPlaceholder")}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-textMain placeholder:text-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/30"
          disabled={loading}
        />
        <button
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          className="px-4 py-2 text-sm font-medium bg-primary text-onAccent rounded-lg hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? t("promoActivating") : t("promoActivate")}
        </button>
      </div>
      {result && (
        <p className={`text-sm ${result.type === "success" ? "text-success" : result.type === "already" ? "text-textSecondary" : "text-error"}`}>
          {result.type === "success" && t("promoSuccess", { plan: PLAN_NAMES[result.plan as Plan] ?? result.plan })}
          {result.type === "already" && t("promoAlready")}
          {result.type === "invalid" && t("promoInvalid")}
          {result.type === "error" && t("promoError")}
        </p>
      )}
    </div>
  );
}

export default observer(function BillingPage() {
  const t = useTranslations("Billing");
  const userStore = useUserStore();
  const currentPlan: Plan = (userStore.state.user?.plan as Plan) ?? "free";
  const planExpiresAt = userStore.state.user?.plan_expires_at;

  const visiblePlans = currentPlan === "ultimate"
    ? (["free", "pro", "agency", "ultimate"] as Plan[])
    : VISIBLE_PLANS;

  return (
    <div className="flex flex-col gap-10 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-textMain">{t("title")}</h1>
        <p className="text-textSecondary text-sm mt-1">{t("subtitle")}</p>
      </div>

      {/* Current plan status */}
      {currentPlan !== "free" && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
          <span className="font-semibold text-primary">{PLAN_NAMES[currentPlan]}</span>
          <span className="text-textSecondary">{t("planActive")}</span>
          {planExpiresAt && (
            <span className="text-textSecondary ml-auto">
              {t("planExpires")} {new Date(planExpiresAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      <div className={`grid gap-5 ${visiblePlans.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {visiblePlans.map((plan) => {
          const limits    = PLAN_LIMITS[plan];
          const price     = PRICES[plan];
          const isCurrent = plan === currentPlan;
          const isPopular = plan === "pro";
          const isUltimate = plan === "ultimate";

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
              ok: limits.export_formats.includes("pdf"),
              label: t("feat.export"),
            },
          ];

          return (
            <div
              key={plan}
              className={`relative flex flex-col overflow-hidden rounded-2xl bg-surface transition-shadow ${
                isUltimate && isCurrent
                  ? "border-2 border-primary shadow-[0_8px_28px_rgba(217,119,6,0.20)]"
                  : isPopular && !isCurrent
                    ? "border-2 border-primary shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
                    : isCurrent
                      ? "border-2 border-primary/50"
                      : "border border-border"
              }`}
            >
              {/* Top stripe */}
              {isCurrent && isUltimate ? (
                <div className="bg-primary/15 text-primary text-xs font-semibold text-center py-1.5 tracking-wide border-b border-primary/25">
                  {t("current")}
                </div>
              ) : isCurrent ? (
                <div className="bg-primary/10 text-primary text-xs font-semibold text-center py-1.5 tracking-wide border-b border-primary/20">
                  {t("current")}
                </div>
              ) : isPopular ? (
                <div className="bg-primary text-onAccent text-xs font-semibold text-center py-1.5 tracking-wide">
                  {t("popular")}
                </div>
              ) : isUltimate ? (
                <div className="bg-gradient-to-r from-primary to-primaryHover text-onAccent text-xs font-semibold text-center py-1.5 tracking-wide">
                  {t("exclusiveTag")}
                </div>
              ) : (
                <div className="py-1.5" />
              )}

              <div className="p-6 flex flex-col gap-5 flex-1">
                {/* Name + tagline */}
                <div>
                  <h3 className={`font-semibold text-lg ${isUltimate ? "text-primary" : "text-textMain"}`}>
                    {PLAN_NAMES[plan]}
                  </h3>
                  <p className="text-xs text-textSecondary mt-0.5">{t(TAGLINE_KEYS[plan])}</p>
                </div>

                {/* Price */}
                <div className="flex items-end gap-1.5">
                  {price ? (
                    <>
                      <span className="text-3xl font-bold text-textMain leading-none tabular-nums">{price}</span>
                      <span className="text-sm text-textSecondary pb-0.5">{t("perMonth")}</span>
                    </>
                  ) : (
                    <span className={`text-3xl font-bold leading-none ${isUltimate ? "text-primary" : "text-textMain"}`}>
                      {t("free")}
                    </span>
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
                  ) : plan !== "free" && !isUltimate ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl bg-primary text-onAccent text-sm font-medium opacity-50 cursor-not-allowed"
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

      <PromoSection />

      <p className="text-xs text-textSecondary">{t("paymentNote")}</p>
    </div>
  );
});

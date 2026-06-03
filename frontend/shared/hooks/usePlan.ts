"use client";

import { useBillingStore } from "@/shared/store/StoreProvider";
import { PLAN_NAMES } from "@/shared/lib/plans";

export function usePlan() {
  const billingStore = useBillingStore();
  const plan = billingStore.plan;
  const limits = billingStore.limits;
  const planName = PLAN_NAMES[plan];

  return {
    plan,
    planName,
    limits,
    isPro:       plan === "pro" || plan === "agency" || plan === "ultimate",
    isAgency:    plan === "agency" || plan === "ultimate",
    isUltimate:  plan === "ultimate",
    canAddTgChannel:     limits.tg_channels === null,
    canAddVkCommunity:   limits.vk_communities === null,
    canUseAI:            (limits.ai_daily ?? 0) > 0 || limits.ai_daily === null,
    canExport:           limits.export_formats.length > 1,
    canExportFormat:     (fmt: string) => limits.export_formats.includes(fmt as "xml" | "csv" | "pdf"),
    hasFullHistory:      limits.history_days === null,
  };
}

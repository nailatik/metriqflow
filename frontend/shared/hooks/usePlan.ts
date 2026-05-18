"use client";

import { useUserStore } from "@/shared/store/StoreProvider";
import { getLimits, PLAN_NAMES } from "@/shared/lib/plans";
import type { Plan } from "@/entities/user/types";

export function usePlan() {
  const userStore = useUserStore();
  const plan: Plan = (userStore.user?.plan as Plan) ?? "free";
  const limits = getLimits(plan);
  const planName = PLAN_NAMES[plan];

  return {
    plan,
    planName,
    limits,
    isPro:       plan === "pro" || plan === "agency" || plan === "unlimited",
    isAgency:    plan === "agency" || plan === "unlimited",
    isUnlimited: plan === "unlimited",
    canAddTgChannel:     limits.tg_channels === null,
    canAddVkCommunity:   limits.vk_communities === null,
    canUseAI:            (limits.ai_daily ?? 0) > 0 || limits.ai_daily === null,
    canExport:           limits.export,
    hasFullHistory:      limits.history_days === null,
  };
}

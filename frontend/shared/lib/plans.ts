import type { Plan } from "@/entities/user/types";

export interface PlanLimits {
  tg_channels:    number | null;
  vk_communities: number | null;
  history_days:   number | null;
  autoreports:    number | null;
  ai_daily:       number | null;
  export:         boolean;
  team:           number | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:      { tg_channels: 1,  vk_communities: 1,  history_days: 30,   autoreports: 1,    ai_daily: 0,    export: false, team: 1    },
  pro:       { tg_channels: 5,  vk_communities: 5,  history_days: null, autoreports: null, ai_daily: 5,    export: true,  team: 1    },
  agency:    { tg_channels: 20, vk_communities: 20, history_days: null, autoreports: null, ai_daily: null, export: true,  team: 3    },
  unlimited: { tg_channels: null, vk_communities: null, history_days: null, autoreports: null, ai_daily: null, export: true, team: null },
};

export const PLAN_NAMES: Record<Plan, string> = {
  free:      "Free",
  pro:       "Pro",
  agency:    "Agency",
  unlimited: "Unlimited",
};

export function getLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

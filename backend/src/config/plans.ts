export type Plan = "free" | "pro" | "agency" | "unlimited";

export interface PlanLimits {
  tg_channels:     number | null;
  vk_communities:  number | null;
  history_days:    number | null;
  autoreports:     number | null;
  ai_daily:        number | null;
  export:          boolean;
  team:            number | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:      { tg_channels: 1,  vk_communities: 1,  history_days: 30,   autoreports: 1,    ai_daily: 0,    export: false, team: 1    },
  pro:       { tg_channels: 5,  vk_communities: 5,  history_days: null, autoreports: null, ai_daily: 5,    export: true,  team: 1    },
  agency:    { tg_channels: 20, vk_communities: 20, history_days: null, autoreports: null, ai_daily: null, export: true,  team: 3    },
  unlimited: { tg_channels: null, vk_communities: null, history_days: null, autoreports: null, ai_daily: null, export: true, team: null },
};

export function getLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free;
}

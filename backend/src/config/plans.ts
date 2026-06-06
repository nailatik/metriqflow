export type Plan = "free" | "pro" | "agency" | "ultimate";

export interface PlanLimits {
  tg_channels:     number | null;
  vk_communities:  number | null;
  competitors:     number | null;
  history_days:    number | null;
  autoreports:     number | null;
  ai_daily:        number | null;
  export_formats:  ReportFormat[];
  team:            number | null;
}

export type ReportFormat = "xml" | "csv" | "pdf";

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:     { tg_channels: 1,    vk_communities: 1,    competitors: 1,    history_days: 30,   autoreports: 1,    ai_daily: 0,  export_formats: ["xml","csv"],       team: 1    },
  pro:      { tg_channels: 5,    vk_communities: 5,    competitors: 5,    history_days: null, autoreports: null, ai_daily: 5,  export_formats: ["xml","csv","pdf"], team: 1    },
  agency:   { tg_channels: 20,   vk_communities: 20,   competitors: 20,   history_days: null, autoreports: null, ai_daily: 20, export_formats: ["xml","csv","pdf"], team: 3    },
  ultimate: { tg_channels: null, vk_communities: null, competitors: null, history_days: null, autoreports: null, ai_daily: 20, export_formats: ["xml","csv","pdf"], team: null },
};

export function getLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free;
}

export function canExportFormat(plan: string, format: ReportFormat): boolean {
  return getLimits(plan).export_formats.includes(format);
}

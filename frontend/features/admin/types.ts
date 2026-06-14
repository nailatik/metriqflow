export type Plan = "free" | "pro" | "agency" | "ultimate";
export type PromoStatus = "active" | "exhausted" | "expired" | "disabled";

export interface PromoCode {
  code: string;
  label: string | null;
  grants_plan: Plan;
  grants_duration_days: number | null;
  max_uses: number;
  used_count: number;
  remaining: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: number | null;
  status: PromoStatus;
}

export interface PromoRedemption {
  user_id: number;
  email: string;
  redeemed_at: string;
}

export interface CreatePromoPayload {
  code?: string;
  label?: string;
  grants_plan: Plan;
  grants_duration_days?: number | null;
  max_uses: number;
  expires_at?: string | null;
}

export interface PatchPromoPayload {
  active?: boolean;
  max_uses?: number;
  expires_at?: string | null;
  label?: string | null;
}

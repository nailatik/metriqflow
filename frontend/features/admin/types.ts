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

export interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  plan: Plan;
  plan_expires_at: string | null;
  email_verified: boolean;
  created_at: string;
  tg_linked: string;
  vk_linked: string;
  schedules_count: string;
  promos_used: string;
}

export interface TGChannel {
  id: string;
  title: string;
  username: string | null;
}

export interface TGIntegration {
  telegram_id: string;
  username: string | null;
  linked_at: string;
  channels: TGChannel[] | null;
}

export interface VKCommunity {
  id: string;
  name: string;
  screen_name: string | null;
  active: boolean;
}

export interface VKIntegration {
  id: number;
  linked_at: string;
  communities: VKCommunity[] | null;
}

export interface UserSchedule {
  id: number;
  name: string;
  format: string;
  enabled: boolean;
  created_at: string;
  next_send_at: string | null;
}

export interface UserRedemption {
  redeemed_at: string;
  code: string;
  grants_plan: Plan;
  grants_duration_days: number | null;
}

export interface AdminUserDetail {
  user: {
    id: number;
    email: string;
    full_name: string | null;
    plan: Plan;
    plan_expires_at: string | null;
    email_verified: boolean;
    created_at: string;
    organization: string | null;
    phone: string | null;
  };
  telegram: TGIntegration[];
  vk: VKIntegration[];
  schedules: UserSchedule[];
  redemptions: UserRedemption[];
}

export interface UsersListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface PatchUserPlanPayload {
  plan: Plan;
  plan_expires_at?: string | null;
}

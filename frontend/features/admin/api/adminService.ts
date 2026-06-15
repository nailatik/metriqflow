import { api } from "@/shared/lib/axios";
import type {
  PromoCode,
  PromoRedemption,
  CreatePromoPayload,
  PatchPromoPayload,
  UsersListResponse,
  AdminUserDetail,
  PatchUserPlanPayload,
  BillingEvent,
  AuditEvent,
} from "../types";

export const adminService = {
  getOverview: () => api.get("/admin/overview"),

  listPromos: () => api.get<PromoCode[]>("/admin/promos"),
  createPromo: (data: CreatePromoPayload) => api.post<PromoCode>("/admin/promos", data),
  patchPromo: (code: string, data: PatchPromoPayload) =>
    api.patch<PromoCode>(`/admin/promos/${code}`, data),
  deletePromo: (code: string) => api.delete(`/admin/promos/${code}`),
  getRedemptions: (code: string) =>
    api.get<PromoRedemption[]>(`/admin/promos/${code}/redemptions`),

  listUsers: (params: { page?: number; limit?: number; search?: string; plan?: string }) =>
    api.get<UsersListResponse>("/admin/users", { params }),
  getUser: (id: number) =>
    api.get<AdminUserDetail>(`/admin/users/${id}`),
  patchUserPlan: (id: number, data: PatchUserPlanPayload) =>
    api.patch(`/admin/users/${id}/plan`, data),

  getBillingEvents: (params: { page?: number; limit?: number }) =>
    api.get<{ events: BillingEvent[]; total: number; page: number; limit: number }>(
      "/admin/billing/events", { params }
    ),

  getAuditLog: (params: { page?: number; limit?: number; action?: string }) =>
    api.get<{ events: AuditEvent[]; total: number; page: number; limit: number }>(
      "/admin/audit", { params }
    ),
};

import { api } from "@/shared/lib/axios";
import type {
  PromoCode,
  PromoRedemption,
  CreatePromoPayload,
  PatchPromoPayload,
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
};

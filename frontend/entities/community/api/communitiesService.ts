import { http } from "@/shared/lib/axios";
import type { Community } from "../types";

export const communitiesService = {
  getCommunities: () => http.get<Community[]>("/vk/communities"),
  addCommunity: (group_id: string) => http.post<Community, { group_id: string }>("/vk/communities", { group_id }),
  removeCommunity: (id: number) => http.delete(`/vk/communities/${id}`),
};

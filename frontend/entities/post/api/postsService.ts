import { http } from "@/shared/lib/axios";
import type { TgSearchParams, TgSearchResult, VkSearchParams, VkSearchResult } from "../types";

export const postsService = {
  searchTg: (params: TgSearchParams) =>
    http.get<TgSearchResult>("/posts/search", { params }),

  searchVk: ({ communityId, ...params }: VkSearchParams) =>
    http.get<VkSearchResult>(`/vk/communities/${communityId}/posts-search`, { params }),
};

import { http } from "@/shared/lib/axios";
import type { PostsSearchParams, PostsSearchResult } from "../types";

export const postsService = {
  search: (params: PostsSearchParams) =>
    http.get<PostsSearchResult>("/posts/search", { params }),
};

import type { Community } from "@/entities/community/types";

export interface CommunitiesState {
  list: Community[];
  loaded: boolean;
}

export type AddCommunityResult =
  | { ok: true; community: Community }
  | { ok: false; upgrade: true }
  | { ok: false; code?: number; message?: string };

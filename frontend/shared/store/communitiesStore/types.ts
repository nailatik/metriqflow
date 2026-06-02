import type { Community } from "@/entities/community/types";

export type AddCommunityResult =
  | { ok: true; community: Community }
  | { ok: false; upgrade: true }
  | { ok: false; code?: number; message?: string };

import type { Community } from "@/entities/community/types";

export interface CommunitiesState {
  list: Community[];
  loaded: boolean;
}

export const initialCommunitiesState: CommunitiesState = {
  list: [],
  loaded: false,
};

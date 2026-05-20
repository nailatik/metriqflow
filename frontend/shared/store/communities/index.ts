import { makeAutoObservable } from "mobx";
import type { Community } from "@/entities/community/types";
import type { RootStore } from "../RootStore";
import { initialCommunitiesState } from "./models/communitiesState";
import { communitiesAsync } from "./models/communitiesAsync";
import { communitiesSync } from "./models/communitiesSync";

export class CommunitiesStore {
  list: Community[] = initialCommunitiesState.list;
  loaded: boolean = initialCommunitiesState.loaded;
  inflight: Promise<void> | null = null;

  constructor(public root: RootStore) {
    makeAutoObservable(this, { root: false, inflight: false });
  }

  fetch(force = false) {
    return communitiesAsync.fetch(this, force);
  }
  add(group_id: string) {
    return communitiesAsync.add(this, group_id);
  }
  remove(id: number) {
    return communitiesAsync.remove(this, id);
  }
  reset() {
    communitiesSync.reset(this);
  }
}

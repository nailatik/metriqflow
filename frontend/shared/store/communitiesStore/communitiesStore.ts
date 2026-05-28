import type { RootStore } from "../RootStore";
import { CommunitiesState } from "./models/communitiesState";
import { communitiesAsync } from "./models/communitiesAsync";
import { communitiesSync } from "./models/communitiesSync";

export class CommunitiesStore {
  state: CommunitiesState;
  inflight: Promise<void> | null = null;

  constructor(public root: RootStore) {
    this.state = new CommunitiesState();
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

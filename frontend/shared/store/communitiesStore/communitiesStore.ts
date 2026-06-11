import type { Community } from "@/entities/community/types";
import type { RootStore } from "../RootStore";
import { CommunitiesState } from "./models/communitiesState";
import { communitiesAsync } from "./models/communitiesAsync";
import { communitiesSync } from "./models/communitiesSync";

export class CommunitiesStore {
  state: CommunitiesState;
  inflight: Promise<void> | null = null;

  readonly sync = {
    setList: (list: Community[]) => communitiesSync.setList(this, list),
    prepend: (item: Community) => communitiesSync.prepend(this, item),
    removeById: (id: number) => communitiesSync.removeById(this, id),
    reset: () => communitiesSync.reset(this),
  };

  readonly async = {
    fetch: (force = false) => communitiesAsync.fetch(this, force),
    add: (group_id: string) => communitiesAsync.add(this, group_id),
    remove: (id: number) => communitiesAsync.remove(this, id),
  };

  constructor(public root: RootStore) {
    this.state = new CommunitiesState();
  }

  fetch(force = false) {
    return this.async.fetch(force);
  }
  add(group_id: string) {
    return this.async.add(group_id);
  }
  remove(id: number) {
    return this.async.remove(id);
  }
  reset() {
    this.sync.reset();
  }
}

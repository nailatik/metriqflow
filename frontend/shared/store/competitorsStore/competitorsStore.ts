import type { Competitor } from "@/entities/competitor/types";
import type { RootStore } from "../RootStore";
import { CompetitorsState } from "./models/competitorsState";
import { competitorsAsync } from "./models/competitorsAsync";
import { competitorsSync } from "./models/competitorsSync";

export class CompetitorsStore {
  state:    CompetitorsState;
  inflight: Promise<void> | null = null;

  readonly sync = {
    setList: (list: Competitor[]) => competitorsSync.setList(this, list),
    prepend: (item: Competitor) => competitorsSync.prepend(this, item),
    removeById: (id: number) => competitorsSync.removeById(this, id),
    reset: () => competitorsSync.reset(this),
  };

  readonly async = {
    fetch: (force = false) => competitorsAsync.fetch(this, force),
    add: (platform: "tg" | "vk", identifier: string) => competitorsAsync.add(this, platform, identifier),
    remove: (id: number) => competitorsAsync.remove(this, id),
  };

  constructor(public root: RootStore) {
    this.state = new CompetitorsState();
  }

  fetch(force = false) {
    return this.async.fetch(force);
  }
  add(platform: "tg" | "vk", identifier: string) {
    return this.async.add(platform, identifier);
  }
  remove(id: number) {
    return this.async.remove(id);
  }
  reset() {
    this.sync.reset();
  }
}

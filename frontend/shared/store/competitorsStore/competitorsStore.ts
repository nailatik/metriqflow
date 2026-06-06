import type { RootStore } from "../RootStore";
import { CompetitorsState } from "./models/competitorsState";
import { competitorsAsync } from "./models/competitorsAsync";
import { competitorsSync } from "./models/competitorsSync";

export class CompetitorsStore {
  state:    CompetitorsState;
  inflight: Promise<void> | null = null;

  constructor(public root: RootStore) {
    this.state = new CompetitorsState();
  }

  fetch(force = false) {
    return competitorsAsync.fetch(this, force);
  }
  add(platform: "tg" | "vk", identifier: string) {
    return competitorsAsync.add(this, platform, identifier);
  }
  remove(id: number) {
    return competitorsAsync.remove(this, id);
  }
  reset() {
    competitorsSync.reset(this);
  }
}

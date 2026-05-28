import type { CreateReport } from "@/entities/report/types";
import type { RootStore } from "../RootStore";
import { ReportsState } from "./models/reportsState";
import { reportsAsync } from "./models/reportsAsync";
import { reportsSync } from "./models/reportsSync";

export class ReportsStore {
  state: ReportsState;
  inflight: Promise<void> | null = null;

  constructor(public root: RootStore) {
    this.state = new ReportsState();
  }

  fetch(force = false) {
    return reportsAsync.fetch(this, force);
  }
  create(data: CreateReport) {
    return reportsAsync.create(this, data);
  }
  remove(id: number) {
    return reportsAsync.remove(this, id);
  }
  reset() {
    reportsSync.reset(this);
  }
}

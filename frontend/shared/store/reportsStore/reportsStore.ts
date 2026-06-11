import type { Report, CreateReport } from "@/entities/report/types";
import type { RootStore } from "../RootStore";
import { ReportsState } from "./models/reportsState";
import { reportsAsync } from "./models/reportsAsync";
import { reportsSync } from "./models/reportsSync";

export class ReportsStore {
  state: ReportsState;
  inflight: Promise<void> | null = null;

  readonly sync = {
    setList: (list: Report[]) => reportsSync.setList(this, list),
    prepend: (report: Report) => reportsSync.prepend(this, report),
    removeById: (id: number) => reportsSync.removeById(this, id),
    reset: () => reportsSync.reset(this),
  };

  readonly async = {
    fetch: (force = false) => reportsAsync.fetch(this, force),
    create: (data: CreateReport) => reportsAsync.create(this, data),
    remove: (id: number) => reportsAsync.remove(this, id),
  };

  constructor(public root: RootStore) {
    this.state = new ReportsState();
  }

  fetch(force = false) {
    return this.async.fetch(force);
  }
  create(data: CreateReport) {
    return this.async.create(data);
  }
  remove(id: number) {
    return this.async.remove(id);
  }
  reset() {
    this.sync.reset();
  }
}

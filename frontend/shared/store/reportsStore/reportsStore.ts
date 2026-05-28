import { makeAutoObservable } from "mobx";
import type { Report, CreateReport } from "@/entities/report/types";
import type { RootStore } from "../RootStore";
import { initialReportsState } from "./models/reportsState";
import { reportsAsync } from "./models/reportsAsync";
import { reportsSync } from "./models/reportsSync";

export class ReportsStore {
  list: Report[] = initialReportsState.list;
  loaded: boolean = initialReportsState.loaded;
  inflight: Promise<void> | null = null;

  constructor(public root: RootStore) {
    makeAutoObservable(this, { root: false, inflight: false });
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

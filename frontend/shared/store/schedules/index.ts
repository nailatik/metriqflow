import { makeAutoObservable } from "mobx";
import type { Schedule, CreateSchedule, UpdateSchedule } from "@/entities/schedule/types";
import type { RootStore } from "../RootStore";
import { initialSchedulesState } from "./models/schedulesState";
import { schedulesAsync } from "./models/schedulesAsync";
import { schedulesSync } from "./models/schedulesSync";

export class SchedulesStore {
  list: Schedule[] = initialSchedulesState.list;
  loaded: boolean = initialSchedulesState.loaded;
  inflight: Promise<void> | null = null;

  constructor(public root: RootStore) {
    makeAutoObservable(this, { root: false, inflight: false });
  }

  fetch(force = false) {
    return schedulesAsync.fetch(this, force);
  }
  create(data: CreateSchedule) {
    return schedulesAsync.create(this, data);
  }
  update(data: UpdateSchedule) {
    return schedulesAsync.update(this, data);
  }
  remove(id: number) {
    return schedulesAsync.remove(this, id);
  }
  toggleChannel(scheduleId: number, channel: "telegram" | "email", enabled: boolean) {
    return schedulesAsync.toggleChannel(this, scheduleId, channel, enabled);
  }
  reset() {
    schedulesSync.reset(this);
  }
}

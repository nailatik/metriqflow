import type { Schedule, CreateSchedule, UpdateSchedule } from "@/entities/schedule/types";
import type { RootStore } from "../RootStore";
import { SchedulesState } from "./models/schedulesState";
import { schedulesAsync } from "./models/schedulesAsync";
import { schedulesSync } from "./models/schedulesSync";

export class SchedulesStore {
  state: SchedulesState;
  inflight: Promise<void> | null = null;

  readonly sync = {
    setList: (list: Schedule[]) => schedulesSync.setList(this, list),
    prepend: (item: Schedule) => schedulesSync.prepend(this, item),
    replace: (item: Schedule) => schedulesSync.replace(this, item),
    removeById: (id: number) => schedulesSync.removeById(this, id),
    setChannelEnabled: (scheduleId: number, channel: "telegram" | "email", enabled: boolean) =>
      schedulesSync.setChannelEnabled(this, scheduleId, channel, enabled),
    reset: () => schedulesSync.reset(this),
  };

  readonly async = {
    fetch: (force = false) => schedulesAsync.fetch(this, force),
    create: (data: CreateSchedule) => schedulesAsync.create(this, data),
    update: (data: UpdateSchedule) => schedulesAsync.update(this, data),
    remove: (id: number) => schedulesAsync.remove(this, id),
    toggleChannel: (scheduleId: number, channel: "telegram" | "email", enabled: boolean) =>
      schedulesAsync.toggleChannel(this, scheduleId, channel, enabled),
  };

  constructor(public root: RootStore) {
    this.state = new SchedulesState();
  }

  fetch(force = false) {
    return this.async.fetch(force);
  }
  create(data: CreateSchedule) {
    return this.async.create(data);
  }
  update(data: UpdateSchedule) {
    return this.async.update(data);
  }
  remove(id: number) {
    return this.async.remove(id);
  }
  toggleChannel(scheduleId: number, channel: "telegram" | "email", enabled: boolean) {
    return this.async.toggleChannel(scheduleId, channel, enabled);
  }
  reset() {
    this.sync.reset();
  }
}

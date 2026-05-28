import type { CreateSchedule, UpdateSchedule } from "@/entities/schedule/types";
import type { RootStore } from "../RootStore";
import { SchedulesState } from "./models/schedulesState";
import { schedulesAsync } from "./models/schedulesAsync";
import { schedulesSync } from "./models/schedulesSync";

export class SchedulesStore {
  state: SchedulesState;
  inflight: Promise<void> | null = null;

  constructor(public root: RootStore) {
    this.state = new SchedulesState();
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

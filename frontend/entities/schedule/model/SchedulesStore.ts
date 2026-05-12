import { makeAutoObservable, runInAction } from "mobx";
import { schedulesService } from "../api/schedulesService";
import type { Schedule, CreateSchedule, UpdateSchedule } from "../types";
import type { RootStore } from "@/shared/store/RootStore";

export class SchedulesStore {
  list: Schedule[] = [];

  constructor(private root: RootStore) {
    makeAutoObservable(this);
  }

  async fetchSchedules(): Promise<void> {
    try {
      const res = await schedulesService.getSchedules();
      runInAction(() => { this.list = res.data; });
    } catch {
      this.root.uiStore.setError("Failed to load schedules");
    }
  }

  async createSchedule(data: CreateSchedule): Promise<Schedule | null> {
    try {
      const res = await schedulesService.createSchedule(data);
      runInAction(() => { this.list.unshift(res.data); });
      return res.data;
    } catch {
      this.root.uiStore.setError("Failed to create schedule");
      return null;
    }
  }

  async updateSchedule(data: UpdateSchedule): Promise<void> {
    try {
      const res = await schedulesService.updateSchedule(data);
      runInAction(() => {
        const i = this.list.findIndex((s) => s.id === data.id);
        if (i !== -1) this.list[i] = res.data;
      });
    } catch {
      this.root.uiStore.setError("Failed to update schedule");
    }
  }

  async deleteSchedule(id: number): Promise<void> {
    try {
      await schedulesService.deleteSchedule(id);
      runInAction(() => { this.list = this.list.filter((s) => s.id !== id); });
    } catch {
      this.root.uiStore.setError("Failed to delete schedule");
    }
  }

  async toggleChannel(scheduleId: number, channel: "telegram" | "email", enabled: boolean): Promise<void> {
    try {
      await schedulesService.toggleChannel(scheduleId, channel, enabled);
      runInAction(() => {
        const sched = this.list.find((s) => s.id === scheduleId);
        if (!sched) return;
        const ch = sched.channels.find((c) => c.channel === channel);
        if (ch) ch.enabled = enabled;
      });
    } catch {
      this.root.uiStore.setError("Failed to toggle channel");
    }
  }
}

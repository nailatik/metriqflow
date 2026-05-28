import { schedulesService } from "@/entities/schedule/api/schedulesService";
import type { Schedule, CreateSchedule, UpdateSchedule } from "@/entities/schedule/types";
import type { SchedulesStore } from "../schedulesStore";
import { schedulesSync } from "./schedulesSync";

export const schedulesAsync = {
  async fetch(store: SchedulesStore, force = false): Promise<void> {
    if (store.state.loaded && !force) return;
    if (store.inflight) return store.inflight;
    const promise = (async () => {
      try {
        const res = await schedulesService.getSchedules();
        schedulesSync.setList(store, res.data);
      } catch {
        store.root.uiStore.setError("Failed to load schedules");
      } finally {
        store.inflight = null;
      }
    })();
    store.inflight = promise;
    return promise;
  },

  async create(store: SchedulesStore, data: CreateSchedule): Promise<Schedule | { upgrade: true } | null> {
    try {
      const res = await schedulesService.createSchedule(data);
      schedulesSync.prepend(store, res.data);
      return res.data;
    } catch (e: unknown) {
      const resp = (e as { response?: { status?: number; data?: { upgrade?: boolean } } })?.response;
      if (resp?.status === 403 && resp?.data?.upgrade) {
        return { upgrade: true };
      }
      store.root.uiStore.setError("Failed to create schedule");
      return null;
    }
  },

  async update(store: SchedulesStore, data: UpdateSchedule): Promise<void> {
    try {
      const res = await schedulesService.updateSchedule(data);
      schedulesSync.replace(store, res.data);
    } catch {
      store.root.uiStore.setError("Failed to update schedule");
    }
  },

  async remove(store: SchedulesStore, id: number): Promise<void> {
    try {
      await schedulesService.deleteSchedule(id);
      schedulesSync.removeById(store, id);
    } catch {
      store.root.uiStore.setError("Failed to delete schedule");
    }
  },

  async toggleChannel(
    store: SchedulesStore,
    scheduleId: number,
    channel: "telegram" | "email",
    enabled: boolean,
  ): Promise<void> {
    try {
      await schedulesService.toggleChannel(scheduleId, channel, enabled);
      schedulesSync.setChannelEnabled(store, scheduleId, channel, enabled);
    } catch {
      store.root.uiStore.setError("Failed to toggle channel");
    }
  },
};

import type { Schedule } from "@/entities/schedule/types";
import type { SchedulesStore } from "../schedulesStore";

export const schedulesSync = {
  setList(store: SchedulesStore, list: Schedule[]): void {
    store.list = list;
    store.loaded = true;
  },

  prepend(store: SchedulesStore, item: Schedule): void {
    store.list.unshift(item);
  },

  replace(store: SchedulesStore, item: Schedule): void {
    const i = store.list.findIndex((s) => s.id === item.id);
    if (i !== -1) store.list[i] = item;
  },

  removeById(store: SchedulesStore, id: number): void {
    store.list = store.list.filter((s) => s.id !== id);
  },

  setChannelEnabled(
    store: SchedulesStore,
    scheduleId: number,
    channel: "telegram" | "email",
    enabled: boolean,
  ): void {
    const sched = store.list.find((s) => s.id === scheduleId);
    if (!sched) return;
    const ch = sched.channels.find((c) => c.channel === channel);
    if (ch) ch.enabled = enabled;
  },

  reset(store: SchedulesStore): void {
    store.list = [];
    store.loaded = false;
  },
};

import { runInAction } from "mobx";
import type { Schedule } from "@/entities/schedule/types";
import type { SchedulesStore } from "../schedulesStore";

export const schedulesSync = {
  setList(store: SchedulesStore, list: Schedule[]): void {
    runInAction(() => {
      store.state.list = list;
      store.state.loaded = true;
    });
  },

  prepend(store: SchedulesStore, item: Schedule): void {
    runInAction(() => {
      store.state.list.unshift(item);
    });
  },

  replace(store: SchedulesStore, item: Schedule): void {
    runInAction(() => {
      const i = store.state.list.findIndex((s) => s.id === item.id);
      if (i !== -1) store.state.list[i] = item;
    });
  },

  removeById(store: SchedulesStore, id: number): void {
    runInAction(() => {
      store.state.list = store.state.list.filter((s) => s.id !== id);
    });
  },

  setChannelEnabled(
    store: SchedulesStore,
    scheduleId: number,
    channel: "telegram" | "email",
    enabled: boolean,
  ): void {
    runInAction(() => {
      const sched = store.state.list.find((s) => s.id === scheduleId);
      if (!sched) return;
      const ch = sched.channels.find((c) => c.channel === channel);
      if (ch) ch.enabled = enabled;
    });
  },

  reset(store: SchedulesStore): void {
    runInAction(() => {
      store.state.list = [];
      store.state.loaded = false;
    });
  },
};

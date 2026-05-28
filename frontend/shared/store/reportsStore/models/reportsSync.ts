import { runInAction } from "mobx";
import type { Report } from "@/entities/report/types";
import type { ReportsStore } from "../reportsStore";

export const reportsSync = {
  setList(store: ReportsStore, list: Report[]): void {
    runInAction(() => {
      store.state.list = list;
      store.state.loaded = true;
    });
  },

  prepend(store: ReportsStore, report: Report): void {
    runInAction(() => {
      store.state.list.unshift(report);
    });
  },

  removeById(store: ReportsStore, id: number): void {
    runInAction(() => {
      store.state.list = store.state.list.filter((r) => r.id !== id);
    });
  },

  reset(store: ReportsStore): void {
    runInAction(() => {
      store.state.list = [];
      store.state.loaded = false;
    });
  },
};

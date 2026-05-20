import type { Report } from "@/entities/report/types";
import type { ReportsStore } from "../index";

export const reportsSync = {
  setList(store: ReportsStore, list: Report[]): void {
    store.list = list;
    store.loaded = true;
  },

  prepend(store: ReportsStore, report: Report): void {
    store.list.unshift(report);
  },

  removeById(store: ReportsStore, id: number): void {
    store.list = store.list.filter((r) => r.id !== id);
  },

  reset(store: ReportsStore): void {
    store.list = [];
    store.loaded = false;
  },
};

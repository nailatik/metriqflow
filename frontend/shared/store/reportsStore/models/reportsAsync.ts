import { reportsService } from "@/entities/report/api/reportsService";
import type { Report, CreateReport } from "@/entities/report/types";
import type { ReportsStore } from "../reportsStore";
import { reportsSync } from "./reportsSync";

export const reportsAsync = {
  async fetch(store: ReportsStore, force = false): Promise<void> {
    if (store.state.loaded && !force) return;
    if (store.inflight) return store.inflight;
    const promise = (async () => {
      try {
        const res = await reportsService.getReports();
        reportsSync.setList(store, res.data);
      } catch {
        store.root.uiStore.setError("Failed to load reports");
      } finally {
        store.inflight = null;
      }
    })();
    store.inflight = promise;
    return promise;
  },

  async create(store: ReportsStore, data: CreateReport): Promise<Report | null> {
    try {
      const res = await reportsService.createReport(data);
      reportsSync.prepend(store, res.data);
      return res.data;
    } catch {
      store.root.uiStore.setError("Failed to create report");
      return null;
    }
  },

  async remove(store: ReportsStore, id: number): Promise<void> {
    try {
      await reportsService.deleteReport(id);
      reportsSync.removeById(store, id);
    } catch {
      store.root.uiStore.setError("Failed to delete report");
    }
  },
};

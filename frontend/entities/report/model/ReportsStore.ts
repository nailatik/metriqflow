import { makeAutoObservable, runInAction } from "mobx";
import { reportsService } from "../api/reportsService";
import type { Report, CreateReport } from "../types";
import type { RootStore } from "@/shared/store/RootStore";

export class ReportsStore {
  list: Report[] = [];

  constructor(private root: RootStore) {
    makeAutoObservable(this);
  }

  async fetchReports(): Promise<void> {
    try {
      const res = await reportsService.getReports();
      runInAction(() => {
        this.list = res.data;
      });
    } catch {
      this.root.uiStore.setError("Failed to load reports");
    }
  }

  async createReport(data: CreateReport): Promise<Report | null> {
    try {
      const res = await reportsService.createReport(data);
      runInAction(() => {
        this.list.unshift(res.data);
      });
      return res.data;
    } catch {
      this.root.uiStore.setError("Failed to create report");
      return null;
    }
  }

  async deleteReport(id: number): Promise<void> {
    try {
      await reportsService.deleteReport(id);
      runInAction(() => {
        this.list = this.list.filter((r) => r.id !== id);
      });
    } catch {
      this.root.uiStore.setError("Failed to delete report");
    }
  }
}

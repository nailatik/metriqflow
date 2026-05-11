import { makeAutoObservable, runInAction } from "mobx";
import { reportsService } from "../api/reportsService";
import type { Report, CreateReport, UpdateReport } from "../types";
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

  async createReport(data: CreateReport): Promise<void> {
    try {
      const res = await reportsService.createReport(data);
      runInAction(() => {
        this.list.push(res.data);
      });
    } catch {
      this.root.uiStore.setError("Failed to create report");
    }
  }

  async updateReport(data: UpdateReport): Promise<void> {
    try {
      const res = await reportsService.updateReport(data);
      runInAction(() => {
        const index = this.list.findIndex((r) => r.id === data.id);
        if (index !== -1) this.list[index] = res.data;
      });
    } catch {
      this.root.uiStore.setError("Failed to update report");
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

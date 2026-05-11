import { http } from "@/shared/lib/axios";
import type { Report, CreateReport, UpdateReport } from "../types";

export const reportsService = {
  getReports: () => http.get<Report[]>("/reports"),

  createReport: (data: CreateReport) =>
    http.post<Report, CreateReport>("/reports", data),

  updateReport: (data: UpdateReport) =>
    http.patch<Report, { title: string }>(`/reports/${data.id}`, { title: data.title }),

  deleteReport: (id: number) => http.delete(`/reports/${id}`),
};

import { http } from "@/shared/lib/axios";
import type { Report, CreateReport } from "../types";

export const reportsService = {
  getReports: () => http.get<Report[]>("/reports"),

  createReport: (data: CreateReport) =>
    http.post<Report, CreateReport>("/reports", data),

  deleteReport: (id: number) => http.delete(`/reports/${id}`),

  downloadUrl: (id: number) => `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/reports/${id}/download`,
};

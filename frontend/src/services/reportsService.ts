import { http } from "./http";

export interface Report {
  id: number;
  title: string;
}

export interface CreateReport {
  title: string;
}

export interface UpdateReport {
  id: number;
  title: string;
}

export const reportsService = {
  getReports: () => http.get<Report[]>("/reports"),
  
  createReport: (data: CreateReport) => http.post<Report, CreateReport>("/reports", data),
  
  updateReport: (data: UpdateReport) => http.patch<Report, { title: string }>(`/reports/${data.id}`, { title: data.title }),
  
  deleteReport: (id: number) => http.delete(`/reports/${id}`),
};
import { http } from "./http";

export interface Report {
  id: number;
  title: string;
}

export const reportsService = {
  getReports: () => http.get<Report[]>("/reports"),
};
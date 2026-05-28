import type { Report } from "@/entities/report/types";

export interface ReportsState {
  list: Report[];
  loaded: boolean;
}

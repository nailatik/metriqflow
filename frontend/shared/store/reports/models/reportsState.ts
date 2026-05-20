import type { Report } from "@/entities/report/types";

export interface ReportsState {
  list: Report[];
  loaded: boolean;
}

export const initialReportsState: ReportsState = {
  list: [],
  loaded: false,
};

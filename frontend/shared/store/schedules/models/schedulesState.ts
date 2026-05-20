import type { Schedule } from "@/entities/schedule/types";

export interface SchedulesState {
  list: Schedule[];
  loaded: boolean;
}

export const initialSchedulesState: SchedulesState = {
  list: [],
  loaded: false,
};

import { http } from "@/shared/lib/axios";
import type { Schedule, CreateSchedule, UpdateSchedule } from "../types";

export const schedulesService = {
  getSchedules:   () => http.get<Schedule[]>("/report-schedules"),

  createSchedule: (data: CreateSchedule) =>
    http.post<Schedule, CreateSchedule>("/report-schedules", data),

  updateSchedule: (data: UpdateSchedule) => {
    const { id, ...rest } = data;
    return http.patch<Schedule, Omit<UpdateSchedule, "id">>(`/report-schedules/${id}`, rest);
  },

  deleteSchedule: (id: number) => http.delete(`/report-schedules/${id}`),

  toggleChannel: (scheduleId: number, channel: "telegram" | "email", enabled: boolean) =>
    http.patch(`/report-schedules/${scheduleId}/channels/${channel}`, { enabled }),
};

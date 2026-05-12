import type { ReportSource, ReportFormat } from "@/entities/report/types";

export type ScheduleFrequency = 1 | 7 | 30;
export type ScheduleLastStatus = "delivered" | "failed" | "no_channels" | "pending" | null;

export interface ScheduleChannel {
  channel: "telegram" | "email";
  email: string | null;
  enabled: boolean;
}

export interface Schedule {
  id: number;
  title: string;
  source: ReportSource;
  format: ReportFormat;
  frequency_days: ScheduleFrequency;
  locale: string;
  enabled: boolean;
  paused: boolean;
  next_send_at: string;
  last_sent_at: string | null;
  last_status: ScheduleLastStatus;
  created_at: string;
  channels: ScheduleChannel[];
}

export interface CreateSchedule {
  title?: string;
  source: ReportSource;
  format: ReportFormat;
  frequency_days: ScheduleFrequency;
  locale: string;
  channels: { channel: "telegram" | "email"; email?: string; enabled: boolean }[];
}

export interface UpdateSchedule {
  id: number;
  enabled?: boolean;
  paused?: boolean;
  title?: string;
  channels?: { channel: "telegram" | "email"; email?: string; enabled: boolean }[];
}

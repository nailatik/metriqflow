export type ReportSource = "all" | "telegram" | "vk";
export type ReportFormat = "csv" | "pdf" | "xml";
export type ReportStatus = "pending" | "ready" | "failed";

export interface Report {
  id: number;
  title: string;
  source: ReportSource;
  format: ReportFormat;
  period_days: number;
  status: ReportStatus;
  created_at: string;
  expires_at: string;
}

export interface CreateReport {
  title?: string;
  source: ReportSource;
  format: ReportFormat;
  period_days: 1 | 7 | 30;
  locale: string;
}

ALTER TABLE report_schedules
  ADD COLUMN IF NOT EXISTS send_hour SMALLINT NOT NULL DEFAULT 9
    CONSTRAINT report_schedules_send_hour_check CHECK (send_hour >= 0 AND send_hour <= 23);

-- Expand reports table with full report metadata
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS source      VARCHAR(20)   NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS format      VARCHAR(10)   NOT NULL DEFAULT 'csv',
  ADD COLUMN IF NOT EXISTS period_days INTEGER       NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS status      VARCHAR(20)   NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS file_path   TEXT,
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW() + INTERVAL '1 year',
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_reports_user_id    ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_expires_at ON reports(expires_at);

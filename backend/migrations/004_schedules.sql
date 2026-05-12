CREATE TABLE IF NOT EXISTS report_schedules (
  id             SERIAL       PRIMARY KEY,
  user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT         NOT NULL,
  source         VARCHAR(20)  NOT NULL DEFAULT 'all',
  format         VARCHAR(10)  NOT NULL DEFAULT 'csv',
  frequency_days INTEGER      NOT NULL DEFAULT 7,
  locale         VARCHAR(5)   NOT NULL DEFAULT 'en',
  enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
  paused         BOOLEAN      NOT NULL DEFAULT FALSE,
  next_send_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_sent_at   TIMESTAMPTZ,
  last_status    VARCHAR(20),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_channels (
  id          SERIAL       PRIMARY KEY,
  schedule_id INTEGER      NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,
  channel     VARCHAR(20)  NOT NULL,
  email       TEXT,
  enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
  UNIQUE(schedule_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_schedules_user    ON report_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_next    ON report_schedules(next_send_at) WHERE enabled = TRUE AND paused = FALSE;
CREATE INDEX IF NOT EXISTS idx_sch_channels_sid  ON schedule_channels(schedule_id);

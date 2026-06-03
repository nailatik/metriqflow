-- Alert preferences + dead-account gate + anti-spam log
ALTER TABLE users ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Backfill: last real session, then account creation, then now
UPDATE users u
SET last_active_at = COALESCE(
  (SELECT MAX(rt.created_at) FROM refresh_tokens rt WHERE rt.user_id = u.id),
  u.created_at,
  NOW()
)
WHERE last_active_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);

CREATE TABLE IF NOT EXISTS alert_log (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_pk INT,                    -- telegram_channels.id; NULL for reengagement
  kind       TEXT NOT NULL,          -- 'drop' | 'ok' | 'reengagement'
  cur_er     FLOAT,
  prev_er    FLOAT,
  drop_pct   FLOAT,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_log_user_kind ON alert_log(user_id, kind, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_log_channel   ON alert_log(channel_pk, sent_at DESC);

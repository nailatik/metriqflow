CREATE TABLE ai_cache (
  id          SERIAL PRIMARY KEY,
  network     TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  period      TEXT NOT NULL,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_cache_lookup ON ai_cache (network, source_id, period, created_at DESC);

CREATE TABLE ai_usage (
  user_id INT  NOT NULL,
  used_on DATE NOT NULL DEFAULT CURRENT_DATE,
  count   INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, used_on)
);

CREATE TABLE IF NOT EXISTS payments (
  id            BIGSERIAL    PRIMARY KEY,
  user_id       INT          NOT NULL REFERENCES users(id),
  provider      VARCHAR(20)  NOT NULL DEFAULT 'yookassa',
  provider_id   VARCHAR(120),
  amount_minor  INT          NOT NULL,
  currency      VARCHAR(3)   NOT NULL DEFAULT 'RUB',
  status        VARCHAR(20)  NOT NULL,
  plan          VARCHAR(20),
  period_days   INT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);

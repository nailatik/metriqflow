CREATE TABLE IF NOT EXISTS promo_codes (
  code                 VARCHAR(40)  PRIMARY KEY,
  grants_plan          VARCHAR(20)  NOT NULL,
  grants_duration_days INT,
  max_uses             INT          NOT NULL,
  used_count           INT          NOT NULL DEFAULT 0,
  expires_at           TIMESTAMPTZ,
  active               BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  code        VARCHAR(40) NOT NULL REFERENCES promo_codes(code),
  user_id     INT         NOT NULL REFERENCES users(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);

INSERT INTO promo_codes (code, grants_plan, grants_duration_days, max_uses, expires_at)
VALUES ('DEFENSE2026', 'ultimate', 30, 200, '2026-06-20 23:59:59+00')
ON CONFLICT (code) DO NOTHING;

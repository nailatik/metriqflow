ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(id) WHERE is_admin = true;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          BIGSERIAL    PRIMARY KEY,
  admin_id    INT          NOT NULL REFERENCES users(id),
  action      VARCHAR(60)  NOT NULL,
  target_type VARCHAR(40),
  target_id   VARCHAR(80),
  meta        JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);

ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS label       VARCHAR(120);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS created_by  INT REFERENCES users(id);

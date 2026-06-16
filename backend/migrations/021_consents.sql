-- 152-FZ: split consent (PDn vs terms vs marketing, no longer one checkbox)
-- needs an audit trail of who agreed to what, when, and from which IP —
-- a boolean column can't prove consent during an RKN inspection.
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_to_terms     boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_to_marketing boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS user_consents (
  id           bigserial PRIMARY KEY,
  user_id      integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type text    NOT NULL,           -- 'pdn' | 'terms' | 'marketing'
  doc_version  text    NOT NULL,
  granted      boolean NOT NULL,           -- true = granted, false = revoked
  ip           inet,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id, consent_type, created_at DESC);

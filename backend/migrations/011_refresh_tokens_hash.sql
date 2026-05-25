-- Store only sha256(refresh_token) instead of the raw token.
-- Existing sessions (rows with NULL token_hash) are revoked so users
-- have to re-login once; this is a one-time security uplift.

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS token_hash text;

-- Old plaintext tokens cannot be safely backfilled into the new hash column
-- without re-issuing them, so just revoke them. New logins/refreshes will
-- populate token_hash going forward.
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE revoked_at IS NULL AND token_hash IS NULL;

ALTER TABLE refresh_tokens
  ALTER COLUMN token DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
  ON refresh_tokens(token_hash)
  WHERE token_hash IS NOT NULL;

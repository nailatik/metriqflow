-- Soft-delete for users (admin danger zone). Preserves FK integrity of
-- reports / promo_redemptions / payments instead of cascading hard delete.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index: active-user lookups (login, admin lists) skip tombstones cheaply.
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;

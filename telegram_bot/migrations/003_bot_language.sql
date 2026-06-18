-- Per-Telegram-user bot preferences (language), independent of account linking.
-- Stored by telegram_id so an unlinked user's language choice persists across
-- restarts and survives the linking flow.
CREATE TABLE IF NOT EXISTS telegram_bot_prefs (
    telegram_id BIGINT      PRIMARY KEY,
    language    VARCHAR(8)  NOT NULL DEFAULT 'ru',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

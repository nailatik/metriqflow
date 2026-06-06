-- Planned / scheduled content posts for auto-publishing.
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');
CREATE TYPE post_platform AS ENUM ('tg', 'vk');

CREATE TABLE IF NOT EXISTS planned_posts (
    id              SERIAL          PRIMARY KEY,
    user_id         INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform        post_platform   NOT NULL,
    -- tg: telegram_channels.channel_id (BIGINT stored as text for uniformity)
    -- vk: vk_communities.community_id (BIGINT stored as text)
    channel_id      TEXT            NOT NULL,
    channel_title   TEXT,
    scheduled_at    TIMESTAMPTZ     NOT NULL,
    text            TEXT            NOT NULL DEFAULT '',
    media_urls      TEXT[]          NOT NULL DEFAULT '{}',
    status          post_status     NOT NULL DEFAULT 'draft',
    error_message   TEXT,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planned_posts_user        ON planned_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_posts_scheduled   ON planned_posts(status, scheduled_at)
    WHERE status = 'scheduled';

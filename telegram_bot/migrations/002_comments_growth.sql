-- Comments on channel posts (fetched via Telethon msg.replies.replies)
ALTER TABLE telegram_posts
  ADD COLUMN IF NOT EXISTS comments INTEGER NOT NULL DEFAULT 0;

-- Hourly member_count snapshots for Telegram channels (enables subscriber growth)
CREATE TABLE IF NOT EXISTS member_count_snapshots (
    id          SERIAL PRIMARY KEY,
    channel_id  BIGINT      NOT NULL,
    count       INTEGER     NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mcs_channel_at
  ON member_count_snapshots(channel_id, recorded_at DESC);

-- Member_count snapshots for VK communities (enables subscriber growth)
CREATE TABLE IF NOT EXISTS vk_community_snapshots (
    id           SERIAL      PRIMARY KEY,
    community_id BIGINT      NOT NULL,
    member_count INTEGER     NOT NULL,
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vcs_community_at
  ON vk_community_snapshots(community_id, recorded_at DESC);

-- Competitor channels the user tracks for side-by-side benchmarking.
CREATE TABLE IF NOT EXISTS competitors (
    id               SERIAL      PRIMARY KEY,
    user_id          INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform         VARCHAR(8)  NOT NULL CHECK (platform IN ('tg','vk')),
    identifier       VARCHAR(255) NOT NULL,   -- tg username (no @) | vk numeric group id
    title            VARCHAR(512),
    photo_url        TEXT,
    subscriber_count INTEGER,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    last_synced_at   TIMESTAMPTZ,
    added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, platform, identifier)
);
CREATE INDEX IF NOT EXISTS idx_competitors_user ON competitors(user_id);

-- Cached metric snapshots (avoid re-scraping on every page view).
CREATE TABLE IF NOT EXISTS competitor_snapshots (
    id              SERIAL      PRIMARY KEY,
    competitor_id   INTEGER     NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    period_days     INTEGER     NOT NULL,
    subscribers     INTEGER,
    avg_views       INTEGER,
    er              FLOAT,
    er_basis        VARCHAR(16) NOT NULL DEFAULT 'na',
    post_freq       FLOAT,
    posts_sampled   INTEGER     NOT NULL DEFAULT 0,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_competitor_snap ON competitor_snapshots(competitor_id, period_days, fetched_at DESC);

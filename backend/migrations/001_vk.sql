-- VK OAuth integrations
CREATE TABLE IF NOT EXISTS vk_integrations (
    id           SERIAL      PRIMARY KEY,
    user_id      INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    vk_user_id   BIGINT      NOT NULL,
    access_token TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VK communities (groups) managed by the user
CREATE TABLE IF NOT EXISTS vk_communities (
    id                 SERIAL      PRIMARY KEY,
    user_id            INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vk_integration_id  INTEGER     NOT NULL REFERENCES vk_integrations(id) ON DELETE CASCADE,
    community_id       BIGINT      NOT NULL,
    name               TEXT        NOT NULL,
    screen_name        TEXT,
    photo_url          TEXT,
    member_count       INTEGER,
    is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
    added_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_vk_communities_user ON vk_communities(user_id);
CREATE INDEX IF NOT EXISTS idx_vk_communities_integration ON vk_communities(vk_integration_id);

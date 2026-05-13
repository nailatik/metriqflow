-- Decouple vk_communities from vk_integrations; each community stores its own token
ALTER TABLE vk_communities
  ALTER COLUMN vk_integration_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS community_token TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS idx_vk_communities_integration;

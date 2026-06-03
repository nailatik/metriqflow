-- AI insights: per-locale cache + richer payload.
-- Existing rows were generated with the russian prompt → backfill 'ru'.
ALTER TABLE ai_cache ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'ru';

-- Lookup must include locale so an EN user never reads an RU-cached payload.
DROP INDEX IF EXISTS idx_ai_cache_lookup;
CREATE INDEX idx_ai_cache_lookup
  ON ai_cache (network, source_id, period, locale, created_at DESC);

-- Pre-migration payloads use the old shape (no headline / data_quality) and would
-- crash the new frontend on a cache hit. They regenerate cheaply — drop them.
DELETE FROM ai_cache;

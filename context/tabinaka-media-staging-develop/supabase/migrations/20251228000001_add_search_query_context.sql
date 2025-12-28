BEGIN;

ALTER TABLE search_queries
  ADD COLUMN IF NOT EXISTS location JSONB,
  ADD COLUMN IF NOT EXISTS radius_meters INTEGER,
  ADD COLUMN IF NOT EXISTS inferred_category TEXT,
  ADD COLUMN IF NOT EXISTS has_results BOOLEAN;

CREATE INDEX IF NOT EXISTS search_queries_inferred_category_idx
  ON search_queries (inferred_category);

CREATE INDEX IF NOT EXISTS search_queries_radius_meters_idx
  ON search_queries (radius_meters);

COMMIT;

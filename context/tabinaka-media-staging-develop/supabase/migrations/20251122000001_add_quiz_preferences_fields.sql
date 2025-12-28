-- Add optional preference fields captured on quiz page (dietary, language, photo subjects)

-- quiz_results: store flattened preferences for easier analytics/filters
ALTER TABLE IF EXISTS quiz_results
  ADD COLUMN IF NOT EXISTS dietary_preferences JSONB,
  ADD COLUMN IF NOT EXISTS language_comfort JSONB,
  ADD COLUMN IF NOT EXISTS photo_subjects JSONB;

COMMENT ON COLUMN quiz_results.dietary_preferences IS 'Array of dietary preference codes (e.g., vegetarian, halal, allergies)';
COMMENT ON COLUMN quiz_results.language_comfort IS 'Array of languages user is comfortable with (e.g., english, japanese)';
COMMENT ON COLUMN quiz_results.photo_subjects IS 'Array of photo subject preferences (e.g., raw fish, crowds, expensive, long stairs, alcohol)';

-- quiz_sessions metadata can already store arbitrary JSON, but index helpful for lookups if stored there later
CREATE INDEX IF NOT EXISTS quiz_results_dietary_idx ON quiz_results USING GIN (dietary_preferences);
CREATE INDEX IF NOT EXISTS quiz_results_language_idx ON quiz_results USING GIN (language_comfort);
CREATE INDEX IF NOT EXISTS quiz_results_photo_idx ON quiz_results USING GIN (photo_subjects);


BEGIN;

ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS diagnosis_type TEXT,
  ADD COLUMN IF NOT EXISTS persona_history JSONB;

CREATE INDEX IF NOT EXISTS quiz_sessions_diagnosis_type_idx
  ON quiz_sessions (diagnosis_type);

COMMIT;

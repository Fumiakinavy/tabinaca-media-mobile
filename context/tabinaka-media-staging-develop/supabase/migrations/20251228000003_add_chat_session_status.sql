BEGIN;

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS session_end_reason TEXT;

CREATE INDEX IF NOT EXISTS chat_sessions_status_idx
  ON chat_sessions (status);

COMMIT;

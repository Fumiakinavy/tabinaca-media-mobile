BEGIN;

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS intent TEXT;

CREATE INDEX IF NOT EXISTS chat_messages_language_idx
  ON chat_messages (language);

CREATE INDEX IF NOT EXISTS chat_messages_intent_idx
  ON chat_messages (intent);

COMMIT;

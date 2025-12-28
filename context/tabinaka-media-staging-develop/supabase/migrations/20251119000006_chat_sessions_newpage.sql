BEGIN;

-- 0. prerequisites (enum + tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'chat_session_type'
  ) THEN
    CREATE TYPE chat_session_type AS ENUM ('assistant','vendor_support','system');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_sessions'
  ) THEN
    CREATE TABLE chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      session_type chat_session_type NOT NULL DEFAULT 'assistant',
      title TEXT NOT NULL DEFAULT 'New chat',
      state JSONB NOT NULL DEFAULT '{}',
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS chat_sessions_account_id_started_at_idx
      ON chat_sessions (account_id, started_at DESC);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN
    CREATE TABLE chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user','assistant','tool')),
      content TEXT NOT NULL,
      sequence BIGINT,
      tool_calls JSONB,
      latency_ms INTEGER,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS chat_messages_session_id_created_at_idx
      ON chat_messages (session_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_session_sequence_idx
      ON chat_messages (session_id, sequence)
      WHERE sequence IS NOT NULL;
  END IF;
END $$;

-- 1. chat_sessions.title column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_sessions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'chat_sessions' AND column_name = 'title'
    ) THEN
      ALTER TABLE chat_sessions ADD COLUMN title TEXT;
    END IF;

    UPDATE chat_sessions
    SET title = 'New chat'
    WHERE title IS NULL OR btrim(title) = '';

    ALTER TABLE chat_sessions ALTER COLUMN title SET DEFAULT 'New chat';
    ALTER TABLE chat_sessions ALTER COLUMN title SET NOT NULL;

    CREATE INDEX IF NOT EXISTS chat_sessions_account_id_last_activity_idx
      ON chat_sessions (account_id, last_activity_at DESC);
  ELSE
    RAISE NOTICE 'chat_sessions table not found; skipping title update';
  END IF;
END $$;

-- 2. chat_messages enhancements
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN
    ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'chat_messages' AND column_name = 'sequence'
    ) THEN
      ALTER TABLE chat_messages ADD COLUMN sequence BIGINT;
      UPDATE chat_messages AS cm
      SET sequence = ranked.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at, id) AS rn
        FROM chat_messages
      ) AS ranked
      WHERE cm.id = ranked.id;
    END IF;

    UPDATE chat_messages AS cm
    SET sequence = ranked.rn
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at, id) AS rn
      FROM chat_messages
      WHERE sequence IS NULL
    ) AS ranked
    WHERE cm.id = ranked.id;

    ALTER TABLE chat_messages ALTER COLUMN sequence SET NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_session_sequence_idx
      ON chat_messages (session_id, sequence);
  ELSE
    RAISE NOTICE 'chat_messages table not found; skipping message updates';
  END IF;
END $$;

-- 3. chat_session_summaries table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_sessions'
  ) THEN
    CREATE TABLE IF NOT EXISTS chat_session_summaries (
      session_id UUID PRIMARY KEY REFERENCES chat_sessions(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      title_suggestion TEXT,
      last_message_excerpt TEXT,
      tags TEXT[] DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSE
    RAISE NOTICE 'chat_sessions table not found; skipping chat_session_summaries creation';
  END IF;
END $$;

-- 4. RLS for chat_session_summaries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_session_summaries'
  ) THEN
    ALTER TABLE chat_session_summaries ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'chat_session_summaries'
        AND policyname = 'Accounts can view own chat session summaries'
    ) THEN
      EXECUTE 'CREATE POLICY "Accounts can view own chat session summaries"
        ON chat_session_summaries FOR SELECT
        USING (
          session_id IN (
            SELECT id FROM chat_sessions WHERE account_id = auth_account_id()
          )
          OR is_service_role()
        )';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'chat_session_summaries'
        AND policyname = 'Accounts can insert own chat session summaries'
    ) THEN
      EXECUTE 'CREATE POLICY "Accounts can insert own chat session summaries"
        ON chat_session_summaries FOR INSERT
        WITH CHECK (
          session_id IN (
            SELECT id FROM chat_sessions WHERE account_id = auth_account_id()
          )
          OR is_service_role()
        )';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'chat_session_summaries'
        AND policyname = 'Accounts can update own chat session summaries'
    ) THEN
      EXECUTE 'CREATE POLICY "Accounts can update own chat session summaries"
        ON chat_session_summaries FOR UPDATE
        USING (
          session_id IN (
            SELECT id FROM chat_sessions WHERE account_id = auth_account_id()
          )
          OR is_service_role()
        )
        WITH CHECK (
          session_id IN (
            SELECT id FROM chat_sessions WHERE account_id = auth_account_id()
          )
          OR is_service_role()
        )';
    END IF;
  END IF;
END $$;

-- 5. RLS policies for chat_sessions/chat_messages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_sessions'
  ) THEN
    ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'chat_sessions'
        AND policyname = 'Accounts can view own chat sessions'
    ) THEN
      EXECUTE 'CREATE POLICY "Accounts can view own chat sessions"
        ON chat_sessions FOR SELECT
        USING (account_id = auth_account_id() OR is_service_role())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'chat_sessions'
        AND policyname = 'Accounts can insert own chat sessions'
    ) THEN
      EXECUTE 'CREATE POLICY "Accounts can insert own chat sessions"
        ON chat_sessions FOR INSERT
        WITH CHECK (account_id = auth_account_id() OR is_service_role())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'chat_sessions'
        AND policyname = 'Accounts can update own chat sessions'
    ) THEN
      EXECUTE 'CREATE POLICY "Accounts can update own chat sessions"
        ON chat_sessions FOR UPDATE
        USING (account_id = auth_account_id() OR is_service_role())
        WITH CHECK (account_id = auth_account_id() OR is_service_role())';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'chat_messages'
        AND policyname = 'Accounts can view own chat messages'
    ) THEN
      EXECUTE 'CREATE POLICY "Accounts can view own chat messages"
        ON chat_messages FOR SELECT
        USING (
          session_id IN (
            SELECT id FROM chat_sessions WHERE account_id = auth_account_id()
          )
          OR is_service_role()
        )';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'chat_messages'
        AND policyname = 'Accounts can insert own chat messages'
    ) THEN
      EXECUTE 'CREATE POLICY "Accounts can insert own chat messages"
        ON chat_messages FOR INSERT
        WITH CHECK (
          session_id IN (
            SELECT id FROM chat_sessions WHERE account_id = auth_account_id()
          )
          OR is_service_role()
        )';
    END IF;
  END IF;
END $$;

COMMIT;

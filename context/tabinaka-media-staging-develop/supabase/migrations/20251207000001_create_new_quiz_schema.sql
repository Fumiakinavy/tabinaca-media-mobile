-- ============================================
-- 1. 新テーブル作成 (Accounts拡張 & Quiz Sessions新規作成)
-- ============================================

BEGIN;

-- 1-1. Enum Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_session_status') THEN
        CREATE TYPE quiz_session_status AS ENUM ('started', 'in_progress', 'completed', 'abandoned');
    ELSE
        -- If type exists but assumes older schema, add 'started'
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'quiz_session_status')
            AND enumlabel = 'started'
        ) THEN
            ALTER TYPE quiz_session_status ADD VALUE 'started' BEFORE 'in_progress';
        END IF;
    END IF;
END $$;

COMMIT;

BEGIN;

-- 1-2. Enhance `accounts` table
-- Add JSONB columns to replace separate profile tables
ALTER TABLE accounts 
    ADD COLUMN IF NOT EXISTS profile JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS utm_source JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

-- 1-3. Create `quiz_sessions` table
-- (Safe Migration: Rename existing table instead of dropping to preserve data)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_sessions') THEN
    ALTER TABLE quiz_sessions RENAME TO quiz_sessions_legacy;
  END IF;
END $$;

CREATE TABLE quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Status & Progress
    status quiz_session_status NOT NULL DEFAULT 'started',
    current_step INTEGER DEFAULT 0,
    last_question_id TEXT,
    
    -- Travel Type Specifics (Direct Access)
    travel_type_code TEXT,
    travel_type_payload JSONB,

    -- Data Storage
    answers JSONB DEFAULT '{}'::jsonb,
    result JSONB DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_account_id ON quiz_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status_updated ON quiz_sessions(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_dropoff_analysis ON quiz_sessions(last_question_id) WHERE status = 'abandoned';

-- 1-4. Trigger for `updated_at`
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_quiz_sessions_updated_at ON quiz_sessions;
CREATE TRIGGER touch_quiz_sessions_updated_at
    BEFORE UPDATE ON quiz_sessions
    FOR EACH ROW
    EXECUTE FUNCTION touch_updated_at();

COMMIT;

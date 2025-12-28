-- ============================================
-- quiz_sessions / quiz_results 手動作成スクリプト
-- ============================================
-- Supabase SQL Editorで実行し、必要なテーブルが存在しない環境を補完します。
-- 既に存在する場合でも IF NOT EXISTS / duplicate_object ハンドリングで安全にスキップされます。
-- ============================================

BEGIN;

-- ENUM型の安全な作成
DO $$
BEGIN
  CREATE TYPE quiz_session_status AS ENUM ('in_progress','completed','abandoned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE quiz_result_type AS ENUM ('travel_type','destination_cluster');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- quiz_forms テーブル（存在しない環境向け）
CREATE TABLE IF NOT EXISTS quiz_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  definition JSONB NOT NULL DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- quiz_sessions テーブル
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  quiz_form_id UUID REFERENCES quiz_forms(id) ON DELETE SET NULL,
  status quiz_session_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  location_permission BOOLEAN,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS quiz_sessions_account_id_started_at_idx 
  ON quiz_sessions (account_id, started_at DESC);

-- quiz_results テーブル
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  result_type quiz_result_type NOT NULL,
  travel_type_code TEXT,
  travel_type_payload JSONB,
  recommendation_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_results_account_id_created_at_idx 
  ON quiz_results (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quiz_results_session_id_idx ON quiz_results (session_id);

COMMIT;

-- 確認クエリ
SELECT to_regclass('public.quiz_sessions') AS quiz_sessions_exists,
       to_regclass('public.quiz_results') AS quiz_results_exists;

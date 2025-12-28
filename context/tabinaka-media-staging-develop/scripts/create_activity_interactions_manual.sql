-- ============================================
-- activity_interactions テーブルを手動で作成
-- ============================================
-- このSQLをSupabaseダッシュボードのSQL Editorで実行してください
-- ============================================

BEGIN;

-- ENUM型の作成（既に存在する場合はエラーを無視）
DO $$ 
BEGIN
  CREATE TYPE interaction_type AS ENUM ('like','bookmark','view','share','book','qr_scan','ai_save');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TYPE interaction_source_type AS ENUM ('manual','quiz','recommendation','chat','migration');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- accounts テーブルの作成（存在しない場合）
DO $$ 
BEGIN
  CREATE TYPE account_status AS ENUM ('active','suspended','deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status account_status NOT NULL DEFAULT 'active',
  onboarding_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- activity_interactions テーブルの作成
CREATE TABLE IF NOT EXISTS activity_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE RESTRICT,
  activity_slug TEXT NOT NULL,
  interaction_type interaction_type NOT NULL,
  source_type interaction_source_type,
  source_id UUID,
  score_delta INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 部分ユニークインデックス（like, bookmark, ai_save は1アカウント1アクティビティ1種別のみ）
CREATE UNIQUE INDEX IF NOT EXISTS unique_like_interactions
  ON activity_interactions (account_id, activity_id, interaction_type)
  WHERE interaction_type IN ('like','bookmark','ai_save');

CREATE INDEX IF NOT EXISTS activity_interactions_account_id_created_at_idx 
  ON activity_interactions (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_interactions_activity_slug_interaction_type_idx 
  ON activity_interactions (activity_slug, interaction_type);

COMMIT;

-- 確認クエリ
SELECT 
  'activity_interactions' AS table_name,
  COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'activity_interactions';


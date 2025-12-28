-- ============================================
-- activity_interactions テーブルの存在確認
-- ============================================
-- このSQLをSupabaseダッシュボードのSQL Editorで実行してください
-- ============================================

-- 1. テーブルの存在確認
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'activity_interactions';

-- 2. テーブルが存在する場合、カラム情報を表示
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'activity_interactions'
ORDER BY ordinal_position;

-- 3. インデックスの確認
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'activity_interactions';

-- 4. データの件数確認（テーブルが存在する場合）
SELECT COUNT(*) AS interaction_count
FROM activity_interactions;

-- 5. サンプルデータの確認（最初の5件）
SELECT 
  id,
  account_id,
  activity_slug,
  interaction_type,
  created_at
FROM activity_interactions
ORDER BY created_at DESC
LIMIT 5;


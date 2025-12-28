-- ============================================
-- Supabase スキーマキャッシュをリフレッシュするSQL
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

-- 2. テーブルが存在する場合、PostgRESTにスキーマリロードを通知
-- （PostgRESTがリスニングしている場合）
NOTIFY pgrst, 'reload schema';

-- 3. テーブルの構造を確認
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'activity_interactions'
ORDER BY ordinal_position;

-- 4. インデックスの確認
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'activity_interactions';


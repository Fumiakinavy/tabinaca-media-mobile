-- ============================================
-- マイグレーション確認スクリプト
-- ============================================
-- 目的: 削除と新スキーマ作成が正常に完了したことを確認
-- ============================================

-- 1. 削除されたテーブルが存在しないことを確認
SELECT 
  expected.table_name,
  CASE 
    WHEN t.table_name IS NULL THEN '✅ 削除済み'
    ELSE '❌ まだ存在'
  END AS status
FROM (
  SELECT unnest(ARRAY[
    'activity_likes',
    'offline_likes',
    'account_quiz_results',
    'user_attributes',
    'user_preferences',
    'chatbot_conversations',
    'chatbot_messages',
    'conversation_context',
    'activity_completions',
    'activity_feedback',
    'ai_suggestions'
  ]) AS table_name
) AS expected
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public'
  AND t.table_name = expected.table_name
ORDER BY expected.table_name;

-- 2. 保持されるべきテーブルが存在することを確認
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ 存在'
    ELSE '❌ 見つからない'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'account_linkages',
    'account_metadata',
    'activities',
    'form_submissions',
    'reviews'
  )
ORDER BY table_name;

-- 3. 新しく作成されたテーブルが存在することを確認
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ 作成済み'
    ELSE '❌ 未作成'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'accounts',
    'account_profiles',
    'activity_interactions',
    'quiz_forms',
    'quiz_sessions',
    'quiz_answers',
    'quiz_results',
    'recommendation_runs',
    'recommendation_items',
    'chat_sessions',
    'chat_messages',
    'generated_activities',
    'generated_activity_saves',
    'articles',
    'article_versions',
    'article_translations',
    'activity_categories',
    'activity_category_map',
    'activity_tags',
    'activity_tag_map',
    'activity_assets',
    'vouchers',
    'voucher_redemptions',
    'vendors',
    'vendor_members',
    'activity_vendor_map',
    'audit_events'
  )
ORDER BY table_name;

-- 4. バックアップテーブルが存在することを確認
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ バックアップ存在'
    ELSE '⚠️ バックアップなし'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'backup_%'
ORDER BY table_name;

-- 5. ENUM型が作成されていることを確認
SELECT 
  typname AS enum_name,
  COUNT(*) AS value_count
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN (
  'account_status',
  'activity_status',
  'activity_type',
  'interaction_type',
  'interaction_source_type',
  'quiz_session_status',
  'quiz_result_type',
  'generated_activity_status',
  'generated_activity_save_source',
  'article_status',
  'asset_type',
  'booking_status',
  'recommendation_trigger',
  'job_status',
  'chat_session_type'
)
GROUP BY typname
ORDER BY typname;


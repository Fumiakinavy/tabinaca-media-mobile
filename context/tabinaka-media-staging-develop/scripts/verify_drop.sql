-- ============================================
-- レガシーテーブル削除後の確認スクリプト
-- ============================================
-- 目的: 削除が正常に完了したことを確認
-- ============================================

-- ============================================
-- 1. 削除されたテーブルが存在しないことを確認
-- ============================================

SELECT 
  table_name,
  CASE 
    WHEN table_name IS NULL THEN '✅ 削除済み'
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

-- ============================================
-- 2. 保持されるべきテーブルが存在することを確認
-- ============================================

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

-- ============================================
-- 3. バックアップテーブルが存在することを確認
-- ============================================

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

-- ============================================
-- 4. 現在の public スキーマの全テーブル一覧
-- ============================================

SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE 'backup_%' THEN 'バックアップ'
    WHEN table_name IN (
      'account_linkages',
      'account_metadata',
      'activities',
      'form_submissions',
      'reviews'
    ) THEN '保持'
    ELSE 'その他'
  END AS category
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY category, table_name;



-- ============================================
-- レガシーテーブル削除スクリプト
-- ============================================
-- 目的: database_design.md の新スキーマに合わせて、旧テーブルを削除
-- 注意: 実行前に必ずバックアップを取得してください
-- 
-- 実行方法:
-- 1. Supabase Dashboard → SQL Editor で実行
-- 2. または: psql で接続して実行
-- ============================================

BEGIN;

-- ============================================
-- 1. 外部キー制約を削除（依存関係を解除）
-- ============================================

-- activity_likes への参照を削除（存在する場合）
DO $$ 
BEGIN
  -- 他のテーブルから activity_likes への FK があれば削除
  -- （実際のFK名は環境によって異なる可能性があるため、エラーを無視）
  EXECUTE 'ALTER TABLE IF EXISTS activity_likes DROP CONSTRAINT IF EXISTS activity_likes_account_id_fkey';
  EXECUTE 'ALTER TABLE IF EXISTS activity_likes DROP CONSTRAINT IF EXISTS activity_likes_user_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- offline_likes への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS offline_likes DROP CONSTRAINT IF EXISTS offline_likes_account_id_fkey';
  EXECUTE 'ALTER TABLE IF EXISTS offline_likes DROP CONSTRAINT IF EXISTS offline_likes_user_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- account_quiz_results への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS account_quiz_results DROP CONSTRAINT IF EXISTS account_quiz_results_account_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- user_attributes への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS user_attributes DROP CONSTRAINT IF EXISTS user_attributes_user_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- user_preferences への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- chatbot_conversations への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS chatbot_conversations DROP CONSTRAINT IF EXISTS chatbot_conversations_user_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- chatbot_messages への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS chatbot_messages DROP CONSTRAINT IF EXISTS chatbot_messages_conversation_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- conversation_context への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS conversation_context DROP CONSTRAINT IF EXISTS conversation_context_conversation_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- activity_completions への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS activity_completions DROP CONSTRAINT IF EXISTS activity_completions_activity_id_fkey';
  EXECUTE 'ALTER TABLE IF EXISTS activity_completions DROP CONSTRAINT IF EXISTS activity_completions_user_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- activity_feedback への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS activity_feedback DROP CONSTRAINT IF EXISTS activity_feedback_activity_id_fkey';
  EXECUTE 'ALTER TABLE IF EXISTS activity_feedback DROP CONSTRAINT IF EXISTS activity_feedback_user_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ai_suggestions への参照を削除
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_user_id_fkey';
  EXECUTE 'ALTER TABLE IF EXISTS ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_activity_id_fkey';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 2. ビューを削除（存在する場合）
-- ============================================

DROP VIEW IF EXISTS legacy_activity_likes CASCADE;
DROP VIEW IF EXISTS cohort_activity_preferences CASCADE;

-- ============================================
-- 3. レガシーテーブルを削除
-- ============================================
-- 注意: 削除順序は依存関係を考慮
-- ============================================

-- 3-1. チャット関連（依存関係: messages → conversations → context）
DROP TABLE IF EXISTS conversation_context CASCADE;
DROP TABLE IF EXISTS chatbot_messages CASCADE;
DROP TABLE IF EXISTS chatbot_conversations CASCADE;

-- 3-2. アクティビティインタラクション関連
-- activity_interactions に統合されるため削除
DROP TABLE IF EXISTS activity_likes CASCADE;
DROP TABLE IF EXISTS offline_likes CASCADE;
DROP TABLE IF EXISTS activity_completions CASCADE;
DROP TABLE IF EXISTS activity_feedback CASCADE;

-- 3-3. クイズ関連
-- quiz_sessions / quiz_results / quiz_answers に再定義されるため削除
DROP TABLE IF EXISTS account_quiz_results CASCADE;

-- 3-4. ユーザー属性・設定関連
-- account_profiles / account_metadata に統合されるため削除
DROP TABLE IF EXISTS user_attributes CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- 3-5. AI推薦関連
-- recommendation_runs / recommendation_items に再定義されるため削除
DROP TABLE IF EXISTS ai_suggestions CASCADE;

-- 3-6. レビュー（新スキーマでは「将来拡張」のため、一旦保持するか削除するか要確認）
-- コメントアウト: 必要に応じて削除
-- DROP TABLE IF EXISTS reviews CASCADE;

-- ============================================
-- 4. レガシーENUM型を削除（存在する場合）
-- ============================================
-- 注意: ENUM型は他のテーブルで使用されている場合は削除できない
-- 新スキーマで再定義されるENUMは後で作成

-- 例: 既存のENUMを確認してから削除
-- DROP TYPE IF EXISTS legacy_enum_type CASCADE;

-- ============================================
-- 5. レガシー関数・トリガーを削除（存在する場合）
-- ============================================

-- 例: 特定の関数を削除
-- DROP FUNCTION IF EXISTS legacy_function_name CASCADE;

-- ============================================
-- 6. 削除確認クエリ
-- ============================================
-- 実行後に以下を実行して、削除されたことを確認:
-- 
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN (
--     'activity_likes',
--     'offline_likes',
--     'account_quiz_results',
--     'user_attributes',
--     'user_preferences',
--     'chatbot_conversations',
--     'chatbot_messages',
--     'conversation_context',
--     'activity_completions',
--     'activity_feedback',
--     'ai_suggestions'
--   )
-- ORDER BY table_name;
-- 
-- 期待される結果: 0 rows（すべて削除されている）

COMMIT;

-- ============================================
-- 注意事項
-- ============================================
-- 1. このスクリプトはレガシーテーブルのみを削除します
-- 2. 保持されるテーブル:
--    - account_linkages
--    - account_metadata (ただし quiz_state は後で quiz_results に移行)
--    - activities
--    - form_submissions
--    - reviews (一旦保持)
-- 3. 新スキーマのテーブルは別途マイグレーションで作成してください
-- 4. データ移行が必要な場合は、削除前に移行スクリプトを実行してください



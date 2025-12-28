-- ============================================
-- レガシーテーブル削除
-- ============================================
-- 目的: database_design.md の新スキーマに合わせて、旧テーブルを削除
-- 注意: 実行前に必ずバックアップを取得してください（20250113000000_backup_legacy_tables.sql）
-- ============================================

BEGIN;

-- ============================================
-- 1. 外部キー制約を削除（依存関係を解除）
-- ============================================

-- activity_likes への参照を削除（存在する場合）
DO $$ 
BEGIN
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

-- 3-6. レビュー（新スキーマでは「将来拡張」のため、一旦保持）
-- DROP TABLE IF EXISTS reviews CASCADE;

COMMIT;



-- ============================================
-- レガシーテーブル削除前のバックアップ
-- ============================================
-- 目的: 削除前にデータをエクスポートしてバックアップ
-- ============================================

-- activity_likes のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_likes') THEN
    CREATE TABLE IF NOT EXISTS backup_activity_likes AS SELECT * FROM activity_likes;
  END IF;
END $$;

-- offline_likes のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offline_likes') THEN
    CREATE TABLE IF NOT EXISTS backup_offline_likes AS SELECT * FROM offline_likes;
  END IF;
END $$;

-- account_quiz_results のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account_quiz_results') THEN
    CREATE TABLE IF NOT EXISTS backup_account_quiz_results AS SELECT * FROM account_quiz_results;
  END IF;
END $$;

-- user_attributes のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_attributes') THEN
    CREATE TABLE IF NOT EXISTS backup_user_attributes AS SELECT * FROM user_attributes;
  END IF;
END $$;

-- user_preferences のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
    CREATE TABLE IF NOT EXISTS backup_user_preferences AS SELECT * FROM user_preferences;
  END IF;
END $$;

-- chatbot_conversations のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chatbot_conversations') THEN
    CREATE TABLE IF NOT EXISTS backup_chatbot_conversations AS SELECT * FROM chatbot_conversations;
  END IF;
END $$;

-- chatbot_messages のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chatbot_messages') THEN
    CREATE TABLE IF NOT EXISTS backup_chatbot_messages AS SELECT * FROM chatbot_messages;
  END IF;
END $$;

-- conversation_context のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_context') THEN
    CREATE TABLE IF NOT EXISTS backup_conversation_context AS SELECT * FROM conversation_context;
  END IF;
END $$;

-- activity_completions のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_completions') THEN
    CREATE TABLE IF NOT EXISTS backup_activity_completions AS SELECT * FROM activity_completions;
  END IF;
END $$;

-- activity_feedback のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_feedback') THEN
    CREATE TABLE IF NOT EXISTS backup_activity_feedback AS SELECT * FROM activity_feedback;
  END IF;
END $$;

-- ai_suggestions のバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_suggestions') THEN
    CREATE TABLE IF NOT EXISTS backup_ai_suggestions AS SELECT * FROM ai_suggestions;
  END IF;
END $$;


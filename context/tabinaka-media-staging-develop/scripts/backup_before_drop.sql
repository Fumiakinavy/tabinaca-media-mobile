-- ============================================
-- レガシーテーブル削除前のバックアップスクリプト
-- ============================================
-- 目的: 削除前にデータをエクスポートしてバックアップ
-- 実行方法: Supabase SQL Editor または psql で実行
-- ============================================

-- ============================================
-- 1. バックアップ用テーブルを作成（存在する場合のみ）
-- ============================================

-- activity_likes のバックアップ
CREATE TABLE IF NOT EXISTS backup_activity_likes AS 
SELECT * FROM activity_likes;

-- offline_likes のバックアップ
CREATE TABLE IF NOT EXISTS backup_offline_likes AS 
SELECT * FROM offline_likes;

-- account_quiz_results のバックアップ
CREATE TABLE IF NOT EXISTS backup_account_quiz_results AS 
SELECT * FROM account_quiz_results;

-- user_attributes のバックアップ
CREATE TABLE IF NOT EXISTS backup_user_attributes AS 
SELECT * FROM user_attributes;

-- user_preferences のバックアップ
CREATE TABLE IF NOT EXISTS backup_user_preferences AS 
SELECT * FROM user_preferences;

-- chatbot_conversations のバックアップ
CREATE TABLE IF NOT EXISTS backup_chatbot_conversations AS 
SELECT * FROM chatbot_conversations;

-- chatbot_messages のバックアップ
CREATE TABLE IF NOT EXISTS backup_chatbot_messages AS 
SELECT * FROM chatbot_messages;

-- conversation_context のバックアップ
CREATE TABLE IF NOT EXISTS backup_conversation_context AS 
SELECT * FROM conversation_context;

-- activity_completions のバックアップ
CREATE TABLE IF NOT EXISTS backup_activity_completions AS 
SELECT * FROM activity_completions;

-- activity_feedback のバックアップ
CREATE TABLE IF NOT EXISTS backup_activity_feedback AS 
SELECT * FROM activity_feedback;

-- ai_suggestions のバックアップ
CREATE TABLE IF NOT EXISTS backup_ai_suggestions AS 
SELECT * FROM ai_suggestions;

-- ============================================
-- 2. バックアップテーブルの行数を確認
-- ============================================

SELECT 
  'activity_likes' AS table_name,
  COUNT(*) AS row_count
FROM backup_activity_likes
UNION ALL
SELECT 
  'offline_likes' AS table_name,
  COUNT(*) AS row_count
FROM backup_offline_likes
UNION ALL
SELECT 
  'account_quiz_results' AS table_name,
  COUNT(*) AS row_count
FROM backup_account_quiz_results
UNION ALL
SELECT 
  'user_attributes' AS table_name,
  COUNT(*) AS row_count
FROM backup_user_attributes
UNION ALL
SELECT 
  'user_preferences' AS table_name,
  COUNT(*) AS row_count
FROM backup_user_preferences
UNION ALL
SELECT 
  'chatbot_conversations' AS table_name,
  COUNT(*) AS row_count
FROM backup_chatbot_conversations
UNION ALL
SELECT 
  'chatbot_messages' AS table_name,
  COUNT(*) AS row_count
FROM backup_chatbot_messages
UNION ALL
SELECT 
  'conversation_context' AS table_name,
  COUNT(*) AS row_count
FROM backup_conversation_context
UNION ALL
SELECT 
  'activity_completions' AS table_name,
  COUNT(*) AS row_count
FROM backup_activity_completions
UNION ALL
SELECT 
  'activity_feedback' AS table_name,
  COUNT(*) AS row_count
FROM backup_activity_feedback
UNION ALL
SELECT 
  'ai_suggestions' AS table_name,
  COUNT(*) AS row_count
FROM backup_ai_suggestions
ORDER BY table_name;

-- ============================================
-- 3. バックアップテーブルを削除する場合
-- ============================================
-- 削除スクリプト実行後、問題がなければ以下を実行:
-- 
-- DROP TABLE IF EXISTS backup_activity_likes CASCADE;
-- DROP TABLE IF EXISTS backup_offline_likes CASCADE;
-- DROP TABLE IF EXISTS backup_account_quiz_results CASCADE;
-- DROP TABLE IF EXISTS backup_user_attributes CASCADE;
-- DROP TABLE IF EXISTS backup_user_preferences CASCADE;
-- DROP TABLE IF EXISTS backup_chatbot_conversations CASCADE;
-- DROP TABLE IF EXISTS backup_chatbot_messages CASCADE;
-- DROP TABLE IF EXISTS backup_conversation_context CASCADE;
-- DROP TABLE IF EXISTS backup_activity_completions CASCADE;
-- DROP TABLE IF EXISTS backup_activity_feedback CASCADE;
-- DROP TABLE IF EXISTS backup_ai_suggestions CASCADE;



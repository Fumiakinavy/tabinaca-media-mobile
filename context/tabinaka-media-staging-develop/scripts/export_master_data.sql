-- ============================================
-- マスターデータ/参照データのエクスポート（CSV形式）
-- develop環境からmain環境にコピーすべきデータ
-- 
-- 注意: JSONBカラムがある場合はpg_dumpの使用を推奨
-- ============================================

-- 実行方法:
-- psql "postgresql://postgres.oqsaxmixaglwjugyqknk:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
-- \i export_master_data.sql

-- 1. activities (体験データ) - マスターデータ
\copy (SELECT * FROM public.activities ORDER BY created_at) TO 'activities.csv' WITH CSV HEADER;

-- 2. quiz_forms (クイズフォーム定義) - 設定データ
\copy (SELECT * FROM public.quiz_forms ORDER BY created_at) TO 'quiz_forms.csv' WITH CSV HEADER;

-- 注意: 以下のテーブルは通常コピーしない
-- - accounts (ユーザーアカウント)
-- - account_linkages (認証情報)
-- - account_metadata (ユーザーメタデータ)
-- - chat_sessions, chat_messages (チャットデータ)
-- - quiz_sessions, quiz_results, quiz_answers (ユーザーのクイズ結果)
-- - activity_interactions (ユーザーのいいね等)
-- - user_behavior_events (行動データ)
-- - form_submissions (フォーム送信データ)
-- - reviews (レビュー)
-- - generated_activities (生成された体験)
-- - generated_activity_saves (保存された体験)
-- - search_queries (検索クエリ)
-- - business_metrics_events (ビジネスメトリクス)
-- - session_replay_events (セッションリプレイ)

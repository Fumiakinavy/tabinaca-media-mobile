-- ============================================
-- チャットアナリティクス用ビュー作成マイグレーション（修正版）
-- ============================================
-- 目的: セクション3「Chat Session Logging」のためのアナリティクス用ビュー
-- ============================================

BEGIN;

-- ============================================
-- 1. アカウント別チャット利用統計ビュー
-- ============================================

CREATE OR REPLACE VIEW chat_usage_by_account AS
SELECT
  cs.account_id,
  COUNT(DISTINCT cs.id) AS total_sessions,
  COUNT(cm.id) AS total_messages,
  ROUND(COUNT(cm.id)::numeric / NULLIF(COUNT(DISTINCT cs.id), 0), 2) AS avg_messages_per_session,
  MAX(cs.last_activity_at) AS last_activity_at,
  MIN(cs.started_at) AS first_activity_at,
  SUM((cs.metadata->'metrics'->>'totalTokens')::int) FILTER (WHERE cs.metadata->'metrics'->>'totalTokens' IS NOT NULL) AS total_tokens_used,
  ROUND(AVG((cs.metadata->'metrics'->>'totalTokens')::numeric) FILTER (WHERE cs.metadata->'metrics'->>'totalTokens' IS NOT NULL), 2) AS avg_tokens_per_session,
  SUM((cs.metadata->'metrics'->>'totalLatencyMs')::int) FILTER (WHERE cs.metadata->'metrics'->>'totalLatencyMs' IS NOT NULL) AS total_latency_ms,
  ROUND(AVG((cs.metadata->'metrics'->>'totalLatencyMs')::numeric) FILTER (WHERE cs.metadata->'metrics'->>'totalLatencyMs' IS NOT NULL), 2) AS avg_latency_per_session,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.metadata->'errors' IS NOT NULL) AS sessions_with_errors
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cm.session_id = cs.id
GROUP BY cs.account_id;

COMMENT ON VIEW chat_usage_by_account IS 
'アカウント別のチャット利用統計。
総セッション数、総メッセージ数、平均メッセージ数、トークン使用量などを集計。';

-- ============================================
-- 2. 日次チャット利用統計ビュー
-- ============================================

CREATE OR REPLACE VIEW daily_chat_usage AS
SELECT
  DATE(cs.started_at) AS date,
  COUNT(DISTINCT cs.account_id) AS unique_users,
  COUNT(DISTINCT cs.id) AS total_sessions,
  COUNT(cm.id) AS total_messages,
  ROUND(COUNT(cm.id)::numeric / NULLIF(COUNT(DISTINCT cs.id), 0), 2) AS avg_messages_per_session,
  SUM((cs.metadata->'metrics'->>'totalTokens')::int) FILTER (WHERE cs.metadata->'metrics'->>'totalTokens' IS NOT NULL) AS total_tokens,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.metadata->'errors' IS NOT NULL) AS sessions_with_errors
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cm.session_id = cs.id
WHERE cs.started_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(cs.started_at)
ORDER BY DATE(cs.started_at) DESC;

COMMENT ON VIEW daily_chat_usage IS 
'日次のチャット利用統計。
ユニークユーザー数、セッション数、メッセージ数などを日別に集計。';

-- ============================================
-- 3. 機能使用統計ビュー（修正版）
-- ============================================

CREATE OR REPLACE VIEW function_usage_stats AS
WITH tool_calls_flat AS (
  SELECT
    cm.session_id,
    cm.created_at,
    jsonb_array_elements(cm.tool_calls)->>'tool' AS function_name
  FROM chat_messages cm
  WHERE cm.role = 'tool' 
    AND cm.tool_calls IS NOT NULL
    AND cm.created_at >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT
  function_name,
  DATE_TRUNC('day', created_at) AS date,
  COUNT(*) AS usage_count,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM tool_calls_flat
WHERE function_name IS NOT NULL
GROUP BY function_name, DATE_TRUNC('day', created_at)
ORDER BY date DESC, usage_count DESC;

COMMENT ON VIEW function_usage_stats IS 
'ツール/関数の使用統計。
各関数の使用回数とユニークセッション数を日別に集計。';

-- ============================================
-- 4. セッション詳細統計ビュー
-- ============================================

CREATE OR REPLACE VIEW session_details AS
SELECT
  cs.id AS session_id,
  cs.account_id,
  cs.session_type,
  cs.started_at,
  cs.last_activity_at,
  cs.closed_at,
  COUNT(cm.id) AS message_count,
  COUNT(cm.id) FILTER (WHERE cm.role = 'user') AS user_message_count,
  COUNT(cm.id) FILTER (WHERE cm.role = 'assistant') AS assistant_message_count,
  COUNT(cm.id) FILTER (WHERE cm.role = 'tool') AS tool_call_count,
  (cs.metadata->'metrics'->>'totalTokens')::int AS total_tokens,
  (cs.metadata->'metrics'->>'totalLatencyMs')::int AS total_latency_ms,
  (cs.metadata->'metrics'->'functionsUsed')::jsonb AS functions_used,
  (cs.metadata->'metrics'->>'placesFound')::int AS places_found,
  (cs.metadata->'metrics'->>'errors')::int AS error_count,
  CASE
    WHEN cs.closed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (cs.closed_at - cs.started_at))
    ELSE EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at))
  END AS session_duration_seconds
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cm.session_id = cs.id
GROUP BY cs.id, cs.account_id, cs.session_type, cs.started_at, cs.last_activity_at, cs.closed_at, cs.metadata;

COMMENT ON VIEW session_details IS 
'セッション詳細統計。
各セッションのメッセージ数、トークン数、所要時間などの詳細情報。';

-- ============================================
-- 5. チャットパフォーマンスメトリクスビュー
-- ============================================

CREATE OR REPLACE VIEW chat_performance_metrics AS
SELECT
  DATE_TRUNC('hour', cm.created_at) AS hour,
  COUNT(*) AS total_messages,
  ROUND(AVG(cm.latency_ms), 2) AS avg_latency_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cm.latency_ms) AS median_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cm.latency_ms) AS p95_latency_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY cm.latency_ms) AS p99_latency_ms,
  MAX(cm.latency_ms) AS max_latency_ms
FROM chat_messages cm
WHERE cm.role = 'assistant'
  AND cm.latency_ms IS NOT NULL
  AND cm.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', cm.created_at)
ORDER BY hour DESC;

COMMENT ON VIEW chat_performance_metrics IS 
'チャットパフォーマンスメトリクス。
レスポンス時間の平均、中央値、95/99パーセンタイルを時間別に集計。';

-- ============================================
-- 6. アカウント別機能利用統計マテリアライズドビュー（修正版）
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS account_function_usage AS
WITH tool_calls_flat AS (
  SELECT
    cs.account_id,
    cm.created_at,
    jsonb_array_elements(cm.tool_calls)->>'tool' AS function_name
  FROM chat_sessions cs
  INNER JOIN chat_messages cm ON cm.session_id = cs.id
  WHERE cm.role = 'tool' AND cm.tool_calls IS NOT NULL
)
SELECT
  account_id,
  function_name,
  COUNT(*) AS usage_count,
  MIN(created_at) AS first_used_at,
  MAX(created_at) AS last_used_at
FROM tool_calls_flat
WHERE function_name IS NOT NULL
GROUP BY account_id, function_name;

CREATE UNIQUE INDEX IF NOT EXISTS account_function_usage_unique_idx 
  ON account_function_usage (account_id, function_name);

COMMENT ON MATERIALIZED VIEW account_function_usage IS 
'アカウント別の機能利用統計（マテリアライズドビュー）。
定期的にREFRESHして最新データを反映。';

-- ============================================
-- 7. リフレッシュ関数
-- ============================================

CREATE OR REPLACE FUNCTION refresh_chat_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY account_function_usage;
  RAISE NOTICE 'Chat analytics materialized views refreshed';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_chat_analytics IS 
'チャットアナリティクスのマテリアライズドビューをリフレッシュする関数。
定期的にcronジョブで実行することで最新データを反映。';

COMMIT;

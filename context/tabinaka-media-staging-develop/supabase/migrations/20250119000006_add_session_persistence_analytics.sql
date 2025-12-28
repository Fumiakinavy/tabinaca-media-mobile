-- ============================================
-- チャットセッション保持用アナリティクスマイグレーション
-- ============================================
-- 目的: セッション保持機能に対応した詳細なアナリティクスビューを作成
-- ============================================

BEGIN;

-- ============================================
-- 1. 会話継続率分析ビュー
-- ============================================

CREATE OR REPLACE VIEW conversation_continuation_analysis AS
SELECT
  account_id,
  session_id,
  started_at,
  last_activity_at,
  closed_at,
  message_count,
  conversation_turns,
  session_duration_minutes,
  avg_response_time_seconds,
  is_continued_session,
  continuation_count,
  time_since_last_session_minutes
FROM (
  SELECT
    cs.account_id,
    cs.id AS session_id,
    cs.started_at,
    cs.last_activity_at,
    cs.closed_at,
    COUNT(cm.id) AS message_count,
    COUNT(cm.id) FILTER (WHERE cm.role = 'user') AS conversation_turns,
    EXTRACT(EPOCH FROM (COALESCE(cs.closed_at, cs.last_activity_at) - cs.started_at)) / 60 AS session_duration_minutes,
    ROUND(AVG(cm.latency_ms) FILTER (WHERE cm.role = 'assistant') / 1000, 2) AS avg_response_time_seconds,
    -- 前回のセッションから1時間以内なら継続セッション
    CASE 
      WHEN LAG(cs.last_activity_at) OVER (PARTITION BY cs.account_id ORDER BY cs.started_at) >= cs.started_at - INTERVAL '1 hour'
      THEN true
      ELSE false
    END AS is_continued_session,
    -- アカウントの累計セッション数
    ROW_NUMBER() OVER (PARTITION BY cs.account_id ORDER BY cs.started_at) AS continuation_count,
    -- 前回のセッションからの経過時間（分）
    EXTRACT(EPOCH FROM (cs.started_at - LAG(cs.last_activity_at) OVER (PARTITION BY cs.account_id ORDER BY cs.started_at))) / 60 AS time_since_last_session_minutes
  FROM chat_sessions cs
  LEFT JOIN chat_messages cm ON cm.session_id = cs.id
  WHERE cs.started_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY cs.id, cs.account_id, cs.started_at, cs.last_activity_at, cs.closed_at
) AS session_data
ORDER BY started_at DESC;

COMMENT ON VIEW conversation_continuation_analysis IS 
'会話継続率の詳細分析。
セッション間の継続性、会話ターン数、平均レスポンス時間を追跡。';

-- ============================================
-- 2. セッション品質スコアビュー
-- ============================================

CREATE OR REPLACE VIEW session_quality_scores AS
WITH tool_calls_flat AS (
  SELECT
    cm.session_id,
    jsonb_array_elements(cm.tool_calls)->>'tool' AS tool_name
  FROM chat_messages cm
  WHERE cm.tool_calls IS NOT NULL
    AND jsonb_array_length(cm.tool_calls) > 0
),
session_tool_counts AS (
  SELECT
    session_id,
    COUNT(DISTINCT tool_name) AS unique_tool_count
  FROM tool_calls_flat
  GROUP BY session_id
)
SELECT
  session_id,
  account_id,
  started_at,
  quality_score,
  engagement_level,
  message_count,
  conversation_turns,
  session_duration_minutes,
  avg_message_length,
  tool_usage_count,
  error_count,
  CASE
    WHEN quality_score >= 80 THEN 'excellent'
    WHEN quality_score >= 60 THEN 'good'
    WHEN quality_score >= 40 THEN 'fair'
    ELSE 'poor'
  END AS quality_category
FROM (
  SELECT
    cs.id AS session_id,
    cs.account_id,
    cs.started_at,
    -- 品質スコア計算（100点満点）
    LEAST(100, GREATEST(0,
      (COUNT(cm.id) FILTER (WHERE cm.role = 'user') * 10) +  -- 会話ターン数（最大40点）
      (CASE WHEN EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60 >= 5 THEN 20 ELSE 
        EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60 * 4 END) +  -- セッション時間（最大20点）
      (COALESCE(stc.unique_tool_count, 0) * 5) +  -- ツール使用（最大20点）
      (CASE WHEN COUNT(cm.id) FILTER (WHERE cm.latency_ms > 5000) = 0 THEN 20 ELSE 10 END) - -- レスポンス速度（最大20点）
      (COALESCE((cs.metadata->'metrics'->>'errors')::int, 0) * 10)  -- エラーペナルティ
    )) AS quality_score,
    CASE
      WHEN COUNT(cm.id) >= 10 THEN 'high'
      WHEN COUNT(cm.id) >= 5 THEN 'medium'
      ELSE 'low'
    END AS engagement_level,
    COUNT(cm.id) AS message_count,
    COUNT(cm.id) FILTER (WHERE cm.role = 'user') AS conversation_turns,
    ROUND(EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60, 2) AS session_duration_minutes,
    ROUND(AVG(LENGTH(cm.content)), 2) AS avg_message_length,
    COALESCE(stc.unique_tool_count, 0) AS tool_usage_count,
    COALESCE((cs.metadata->'metrics'->>'errors')::int, 0) AS error_count
  FROM chat_sessions cs
  LEFT JOIN chat_messages cm ON cm.session_id = cs.id
  LEFT JOIN session_tool_counts stc ON stc.session_id = cs.id
  WHERE cs.started_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY cs.id, cs.account_id, cs.started_at, cs.last_activity_at, cs.metadata, stc.unique_tool_count
) AS quality_data;

COMMENT ON VIEW session_quality_scores IS 
'セッション品質スコア。
会話の質、エンゲージメント、レスポンス速度から総合的に評価。';

-- ============================================
-- 3. 時間帯別利用統計ビュー
-- ============================================

CREATE OR REPLACE VIEW hourly_usage_patterns AS
SELECT
  hour_of_day,
  day_of_week,
  avg_sessions,
  avg_messages,
  avg_session_duration_minutes,
  peak_indicator
FROM (
  SELECT
    EXTRACT(HOUR FROM started_at) AS hour_of_day,
    EXTRACT(DOW FROM started_at) AS day_of_week,
    COUNT(DISTINCT cs.id) AS avg_sessions,
    AVG(message_count) AS avg_messages,
    AVG(session_duration) AS avg_session_duration_minutes,
    CASE 
      WHEN COUNT(DISTINCT cs.id) >= AVG(COUNT(DISTINCT cs.id)) OVER () * 1.5 THEN true
      ELSE false
    END AS peak_indicator
  FROM (
    SELECT
      cs.id,
      cs.started_at,
      COUNT(cm.id) AS message_count,
      EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60 AS session_duration
    FROM chat_sessions cs
    LEFT JOIN chat_messages cm ON cm.session_id = cs.id
    WHERE cs.started_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY cs.id, cs.started_at, cs.last_activity_at
  ) AS cs
  GROUP BY EXTRACT(HOUR FROM started_at), EXTRACT(DOW FROM started_at)
) AS hourly_stats
ORDER BY day_of_week, hour_of_day;

COMMENT ON VIEW hourly_usage_patterns IS 
'時間帯別・曜日別の利用パターン分析。
ピーク時間帯の特定に使用。';

-- ============================================
-- 4. ユーザー別会話スタイル分析ビュー
-- ============================================

CREATE OR REPLACE VIEW user_conversation_styles AS
WITH session_gaps AS (
  SELECT
    cs.account_id,
    cs.id AS session_id,
    cs.started_at,
    cs.last_activity_at,
    LAG(cs.last_activity_at) OVER (PARTITION BY cs.account_id ORDER BY cs.started_at) AS prev_session_end,
    EXTRACT(EPOCH FROM (
      cs.started_at - 
      LAG(cs.last_activity_at) OVER (PARTITION BY cs.account_id ORDER BY cs.started_at)
    )) / 3600 AS gap_hours
  FROM chat_sessions cs
  WHERE cs.started_at >= CURRENT_DATE - INTERVAL '90 days'
),
user_tool_usage AS (
  SELECT
    cs2.account_id,
    jsonb_agg(DISTINCT tool_name ORDER BY tool_name) FILTER (WHERE tool_name IS NOT NULL) AS most_used_features
  FROM chat_sessions cs2
  JOIN chat_messages cm2 ON cm2.session_id = cs2.id
  CROSS JOIN LATERAL jsonb_array_elements(cm2.tool_calls) AS tool_call
  CROSS JOIN LATERAL (SELECT tool_call->>'tool' AS tool_name) AS tool_extract
  WHERE cm2.tool_calls IS NOT NULL
    AND jsonb_array_length(cm2.tool_calls) > 0
    AND cs2.started_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY cs2.account_id
)
SELECT
  account_id,
  total_sessions,
  total_messages,
  avg_messages_per_session,
  avg_session_duration_minutes,
  preferred_hour,
  preferred_day,
  continuation_rate,
  avg_time_between_sessions_hours,
  most_used_features,
  conversation_style
FROM (
  SELECT
    cs.account_id,
    COUNT(DISTINCT cs.id) AS total_sessions,
    COUNT(cm.id) AS total_messages,
    ROUND(COUNT(cm.id)::numeric / NULLIF(COUNT(DISTINCT cs.id), 0), 2) AS avg_messages_per_session,
    ROUND(AVG(EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60), 2) AS avg_session_duration_minutes,
    MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM cs.started_at)) AS preferred_hour,
    MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM cs.started_at)) AS preferred_day,
    ROUND(
      COUNT(DISTINCT cs.id) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM chat_sessions cs2
          WHERE cs2.account_id = cs.account_id
            AND cs2.started_at < cs.started_at
            AND cs2.last_activity_at >= cs.started_at - INTERVAL '1 hour'
        )
      )::numeric / NULLIF(COUNT(DISTINCT cs.id), 0) * 100,
      2
    ) AS continuation_rate,
    ROUND(
      AVG(sg.gap_hours) FILTER (WHERE sg.prev_session_end IS NOT NULL),
      2
    ) AS avg_time_between_sessions_hours,
    utu.most_used_features,
    CASE
      WHEN AVG(EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60) > 10 THEN 'deep_explorer'
      WHEN COUNT(DISTINCT cs.id) > 10 AND AVG(EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60) < 5 THEN 'quick_checker'
      WHEN COUNT(cm.id)::numeric / NULLIF(COUNT(DISTINCT cs.id), 0) > 10 THEN 'detailed_inquirer'
      ELSE 'balanced_user'
    END AS conversation_style
  FROM chat_sessions cs
  LEFT JOIN chat_messages cm ON cm.session_id = cs.id
  LEFT JOIN session_gaps sg ON sg.session_id = cs.id
  LEFT JOIN user_tool_usage utu ON utu.account_id = cs.account_id
  WHERE cs.started_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY cs.account_id, utu.most_used_features
) AS user_styles;

COMMENT ON VIEW user_conversation_styles IS 
'ユーザー別の会話スタイル分析。
利用パターン、好みの時間帯、会話の継続性を分析。';

-- ============================================
-- 5. 長期セッション分析ビュー
-- ============================================

CREATE OR REPLACE VIEW long_running_sessions AS
WITH session_tools_flat AS (
  SELECT
    cm.session_id,
    jsonb_array_elements(cm.tool_calls)->>'tool' AS tool_name
  FROM chat_messages cm
  WHERE cm.tool_calls IS NOT NULL
    AND jsonb_array_length(cm.tool_calls) > 0
),
session_tools_agg AS (
  SELECT
    session_id,
    jsonb_agg(DISTINCT tool_name) AS topics_discussed,
    COUNT(DISTINCT tool_name) AS unique_tool_count
  FROM session_tools_flat
  GROUP BY session_id
)
SELECT
  session_id,
  account_id,
  started_at,
  last_activity_at,
  session_duration_minutes,
  message_count,
  conversation_turns,
  topics_discussed,
  session_complexity_score,
  is_successful_session
FROM (
  SELECT
    cs.id AS session_id,
    cs.account_id,
    cs.started_at,
    cs.last_activity_at,
    ROUND(EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60, 2) AS session_duration_minutes,
    COUNT(cm.id) AS message_count,
    COUNT(cm.id) FILTER (WHERE cm.role = 'user') AS conversation_turns,
    -- 使用されたツールをトピックとして抽出
    COALESCE(sta.topics_discussed, '[]'::jsonb) AS topics_discussed,
    -- セッション複雑度スコア
    (COUNT(cm.id) * 2) + 
    (COALESCE(sta.unique_tool_count, 0) * 5) +
    (EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60)::int AS session_complexity_score,
    -- 成功セッション判定（エラーなし＆5メッセージ以上）
    CASE
      WHEN COALESCE((cs.metadata->'metrics'->>'errors')::int, 0) = 0 
        AND COUNT(cm.id) >= 5
      THEN true
      ELSE false
    END AS is_successful_session
  FROM chat_sessions cs
  LEFT JOIN chat_messages cm ON cm.session_id = cs.id
  LEFT JOIN session_tools_agg sta ON sta.session_id = cs.id
  WHERE cs.started_at >= CURRENT_DATE - INTERVAL '30 days'
    AND EXTRACT(EPOCH FROM (cs.last_activity_at - cs.started_at)) / 60 >= 5  -- 5分以上のセッション
  GROUP BY cs.id, cs.account_id, cs.started_at, cs.last_activity_at, cs.metadata, sta.topics_discussed, sta.unique_tool_count
) AS long_sessions
ORDER BY session_duration_minutes DESC;

COMMENT ON VIEW long_running_sessions IS 
'長時間セッションの分析。
5分以上の詳細な会話を追跡し、複雑度と成功率を評価。';

-- ============================================
-- 6. セッション間隔とリエンゲージメント分析ビュー
-- ============================================

CREATE OR REPLACE VIEW session_gap_analysis AS
SELECT
  account_id,
  current_session_id,
  previous_session_id,
  gap_hours,
  gap_category,
  reengagement_success,
  current_session_quality,
  messages_in_current_session
FROM (
  SELECT
    cs.account_id,
    cs.id AS current_session_id,
    LAG(cs.id) OVER (PARTITION BY cs.account_id ORDER BY cs.started_at) AS previous_session_id,
    ROUND(
      EXTRACT(EPOCH FROM (
        cs.started_at - 
        LAG(cs.last_activity_at) OVER (PARTITION BY cs.account_id ORDER BY cs.started_at)
      )) / 3600,
      2
    ) AS gap_hours,
    CASE
      WHEN EXTRACT(EPOCH FROM (cs.started_at - LAG(cs.last_activity_at) OVER (PARTITION BY cs.account_id ORDER BY cs.started_at))) / 3600 <= 1 THEN 'immediate'
      WHEN EXTRACT(EPOCH FROM (cs.started_at - LAG(cs.last_activity_at) OVER (PARTITION BY cs.account_id ORDER BY cs.started_at))) / 3600 <= 24 THEN 'same_day'
      WHEN EXTRACT(EPOCH FROM (cs.started_at - LAG(cs.last_activity_at) OVER (PARTITION BY cs.account_id ORDER BY cs.started_at))) / 3600 <= 168 THEN 'within_week'
      ELSE 'long_gap'
    END AS gap_category,
    COUNT(cm.id) >= 3 AS reengagement_success,
    COALESCE((cs.metadata->'metrics'->>'totalMessages')::int, 0) AS current_session_quality,
    COUNT(cm.id) AS messages_in_current_session
  FROM chat_sessions cs
  LEFT JOIN chat_messages cm ON cm.session_id = cs.id
  WHERE cs.started_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY cs.id, cs.account_id, cs.started_at, cs.last_activity_at, cs.metadata
) AS gap_data
WHERE gap_hours IS NOT NULL
ORDER BY gap_hours DESC;

COMMENT ON VIEW session_gap_analysis IS 
'セッション間のギャップ分析とリエンゲージメント成功率。
ユーザーが戻ってくるまでの時間とその後のエンゲージメントを追跡。';

COMMIT;

 
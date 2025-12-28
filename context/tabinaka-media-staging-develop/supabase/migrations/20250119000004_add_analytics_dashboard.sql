-- ============================================
-- ダッシュボード用アナリティクスビュー作成マイグレーション
-- ============================================
-- 目的: セクション8「Data Warehouse & Monitoring」のための
--       リテンション分析、DAU/MAU、コホート分析などのビュー
-- ============================================

BEGIN;

-- ============================================
-- 1. デイリーアクティブユーザー (DAU) ビュー
-- ============================================

CREATE OR REPLACE VIEW daily_active_users AS
SELECT
  DATE(event_date) AS date,
  COUNT(DISTINCT account_id) AS dau,
  COUNT(DISTINCT CASE WHEN is_new_user THEN account_id END) AS new_users,
  COUNT(DISTINCT CASE WHEN NOT is_new_user THEN account_id END) AS returning_users
FROM (
  -- ユーザー行動イベントからアクティビティを取得
  SELECT
    DATE(event_timestamp) AS event_date,
    account_id,
    DATE(event_timestamp) = DATE(MIN(event_timestamp) OVER (PARTITION BY account_id)) AS is_new_user
  FROM user_behavior_events
  WHERE account_id IS NOT NULL
    AND event_timestamp >= CURRENT_DATE - INTERVAL '90 days'
  
  UNION
  
  -- チャットセッションからアクティビティを取得
  SELECT
    DATE(started_at) AS event_date,
    account_id,
    DATE(started_at) = DATE(MIN(started_at) OVER (PARTITION BY account_id)) AS is_new_user
  FROM chat_sessions
  WHERE account_id IS NOT NULL
    AND started_at >= CURRENT_DATE - INTERVAL '90 days'
) AS combined_activity
GROUP BY DATE(event_date)
ORDER BY date DESC;

COMMENT ON VIEW daily_active_users IS 
'デイリーアクティブユーザー (DAU) の統計。
新規ユーザーと既存ユーザーを区別して集計。';

-- ============================================
-- 2. ウィークリー/マンスリーアクティブユーザー (WAU/MAU) ビュー（修正版）
-- ============================================

CREATE OR REPLACE VIEW weekly_monthly_active_users AS
WITH daily_users AS (
  SELECT DISTINCT
    DATE(event_date) AS date,
    account_id
  FROM (
    SELECT
      DATE(event_timestamp) AS event_date,
      account_id
    FROM user_behavior_events
    WHERE account_id IS NOT NULL
      AND event_timestamp >= CURRENT_DATE - INTERVAL '90 days'
    
    UNION
    
    SELECT
      DATE(started_at) AS event_date,
      account_id
    FROM chat_sessions
    WHERE account_id IS NOT NULL
      AND started_at >= CURRENT_DATE - INTERVAL '90 days'
  ) AS combined_activity
),
date_series AS (
  SELECT DISTINCT date
  FROM daily_users
)
SELECT
  ds.date,
  COALESCE(dau_calc.dau, 0) AS dau,
  COALESCE(wau_calc.wau, 0) AS wau,
  COALESCE(mau_calc.mau, 0) AS mau,
  ROUND((COALESCE(dau_calc.dau, 0)::numeric / NULLIF(COALESCE(wau_calc.wau, 0), 0)) * 100, 2) AS dau_wau_ratio,
  ROUND((COALESCE(dau_calc.dau, 0)::numeric / NULLIF(COALESCE(mau_calc.mau, 0), 0)) * 100, 2) AS dau_mau_ratio,
  ROUND((COALESCE(wau_calc.wau, 0)::numeric / NULLIF(COALESCE(mau_calc.mau, 0), 0)) * 100, 2) AS wau_mau_ratio
FROM date_series ds
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT account_id) AS dau
  FROM daily_users
  WHERE date = ds.date
) AS dau_calc ON true
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT account_id) AS wau
  FROM daily_users
  WHERE date >= ds.date - INTERVAL '6 days'
    AND date <= ds.date
) AS wau_calc ON true
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT account_id) AS mau
  FROM daily_users
  WHERE date >= ds.date - INTERVAL '29 days'
    AND date <= ds.date
) AS mau_calc ON true
ORDER BY ds.date DESC;

COMMENT ON VIEW weekly_monthly_active_users IS 
'DAU、WAU、MAUとそれらの比率を計算。
エンゲージメントの深さを測定するための重要な指標。';

-- ============================================
-- 3. ユーザーリテンション (継続率) ビュー
-- ============================================

CREATE OR REPLACE VIEW user_retention AS
SELECT
  cohort_date,
  days_since_signup,
  cohort_size,
  retained_users,
  ROUND((retained_users::numeric / cohort_size) * 100, 2) AS retention_rate
FROM (
  SELECT
    first_activity_date AS cohort_date,
    DATE(activity_date) - first_activity_date AS days_since_signup,
    COUNT(DISTINCT first_activity.account_id) AS cohort_size,
    COUNT(DISTINCT activity.account_id) AS retained_users
  FROM (
    -- 各ユーザーの最初のアクティビティ日を取得
    SELECT
      account_id,
      DATE(MIN(event_timestamp)) AS first_activity_date
    FROM user_behavior_events
    WHERE account_id IS NOT NULL
    GROUP BY account_id
    
    UNION
    
    SELECT
      account_id,
      DATE(MIN(started_at)) AS first_activity_date
    FROM chat_sessions
    WHERE account_id IS NOT NULL
    GROUP BY account_id
  ) AS first_activity
  LEFT JOIN (
    -- すべてのアクティビティを取得
    SELECT
      account_id,
      DATE(event_timestamp) AS activity_date
    FROM user_behavior_events
    WHERE account_id IS NOT NULL
    
    UNION
    
    SELECT
      account_id,
      DATE(started_at) AS activity_date
    FROM chat_sessions
    WHERE account_id IS NOT NULL
  ) AS activity ON first_activity.account_id = activity.account_id
  WHERE first_activity.first_activity_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY first_activity_date, DATE(activity_date) - first_activity_date
) AS retention_data
ORDER BY cohort_date DESC, days_since_signup;

COMMENT ON VIEW user_retention IS 
'ユーザーリテンション（継続率）の分析。
コホート日ごとに、何日後にどれだけのユーザーが戻ってきたかを追跡。';

-- ============================================
-- 4. コホート分析ビュー（週次）
-- ============================================

CREATE OR REPLACE VIEW weekly_cohort_analysis AS
SELECT
  cohort_week,
  weeks_since_signup,
  cohort_size,
  active_users,
  ROUND((active_users::numeric / cohort_size) * 100, 2) AS retention_rate
FROM (
  SELECT
    DATE_TRUNC('week', first_activity.first_activity_date) AS cohort_week,
    FLOOR(EXTRACT(EPOCH FROM (DATE_TRUNC('week', activity.activity_date) - DATE_TRUNC('week', first_activity.first_activity_date))) / 604800)::int AS weeks_since_signup,
    COUNT(DISTINCT first_activity.account_id) AS cohort_size,
    COUNT(DISTINCT activity.account_id) AS active_users
  FROM (
    SELECT
      account_id,
      MIN(event_timestamp) AS first_activity_date
    FROM user_behavior_events
    WHERE account_id IS NOT NULL
    GROUP BY account_id
    
    UNION
    
    SELECT
      account_id,
      MIN(started_at) AS first_activity_date
    FROM chat_sessions
    WHERE account_id IS NOT NULL
    GROUP BY account_id
  ) AS first_activity
  LEFT JOIN (
    SELECT
      account_id,
      event_timestamp AS activity_date
    FROM user_behavior_events
    WHERE account_id IS NOT NULL
    
    UNION
    
    SELECT
      account_id,
      started_at AS activity_date
    FROM chat_sessions
    WHERE account_id IS NOT NULL
  ) AS activity ON first_activity.account_id = activity.account_id
  WHERE DATE_TRUNC('week', first_activity.first_activity_date) >= CURRENT_DATE - INTERVAL '12 weeks'
  GROUP BY DATE_TRUNC('week', first_activity.first_activity_date), weeks_since_signup
) AS cohort_data
ORDER BY cohort_week DESC, weeks_since_signup;

COMMENT ON VIEW weekly_cohort_analysis IS 
'週次コホート分析。
各週に登録したユーザーが何週間後も戻ってきているかを追跡。';

-- ============================================
-- 5. ユーザーエンゲージメントスコアビュー
-- ============================================

CREATE OR REPLACE VIEW user_engagement_scores AS
SELECT
  account_id,
  total_days_active,
  total_sessions,
  total_messages,
  avg_session_duration_minutes,
  last_activity_date,
  days_since_last_activity,
  CASE
    WHEN days_since_last_activity <= 1 THEN 'highly_active'
    WHEN days_since_last_activity <= 7 THEN 'active'
    WHEN days_since_last_activity <= 30 THEN 'occasional'
    ELSE 'dormant'
  END AS engagement_level,
  ROUND(
    (total_days_active * 10 + total_sessions * 5 + total_messages * 2) / 
    GREATEST(days_since_last_activity, 1)::numeric,
    2
  ) AS engagement_score
FROM (
  SELECT
    account_id,
    COUNT(DISTINCT activity_date) AS total_days_active,
    COUNT(DISTINCT session_id) AS total_sessions,
    SUM(message_count) AS total_messages,
    ROUND(AVG(session_duration_minutes), 2) AS avg_session_duration_minutes,
    MAX(activity_date) AS last_activity_date,
    CURRENT_DATE - MAX(activity_date) AS days_since_last_activity
  FROM (
    SELECT
      ube.account_id,
      DATE(ube.event_timestamp) AS activity_date,
      ube.session_id,
      0 AS message_count,
      0 AS session_duration_minutes
    FROM user_behavior_events ube
    WHERE ube.account_id IS NOT NULL
    
    UNION ALL
    
    SELECT
      cs.account_id,
      DATE(cs.started_at) AS activity_date,
      cs.id::text AS session_id,
      COALESCE((SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = cs.id), 0) AS message_count,
      EXTRACT(EPOCH FROM (COALESCE(cs.closed_at, cs.last_activity_at) - cs.started_at)) / 60 AS session_duration_minutes
    FROM chat_sessions cs
    WHERE cs.account_id IS NOT NULL
  ) AS all_activity
  GROUP BY account_id
) AS engagement_data
ORDER BY engagement_score DESC;

COMMENT ON VIEW user_engagement_scores IS 
'ユーザーごとのエンゲージメントスコア。
アクティブ日数、セッション数、メッセージ数から算出し、
ユーザーをhighly_active、active、occasional、dormantに分類。';

-- ============================================
-- 6. 機能別利用統計サマリービュー
-- ============================================

CREATE OR REPLACE VIEW feature_usage_summary AS
SELECT
  feature_category,
  feature_name,
  total_uses,
  unique_users,
  avg_uses_per_user,
  last_used_at,
  usage_trend_7d,
  usage_trend_30d
FROM (
  SELECT
    CASE
      WHEN function_name LIKE '%search%' THEN 'search'
      WHEN function_name LIKE '%recommend%' THEN 'recommendation'
      WHEN function_name LIKE '%place%' THEN 'places'
      WHEN function_name LIKE '%review%' THEN 'reviews'
      ELSE 'other'
    END AS feature_category,
    function_name AS feature_name,
    COUNT(*) AS total_uses,
    COUNT(DISTINCT cs.account_id) AS unique_users,
    ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT cs.account_id), 0), 2) AS avg_uses_per_user,
    MAX(cm.created_at) AS last_used_at,
    COUNT(*) FILTER (WHERE cm.created_at >= CURRENT_DATE - INTERVAL '7 days') AS usage_trend_7d,
    COUNT(*) FILTER (WHERE cm.created_at >= CURRENT_DATE - INTERVAL '30 days') AS usage_trend_30d
  FROM chat_messages cm
  INNER JOIN chat_sessions cs ON cm.session_id = cs.id
  CROSS JOIN LATERAL (
    SELECT jsonb_array_elements(cm.tool_calls) AS tool_call
    WHERE cm.role = 'tool' AND cm.tool_calls IS NOT NULL
  ) AS tool_calls_expanded
  CROSS JOIN LATERAL (
    SELECT tool_calls_expanded.tool_call->>'tool' AS function_name
  ) AS function_info
  WHERE function_name IS NOT NULL
  GROUP BY feature_category, function_name
) AS feature_stats
ORDER BY total_uses DESC;

COMMENT ON VIEW feature_usage_summary IS 
'機能別の利用統計サマリー。
各機能の利用回数、ユニークユーザー数、直近7日/30日のトレンドを集計。';

-- ============================================
-- 7. データ品質モニタリングビュー
-- ============================================

CREATE OR REPLACE VIEW data_quality_metrics AS
SELECT
  metric_name,
  metric_value,
  threshold,
  status,
  last_checked
FROM (
  SELECT
    'user_behavior_events_24h' AS metric_name,
    COUNT(*) AS metric_value,
    100 AS threshold,
    CASE WHEN COUNT(*) >= 100 THEN 'healthy' ELSE 'warning' END AS status,
    NOW() AS last_checked
  FROM user_behavior_events
  WHERE event_timestamp >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT
    'chat_sessions_24h',
    COUNT(*),
    10,
    CASE WHEN COUNT(*) >= 10 THEN 'healthy' ELSE 'warning' END,
    NOW()
  FROM chat_sessions
  WHERE started_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT
    'null_account_id_rate',
    ROUND((COUNT(*) FILTER (WHERE account_id IS NULL)::numeric / NULLIF(COUNT(*), 0)) * 100, 2),
    10,
    CASE 
      WHEN ROUND((COUNT(*) FILTER (WHERE account_id IS NULL)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) <= 10 THEN 'healthy'
      ELSE 'warning'
    END,
    NOW()
  FROM user_behavior_events
  WHERE event_timestamp >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT
    'avg_event_latency_ms',
    ROUND(AVG(latency_ms), 2),
    5000,
    CASE WHEN ROUND(AVG(latency_ms), 2) <= 5000 THEN 'healthy' ELSE 'warning' END,
    NOW()
  FROM chat_messages
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND latency_ms IS NOT NULL
) AS quality_checks
ORDER BY 
  CASE status 
    WHEN 'warning' THEN 1 
    WHEN 'healthy' THEN 2 
  END,
  metric_name;

COMMENT ON VIEW data_quality_metrics IS 
'データ品質モニタリングメトリクス。
24時間以内のイベント数、null率、レイテンシなどを監視。';

COMMIT;


-- ============================================
-- ヘルパー関数作成マイグレーション
-- ============================================
-- 目的: ダッシュボードAPIで使用するヘルパー関数
-- ============================================

BEGIN;

-- ============================================
-- 1. リテンション率を取得する関数
-- ============================================

CREATE OR REPLACE FUNCTION get_retention_rates()
RETURNS TABLE (
  day_1 numeric,
  day_7 numeric,
  day_30 numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      (SELECT retention_rate 
       FROM user_retention 
       WHERE days_since_signup = 1 
       AND cohort_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY cohort_date DESC 
       LIMIT 1),
      0
    ) AS day_1,
    COALESCE(
      (SELECT AVG(retention_rate) 
       FROM user_retention 
       WHERE days_since_signup = 7 
       AND cohort_date >= CURRENT_DATE - INTERVAL '60 days'),
      0
    ) AS day_7,
    COALESCE(
      (SELECT AVG(retention_rate) 
       FROM user_retention 
       WHERE days_since_signup = 30 
       AND cohort_date >= CURRENT_DATE - INTERVAL '90 days'),
      0
    ) AS day_30;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_retention_rates IS 
'Day 1、Day 7、Day 30のリテンション率を取得する関数。
ダッシュボードの概要表示に使用。';

-- ============================================
-- 2. アカウント別アクティビティサマリー取得関数
-- ============================================

CREATE OR REPLACE FUNCTION get_account_activity_summary(
  p_account_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_sessions INTEGER,
  total_messages INTEGER,
  total_events INTEGER,
  days_active INTEGER,
  last_activity_at TIMESTAMPTZ,
  engagement_level TEXT,
  top_features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cs.id)::INTEGER AS total_sessions,
    COALESCE(SUM((cs.metadata->'metrics'->>'totalMessages')::int), 0)::INTEGER AS total_messages,
    COUNT(DISTINCT ube.id)::INTEGER AS total_events,
    COUNT(DISTINCT DATE(COALESCE(cs.started_at, ube.event_timestamp)))::INTEGER AS days_active,
    GREATEST(MAX(cs.last_activity_at), MAX(ube.event_timestamp)) AS last_activity_at,
    CASE
      WHEN CURRENT_DATE - GREATEST(MAX(DATE(cs.last_activity_at)), MAX(DATE(ube.event_timestamp))) <= 1 THEN 'highly_active'
      WHEN CURRENT_DATE - GREATEST(MAX(DATE(cs.last_activity_at)), MAX(DATE(ube.event_timestamp))) <= 7 THEN 'active'
      WHEN CURRENT_DATE - GREATEST(MAX(DATE(cs.last_activity_at)), MAX(DATE(ube.event_timestamp))) <= 30 THEN 'occasional'
      ELSE 'dormant'
    END AS engagement_level,
    (
      SELECT jsonb_agg(jsonb_build_object('function', function_name, 'count', usage_count))
      FROM (
        SELECT 
          tool_call->>'tool' AS function_name,
          COUNT(*) AS usage_count
        FROM chat_messages cm
        INNER JOIN chat_sessions cs2 ON cm.session_id = cs2.id
        CROSS JOIN LATERAL jsonb_array_elements(cm.tool_calls) AS tool_call
        WHERE cs2.account_id = p_account_id
          AND cm.role = 'tool'
          AND cm.tool_calls IS NOT NULL
          AND cm.created_at >= CURRENT_DATE - p_days_back
        GROUP BY tool_call->>'tool'
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) AS top_funcs
    ) AS top_features
  FROM chat_sessions cs
  FULL OUTER JOIN user_behavior_events ube ON cs.account_id = ube.account_id
  WHERE COALESCE(cs.account_id, ube.account_id) = p_account_id
    AND (cs.started_at >= CURRENT_DATE - p_days_back OR ube.event_timestamp >= CURRENT_DATE - p_days_back);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_account_activity_summary IS 
'特定アカウントのアクティビティサマリーを取得する関数。
ユーザープロファイル画面などで使用。';

-- ============================================
-- 3. トレンドデータ取得関数
-- ============================================

CREATE OR REPLACE FUNCTION get_metric_trend(
  p_metric_name TEXT,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  value NUMERIC
) AS $$
BEGIN
  IF p_metric_name = 'dau' THEN
    RETURN QUERY
    SELECT 
      dau.date::DATE,
      dau.dau::NUMERIC
    FROM daily_active_users dau
    WHERE dau.date >= CURRENT_DATE - p_days_back
    ORDER BY dau.date;
    
  ELSIF p_metric_name = 'chat_sessions' THEN
    RETURN QUERY
    SELECT
      DATE(started_at)::DATE,
      COUNT(*)::NUMERIC
    FROM chat_sessions
    WHERE started_at >= CURRENT_DATE - p_days_back
    GROUP BY DATE(started_at)
    ORDER BY DATE(started_at);
    
  ELSIF p_metric_name = 'events' THEN
    RETURN QUERY
    SELECT
      DATE(event_timestamp)::DATE,
      COUNT(*)::NUMERIC
    FROM user_behavior_events
    WHERE event_timestamp >= CURRENT_DATE - p_days_back
    GROUP BY DATE(event_timestamp)
    ORDER BY DATE(event_timestamp);
    
  ELSE
    RAISE EXCEPTION 'Unknown metric: %', p_metric_name;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_metric_trend IS 
'指定されたメトリクスのトレンドデータを取得する関数。
dau、chat_sessions、eventsなどをサポート。';

-- ============================================
-- 4. データ品質アラート検出関数
-- ============================================

CREATE OR REPLACE FUNCTION detect_data_quality_alerts()
RETURNS TABLE (
  alert_level TEXT,
  alert_message TEXT,
  metric_name TEXT,
  metric_value NUMERIC,
  threshold NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN status = 'warning' THEN 'warning'
      WHEN status = 'error' THEN 'error'
      ELSE 'info'
    END AS alert_level,
    CASE
      WHEN dqm.metric_name = 'user_behavior_events_24h' AND metric_value < threshold THEN 
        'ユーザー行動イベントが少なすぎます'
      WHEN dqm.metric_name = 'chat_sessions_24h' AND metric_value < threshold THEN 
        'チャットセッションが少なすぎます'
      WHEN dqm.metric_name = 'null_account_id_rate' AND metric_value > threshold THEN 
        'account_idがnullのイベントが多すぎます'
      WHEN dqm.metric_name = 'avg_event_latency_ms' AND metric_value > threshold THEN 
        'イベントのレイテンシが高すぎます'
      ELSE 'データ品質に問題があります'
    END AS alert_message,
    dqm.metric_name,
    dqm.metric_value,
    dqm.threshold
  FROM data_quality_metrics dqm
  WHERE dqm.status != 'healthy';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION detect_data_quality_alerts IS 
'データ品質の問題を検出し、アラートを生成する関数。
モニタリングダッシュボードで使用。';

-- ============================================
-- 5. 定期実行用のメンテナンス関数
-- ============================================

CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
BEGIN
  -- 古いイベントのクリーンアップ
  DELETE FROM user_behavior_events
  WHERE event_timestamp < NOW() - INTERVAL '2 years';
  
  DELETE FROM business_metrics_events
  WHERE event_timestamp < NOW() - INTERVAL '2 years';
  
  DELETE FROM session_replay_events
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- アナリティクスビューのリフレッシュ
  REFRESH MATERIALIZED VIEW CONCURRENTLY account_function_usage;
  
  -- 統計情報の更新
  ANALYZE user_behavior_events;
  ANALYZE business_metrics_events;
  ANALYZE chat_sessions;
  ANALYZE chat_messages;
  
  v_result := 'Daily maintenance completed successfully';
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    v_result := 'Daily maintenance failed: ' || SQLERRM;
    RAISE WARNING '%', v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION run_daily_maintenance IS 
'毎日実行するメンテナンス処理。
古いデータの削除、マテリアライズドビューのリフレッシュ、統計情報の更新を行う。
cronジョブで定期実行を推奨。';

COMMIT;


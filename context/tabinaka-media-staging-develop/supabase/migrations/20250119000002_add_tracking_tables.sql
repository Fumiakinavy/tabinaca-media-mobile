-- ============================================
-- トラッキングイベントテーブル作成マイグレーション
-- ============================================
-- 目的: セクション2「Tracking Transport Layer」のためのイベントテーブルを作成
-- ============================================

BEGIN;

-- ============================================
-- 1. ユーザー行動イベントテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS user_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_url TEXT NOT NULL,
  user_agent TEXT,
  screen_resolution TEXT,
  viewport_size TEXT,
  language TEXT,
  timezone TEXT,
  referrer TEXT,
  
  -- 行動データ
  actions JSONB NOT NULL DEFAULT '[]',
  
  -- パフォーマンスデータ
  performance JSONB,
  
  -- エンゲージメントデータ
  engagement JSONB,
  
  -- メタデータ
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_behavior_events_account_id_idx 
  ON user_behavior_events (account_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS user_behavior_events_session_id_idx 
  ON user_behavior_events (session_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS user_behavior_events_timestamp_idx 
  ON user_behavior_events (event_timestamp DESC);

CREATE INDEX IF NOT EXISTS user_behavior_events_page_url_idx 
  ON user_behavior_events (page_url);

COMMENT ON TABLE user_behavior_events IS 
'ユーザーの詳細な行動イベントを記録するテーブル。
クリック、スクロール、入力、フォーカスなどのDOM操作を記録。
lib/userBehaviorTracker.ts から送信される。';

-- ============================================
-- 2. ビジネスメトリクスイベントテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS business_metrics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_url TEXT NOT NULL,
  experience_slug TEXT,
  experience_title TEXT,
  
  -- コンバージョンファネル
  conversion_funnel JSONB,
  
  -- 収益メトリクス
  revenue_metrics JSONB,
  
  -- ユーザージャーニー
  user_journey JSONB,
  
  -- コンテンツパフォーマンス
  content_performance JSONB,
  
  -- カスタマー満足度
  customer_satisfaction JSONB,
  
  -- メタデータ
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_metrics_events_account_id_idx 
  ON business_metrics_events (account_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS business_metrics_events_session_id_idx 
  ON business_metrics_events (session_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS business_metrics_events_timestamp_idx 
  ON business_metrics_events (event_timestamp DESC);

CREATE INDEX IF NOT EXISTS business_metrics_events_experience_slug_idx 
  ON business_metrics_events (experience_slug);

COMMENT ON TABLE business_metrics_events IS 
'ビジネスメトリクスとセッションリプレイデータを記録するテーブル。
コンバージョンファネル、収益、ユーザージャーニーを記録。
lib/businessMetricsTracker.ts から送信される。';

-- ============================================
-- 3. セッションリプレイイベントテーブル（将来の拡張用）
-- ============================================

CREATE TABLE IF NOT EXISTS session_replay_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'mouse_move', 'click', 'scroll', 'form_interaction'
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_replay_events_session_id_idx 
  ON session_replay_events (session_id, timestamp);

CREATE INDEX IF NOT EXISTS session_replay_events_timestamp_idx 
  ON session_replay_events (timestamp DESC);

COMMENT ON TABLE session_replay_events IS 
'セッションリプレイ用の詳細イベントを記録するテーブル。
マウス移動、クリック、スクロールなどを時系列で記録。
将来的にセッションリプレイ機能を実装する際に使用。';

-- ============================================
-- 4. データ保存期間管理のための関数（将来の拡張用）
-- ============================================

-- 古いイベントデータを削除する関数
CREATE OR REPLACE FUNCTION cleanup_old_tracking_events()
RETURNS void AS $$
BEGIN
  -- 2年以上前のユーザー行動イベントを削除
  DELETE FROM user_behavior_events
  WHERE event_timestamp < NOW() - INTERVAL '2 years';
  
  -- 2年以上前のビジネスメトリクスイベントを削除
  DELETE FROM business_metrics_events
  WHERE event_timestamp < NOW() - INTERVAL '2 years';
  
  -- 90日以上前のセッションリプレイイベントを削除
  DELETE FROM session_replay_events
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Old tracking events cleaned up';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_tracking_events IS 
'古いトラッキングイベントを削除する関数。
定期的にcronジョブで実行することで、ストレージコストを最適化。';

-- ============================================
-- 5. 統計用のマテリアライズドビュー（将来の拡張用）
-- ============================================

-- 日次ユーザー行動サマリー
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_user_behavior_summary AS
SELECT
  DATE(event_timestamp) AS event_date,
  account_id,
  COUNT(DISTINCT session_id) AS session_count,
  COUNT(*) AS event_count,
  COUNT(DISTINCT page_url) AS unique_pages_visited,
  AVG((engagement->>'timeOnPage')::int) AS avg_time_on_page,
  AVG((engagement->>'scrollDepth')::int) AS avg_scroll_depth,
  AVG((engagement->>'clickCount')::int) AS avg_click_count
FROM user_behavior_events
WHERE event_timestamp >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(event_timestamp), account_id;

CREATE UNIQUE INDEX IF NOT EXISTS daily_user_behavior_summary_unique_idx 
  ON daily_user_behavior_summary (event_date, account_id);

COMMENT ON MATERIALIZED VIEW daily_user_behavior_summary IS 
'日次のユーザー行動サマリー。ダッシュボード表示用。
定期的にREFRESHすることで最新データを反映。';

COMMIT;


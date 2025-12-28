-- ============================================
-- ページ滞在時間の正確計測用テーブル
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS page_dwell_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_group TEXT,
  enter_at TIMESTAMPTZ NOT NULL,
  leave_at TIMESTAMPTZ NOT NULL,
  total_duration_ms BIGINT NOT NULL,
  active_duration_ms BIGINT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_dwell_events_account_id_idx
  ON page_dwell_events (account_id, enter_at DESC);

CREATE INDEX IF NOT EXISTS page_dwell_events_session_id_idx
  ON page_dwell_events (session_id, enter_at DESC);

CREATE INDEX IF NOT EXISTS page_dwell_events_page_path_idx
  ON page_dwell_events (page_path, enter_at DESC);

CREATE INDEX IF NOT EXISTS page_dwell_events_page_group_idx
  ON page_dwell_events (page_group, enter_at DESC);

COMMENT ON TABLE page_dwell_events IS
'ページ滞在時間イベント。
Next.jsルーティングとvisibility/focusを元に送信される。';

-- 集計ビュー（直近30日）
CREATE OR REPLACE VIEW page_dwell_summary AS
SELECT
  page_path,
  page_group,
  COUNT(*) AS views,
  ROUND(AVG(active_duration_ms)::numeric / 1000, 2) AS avg_active_seconds,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY active_duration_ms)::numeric / 1000, 2) AS median_active_seconds,
  ROUND(SUM(active_duration_ms)::numeric / 1000, 2) AS total_active_seconds,
  ROUND(MAX(active_duration_ms)::numeric / 1000, 2) AS max_active_seconds
FROM page_dwell_events
WHERE enter_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY page_path, page_group
ORDER BY total_active_seconds DESC;

COMMENT ON VIEW page_dwell_summary IS
'直近30日のページ滞在時間サマリー。active_duration_ms を基準に集計。';

COMMIT;

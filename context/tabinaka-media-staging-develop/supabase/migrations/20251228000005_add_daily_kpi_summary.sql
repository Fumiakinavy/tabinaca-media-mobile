BEGIN;

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_kpi_summary AS
SELECT
  dau.date::date AS date,
  dau.dau,
  dau.new_users,
  dau.returning_users,
  COALESCE(dcu.total_sessions, 0) AS total_chat_sessions,
  COALESCE(dcu.total_messages, 0) AS total_chat_messages,
  COALESCE(dcu.avg_messages_per_session, 0) AS avg_messages_per_session,
  COALESCE(dss.total_searches, 0) AS total_searches,
  COALESCE(dss.unique_searchers, 0) AS unique_searchers,
  COALESCE(dss.unique_queries, 0) AS unique_queries,
  COALESCE(dss.overall_ctr, 0) AS overall_search_ctr,
  COALESCE(ds.avg_session_minutes, 0) AS avg_session_minutes
FROM daily_active_users dau
LEFT JOIN daily_chat_usage dcu ON dcu.date = dau.date
LEFT JOIN daily_search_stats dss ON dss.date = dau.date
LEFT JOIN (
  SELECT
    DATE(started_at) AS date,
    ROUND(AVG(session_duration_seconds) / 60, 2) AS avg_session_minutes
  FROM session_details
  GROUP BY DATE(started_at)
) AS ds ON ds.date = dau.date
ORDER BY dau.date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS daily_kpi_summary_date_idx
  ON daily_kpi_summary (date);

CREATE OR REPLACE FUNCTION refresh_daily_kpi_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_kpi_summary;
  RAISE NOTICE 'daily_kpi_summary refreshed';
END;
$$ LANGUAGE plpgsql;

COMMIT;

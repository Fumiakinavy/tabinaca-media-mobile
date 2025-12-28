-- ============================================
-- コンテンツアナリティクス作成マイグレーション
-- ============================================
-- 目的: クイズ、検索、レコメンデーションのアナリティクス
-- ============================================

BEGIN;

-- ============================================
-- 1. 検索クエリトラッキングテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  session_id TEXT,
  search_query TEXT NOT NULL,
  search_source TEXT, -- 'hero', 'header', 'chat', etc.
  search_context JSONB, -- filters, location, etc.
  page_url TEXT,
  results_count INTEGER,
  clicked_result_id UUID,
  clicked_result_position INTEGER,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_queries_account_id_idx 
  ON search_queries (account_id, searched_at DESC);

CREATE INDEX IF NOT EXISTS search_queries_query_idx 
  ON search_queries (search_query, searched_at DESC);

CREATE INDEX IF NOT EXISTS search_queries_searched_at_idx 
  ON search_queries (searched_at DESC);

COMMENT ON TABLE search_queries IS 
'ユーザーの検索クエリを記録するテーブル。
検索キーワード、ソース、結果数、クリックされた結果などを追跡。';

-- ============================================
-- 2. クイズアナリティクスビュー
-- ============================================

CREATE OR REPLACE VIEW quiz_analytics AS
SELECT
  qs.account_id,
  qs.id AS session_id,
  qs.status,
  qs.started_at,
  qs.completed_at,
  EXTRACT(EPOCH FROM (COALESCE(qs.completed_at, NOW()) - qs.started_at)) / 60 AS duration_minutes,
  COUNT(qa.id) AS answers_count,
  qr.travel_type_code,
  qr.travel_type_payload,
  jsonb_array_length(COALESCE(qr.recommendation_snapshot, '[]'::jsonb)) AS recommendations_count,
  qs.location_permission,
  qs.metadata
FROM quiz_sessions qs
LEFT JOIN quiz_answers qa ON qa.session_id = qs.id
LEFT JOIN quiz_results qr ON qr.session_id = qs.id
GROUP BY qs.id, qs.account_id, qs.status, qs.started_at, qs.completed_at, 
         qr.travel_type_code, qr.travel_type_payload, qr.recommendation_snapshot,
         qs.location_permission, qs.metadata
ORDER BY qs.started_at DESC;

COMMENT ON VIEW quiz_analytics IS 
'クイズセッションの詳細分析。
完了率、所要時間、回答数、旅行タイプ、レコメンド数を追跡。';

-- ============================================
-- 3. クイズ完了率ビュー
-- ============================================

CREATE OR REPLACE VIEW quiz_completion_rates AS
SELECT
  DATE(started_at) AS date,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_sessions,
  COUNT(*) FILTER (WHERE status = 'abandoned') AS abandoned_sessions,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_sessions,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS completion_rate,
  AVG(
    EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) / 60
  ) FILTER (WHERE status = 'completed') AS avg_completion_time_minutes
FROM quiz_sessions
WHERE started_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(started_at)
ORDER BY DATE(started_at) DESC;

COMMENT ON VIEW quiz_completion_rates IS 
'日次のクイズ完了率。
開始されたセッション数、完了率、平均完了時間を追跡。';

-- ============================================
-- 4. 旅行タイプ分布ビュー
-- ============================================

CREATE OR REPLACE VIEW travel_type_distribution AS
SELECT
  travel_type_code,
  travel_type_payload->>'travelTypeName' AS travel_type_name,
  travel_type_payload->>'travelTypeEmoji' AS travel_type_emoji,
  COUNT(*) AS result_count,
  COUNT(DISTINCT account_id) AS unique_users,
  ROUND(
    (COUNT(*)::numeric / (SELECT COUNT(*) FROM quiz_results WHERE created_at >= CURRENT_DATE - INTERVAL '90 days')) * 100,
    2
  ) AS percentage,
  MAX(created_at) AS last_result_at
FROM quiz_results
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  AND travel_type_code IS NOT NULL
GROUP BY travel_type_code, travel_type_payload->>'travelTypeName', travel_type_payload->>'travelTypeEmoji'
ORDER BY result_count DESC;

COMMENT ON VIEW travel_type_distribution IS 
'旅行タイプの分布。
各タイプの人気度、ユニークユーザー数、割合を表示。';

-- ============================================
-- 5. レコメンデーション分析ビュー
-- ============================================

CREATE OR REPLACE VIEW recommendation_analytics AS
WITH recommendation_items_flat AS (
  SELECT
    qr.account_id,
    qr.session_id,
    qr.created_at,
    qr.travel_type_code,
    item_value->>'slug' AS activity_slug,
    item_value->>'title' AS activity_title,
    (item_value->>'relevanceScore')::numeric AS relevance_score,
    item_position AS position
  FROM quiz_results qr
  CROSS JOIN LATERAL jsonb_array_elements(qr.recommendation_snapshot) WITH ORDINALITY AS items(item_value, item_position)
  WHERE qr.recommendation_snapshot IS NOT NULL
    AND jsonb_array_length(qr.recommendation_snapshot) > 0
    AND qr.created_at >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT
  activity_slug,
  activity_title,
  COUNT(*) AS times_recommended,
  COUNT(DISTINCT account_id) AS unique_users_recommended,
  ROUND(AVG(relevance_score), 2) AS avg_relevance_score,
  ROUND(AVG(position), 2) AS avg_position,
  MIN(created_at) AS first_recommended_at,
  MAX(created_at) AS last_recommended_at,
  -- 旅行タイプ別の推薦回数
  jsonb_object_agg(
    travel_type_code,
    travel_type_count
  ) FILTER (WHERE travel_type_code IS NOT NULL) AS by_travel_type
FROM (
  SELECT
    activity_slug,
    activity_title,
    account_id,
    relevance_score,
    position,
    created_at,
    travel_type_code,
    COUNT(*) AS travel_type_count
  FROM recommendation_items_flat
  GROUP BY activity_slug, activity_title, account_id, relevance_score, position, created_at, travel_type_code
) AS subq
GROUP BY activity_slug, activity_title
ORDER BY times_recommended DESC;

COMMENT ON VIEW recommendation_analytics IS 
'レコメンデーション結果の分析。
どのアクティビティが何回推薦されたか、平均スコア、旅行タイプ別の分布を追跡。';

-- ============================================
-- 6. 検索クエリ分析ビュー
-- ============================================

CREATE OR REPLACE VIEW search_analytics AS
SELECT
  search_query,
  COUNT(*) AS search_count,
  COUNT(DISTINCT account_id) AS unique_users,
  COUNT(*) FILTER (WHERE clicked_result_id IS NOT NULL) AS clicks_count,
  ROUND(
    (COUNT(*) FILTER (WHERE clicked_result_id IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS click_through_rate,
  ROUND(AVG(results_count), 2) AS avg_results_count,
  jsonb_object_agg(
    search_source,
    source_count
  ) FILTER (WHERE search_source IS NOT NULL) AS by_source,
  MAX(searched_at) AS last_searched_at
FROM (
  SELECT
    search_query,
    account_id,
    clicked_result_id,
    results_count,
    search_source,
    searched_at,
    COUNT(*) AS source_count
  FROM search_queries
  WHERE searched_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY search_query, account_id, clicked_result_id, results_count, search_source, searched_at
) AS subq
GROUP BY search_query
ORDER BY search_count DESC;

COMMENT ON VIEW search_analytics IS 
'検索クエリの分析。
人気の検索キーワード、クリック率、ソース別分布を追跡。';

-- ============================================
-- 7. 日次検索統計ビュー
-- ============================================

CREATE OR REPLACE VIEW daily_search_stats AS
SELECT
  DATE(searched_at) AS date,
  COUNT(*) AS total_searches,
  COUNT(DISTINCT account_id) AS unique_searchers,
  COUNT(DISTINCT search_query) AS unique_queries,
  ROUND(
    (COUNT(*) FILTER (WHERE clicked_result_id IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS overall_ctr,
  ROUND(AVG(results_count), 2) AS avg_results_per_search,
  -- ソース別の検索数
  COUNT(*) FILTER (WHERE search_source = 'hero') AS searches_from_hero,
  COUNT(*) FILTER (WHERE search_source = 'header') AS searches_from_header,
  COUNT(*) FILTER (WHERE search_source = 'chat') AS searches_from_chat
FROM search_queries
WHERE searched_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(searched_at)
ORDER BY DATE(searched_at) DESC;

COMMENT ON VIEW daily_search_stats IS 
'日次の検索統計。
総検索数、ユニーク検索者数、CTR、ソース別の分布を追跡。';

-- ============================================
-- 8. ユーザーコンテンツジャーニービュー
-- ============================================

CREATE OR REPLACE VIEW user_content_journey AS
WITH user_accounts AS (
  SELECT DISTINCT COALESCE(qs.account_id, sq.account_id) AS account_id
  FROM quiz_sessions qs
  FULL OUTER JOIN search_queries sq ON qs.account_id = sq.account_id
  WHERE COALESCE(qs.account_id, sq.account_id) IS NOT NULL
)
SELECT
  ua.account_id,
  -- クイズ
  COUNT(DISTINCT qs.id) AS total_quizzes,
  COUNT(DISTINCT qs.id) FILTER (WHERE qs.status = 'completed') AS completed_quizzes,
  MAX(qs.completed_at) AS last_quiz_completed_at,
  -- 検索
  COUNT(DISTINCT sq.id) AS total_searches,
  COUNT(DISTINCT sq.search_query) AS unique_search_queries,
  MAX(sq.searched_at) AS last_search_at,
  -- 旅行タイプ
  (
    SELECT jsonb_agg(DISTINCT travel_type_code)
    FROM quiz_results qr2
    WHERE qr2.account_id = ua.account_id
      AND travel_type_code IS NOT NULL
  ) AS travel_types_discovered,
  -- 推薦された体験数
  (
    SELECT SUM(jsonb_array_length(recommendation_snapshot))
    FROM quiz_results qr3
    WHERE qr3.account_id = ua.account_id
      AND recommendation_snapshot IS NOT NULL
  ) AS total_recommendations_received
FROM user_accounts ua
LEFT JOIN quiz_sessions qs ON qs.account_id = ua.account_id
LEFT JOIN search_queries sq ON sq.account_id = ua.account_id
GROUP BY ua.account_id
ORDER BY total_quizzes DESC, total_searches DESC;

COMMENT ON VIEW user_content_journey IS 
'ユーザーごとのコンテンツジャーニー。
クイズ、検索、旅行タイプ、レコメンデーションの全体像を追跡。';

-- ============================================
-- 9. トップ検索キーワードマテリアライズドビュー
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS top_search_keywords AS
SELECT
  search_query,
  COUNT(*) AS search_count,
  COUNT(DISTINCT account_id) AS unique_users,
  MAX(searched_at) AS last_searched_at
FROM search_queries
WHERE searched_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY search_query
ORDER BY search_count DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS top_search_keywords_unique_idx 
  ON top_search_keywords (search_query);

COMMENT ON MATERIALIZED VIEW top_search_keywords IS 
'トップ100の検索キーワード（マテリアライズドビュー）。
定期的にREFRESHして最新データを反映。';

-- ============================================
-- 10. リフレッシュ関数
-- ============================================

CREATE OR REPLACE FUNCTION refresh_content_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_search_keywords;
  RAISE NOTICE 'Content analytics materialized views refreshed';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_content_analytics IS 
'コンテンツアナリティクスのマテリアライズドビューをリフレッシュする関数。';

COMMIT;


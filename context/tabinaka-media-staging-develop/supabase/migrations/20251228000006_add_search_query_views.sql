BEGIN;

CREATE OR REPLACE VIEW search_query_category_stats AS
SELECT
  inferred_category,
  COUNT(*) AS search_count,
  COUNT(DISTINCT account_id) AS unique_users,
  COUNT(*) FILTER (WHERE has_results IS true) AS searches_with_results,
  ROUND(
    (COUNT(*) FILTER (WHERE has_results IS true)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS results_rate,
  ROUND(AVG(radius_meters), 2) AS avg_radius_meters,
  MAX(searched_at) AS last_searched_at
FROM search_queries
WHERE searched_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY inferred_category
ORDER BY search_count DESC;

COMMENT ON VIEW search_query_category_stats IS
'検索カテゴリ別の利用統計（直近90日）。検索回数、結果率、平均半径など。';

CREATE OR REPLACE VIEW search_query_radius_buckets AS
SELECT
  CASE
    WHEN radius_meters IS NULL THEN 'unknown'
    WHEN radius_meters <= 500 THEN '0-0.5km'
    WHEN radius_meters <= 1000 THEN '0.5-1km'
    WHEN radius_meters <= 2000 THEN '1-2km'
    WHEN radius_meters <= 5000 THEN '2-5km'
    ELSE '5km+' END AS radius_bucket,
  COUNT(*) AS search_count,
  COUNT(DISTINCT account_id) AS unique_users,
  ROUND(AVG(results_count), 2) AS avg_results_count,
  ROUND(
    (COUNT(*) FILTER (WHERE clicked_result_id IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS click_through_rate,
  MAX(searched_at) AS last_searched_at
FROM search_queries
WHERE searched_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY radius_bucket
ORDER BY search_count DESC;

COMMENT ON VIEW search_query_radius_buckets IS
'検索半径別の利用統計（直近90日）。CTRと平均結果数を集計。';

COMMIT;

# 📊 アナリティクスSQL クエリ集

## 🎯 概要

別プロジェクトのダッシュボードから Supabase に直接接続して実行する SQL クエリ集です。

すべてのクエリは**読み取り専用（SELECT）**で、データを変更しません。

---

## 📈 基本メトリクス

### 1. DAU / WAU / MAU（デイリー・ウィークリー・マンスリーアクティブユーザー）

```sql
-- 最新のDAU/WAU/MAU/Stickiness
SELECT
  date,
  dau,
  wau,
  mau,
  dau_mau_ratio AS stickiness
FROM weekly_monthly_active_users
ORDER BY date DESC
LIMIT 1;

-- 過去30日間のトレンド
SELECT
  date,
  dau,
  wau,
  mau,
  dau_mau_ratio AS stickiness
FROM weekly_monthly_active_users
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### 2. 新規ユーザー vs リピーターユーザー

```sql
-- 日次の新規/既存ユーザー数
SELECT
  date,
  dau AS total_active_users,
  new_users,
  dau - new_users AS returning_users,
  ROUND((new_users::numeric / NULLIF(dau, 0)) * 100, 2) AS new_user_rate
FROM daily_active_users
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### 3. ユーザーリテンション（定着率）

```sql
-- 最新のリテンション率
SELECT
  cohort_date,
  cohort_size,
  day_1_retention,
  day_7_retention,
  day_30_retention
FROM user_retention_cohorts
WHERE cohort_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY cohort_date DESC
LIMIT 10;

-- リテンション率の平均
SELECT
  AVG(day_1_retention) AS avg_day1_retention,
  AVG(day_7_retention) AS avg_day7_retention,
  AVG(day_30_retention) AS avg_day30_retention
FROM user_retention_cohorts
WHERE cohort_date >= CURRENT_DATE - INTERVAL '90 days';
```

### 4. エンゲージメント分布

```sql
-- ユーザーをエンゲージメントレベルで分類
SELECT
  engagement_level,
  COUNT(*) AS user_count,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER ()) * 100, 2) AS percentage
FROM user_engagement_scores
GROUP BY engagement_level
ORDER BY
  CASE engagement_level
    WHEN 'highly_active' THEN 1
    WHEN 'active' THEN 2
    WHEN 'occasional' THEN 3
    WHEN 'dormant' THEN 4
  END;
```

---

## 🎯 クイズアナリティクス

### 5. クイズ完了率（日次）

```sql
-- 過去30日間のクイズ完了率
SELECT
  date,
  total_sessions,
  completed_sessions,
  abandoned_sessions,
  completion_rate,
  avg_completion_time_minutes
FROM quiz_completion_rates
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- 平均完了率（過去30日間）
SELECT
  ROUND(AVG(completion_rate), 2) AS avg_completion_rate,
  ROUND(AVG(avg_completion_time_minutes), 2) AS avg_completion_time
FROM quiz_completion_rates
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

### 6. 旅行タイプ分布

```sql
-- 人気の旅行タイプ TOP 10
SELECT
  travel_type_code,
  travel_type_name,
  travel_type_emoji,
  result_count,
  unique_users,
  percentage,
  last_result_at
FROM travel_type_distribution
ORDER BY result_count DESC
LIMIT 10;

-- 旅行タイプ別のユーザー数
SELECT
  travel_type_code,
  travel_type_name,
  unique_users,
  ROUND((unique_users::numeric / SUM(unique_users) OVER ()) * 100, 2) AS user_percentage
FROM travel_type_distribution
ORDER BY unique_users DESC;
```

### 7. クイズセッション詳細

```sql
-- 最近完了したクイズ（TOP 50）
SELECT
  account_id,
  session_id,
  status,
  started_at,
  completed_at,
  duration_minutes,
  answers_count,
  travel_type_code,
  recommendations_count,
  location_permission
FROM quiz_analytics
WHERE status = 'completed'
  AND started_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY completed_at DESC
LIMIT 50;

-- 放棄されたクイズ（改善対象）
SELECT
  account_id,
  session_id,
  started_at,
  duration_minutes,
  answers_count
FROM quiz_analytics
WHERE status = 'abandoned'
  AND started_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY started_at DESC
LIMIT 50;
```

---

## 🔍 検索アナリティクス

### 8. 人気検索キーワード

```sql
-- TOP 20 検索キーワード
SELECT
  search_query,
  search_count,
  unique_users,
  click_through_rate,
  avg_results_count,
  last_searched_at
FROM search_analytics
WHERE search_count >= 3  -- 3回以上検索されたもの
ORDER BY search_count DESC
LIMIT 20;

-- CTRが低いキーワード（改善対象）
SELECT
  search_query,
  search_count,
  click_through_rate,
  avg_results_count
FROM search_analytics
WHERE search_count >= 5
  AND click_through_rate < 30  -- CTR 30%未満
ORDER BY search_count DESC
LIMIT 20;
```

### 9. 検索ソース別統計

```sql
-- 検索ソース別の総数（過去7日間）
SELECT
  SUM(searches_from_hero) AS hero_total,
  SUM(searches_from_header) AS header_total,
  SUM(searches_from_chat) AS chat_total,
  SUM(total_searches) AS grand_total,
  ROUND((SUM(searches_from_hero)::numeric / NULLIF(SUM(total_searches), 0)) * 100, 2) AS hero_percentage,
  ROUND((SUM(searches_from_header)::numeric / NULLIF(SUM(total_searches), 0)) * 100, 2) AS header_percentage,
  ROUND((SUM(searches_from_chat)::numeric / NULLIF(SUM(total_searches), 0)) * 100, 2) AS chat_percentage
FROM daily_search_stats
WHERE date >= CURRENT_DATE - INTERVAL '7 days';
```

### 10. 日次検索トレンド

```sql
-- 過去30日間の検索トレンド
SELECT
  date,
  total_searches,
  unique_searchers,
  unique_queries,
  overall_ctr,
  ROUND(avg_results_per_search, 2) AS avg_results
FROM daily_search_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

---

## ✨ レコメンデーションアナリティクス

### 11. 人気レコメンド結果

```sql
-- 最も推薦されているアクティビティ TOP 20
SELECT
  activity_slug,
  activity_title,
  times_recommended,
  unique_users_recommended,
  avg_relevance_score,
  avg_position,
  last_recommended_at
FROM recommendation_analytics
ORDER BY times_recommended DESC
LIMIT 20;

-- 高スコアだが推薦回数が少ない（潜在的な良コンテンツ）
SELECT
  activity_slug,
  activity_title,
  times_recommended,
  avg_relevance_score,
  unique_users_recommended
FROM recommendation_analytics
WHERE avg_relevance_score >= 0.8
  AND times_recommended < 10
ORDER BY avg_relevance_score DESC
LIMIT 20;
```

### 12. 旅行タイプ別レコメンド分布

```sql
-- レコメンドの旅行タイプ別分布
SELECT
  activity_slug,
  activity_title,
  times_recommended,
  by_travel_type
FROM recommendation_analytics
WHERE times_recommended >= 10
ORDER BY times_recommended DESC
LIMIT 20;
```

---

## 💬 チャットセッションアナリティクス

### 13. チャットセッション統計

```sql
-- 今日のセッション統計
SELECT
  COUNT(*) AS total_sessions,
  COUNT(DISTINCT account_id) AS unique_users,
  AVG(EXTRACT(EPOCH FROM (last_activity_at - started_at)) / 60) AS avg_duration_minutes
FROM chat_sessions
WHERE started_at >= CURRENT_DATE;

-- 過去7日間のセッション統計
SELECT
  DATE(started_at) AS date,
  COUNT(*) AS total_sessions,
  COUNT(DISTINCT account_id) AS unique_users,
  ROUND(AVG(EXTRACT(EPOCH FROM (last_activity_at - started_at)) / 60), 2) AS avg_duration_minutes
FROM chat_sessions
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;
```

### 14. セッション品質スコア

```sql
-- 品質カテゴリ別セッション数
SELECT
  quality_category,
  COUNT(*) AS session_count,
  ROUND(AVG(quality_score), 2) AS avg_score,
  ROUND(AVG(session_duration_minutes), 2) AS avg_duration,
  ROUND(AVG(message_count), 2) AS avg_messages
FROM session_quality_scores
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY quality_category
ORDER BY
  CASE quality_category
    WHEN 'excellent' THEN 1
    WHEN 'good' THEN 2
    WHEN 'fair' THEN 3
    WHEN 'poor' THEN 4
  END;

-- 低品質セッションの分析（改善対象）
SELECT
  session_id,
  account_id,
  quality_score,
  message_count,
  error_count,
  tool_usage_count
FROM session_quality_scores
WHERE quality_category = 'poor'
  AND started_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY started_at DESC
LIMIT 50;
```

### 15. 会話継続率

```sql
-- 継続セッションの割合
SELECT
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE is_continued_session) AS continued_sessions,
  ROUND((COUNT(*) FILTER (WHERE is_continued_session)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS continuation_rate,
  ROUND(AVG(time_since_last_session_minutes) FILTER (WHERE is_continued_session), 2) AS avg_gap_minutes
FROM conversation_continuation_analysis
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days';
```

### 16. 時間帯別利用パターン

```sql
-- 曜日別・時間帯別の平均セッション数
SELECT
  day_of_week,
  hour_of_day,
  avg_sessions,
  avg_messages,
  ROUND(avg_session_duration_minutes, 2) AS avg_duration,
  peak_indicator
FROM hourly_usage_patterns
WHERE day_of_week = EXTRACT(DOW FROM CURRENT_DATE)  -- 今日の曜日
ORDER BY hour_of_day;

-- ピーク時間帯
SELECT
  day_of_week,
  hour_of_day,
  avg_sessions
FROM hourly_usage_patterns
WHERE peak_indicator = true
ORDER BY avg_sessions DESC
LIMIT 10;
```

### 17. ユーザー会話スタイル

```sql
-- 会話スタイル別ユーザー数
SELECT
  conversation_style,
  COUNT(*) AS user_count,
  ROUND(AVG(total_sessions), 2) AS avg_sessions,
  ROUND(AVG(avg_messages_per_session), 2) AS avg_messages_per_session,
  ROUND(AVG(avg_session_duration_minutes), 2) AS avg_duration,
  ROUND(AVG(continuation_rate), 2) AS avg_continuation_rate
FROM user_conversation_styles
GROUP BY conversation_style
ORDER BY user_count DESC;

-- パワーユーザー（Deep Explorer）
SELECT
  account_id,
  total_sessions,
  total_messages,
  avg_messages_per_session,
  avg_session_duration_minutes,
  continuation_rate,
  most_used_features
FROM user_conversation_styles
WHERE conversation_style = 'deep_explorer'
ORDER BY total_sessions DESC
LIMIT 50;
```

### 18. 長時間セッション

```sql
-- 5分以上の成功セッション
SELECT
  session_id,
  account_id,
  session_duration_minutes,
  message_count,
  conversation_turns,
  topics_discussed,
  session_complexity_score
FROM long_running_sessions
WHERE is_successful_session = true
  AND started_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY session_duration_minutes DESC
LIMIT 50;

-- 平均セッション複雑度スコア
SELECT
  ROUND(AVG(session_complexity_score), 2) AS avg_complexity,
  ROUND(AVG(message_count), 2) AS avg_messages,
  ROUND(AVG(tool_usage_count), 2) AS avg_tools
FROM long_running_sessions
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days';
```

### 19. セッション間隔とリエンゲージメント

```sql
-- 間隔カテゴリ別の分布
SELECT
  gap_category,
  COUNT(*) AS session_count,
  COUNT(*) FILTER (WHERE reengagement_success) AS successful_reengagements,
  ROUND((COUNT(*) FILTER (WHERE reengagement_success)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS success_rate,
  ROUND(AVG(gap_hours), 2) AS avg_gap_hours
FROM session_gap_analysis
GROUP BY gap_category
ORDER BY
  CASE gap_category
    WHEN 'immediate' THEN 1
    WHEN 'same_day' THEN 2
    WHEN 'within_week' THEN 3
    WHEN 'long_gap' THEN 4
  END;

-- リエンゲージメント失敗セッション（改善対象）
SELECT
  account_id,
  current_session_id,
  gap_hours,
  gap_category,
  messages_in_current_session
FROM session_gap_analysis
WHERE reengagement_success = false
  AND gap_hours <= 168  -- 1週間以内
ORDER BY gap_hours DESC
LIMIT 50;
```

---

## 🎯 ユーザージャーニー分析

### 20. ユーザーコンテンツジャーニー

```sql
-- クイズ・検索・レコメンドの全体像
SELECT
  account_id,
  total_quizzes,
  completed_quizzes,
  total_searches,
  unique_search_queries,
  travel_types_discovered,
  total_recommendations_received,
  last_quiz_completed_at,
  last_search_at
FROM user_content_journey
WHERE total_quizzes > 0 OR total_searches > 0
ORDER BY
  total_quizzes DESC,
  total_searches DESC
LIMIT 100;

-- クイズしたが検索していないユーザー（エンゲージメント機会）
SELECT
  account_id,
  total_quizzes,
  completed_quizzes,
  travel_types_discovered,
  total_recommendations_received
FROM user_content_journey
WHERE total_quizzes > 0
  AND total_searches = 0
ORDER BY completed_quizzes DESC
LIMIT 50;

-- 検索したがクイズしていないユーザー
SELECT
  account_id,
  total_searches,
  unique_search_queries,
  last_search_at
FROM user_content_journey
WHERE total_searches > 0
  AND total_quizzes = 0
ORDER BY total_searches DESC
LIMIT 50;
```

---

## 🔧 アカウント別統計

### 21. アカウント別チャット利用統計

```sql
-- チャット利用が多いユーザー TOP 50
SELECT
  account_id,
  total_sessions,
  total_messages,
  avg_messages_per_session,
  total_tokens_used,
  avg_tokens_per_session,
  last_activity_at,
  sessions_with_errors
FROM chat_usage_by_account
ORDER BY total_sessions DESC
LIMIT 50;

-- エラーが多いユーザー（サポート対象）
SELECT
  account_id,
  total_sessions,
  sessions_with_errors,
  ROUND((sessions_with_errors::numeric / NULLIF(total_sessions, 0)) * 100, 2) AS error_rate
FROM chat_usage_by_account
WHERE sessions_with_errors > 0
ORDER BY error_rate DESC, sessions_with_errors DESC
LIMIT 50;
```

---

## 📊 ダッシュボード用総合クエリ

### 22. 今日のサマリー

```sql
-- 今日の主要メトリクス
SELECT
  (SELECT COUNT(DISTINCT account_id)
   FROM (
     SELECT account_id FROM user_behavior_events WHERE DATE(event_timestamp) = CURRENT_DATE
     UNION
     SELECT account_id FROM chat_sessions WHERE DATE(started_at) = CURRENT_DATE
   ) AS today_users) AS dau,

  (SELECT COUNT(*) FROM chat_sessions WHERE DATE(started_at) = CURRENT_DATE) AS total_sessions,

  (SELECT COUNT(*) FROM quiz_sessions WHERE DATE(started_at) = CURRENT_DATE) AS total_quizzes,

  (SELECT COUNT(*) FROM search_queries WHERE DATE(searched_at) = CURRENT_DATE) AS total_searches,

  (SELECT ROUND(AVG(completion_rate), 2) FROM quiz_completion_rates WHERE date = CURRENT_DATE) AS quiz_completion_rate,

  (SELECT ROUND(AVG(overall_ctr), 2) FROM daily_search_stats WHERE date = CURRENT_DATE) AS search_ctr;
```

### 23. 過去7日間のトレンド

```sql
-- 過去7日間の主要メトリクス推移
SELECT
  d.date,
  COALESCE(dau.dau, 0) AS dau,
  COALESCE(sess.session_count, 0) AS sessions,
  COALESCE(quiz.quiz_count, 0) AS quizzes,
  COALESCE(search.search_count, 0) AS searches
FROM generate_series(
  CURRENT_DATE - INTERVAL '6 days',
  CURRENT_DATE,
  '1 day'::interval
) AS d(date)
LEFT JOIN (
  SELECT date, dau FROM daily_active_users
) AS dau ON dau.date = d.date
LEFT JOIN (
  SELECT DATE(started_at) AS date, COUNT(*) AS session_count
  FROM chat_sessions
  GROUP BY DATE(started_at)
) AS sess ON sess.date = d.date
LEFT JOIN (
  SELECT DATE(started_at) AS date, COUNT(*) AS quiz_count
  FROM quiz_sessions
  GROUP BY DATE(started_at)
) AS quiz ON quiz.date = d.date
LEFT JOIN (
  SELECT DATE(searched_at) AS date, COUNT(*) AS search_count
  FROM search_queries
  GROUP BY DATE(searched_at)
) AS search ON search.date = d.date
ORDER BY d.date DESC;
```

---

## 🎨 データエクスポート用クエリ

### 24. 全ユーザーアクティビティエクスポート

```sql
-- 過去30日間の全ユーザーアクティビティ（CSV用）
SELECT
  ue.engagement_level,
  ue.account_id,
  ue.activity_days,
  ue.total_sessions AS engagement_sessions,
  COALESCE(ch.total_sessions, 0) AS chat_sessions,
  COALESCE(ch.total_messages, 0) AS chat_messages,
  COALESCE(ucj.total_quizzes, 0) AS quizzes,
  COALESCE(ucj.completed_quizzes, 0) AS completed_quizzes,
  COALESCE(ucj.total_searches, 0) AS searches,
  COALESCE(ch.last_activity_at, ucj.last_quiz_completed_at, ucj.last_search_at) AS last_activity
FROM user_engagement_scores ue
LEFT JOIN chat_usage_by_account ch ON ch.account_id = ue.account_id
LEFT JOIN user_content_journey ucj ON ucj.account_id = ue.account_id
ORDER BY ue.engagement_score DESC;
```

---

## 🔍 生データアクセス（詳細分析用）

### 25. 生イベントデータ

```sql
-- ユーザー行動イベント（最新1000件）
SELECT
  account_id,
  session_id,
  event_timestamp,
  page_url,
  actions,
  performance,
  engagement
FROM user_behavior_events
ORDER BY event_timestamp DESC
LIMIT 1000;

-- ビジネスメトリクスイベント（最新1000件）
SELECT
  account_id,
  session_id,
  event_timestamp,
  event_name,
  event_category,
  event_value,
  event_metadata
FROM business_metrics_events
ORDER BY event_timestamp DESC
LIMIT 1000;

-- チャットメッセージ詳細（最新1000件）
SELECT
  cm.id,
  cm.session_id,
  cs.account_id,
  cm.role,
  LENGTH(cm.content) AS content_length,
  cm.tool_calls,
  cm.latency_ms,
  cm.tokens_used,
  cm.created_at
FROM chat_messages cm
JOIN chat_sessions cs ON cs.id = cm.session_id
ORDER BY cm.created_at DESC
LIMIT 1000;
```

---

## 💡 パフォーマンス最適化Tips

### クエリ実行時の注意点

1. **日付範囲を指定**: 常に `WHERE date >= ...` を使って範囲を限定
2. **LIMIT を使用**: 大量データの場合は必ず LIMIT を指定
3. **インデックスを活用**: `account_id`, `event_timestamp`, `started_at` などはインデックスあり
4. **EXPLAIN で確認**: 遅いクエリは `EXPLAIN ANALYZE` で最適化

### インデックスが効くクエリの書き方

```sql
-- ✅ Good: インデックスが効く
SELECT * FROM user_behavior_events
WHERE account_id = 'xxx'
  AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY event_timestamp DESC;

-- ❌ Bad: フルスキャン
SELECT * FROM user_behavior_events
WHERE EXTRACT(YEAR FROM event_timestamp) = 2025;
```

---

**最終更新**: 2025年1月20日
**バージョン**: 2.0.0

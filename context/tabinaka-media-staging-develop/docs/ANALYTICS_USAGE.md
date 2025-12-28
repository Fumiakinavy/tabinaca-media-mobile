# アナリティクス機能の使い方

## 概要

Gappyプラットフォームには、ユーザー行動、チャット利用、ビジネスメトリクスを包括的に追跡するアナリティクス機能が実装されています。このドキュメントでは、実装された機能の使い方と、データ分析の方法を説明します。

---

## 📊 利用可能なメトリクス

### 1. ユーザーアクティビティメトリクス

#### DAU / WAU / MAU

```sql
-- 最新のDAU/WAU/MAU
SELECT * FROM weekly_monthly_active_users
ORDER BY date DESC
LIMIT 1;
```

**取得できるデータ:**

- `dau`: 日次アクティブユーザー数
- `wau`: 週次アクティブユーザー数
- `mau`: 月次アクティブユーザー数
- `dau_wau_ratio`: DAU/WAU比率（%）
- `dau_mau_ratio`: DAU/MAU比率（%）- Stickinessスコア

**Stickinessスコア（DAU/MAU）の見方:**

- **20%以上**: 非常に優秀（毎月のユーザーの20%が毎日使っている）
- **15-20%**: 良好
- **10-15%**: 平均的
- **10%未満**: 改善が必要

---

### 2. リテンション（継続率）分析

#### 日次リテンション

```sql
-- 直近30日のDay 1リテンションを確認
SELECT cohort_date, retention_rate
FROM user_retention
WHERE days_since_signup = 1
  AND cohort_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY cohort_date DESC;
```

#### 重要な日数

```sql
-- Day 1, 7, 30のリテンション
SELECT * FROM get_retention_rates();
```

**リテンション率の目安:**

- **Day 1**: 40%以上が理想
- **Day 7**: 20%以上が理想
- **Day 30**: 10%以上が理想

---

### 3. コホート分析

#### 週次コホート

```sql
-- 直近12週のコホート分析
SELECT
  cohort_week,
  weeks_since_signup,
  cohort_size,
  active_users,
  retention_rate
FROM weekly_cohort_analysis
WHERE cohort_week >= CURRENT_DATE - INTERVAL '12 weeks'
ORDER BY cohort_week DESC, weeks_since_signup;
```

**使い方:**

- 各週に登録したユーザーが、何週間後も使い続けているか確認
- コホート間の比較で、プロダクト改善の効果を測定
- 特定の週のリテンションが悪い場合、その週に何があったか調査

---

### 4. エンゲージメント分析

#### ユーザーエンゲージメントレベル

```sql
-- エンゲージメント分布
SELECT
  engagement_level,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
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

**エンゲージメントレベルの定義:**

- **Highly Active**: 直近1日以内にアクティブ
- **Active**: 直近7日以内にアクティブ
- **Occasional**: 直近30日以内にアクティブ
- **Dormant**: 30日以上非アクティブ

#### トップエンゲージユーザー

```sql
-- エンゲージメントスコアトップ100
SELECT
  account_id,
  total_days_active,
  total_sessions,
  total_messages,
  engagement_score,
  engagement_level
FROM user_engagement_scores
ORDER BY engagement_score DESC
LIMIT 100;
```

---

### 5. 機能使用統計

```sql
-- 最も使われている機能トップ10
SELECT
  feature_name,
  total_uses,
  unique_users,
  avg_uses_per_user,
  usage_trend_7d,
  usage_trend_30d
FROM feature_usage_summary
ORDER BY total_uses DESC
LIMIT 10;
```

**分析のポイント:**

- `total_uses`: 総使用回数
- `unique_users`: 使用したユニークユーザー数
- `avg_uses_per_user`: ユーザーあたり平均使用回数
- `usage_trend_7d` vs `usage_trend_30d`: 最近のトレンド

---

### 6. チャット利用統計

```sql
-- アカウント別チャット利用状況
SELECT
  account_id,
  total_sessions,
  total_messages,
  avg_messages_per_session,
  total_tokens_used,
  avg_latency_per_session,
  last_activity_at
FROM chat_usage_by_account
ORDER BY total_sessions DESC
LIMIT 100;
```

---

## 🔍 よくある分析クエリ

### 1. 「次の日も使っているか」を確認

```sql
-- Day 1リテンションのトレンド（過去30日）
SELECT
  cohort_date,
  retention_rate as day_1_retention
FROM user_retention
WHERE days_since_signup = 1
  AND cohort_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY cohort_date DESC;
```

### 2. 継続利用ユーザーの特定

```sql
-- 7日連続でアクティブなユーザー
WITH daily_activity AS (
  SELECT
    account_id,
    DATE(event_timestamp) AS activity_date
  FROM user_behavior_events
  WHERE event_timestamp >= CURRENT_DATE - INTERVAL '7 days'

  UNION

  SELECT
    account_id,
    DATE(started_at) AS activity_date
  FROM chat_sessions
  WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT
  account_id,
  COUNT(DISTINCT activity_date) AS active_days
FROM daily_activity
GROUP BY account_id
HAVING COUNT(DISTINCT activity_date) >= 7;
```

### 3. ユーザーの初回アクション分析

```sql
-- 新規ユーザーの初回アクション（過去7日）
WITH first_actions AS (
  SELECT
    account_id,
    MIN(event_timestamp) AS first_action_time
  FROM user_behavior_events
  WHERE event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY account_id
)
SELECT
  DATE(first_action_time) AS signup_date,
  COUNT(*) AS new_users
FROM first_actions
GROUP BY DATE(first_action_time)
ORDER BY signup_date DESC;
```

### 4. 離脱ユーザーの特定

```sql
-- 30日以上アクティビティがないユーザー
SELECT
  account_id,
  last_activity_date,
  CURRENT_DATE - last_activity_date AS days_inactive,
  total_days_active,
  total_sessions
FROM user_engagement_scores
WHERE engagement_level = 'dormant'
  AND total_sessions > 5  -- 一度はアクティブだったユーザー
ORDER BY days_since_last_activity DESC;
```

---

## 📈 ダッシュボードAPI使用例

### JavaScript / TypeScript

```typescript
// ダッシュボードメトリクスを取得
async function getDashboardMetrics() {
  const response = await fetch("/api/analytics/dashboard", {
    headers: {
      "x-gappy-account-id": accountId,
      "x-gappy-account-token": accountToken,
    },
  });

  const data = await response.json();

  console.log("概要:", data.overview);
  // {
  //   dau: 150,
  //   wau: 500,
  //   mau: 1200,
  //   dau_mau_ratio: 12.5,
  //   new_users_today: 15,
  //   active_sessions_today: 150
  // }

  console.log("リテンション:", data.retention);
  // { day_1: 45.2, day_7: 22.8, day_30: 12.1 }

  console.log("エンゲージメント:", data.engagement);
  // {
  //   highly_active: 50,
  //   active: 200,
  //   occasional: 400,
  //   dormant: 550
  // }
}
```

---

## 🔔 データ品質モニタリング

### アラート確認

```sql
-- 現在のデータ品質アラート
SELECT * FROM detect_data_quality_alerts();
```

### データ品質メトリクス

```sql
-- すべての品質メトリクス
SELECT
  metric_name,
  metric_value,
  threshold,
  status
FROM data_quality_metrics
ORDER BY
  CASE status
    WHEN 'warning' THEN 1
    WHEN 'healthy' THEN 2
  END;
```

---

## 🛠️ メンテナンス

### 日次メンテナンス実行

```sql
-- 古いデータのクリーンアップとビューのリフレッシュ
SELECT run_daily_maintenance();
```

**推奨スケジュール:**

- 毎日午前3時（UTC）に自動実行
- Supabase EdgeFunctions または pg_cron で設定

### マテリアライズドビューのリフレッシュ

```sql
-- チャットアナリティクスビュー
REFRESH MATERIALIZED VIEW CONCURRENTLY account_function_usage;

-- ユーザー行動サマリー
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_user_behavior_summary;
```

---

## 📊 ダッシュボード作成のヒント

### Looker Studio / Metabase 連携

1. **データソース接続**: Supabaseの接続情報を設定
2. **推奨ビュー**:
   - `daily_active_users`: DAUトレンドグラフ
   - `weekly_cohort_analysis`: コホートヒートマップ
   - `user_engagement_scores`: エンゲージメント分布
   - `feature_usage_summary`: 機能使用ランキング

### 重要なKPI

1. **成長指標**
   - DAU / WAU / MAU
   - 新規ユーザー数
   - ユーザー登録数

2. **エンゲージメント指標**
   - DAU/MAU比率（Stickiness）
   - セッション時間
   - 機能使用率

3. **リテンション指標**
   - Day 1 / 7 / 30 リテンション
   - コホートリテンション
   - チャーン率

4. **品質指標**
   - エラー率
   - レイテンシ
   - データ欠損率

---

## 🎯 次のステップ

1. **定期レポート設定**: 週次/月次でメトリクスをSlack通知
2. **アラート設定**: 異常値検知時に自動通知
3. **A/Bテスト**: 新機能のリテンション影響を測定
4. **予測分析**: チャーン予測モデルの構築

# 📊 アナリティクスダッシュボード 使用ガイド

## 概要

このガイドでは、Gappyプラットフォームに実装された包括的なアナリティクスダッシュボードの使い方を説明します。

## 🎯 主要機能

### 1. リアルタイム概要メトリクス

ダッシュボードのトップには、最も重要なKPIがリアルタイムで表示されます：

- **DAU (Daily Active Users)**: 日次アクティブユーザー数
- **WAU (Weekly Active Users)**: 週次アクティブユーザー数
- **MAU (Monthly Active Users)**: 月次アクティブユーザー数
- **Stickiness (DAU/MAU比率)**: ユーザーのエンゲージメント指標

### 2. 今日のアクティビティ

- **新規ユーザー**: 今日登録したユーザー数
- **アクティブセッション**: 現在進行中のセッション数
- **総セッション数**: 今日開始されたセッション総数
- **平均セッション時間**: セッションの平均時間（分）

### 3. リテンション分析

ユーザーがプラットフォームに戻ってくる割合を追跡：

- **Day 1 Retention**: 登録翌日に戻ってきたユーザーの割合
  - 🎯 目標: 40%以上
- **Day 7 Retention**: 登録7日後に戻ってきたユーザーの割合
  - 🎯 目標: 20%以上
- **Day 30 Retention**: 登録30日後に戻ってきたユーザーの割合
  - 🎯 目標: 10%以上

### 4. エンゲージメント分布

ユーザーを活動レベルで分類：

- 🔥 **Highly Active**: 直近1日以内にアクティブ
- ⭐ **Active**: 直近7日以内にアクティブ
- 👤 **Occasional**: 直近30日以内にアクティブ
- 😴 **Dormant**: 30日以上アクティビティなし

### 5. セッションインサイト（新機能）

AIチャットのセッション保持機能に基づく詳細分析：

#### 会話継続率

ユーザーが会話を継続する割合を追跡。高い継続率は、AIの応答品質とユーザーエクスペリエンスが優れていることを示します。

#### セッション品質スコア (0-100点)

以下の要素から算出：

- 会話ターン数（最大40点）
- セッション時間（最大20点）
- ツール使用頻度（最大20点）
- レスポンス速度（最大20点）
- エラー発生（ペナルティ）

**評価基準:**

- 80点以上: Excellent（優秀）
- 60-79点: Good（良好）
- 40-59点: Fair（普通）
- 39点以下: Poor（要改善）

#### ピーク利用時間

最も利用が多い時間帯を特定し、サーバーリソースの最適化に活用します。

### 6. ユーザー会話スタイル（新機能）

ユーザーの会話パターンを4つのタイプに分類：

- 🔍 **Deep Explorer（じっくり探索型）**: セッション時間が長く、詳細に探索するユーザー
- ⚡ **Quick Checker（素早く確認型）**: 短時間で頻繁にアクセスするユーザー
- 📝 **Detailed Inquirer（詳細質問型）**: メッセージ数が多く、詳しく質問するユーザー
- ⚖️ **Balanced User（バランス型）**: バランスの取れた利用パターン

### 7. セッション間隔分析（新機能）

ユーザーが再訪するまでの時間を分析：

- **即座に戻る（1時間以内）**: 継続的な利用を示す
- **同日中（24時間以内）**: 定期的な利用パターン
- **1週間以内**: 断続的な利用
- **長期間後（7日以上）**: リエンゲージメントが必要

#### リエンゲージメント成功率

ユーザーが戻ってきた後、3メッセージ以上会話する割合。高い成功率は、プロダクトの価値が持続していることを示します。

### 8. 人気機能トップ10

最も使用されている機能をランキング形式で表示：

- 総使用回数
- ユニークユーザー数
- 機能名

### 9. データ品質モニター

データ収集の健全性をリアルタイムで監視：

- ✅ Healthy: 正常
- ⚠️ Warning: 注意が必要

## 🔄 自動更新

ダッシュボードは**5分ごと**に自動的にデータを更新します。手動で更新する場合は、ブラウザをリフレッシュしてください。

## 📡 API エンドポイント

### ダッシュボードデータ取得

```typescript
GET / api / analytics / dashboard;
```

**必須ヘッダー:**

```
x-gappy-account-id: YOUR_ACCOUNT_ID
x-gappy-account-token: YOUR_ACCOUNT_TOKEN
```

**レスポンス例:**

```json
{
  "overview": {
    "dau": 150,
    "wau": 450,
    "mau": 1200,
    "dau_mau_ratio": 12.5,
    "new_users_today": 25,
    "active_sessions_today": 150,
    "total_sessions_today": 280,
    "avg_session_duration": 8
  },
  "retention": {
    "day_1": 45.2,
    "day_7": 22.8,
    "day_30": 12.1
  },
  "engagement": {
    "highly_active": 50,
    "active": 120,
    "occasional": 200,
    "dormant": 830
  },
  "session_insights": {
    "avg_continuation_rate": 65,
    "avg_session_quality_score": 72,
    "peak_hour": 14,
    "peak_day": 3,
    "conversation_styles": {
      "deep_explorer": 45,
      "quick_checker": 120,
      "detailed_inquirer": 80,
      "balanced_user": 55
    }
  },
  "session_gaps": {
    "immediate": 150,
    "same_day": 80,
    "within_week": 40,
    "long_gap": 30,
    "reengagement_success_rate": 68
  },
  "hourly_patterns": [...],
  "feature_usage": [...],
  "data_quality": [...]
}
```

## 📊 データベースビュー

### セッション保持用ビュー

#### 1. `conversation_continuation_analysis`

会話の継続性を分析するビュー。

```sql
SELECT * FROM conversation_continuation_analysis
WHERE account_id = 'YOUR_ACCOUNT_ID'
ORDER BY started_at DESC
LIMIT 100;
```

**取得できるデータ:**

- `is_continued_session`: 継続セッションかどうか
- `continuation_count`: アカウントの累計セッション数
- `time_since_last_session_minutes`: 前回のセッションからの経過時間

#### 2. `session_quality_scores`

セッションの品質スコアを評価するビュー。

```sql
SELECT * FROM session_quality_scores
WHERE quality_category = 'excellent'
ORDER BY quality_score DESC
LIMIT 50;
```

**品質カテゴリー:**

- `excellent`: 80点以上
- `good`: 60-79点
- `fair`: 40-59点
- `poor`: 39点以下

#### 3. `hourly_usage_patterns`

時間帯別・曜日別の利用パターン。

```sql
SELECT * FROM hourly_usage_patterns
WHERE day_of_week = 1 -- 月曜日
  AND peak_indicator = true;
```

#### 4. `user_conversation_styles`

ユーザー別の会話スタイル分析。

```sql
SELECT
  conversation_style,
  COUNT(*) as user_count
FROM user_conversation_styles
GROUP BY conversation_style
ORDER BY user_count DESC;
```

**会話スタイル:**

- `deep_explorer`: 平均セッション時間 > 10分
- `quick_checker`: セッション数 > 10 かつ 平均セッション時間 < 5分
- `detailed_inquirer`: 平均メッセージ数 > 10
- `balanced_user`: 上記以外

#### 5. `long_running_sessions`

5分以上の長時間セッションを追跡。

```sql
SELECT * FROM long_running_sessions
WHERE is_successful_session = true
ORDER BY session_complexity_score DESC
LIMIT 20;
```

#### 6. `session_gap_analysis`

セッション間のギャップとリエンゲージメント分析。

```sql
SELECT
  gap_category,
  COUNT(*) as session_count,
  AVG(CASE WHEN reengagement_success THEN 1 ELSE 0 END) * 100 as success_rate
FROM session_gap_analysis
GROUP BY gap_category
ORDER BY session_count DESC;
```

## 🎨 カスタマイズ

### ダッシュボードへのアクセス

```
https://your-domain.com/dashboard/analytics
```

### コンポーネントの再利用

ダッシュボードで使用されているチャートコンポーネントは、他のページでも再利用できます：

```tsx
import { MetricCard, LineChart, BarChart, PieChart, HeatMap } from '@/components/analytics';

// 使用例
<MetricCard
  title="カスタムメトリクス"
  value={1234}
  subtitle="説明文"
  trend={+5.2}
  icon="📈"
/>

<LineChart
  data={[
    { label: '1月', value: 100 },
    { label: '2月', value: 150 },
    { label: '3月', value: 200 }
  ]}
  title="月次トレンド"
  color="#6366f1"
/>
```

## 🔧 トラブルシューティング

### データが表示されない

1. 認証情報を確認してください（`gappy_account_id` と `gappy_account_token`）
2. ブラウザのコンソールでエラーメッセージを確認してください
3. データベースマイグレーションが完了しているか確認してください

```bash
# マイグレーションの確認
supabase db push
```

### パフォーマンスの最適化

マテリアライズドビューを定期的に更新してください：

```sql
-- すべてのアナリティクスビューを更新
SELECT refresh_all_analytics_mvs();
```

推奨スケジュール：毎日午前3時（UTC）

### セッション品質スコアが低い場合

以下を確認してください：

- AIレスポンス時間（目標: 5秒以内）
- エラー発生率（目標: 0%）
- ツールの利用可能性
- 会話の継続性

## 📚 関連ドキュメント

- [データキャプチャ仕様書](./data-capture-readme.md)
- [アナリティクス使用ガイド](./ANALYTICS_USAGE.md)
- [プライバシーポリシー](../pages/privacy-policy.tsx)

## 🚀 次のステップ

1. **カスタムアラート**: 特定のメトリクスが閾値を超えた場合の通知を設定
2. **コホート分析の拡張**: より詳細なユーザーセグメント分析
3. **A/Bテスト統合**: 機能テストの結果をダッシュボードに統合
4. **予測分析**: 機械学習を使用した将来のトレンド予測

---

**最終更新日**: 2025年1月19日

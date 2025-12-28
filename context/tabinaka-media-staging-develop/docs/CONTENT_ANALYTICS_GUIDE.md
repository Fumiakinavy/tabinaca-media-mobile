# 📊 コンテンツアナリティクス実装ガイド

## 🎯 概要

クイズ、検索、レコメンデーションのデータをダッシュボードで可視化するための実装です。

---

## 🗄️ 新規マイグレーション

### `supabase/migrations/20250120000001_add_content_analytics.sql`

**作成されるテーブル:**

1. `search_queries` - 検索クエリトラッキング（新規）

**作成されるビュー（9個）:**

1. `quiz_analytics` - クイズセッション詳細
2. `quiz_completion_rates` - 日次完了率
3. `travel_type_distribution` - 旅行タイプ分布
4. `recommendation_analytics` - レコメンド分析
5. `search_analytics` - 検索クエリ分析
6. `daily_search_stats` - 日次検索統計
7. `user_content_journey` - ユーザージャーニー
8. `top_search_keywords` - トップキーワード（マテリアライズドビュー）
9. `refresh_content_analytics()` - リフレッシュ関数

---

## 📝 実装ファイル

### 1. フロントエンド

#### `lib/searchTracker.ts`（新規）

検索クエリをトラッキングするライブラリ。

```typescript
import { searchTracker } from "@/lib/searchTracker";

// 検索実行時
searchTracker.trackSearch({
  searchQuery: "浅草 グルメ",
  searchSource: "hero",
  resultsCount: 15,
});

// 検索結果クリック時
searchTracker.trackSearchClick(
  "浅草 グルメ",
  "activity-id-123",
  3, // 3番目の結果
  "hero",
);
```

**機能:**

- ✅ `navigator.sendBeacon` で確実に送信
- ✅ オフライン時はLocalStorageに保存→リトライ
- ✅ 同意管理対応（`gappy_tracking_disabled`）

### 2. バックエンド

#### `pages/api/track/search.ts`（新規）

検索クエリを保存するAPIエンドポイント。

**エンドポイント:** `POST /api/track/search`

**リクエストボディ:**

```json
{
  "account_id": "uuid",
  "session_id": "sess_xxx",
  "search_query": "浅草 グルメ",
  "search_source": "hero",
  "search_context": { "filters": ["duration:60-90"] },
  "page_url": "https://example.com/",
  "results_count": 15,
  "clicked_result_id": "activity-id-123",
  "clicked_result_position": 3
}
```

---

## 🔌 統合方法

### HeroSection.tsx に統合

```typescript
import { searchTracker } from "@/lib/searchTracker";

const handleSearch = async () => {
  const trimmed = searchQuery.trim();

  // GA4トラッキング（既存）
  if (trimmed) {
    sendSearchQuery(trimmed, "hero");
  }

  // Supabaseトラッキング（新規）
  await searchTracker.trackSearch({
    searchQuery: trimmed,
    searchSource: "hero",
    searchContext: {
      duration: selectedDurations[0],
      filters: selectedDurations,
    },
  });

  // リダイレクト処理...
};
```

### チャットページでの結果クリック追跡

```typescript
// ユーザーがレコメンド結果をクリックしたとき
const handleResultClick = (activity: Activity, position: number) => {
  searchTracker.trackSearchClick(
    currentSearchQuery,
    activity.id,
    position,
    "chat",
  );
};
```

---

## 📊 ダッシュボードで見れるデータ

### 1. クイズ分析

**見れるデータ:**

- ✅ クイズ完了率（日次）
- ✅ 平均完了時間
- ✅ 放棄率
- ✅ 旅行タイプの分布
  - GRLP（グルメラバー）: 35%
  - ADVT（アドベンチャラー）: 25%
  - CULT（カルチャーシーカー）: 20%
  - ...
- ✅ 各タイプのユニークユーザー数

**SQLクエリ例:**

```sql
-- クイズ完了率トレンド
SELECT * FROM quiz_completion_rates
ORDER BY date DESC
LIMIT 30;

-- 人気の旅行タイプ
SELECT * FROM travel_type_distribution
ORDER BY result_count DESC;
```

### 2. 検索分析

**見れるデータ:**

- ✅ 人気検索キーワード トップ100
- ✅ 検索回数、ユニークユーザー数
- ✅ クリック率（CTR）
- ✅ 平均結果数
- ✅ ソース別分布（hero/header/chat）
- ✅ 日次検索統計

**SQLクエリ例:**

```sql
-- 人気キーワードトップ10
SELECT * FROM search_analytics
ORDER BY search_count DESC
LIMIT 10;

-- 検索トレンド
SELECT * FROM daily_search_stats
ORDER BY date DESC
LIMIT 30;

-- クリック率が低いキーワード（改善対象）
SELECT * FROM search_analytics
WHERE search_count >= 10
  AND click_through_rate < 20
ORDER BY search_count DESC;
```

### 3. レコメンデーション分析

**見れるデータ:**

- ✅ 最も推薦されているアクティビティ
- ✅ 推薦回数、ユニークユーザー数
- ✅ 平均関連スコア
- ✅ 平均表示順位
- ✅ 旅行タイプ別の推薦分布

**SQLクエリ例:**

```sql
-- 人気のレコメンド結果
SELECT * FROM recommendation_analytics
ORDER BY times_recommended DESC
LIMIT 20;

-- 高スコアだけど推薦回数が少ない（潜在的な良コンテンツ）
SELECT * FROM recommendation_analytics
WHERE avg_relevance_score >= 0.8
  AND times_recommended < 10
ORDER BY avg_relevance_score DESC;
```

### 4. ユーザージャーニー

**見れるデータ:**

- ✅ ユーザーごとのクイズ実施回数
- ✅ 検索回数、ユニーク検索クエリ数
- ✅ 発見した旅行タイプ
- ✅ 受け取ったレコメンド総数

**SQLクエリ例:**

```sql
-- アクティブなユーザー
SELECT * FROM user_content_journey
WHERE total_quizzes > 0 OR total_searches > 0
ORDER BY total_quizzes DESC, total_searches DESC
LIMIT 100;

-- クイズしたけど検索していないユーザー（エンゲージメント機会）
SELECT * FROM user_content_journey
WHERE total_quizzes > 0 AND total_searches = 0;
```

---

## 🎯 ビジネスインサイト

### ✅ 回答できる質問

#### クイズ

- ✅ 「クイズの完了率は？」→ `quiz_completion_rates`
- ✅ 「どの旅行タイプが人気か？」→ `travel_type_distribution`
- ✅ 「クイズ完了までの平均時間は？」→ `quiz_completion_rates.avg_completion_time_minutes`
- ✅ 「放棄率は？」→ `abandoned_sessions / total_sessions`

#### 検索

- ✅ 「ユーザーは何を検索しているか？」→ `search_analytics`
- ✅ 「検索結果のクリック率は？」→ `search_analytics.click_through_rate`
- ✅ 「どこから検索されているか？」→ `daily_search_stats` (hero/header/chat)
- ✅ 「検索トレンドは？」→ `daily_search_stats` (時系列)

#### レコメンデーション

- ✅ 「どのアクティビティが最も推薦されているか？」→ `recommendation_analytics`
- ✅ 「旅行タイプ別の推薦傾向は？」→ `recommendation_analytics.by_travel_type`
- ✅ 「関連スコアの高いコンテンツは？」→ `recommendation_analytics.avg_relevance_score`

#### ユーザー理解

- ✅ 「クイズから検索への導線は？」→ `user_content_journey`
- ✅ 「パワーユーザーは？」→ `user_content_journey` (top users)

---

## 🚀 実装手順

### ステップ1: マイグレーション実行

```bash
# Supabase Dashboard → SQL Editor
# 20250120000001_add_content_analytics.sql をコピー&ペースト → Run
```

### ステップ2: フロントエンド統合

```typescript
// components/HeroSection.tsx
import { searchTracker } from '@/lib/searchTracker';

// 検索実行時にトラッキング追加
await searchTracker.trackSearch({...});
```

### ステップ3: ダッシュボードAPI拡張（次のステップ）

`pages/api/analytics/dashboard.ts` に以下を追加:

- クイズメトリクス
- 検索メトリクス
- レコメンデーションメトリクス

### ステップ4: ダッシュボードUI更新（次のステップ）

`pages/dashboard/analytics.tsx` に以下を追加:

- クイズ完了率グラフ
- 旅行タイプ分布（円グラフ）
- トップ検索キーワード（表）
- 人気レコメンド結果（表）

---

## 📈 メンテナンス

### 日次

```sql
-- マテリアライズドビューを更新
SELECT refresh_content_analytics();
```

### 定期的な分析クエリ

```sql
-- 今週のトップ検索キーワード
SELECT search_query, search_count, click_through_rate
FROM search_analytics
ORDER BY search_count DESC
LIMIT 10;

-- クイズ完了率の推移（過去30日）
SELECT date, completion_rate, total_sessions
FROM quiz_completion_rates
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date;

-- 推薦精度の確認（高スコアコンテンツ）
SELECT activity_title, times_recommended, avg_relevance_score
FROM recommendation_analytics
WHERE times_recommended >= 5
ORDER BY avg_relevance_score DESC
LIMIT 20;
```

---

## 🎨 ダッシュボードUI案

### クイズセクション

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 クイズ分析

┌─────────────────────┐ ┌─────────────────────┐
│ 完了率              │ │ 平均完了時間        │
│ 68.5%               │ │ 3.2分               │
│ ↑ +5.2%             │ │ ↓ -0.3分            │
└─────────────────────┘ └─────────────────────┘

旅行タイプ分布 🥧
┌──────────────────────────────────┐
│ 🍜 グルメラバー      35% (142人) │
│ 🏔️ アドベンチャラー  25% (101人) │
│ 🎨 カルチャーシーカー 20% (81人)  │
│ 🌸 トラディショナル   20% (80人)  │
└──────────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 検索セクション

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 検索分析

トップ検索キーワード
┌─────────────────────────────────┐
│ 1. 浅草 グルメ    245回 CTR:45% │
│ 2. 渋谷 観光      198回 CTR:38% │
│ 3. 新宿 ラーメン  156回 CTR:52% │
│ 4. 東京 体験      134回 CTR:41% │
│ 5. 秋葉原 文化    98回  CTR:35% │
└─────────────────────────────────┘

検索ソース別
Hero: 65% | Header: 25% | Chat: 10%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎉 完成後にできること

### プロダクト改善

1. **クイズ最適化**: 完了率が低い質問を改善
2. **検索精度向上**: CTRが低いキーワードの結果を改善
3. **レコメンド改善**: 高スコアだが推薦回数が少ないコンテンツを発掘

### マーケティング

4. **人気キーワードでSEO**: よく検索されるキーワードでコンテンツ作成
5. **旅行タイプ別施策**: 各タイプに合わせたキャンペーン

### ユーザー理解

6. **ユーザージャーニー**: クイズ→検索→予約の流れを可視化
7. **セグメント分析**: 旅行タイプ別の行動パターン

---

**最終更新**: 2025年1月20日
**バージョン**: 1.0.0

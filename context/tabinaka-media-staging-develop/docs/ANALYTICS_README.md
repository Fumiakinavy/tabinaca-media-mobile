# 📊 アナリティクス実装 完全ガイド

## 🎯 重要なお知らせ

**ダッシュボードは別プロジェクトで実装してください！**

このプロジェクト内のダッシュボードコードは削除されました。理由：

- 同一ドメイン内でのダッシュボードは保守が困難
- パフォーマンスとセキュリティの懸念
- 専用ダッシュボードプロジェクトの方が柔軟性が高い

---

## 📚 ドキュメント一覧

### 1. データ構造ガイド

**`ANALYTICS_DATA_STRUCTURE.md`**

- すべてのテーブルとビューの詳細構造
- カラム定義、型、インデックス情報
- 25 個以上のビューの説明

### 2. SQL クエリ集

**`ANALYTICS_SQL_QUERIES.md`**

- 即座に使える 25 個以上の SQL クエリ
- DAU/MAU/Stickiness、リテンション、エンゲージメント
- クイズ、検索、レコメンデーション分析
- チャットセッション、ユーザージャーニー分析
- パフォーマンス最適化 Tips

### 3. 外部ダッシュボードセットアップ

**`EXTERNAL_DASHBOARD_SETUP.md`**

- Supabase 接続方法
- Next.js / React / Python でのセットアップ
- データ取得の具体例
- チャート実装例
- リアルタイム更新、データエクスポート

### 4. コンテンツアナリティクス実装

**`IMPLEMENTATION_CONTENT_ANALYTICS.md`**

- クイズ、検索、レコメンデーション分析の実装詳細
- ファイル一覧、データフロー
- ビジネスインサイト例

### 5. コンテンツアナリティクスガイド

**`CONTENT_ANALYTICS_GUIDE.md`**

- コンテンツアナリティクスの使い方
- 統合方法、SQL クエリ例
- メンテナンス方法

---

## 🗄️ データベースマイグレーション

### 実行順序

以下の順序でマイグレーションを実行してください：

```bash
# 1. 同意管理
supabase/migrations/20250119000001_add_consent_management.sql

# 2. トラッキングテーブル
supabase/migrations/20250119000002_add_tracking_tables.sql

# 3. チャットアナリティクスビュー
supabase/migrations/20250119000003_add_chat_analytics_views.sql

# 4. ダッシュボードアナリティクスビュー
supabase/migrations/20250119000004_add_analytics_dashboard.sql

# 5. ヘルパー関数（オプション）
supabase/migrations/20250119000005_add_helper_functions.sql

# 6. セッション保持アナリティクス
supabase/migrations/20250119000006_add_session_persistence_analytics.sql

# 7. コンテンツアナリティクス
supabase/migrations/20250120000001_add_content_analytics.sql
```

### 実行方法

```bash
# Supabase Dashboard → SQL Editor
# 各マイグレーションファイルをコピー&ペースト → Run
```

---

## 📊 取得できるデータ

### 基本メトリクス

- ✅ **DAU / WAU / MAU** - デイリー・ウィークリー・マンスリーアクティブユーザー
- ✅ **Stickiness** - DAU/MAU 比率
- ✅ **リテンション** - Day 1 / Day 7 / Day 30
- ✅ **エンゲージメント** - ユーザー分類（highly_active / active / occasional / dormant）

### クイズアナリティクス

- ✅ **完了率** - 日次の完了率トレンド
- ✅ **旅行タイプ分布** - GRLP / ADVT / CULT など
- ✅ **セッション詳細** - 所要時間、回答数、レコメンド数
- ✅ **放棄率分析** - どこで離脱しているか

### 検索アナリティクス

- ✅ **人気キーワード** - トップ 100 検索クエリ
- ✅ **CTR（クリック率）** - キーワード別クリック率
- ✅ **検索ソース** - Hero / Header / Chat 別統計
- ✅ **日次トレンド** - 検索数の推移

### レコメンデーションアナリティクス

- ✅ **人気レコメンド** - 最も推薦されているアクティビティ
- ✅ **関連スコア** - 平均関連スコア、表示位置
- ✅ **旅行タイプ別** - タイプ別の推薦傾向

### チャットセッションアナリティクス

- ✅ **セッション統計** - 総数、平均時間、メッセージ数
- ✅ **品質スコア** - 会話の質を 0-100 で評価
- ✅ **会話継続率** - ユーザーが戻ってくる割合
- ✅ **時間帯別利用** - ピーク時間帯の特定
- ✅ **会話スタイル** - Deep Explorer / Quick Checker など
- ✅ **長時間セッション** - 5 分以上の詳細会話
- ✅ **リエンゲージメント** - セッション間隔と再訪成功率

### ユーザージャーニー

- ✅ **コンテンツジャーニー** - クイズ→検索→予約の流れ
- ✅ **アカウント別統計** - ユーザーごとの行動パターン

---

## 🔑 Supabase 接続情報

別プロジェクトから接続する際に必要：

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**取得方法:**

1. Supabase Dashboard → Settings → API
2. Project URL と anon public key をコピー

---

## 🚀 クイックスタート（別プロジェクト）

### ステップ 1: プロジェクト作成

```bash
npx create-next-app@latest gappy-analytics-dashboard
cd gappy-analytics-dashboard
npm install @supabase/supabase-js recharts
```

### ステップ 2: 環境変数設定

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### ステップ 3: データ取得

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// pages/index.tsx
const { data } = await supabase
  .from("weekly_monthly_active_users")
  .select("*")
  .order("date", { ascending: false })
  .limit(30);

console.log(data); // DAU/MAU/Stickiness データ
```

### ステップ 4: チャートで可視化

```typescript
import { LineChart, Line, XAxis, YAxis } from "recharts";

<LineChart width={800} height={400} data={data}>
  <XAxis dataKey="date" />
  <YAxis />
  <Line type="monotone" dataKey="dau" stroke="#8884d8" name="DAU" />
  <Line type="monotone" dataKey="mau" stroke="#82ca9d" name="MAU" />
</LineChart>;
```

---

## 📝 主要なSQLクエリ例

### DAU / MAU

```sql
SELECT date, dau, wau, mau, dau_mau_ratio AS stickiness
FROM weekly_monthly_active_users
ORDER BY date DESC
LIMIT 30;
```

### クイズ完了率

```sql
SELECT date, completion_rate, total_sessions, avg_completion_time_minutes
FROM quiz_completion_rates
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### 人気検索キーワード

```sql
SELECT search_query, search_count, click_through_rate, unique_users
FROM search_analytics
ORDER BY search_count DESC
LIMIT 20;
```

### 旅行タイプ分布

```sql
SELECT travel_type_code, travel_type_name, travel_type_emoji,
       result_count, unique_users, percentage
FROM travel_type_distribution
ORDER BY result_count DESC;
```

---

## 🎯 ビジネスインサイト例

### 回答できる質問

#### ユーザー理解

- ❓ 「何人のユーザーが毎日使っているか？」→ DAU
- ❓ 「ユーザーは翌日戻ってくるか？」→ Day 1 Retention
- ❓ 「ユーザーの定着率は？」→ Stickiness (DAU/MAU)
- ❓ 「どのユーザーがアクティブか？」→ Engagement 分類

#### クイズ

- ❓ 「クイズの完了率は？」→ `quiz_completion_rates`
- ❓ 「どの旅行タイプが人気か？」→ `travel_type_distribution`
- ❓ 「放棄率を改善できるか？」→ 放棄セッション分析

#### 検索

- ❓ 「ユーザーは何を検索しているか？」→ `search_analytics`
- ❓ 「検索結果のクリック率は？」→ CTR 分析
- ❓ 「どこから検索されているか？」→ ソース別統計

#### チャット

- ❓ 「会話の質は良いか？」→ `session_quality_scores`
- ❓ 「ユーザーは会話を継続するか？」→ 継続率
- ❓ 「ピーク時間帯は？」→ 時間帯別利用パターン

---

## 🔧 メンテナンス

### 日次タスク

```sql
-- マテリアライズドビューを更新
SELECT refresh_content_analytics();
SELECT refresh_all_analytics_mvs();
```

### 定期的な確認

- データ品質チェック
- エラーログ確認
- パフォーマンスモニタリング

---

## 📚 詳細ドキュメント

すべての詳細は以下のドキュメントを参照：

1. **`ANALYTICS_DATA_STRUCTURE.md`** - データベース構造
2. **`ANALYTICS_SQL_QUERIES.md`** - SQL クエリ集
3. **`EXTERNAL_DASHBOARD_SETUP.md`** - ダッシュボード構築ガイド

---

## 🎉 これで完璧！

別プロジェクトで美しいダッシュボードを作成できます！

**最終更新**: 2025 年 1 月 20 日
**バージョン**: 2.0.0

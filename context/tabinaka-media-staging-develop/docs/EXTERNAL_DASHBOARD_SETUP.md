# 🚀 外部ダッシュボード セットアップガイド

## 🎯 概要

このプロジェクトとは**別のプロジェクト**でダッシュボードを構築するための完全ガイドです。

Supabase に直接接続して、リアルタイムでデータを取得・可視化できます。

---

## 📚 必要なドキュメント

1. **`ANALYTICS_DATA_STRUCTURE.md`** - すべてのテーブルとビューの構造
2. **`ANALYTICS_SQL_QUERIES.md`** - 実行可能な SQL クエリ集（25 個以上）
3. このファイル - セットアップ手順

---

## 🔑 Supabase 接続情報の取得

### ステップ 1: Supabase ダッシュボードにアクセス

```
https://supabase.com/dashboard
```

### ステップ 2: プロジェクトを選択

### ステップ 3: API 設定を取得

**Settings** → **API** で以下を取得：

- **Project URL**: `https://xxx.supabase.co`
- **anon public key**: 読み取り専用アクセス用（クライアント側）
- **service_role key**: 管理者アクセス用（サーバー側のみ）

⚠️ **重要**: `service_role` キーは**絶対にクライアント側で使用しない**でください！

---

## 🛠️ ダッシュボードプロジェクトのセットアップ

### オプション 1: Next.js + Supabase

```bash
# プロジェクト作成
npx create-next-app@latest gappy-analytics-dashboard
cd gappy-analytics-dashboard

# Supabase クライアントインストール
npm install @supabase/supabase-js

# チャートライブラリ（例: Recharts）
npm install recharts

# 環境変数設定
```

**`.env.local`:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**`lib/supabase.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**サーバーサイド（API Routes）:**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

### オプション 2: React + Vite + Supabase

```bash
# プロジェクト作成
npm create vite@latest gappy-analytics-dashboard -- --template react-ts
cd gappy-analytics-dashboard

# Supabase クライアントインストール
npm install @supabase/supabase-js

# チャートライブラリ
npm install recharts

# 環境変数設定
```

**`.env`:**

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**`src/lib/supabase.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### オプション 3: Python + Streamlit

```bash
# プロジェクト作成
mkdir gappy-analytics-dashboard
cd gappy-analytics-dashboard

# 仮想環境作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係インストール
pip install streamlit supabase plotly pandas
```

**`app.py`:**

```python
import streamlit as st
from supabase import create_client, Client
import os

# Supabase 接続
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# ダッシュボード
st.title("📊 Gappy Analytics Dashboard")

# データ取得
response = supabase.table('daily_active_users').select("*").order('date', desc=True).limit(30).execute()
data = response.data

# 表示
st.line_chart(data)
```

---

## 📊 データ取得の例

### 例 1: DAU / MAU / Stickiness

**Next.js API Route (`pages/api/metrics.ts`):**

```typescript
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { data, error } = await supabaseAdmin
    .from("weekly_monthly_active_users")
    .select("*")
    .order("date", { ascending: false })
    .limit(30);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ data });
}
```

**React Component:**

```typescript
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export default function DAUChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((json) => setData(json.data));
  }, []);

  return (
    <div>
      <h2>DAU / MAU Trend</h2>
      <LineChart width={800} height={400} data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="dau" stroke="#8884d8" name="DAU" />
        <Line type="monotone" dataKey="mau" stroke="#82ca9d" name="MAU" />
      </LineChart>
    </div>
  );
}
```

### 例 2: クイズ完了率

```typescript
const { data } = await supabaseAdmin
  .from("quiz_completion_rates")
  .select("*")
  .gte("date", "2025-01-01")
  .order("date", { ascending: false });

// data: [
//   { date: '2025-01-20', completion_rate: 68.5, total_sessions: 245, ... },
//   ...
// ]
```

### 例 3: 人気検索キーワード

```typescript
const { data } = await supabaseAdmin
  .from("search_analytics")
  .select("*")
  .order("search_count", { ascending: false })
  .limit(20);

// data: [
//   { search_query: '浅草 グルメ', search_count: 245, click_through_rate: 45, ... },
//   ...
// ]
```

### 例 4: 旅行タイプ分布

```typescript
const { data } = await supabaseAdmin
  .from("travel_type_distribution")
  .select("*")
  .order("result_count", { ascending: false });

// data: [
//   { travel_type_code: 'GRLP', travel_type_name: 'グルメラバー', travel_type_emoji: '🍜', percentage: 35, ... },
//   ...
// ]
```

### 例 5: リアルタイム DAU（今日）

```typescript
const { data } = await supabaseAdmin.rpc("get_realtime_dau");

// または直接SQL
const { data } = await supabaseAdmin
  .from("chat_sessions")
  .select("account_id", {
    count: "exact",
    head: true,
  })
  .gte("started_at", new Date().toISOString().split("T")[0]);
```

---

## 🔐 アクセス制御

### Row Level Security (RLS) の設定

Supabase ダッシュボードで RLS ポリシーを設定：

```sql
-- 例: analytics ロールのみアクセス可能
CREATE POLICY "Analytics read access"
ON user_behavior_events
FOR SELECT
TO analytics_role
USING (true);
```

### 認証付きダッシュボード

```typescript
// ダッシュボードログイン
const { data, error } = await supabase.auth.signInWithPassword({
  email: "admin@gappy.jp",
  password: "secure-password",
});

// セッション確認
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user || user.email !== "yuta@gappy.jp") {
  // アクセス拒否
  return <div>Access Denied</div>;
}
```

---

## 📈 ダッシュボード構成例

### レイアウト案

```
┌─────────────────────────────────────────────────┐
│  📊 Gappy Analytics Dashboard                   │
├─────────────────────────────────────────────────┤
│  [Today] [7 Days] [30 Days] [Custom]            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  DAU     │ │  MAU     │ │ Stickiness│       │
│  │  1,234   │ │  5,678   │ │  21.7%   │       │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │  DAU / MAU Trend (Line Chart)       │        │
│  │  [Chart showing 30 days trend]      │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  ┌──────────────────┐ ┌──────────────────┐     │
│  │ Quiz Completion  │ │ Travel Type Dist│     │
│  │ [Bar Chart]      │ │ [Pie Chart]     │     │
│  └──────────────────┘ └──────────────────┘     │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │  Top Search Keywords (Table)         │        │
│  │  1. 浅草 グルメ     245 回  CTR:45% │       │
│  │  2. 渋谷 観光       198 回  CTR:38% │       │
│  │  ...                                 │        │
│  └─────────────────────────────────────┘        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### ページ構成案

1. **Overview** - DAU/MAU/Stickiness、今日のサマリー
2. **Users** - エンゲージメント分布、リテンション、ユーザージャーニー
3. **Quiz** - 完了率、旅行タイプ分布、時系列トレンド
4. **Search** - 人気キーワード、CTR、ソース別統計
5. **Chat** - セッション統計、品質スコア、会話スタイル
6. **Recommendations** - 人気レコメンド、旅行タイプ別分布

---

## 🎨 おすすめチャートライブラリ

### JavaScript / TypeScript

- **Recharts** - React向け、シンプル
- **Chart.js** - 軽量、多機能
- **Apache ECharts** - 高機能、美しい
- **Nivo** - React向け、D3.js ベース

### Python

- **Plotly** - インタラクティブ
- **Matplotlib** - 定番
- **Seaborn** - 統計可視化

---

## 🔄 リアルタイム更新

### Supabase Realtime を使う

```typescript
// リアルタイムでチャットセッションを監視
const channel = supabase
  .channel("chat-sessions")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "chat_sessions",
    },
    (payload) => {
      console.log("New session:", payload.new);
      // ダッシュボード更新
    },
  )
  .subscribe();
```

### ポーリング（定期更新）

```typescript
// 10秒ごとに更新
useEffect(() => {
  const interval = setInterval(() => {
    fetchMetrics();
  }, 10000);

  return () => clearInterval(interval);
}, []);
```

---

## 📤 データエクスポート

### CSV エクスポート

```typescript
// すべてのユーザーアクティビティをCSVでエクスポート
const { data } = await supabaseAdmin.from("user_engagement_scores").select(`
    engagement_level,
    account_id,
    activity_days,
    total_sessions
  `);

// CSV変換
const csv = [
  ["engagement_level", "account_id", "activity_days", "total_sessions"],
  ...data.map((row) => [
    row.engagement_level,
    row.account_id,
    row.activity_days,
    row.total_sessions,
  ]),
]
  .map((row) => row.join(","))
  .join("\n");

// ダウンロード
const blob = new Blob([csv], { type: "text/csv" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "user_engagement.csv";
a.click();
```

---

## 🚨 トラブルシューティング

### エラー: "relation does not exist"

→ マイグレーションが実行されていません。以下の順に実行してください：

```
001_add_consent_management.sql
002_add_tracking_tables.sql
003_add_chat_analytics_views.sql
004_add_analytics_dashboard.sql
005_add_helper_functions.sql (オプション)
006_add_session_persistence_analytics.sql
20250120000001_add_content_analytics.sql
```

### エラー: "permission denied"

→ RLS ポリシーを確認してください。または `service_role` キーを使用してください。

### データが取得できない

→ テーブルが空の可能性があります。本番環境でトラッキングが動作しているか確認してください。

---

## 💡 パフォーマンス最適化

### 1. インデックスを活用

すべてのビューは適切なインデックスを使用しています。

### 2. LIMIT を使う

大量データの場合は必ず `LIMIT` を指定してください。

```typescript
.limit(100)
```

### 3. 日付範囲を制限

```typescript
.gte('date', '2025-01-01')
.lte('date', '2025-01-31')
```

### 4. キャッシュを使う

```typescript
// React Query を使う
import { useQuery } from "@tanstack/react-query";

const { data } = useQuery({
  queryKey: ["dau"],
  queryFn: fetchDAU,
  staleTime: 60 * 1000, // 1分間キャッシュ
});
```

---

## 🎉 完成！

これで別プロジェクトで完全なダッシュボードを構築できます！

### 次のステップ

1. プロジェクト作成
2. Supabase 接続
3. `ANALYTICS_SQL_QUERIES.md` からクエリをコピー
4. チャートで可視化
5. 美しいダッシュボード完成！ 🎨

---

**最終更新**: 2025年1月20日
**バージョン**: 2.0.0

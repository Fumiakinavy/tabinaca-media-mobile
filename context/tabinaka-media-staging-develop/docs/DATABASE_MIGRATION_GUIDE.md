# 📊 データベースマイグレーション実行ガイド

## ⚠️ 重要：ダッシュボードを使う前に必ずマイグレーションを実行してください

アナリティクスダッシュボードは、以下のデータベーステーブルとビューが必要です。
これらはマイグレーションファイルで定義されていますが、**手動で実行する必要があります**。

## 🗄️ 必要なマイグレーション

以下のマイグレーションファイルを順番に実行してください：

### 1. トラッキングテーブル

```
supabase/migrations/20250119000002_add_tracking_tables.sql
```

**作成されるテーブル:**

- `user_behavior_events` - ユーザー行動イベント
- `business_metrics_events` - ビジネスメトリクス
- `session_replay_events` - セッションリプレイ
- `daily_user_behavior_summary` - 日次サマリー（マテリアライズドビュー）

### 2. チャットアナリティクスビュー

```
supabase/migrations/20250119000003_add_chat_analytics_views.sql
```

**作成されるビュー:**

- `chat_usage_by_account`
- `daily_chat_usage`
- `function_usage_stats`
- `session_details`
- `chat_performance_metrics`

### 3. ダッシュボードビュー

```
supabase/migrations/20250119000004_add_analytics_dashboard.sql
```

**作成されるビュー:**

- `daily_active_users` - DAU
- `weekly_monthly_active_users` - WAU/MAU
- `user_retention` - リテンション
- `user_retention_cohorts` - コホート分析
- `user_engagement_scores` - エンゲージメント

### 4. セッション保持アナリティクス

```
supabase/migrations/20250119000006_add_session_persistence_analytics.sql
```

**作成されるビュー:**

- `conversation_continuation_analysis` - 会話継続率
- `session_quality_scores` - セッション品質
- `hourly_usage_patterns` - 時間帯別パターン
- `user_conversation_styles` - 会話スタイル
- `long_running_sessions` - 長時間セッション
- `session_gap_analysis` - セッション間隔

## 🚀 マイグレーション実行方法

### 方法1: Supabase CLI（推奨）

```bash
# プロジェクトディレクトリに移動
cd /Users/aip10/Desktop/Gappyタビナカメディアのコピー/tabinaka-media-copy

# Supabaseにログイン（初回のみ）
npx supabase login

# プロジェクトをリンク（初回のみ）
npx supabase link --project-ref YOUR_PROJECT_REF

# マイグレーションを実行
npx supabase db push
```

### 方法2: Supabase Dashboard

1. **Supabase Dashboard** にアクセス

   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   ```

2. **SQL Editor** を開く

3. 各マイグレーションファイルの内容をコピー＆ペースト

4. **Run** をクリックして実行

5. すべてのマイグレーションファイルを順番に実行

### 方法3: SQL ファイルを直接実行

```bash
# Supabaseプロジェクトの接続情報を使用
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f supabase/migrations/20250119000002_add_tracking_tables.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f supabase/migrations/20250119000003_add_chat_analytics_views.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f supabase/migrations/20250119000004_add_analytics_dashboard.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f supabase/migrations/20250119000006_add_session_persistence_analytics.sql
```

## ✅ 実行確認

マイグレーションが正常に実行されたか確認：

```sql
-- テーブルの存在確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_behavior_events',
    'business_metrics_events',
    'chat_sessions',
    'chat_messages'
  );

-- ビューの存在確認
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'daily_active_users',
    'weekly_monthly_active_users',
    'user_retention',
    'conversation_continuation_analysis',
    'session_quality_scores'
  );
```

**期待される結果:**

- テーブル: 4件
- ビュー: 5件以上

## 🔄 マテリアライズドビューの更新

一部のビューはマテリアライズドビュー（キャッシュされたデータ）です。
定期的に更新してください：

```sql
-- 手動更新
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_user_behavior_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY account_function_usage;

-- またはヘルパー関数を使用
SELECT refresh_all_analytics_mvs();
```

**推奨スケジュール:**

- 毎日午前3時（UTC）に自動実行
- Supabase Edge Functions または pg_cron で設定

## 🐛 トラブルシューティング

### エラー: "relation does not exist"

**原因:** テーブルまたはビューが作成されていない

**解決方法:**

1. マイグレーションファイルを順番に実行
2. 依存関係を確認（例: `chat_sessions` テーブルが存在しないと、関連ビューも作成できない）

### エラー: "permission denied"

**原因:** データベース権限が不足

**解決方法:**

1. Supabase Service Role Key を使用
2. または、Supabase Dashboard の SQL Editor から実行（管理者権限）

### エラー: ダッシュボードにデータが表示されない

**原因:**

1. マイグレーションが実行されていない
2. 実際のデータがまだない（トラッキングが動いていない）

**解決方法:**

1. マイグレーションを実行
2. アプリを使用してデータを生成
   - ページを閲覧（`user_behavior_events`）
   - チャットを使用（`chat_sessions`, `chat_messages`）
3. 数時間後にダッシュボードを確認

### ダッシュボードが「0」ばかり表示される

**正常な動作です！**

データが存在しない場合は、すべてのメトリクスが0と表示されます。
これは以下を意味します：

- ✅ マイグレーションは正常に実行された
- ✅ ダッシュボードAPIは正常に動作している
- ℹ️ まだデータが蓄積されていない

**データを生成する方法:**

1. アプリを実際に使用する
2. 複数のページを閲覧する
3. AIチャットを使用する
4. 数時間〜1日待つ

## 📊 初期データの確認

```sql
-- ユーザー行動イベントの確認
SELECT COUNT(*) FROM user_behavior_events;

-- チャットセッションの確認
SELECT COUNT(*) FROM chat_sessions;

-- DAUの確認
SELECT * FROM daily_active_users
ORDER BY date DESC
LIMIT 7;
```

## 🎯 次のステップ

マイグレーション実行後：

1. ✅ `.env.local` に `DASHBOARD_ALLOWED_EMAILS=yuta@gappy.jp` を設定
2. ✅ サーバーを再起動: `npm run dev`
3. ✅ Supabase認証でログイン
4. ✅ ダッシュボードにアクセス: `http://localhost:3000/dashboard/analytics`
5. ✅ アプリを使用してデータを生成
6. ✅ 数時間後にダッシュボードで結果を確認

---

**最終更新日**: 2025年1月20日

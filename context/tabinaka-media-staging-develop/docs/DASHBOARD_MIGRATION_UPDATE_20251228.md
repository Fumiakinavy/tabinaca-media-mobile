# Dashboard向け: マイグレーション/実装変更まとめ (2025-12-28)

このドキュメントは、今回追加したDBマイグレーションと実装変更が
ダッシュボード作成担当に伝わるよう整理したものです。

## 1. 追加マイグレーション一覧

### 20251228000001_add_search_query_context.sql
**対象テーブル:** `search_queries`
**追加カラム:**
- `location` (JSONB)
- `radius_meters` (INTEGER)
- `inferred_category` (TEXT)
- `has_results` (BOOLEAN)

**用途:** 検索クエリの位置/半径/カテゴリ/結果有無をDBに保持。

---

### 20251228000002_add_quiz_diagnosis_fields.sql
**対象テーブル:** `quiz_sessions`
**追加カラム:**
- `diagnosis_type` (TEXT)
- `persona_history` (JSONB)

**用途:** クイズ診断の種別と履歴を保持。

---

### 20251228000003_add_chat_session_status.sql
**対象テーブル:** `chat_sessions`
**追加カラム:**
- `status` (TEXT, default `active`)
- `session_end_reason` (TEXT)

**用途:** セッション状態の追跡（アクティブ/終了）

---

### 20251228000004_add_chat_message_intent_language.sql
**対象テーブル:** `chat_messages`
**追加カラム:**
- `language` (TEXT)
- `intent` (TEXT)

**用途:** メッセージ単位で言語/意図を分析。

---

### 20251228000005_add_daily_kpi_summary.sql
**追加:** `daily_kpi_summary` (Materialized View)
**主要指標:**
- DAU / 新規 / リピーター
- チャットセッション数 / メッセージ数 / 平均メッセージ数
- 検索回数 / ユニーク検索者 / CTR
- 平均セッション時間（分）

**補助:** `refresh_daily_kpi_summary()` 関数

---

### 20251228000006_add_search_query_views.sql
**追加ビュー:**
- `search_query_category_stats`
  - カテゴリ別検索回数 / 結果率 / 平均半径
- `search_query_radius_buckets`
  - 半径帯別検索回数 / CTR / 平均結果数

---

## 2. 実装変更（ダッシュボード視点）

### 検索ログの拡張
- `search_queries` へ以下を保存
  - location / radius_meters / inferred_category / has_results
- Chat tool (`search_places`) 実行時もサーバー側で自動保存
- 検索カテゴリは簡易推定（`lib/searchCategory.ts`）

### チャットログの拡張
- `chat_messages` に言語/意図を自動付与
  - 言語: 日本語/英語/混在/不明
  - 意図: regexベースの intent（`specific/inspiration/details/clarify`）

### チャットセッションの状態
- `chat_sessions.status` と `session_end_reason` を保存
- close 時には `status=closed` が入る

---

## 3. ダッシュボードで使える主な新データ

### 検索系
- `search_queries` で位置/半径/カテゴリ/結果有無が取得可能
- `search_query_category_stats` / `search_query_radius_buckets` で集計済み

### チャット系
- `chat_messages.language` / `chat_messages.intent`
- `chat_sessions.status` / `session_end_reason`

### KPI系
- `daily_kpi_summary` で日次の主要指標を集約

---

## 4. 適用順序
1. `20251228000001` → `20251228000006` の順で適用
2. `daily_kpi_summary` は materialized view なので初回 `REFRESH` が必要

---

## 5. 注意事項
- これらのマイグレーション適用後にデータが入る設計
- `search_queries` の拡張は **APIが受け取るだけでなくクライアント送信も必要**
- `chat_messages.intent` は regex推定なので精度は今後改善余地あり

---

## 6. 参照ファイル
- `supabase/migrations/20251228000001_add_search_query_context.sql`
- `supabase/migrations/20251228000002_add_quiz_diagnosis_fields.sql`
- `supabase/migrations/20251228000003_add_chat_session_status.sql`
- `supabase/migrations/20251228000004_add_chat_message_intent_language.sql`
- `supabase/migrations/20251228000005_add_daily_kpi_summary.sql`
- `supabase/migrations/20251228000006_add_search_query_views.sql`

---

## 7. Raw SQL

### 20251228000001_add_search_query_context.sql
```sql
BEGIN;

ALTER TABLE search_queries
  ADD COLUMN IF NOT EXISTS location JSONB,
  ADD COLUMN IF NOT EXISTS radius_meters INTEGER,
  ADD COLUMN IF NOT EXISTS inferred_category TEXT,
  ADD COLUMN IF NOT EXISTS has_results BOOLEAN;

CREATE INDEX IF NOT EXISTS search_queries_inferred_category_idx
  ON search_queries (inferred_category);

CREATE INDEX IF NOT EXISTS search_queries_radius_meters_idx
  ON search_queries (radius_meters);

COMMIT;
```

### 20251228000002_add_quiz_diagnosis_fields.sql
```sql
BEGIN;

ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS diagnosis_type TEXT,
  ADD COLUMN IF NOT EXISTS persona_history JSONB;

CREATE INDEX IF NOT EXISTS quiz_sessions_diagnosis_type_idx
  ON quiz_sessions (diagnosis_type);

COMMIT;
```

### 20251228000003_add_chat_session_status.sql
```sql
BEGIN;

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS session_end_reason TEXT;

CREATE INDEX IF NOT EXISTS chat_sessions_status_idx
  ON chat_sessions (status);

COMMIT;
```

### 20251228000004_add_chat_message_intent_language.sql
```sql
BEGIN;

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS intent TEXT;

CREATE INDEX IF NOT EXISTS chat_messages_language_idx
  ON chat_messages (language);

CREATE INDEX IF NOT EXISTS chat_messages_intent_idx
  ON chat_messages (intent);

COMMIT;
```

### 20251228000005_add_daily_kpi_summary.sql
```sql
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
```

### 20251228000006_add_search_query_views.sql
```sql
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
```

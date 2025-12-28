# 📊 アナリティクスデータ構造 完全ガイド

## 🎯 概要

このドキュメントは、**別プロジェクトでダッシュボードを構築**するために必要なすべての情報を提供します。

Supabase に直接接続して、以下のデータを取得できます：

---

## 🗄️ データベース構造

### 1. トラッキングテーブル（生データ）

#### `user_behavior_events`

ユーザーの詳細な行動イベント。

| カラム名            | 型          | 説明                     |
| ------------------- | ----------- | ------------------------ |
| `id`                | UUID        | イベント ID              |
| `account_id`        | UUID        | ユーザー ID              |
| `session_id`        | TEXT        | セッション ID            |
| `event_timestamp`   | TIMESTAMPTZ | イベント発生時刻         |
| `page_url`          | TEXT        | ページ URL               |
| `user_agent`        | TEXT        | ユーザーエージェント     |
| `screen_resolution` | TEXT        | 画面解像度               |
| `viewport_size`     | TEXT        | ビューポートサイズ       |
| `language`          | TEXT        | 言語                     |
| `timezone`          | TEXT        | タイムゾーン             |
| `referrer`          | TEXT        | リファラー               |
| `actions`           | JSONB       | 行動データ（クリック等） |
| `performance`       | JSONB       | パフォーマンスデータ     |
| `engagement`        | JSONB       | エンゲージメントデータ   |
| `created_at`        | TIMESTAMPTZ | 作成日時                 |

**インデックス:**

- `account_id, event_timestamp DESC`
- `session_id, event_timestamp DESC`
- `event_timestamp DESC`
- `page_url`

#### `business_metrics_events`

ビジネスメトリクスイベント。

| カラム名          | 型          | 説明             |
| ----------------- | ----------- | ---------------- |
| `id`              | UUID        | イベント ID      |
| `account_id`      | UUID        | ユーザー ID      |
| `session_id`      | TEXT        | セッション ID    |
| `event_timestamp` | TIMESTAMPTZ | イベント発生時刻 |
| `event_name`      | TEXT        | イベント名       |
| `event_category`  | TEXT        | カテゴリ         |
| `event_value`     | NUMERIC     | イベント値       |
| `event_metadata`  | JSONB       | メタデータ       |
| `page_url`        | TEXT        | ページ URL       |
| `created_at`      | TIMESTAMPTZ | 作成日時         |

**インデックス:**

- `account_id, event_timestamp DESC`
- `event_name, event_timestamp DESC`
- `event_timestamp DESC`

#### `chat_sessions`

AI チャットセッション。

| カラム名           | 型          | 説明               |
| ------------------ | ----------- | ------------------ |
| `id`               | UUID        | セッション ID      |
| `account_id`       | UUID        | ユーザー ID        |
| `started_at`       | TIMESTAMPTZ | 開始時刻           |
| `last_activity_at` | TIMESTAMPTZ | 最終アクティビティ |
| `closed_at`        | TIMESTAMPTZ | 終了時刻           |
| `metadata`         | JSONB       | メタデータ         |
| `created_at`       | TIMESTAMPTZ | 作成日時           |

**インデックス:**

- `account_id, started_at DESC`
- `started_at DESC`

#### `chat_messages`

チャットメッセージ。

| カラム名      | 型          | 説明                     |
| ------------- | ----------- | ------------------------ |
| `id`          | UUID        | メッセージ ID            |
| `session_id`  | UUID        | セッション ID            |
| `role`        | TEXT        | ロール（user/assistant） |
| `content`     | TEXT        | メッセージ内容           |
| `tool_calls`  | JSONB       | ツール呼び出し           |
| `latency_ms`  | INTEGER     | レイテンシ（ミリ秒）     |
| `tokens_used` | INTEGER     | 使用トークン数           |
| `created_at`  | TIMESTAMPTZ | 作成日時                 |

**インデックス:**

- `session_id, created_at`

#### `quiz_sessions`

クイズセッション。

| カラム名              | 型          | 説明                                          |
| --------------------- | ----------- | --------------------------------------------- |
| `id`                  | UUID        | セッション ID                                 |
| `account_id`          | UUID        | ユーザー ID                                   |
| `quiz_form_id`        | UUID        | クイズフォーム ID                             |
| `status`              | ENUM        | ステータス（in_progress/completed/abandoned） |
| `started_at`          | TIMESTAMPTZ | 開始時刻                                      |
| `completed_at`        | TIMESTAMPTZ | 完了時刻                                      |
| `location_permission` | BOOLEAN     | 位置情報許可                                  |
| `metadata`            | JSONB       | メタデータ                                    |

**インデックス:**

- `account_id, started_at DESC`

#### `quiz_answers`

クイズ回答。

| カラム名       | 型          | 説明             |
| -------------- | ----------- | ---------------- |
| `id`           | UUID        | 回答 ID          |
| `session_id`   | UUID        | セッション ID    |
| `question_ref` | TEXT        | 質問リファレンス |
| `answer_value` | JSONB       | 回答値           |
| `answered_at`  | TIMESTAMPTZ | 回答日時         |

**インデックス:**

- `session_id`

#### `quiz_results`

クイズ結果。

| カラム名                  | 型          | 説明             |
| ------------------------- | ----------- | ---------------- |
| `id`                      | UUID        | 結果 ID          |
| `session_id`              | UUID        | セッション ID    |
| `account_id`              | UUID        | ユーザー ID      |
| `result_type`             | ENUM        | 結果タイプ       |
| `travel_type_code`        | TEXT        | 旅行タイプコード |
| `travel_type_payload`     | JSONB       | 旅行タイプ情報   |
| `recommendation_snapshot` | JSONB       | レコメンド結果   |
| `created_at`              | TIMESTAMPTZ | 作成日時         |

**インデックス:**

- `account_id, created_at DESC`
- `session_id`

#### `search_queries`

検索クエリ。

| カラム名                  | 型          | 説明               |
| ------------------------- | ----------- | ------------------ |
| `id`                      | UUID        | クエリ ID          |
| `account_id`              | UUID        | ユーザー ID        |
| `session_id`              | TEXT        | セッション ID      |
| `search_query`            | TEXT        | 検索クエリ         |
| `search_source`           | TEXT        | 検索ソース         |
| `search_context`          | JSONB       | 検索コンテキスト   |
| `page_url`                | TEXT        | ページ URL         |
| `results_count`           | INTEGER     | 結果数             |
| `clicked_result_id`       | UUID        | クリックした結果ID |
| `clicked_result_position` | INTEGER     | クリック位置       |
| `searched_at`             | TIMESTAMPTZ | 検索日時           |
| `created_at`              | TIMESTAMPTZ | 作成日時           |

**インデックス:**

- `account_id, searched_at DESC`
- `search_query, searched_at DESC`
- `searched_at DESC`

---

### 2. アナリティクスビュー（集計済み）

#### `daily_active_users`

日次アクティブユーザー。

| カラム名    | 型   | 説明           |
| ----------- | ---- | -------------- |
| `date`      | DATE | 日付           |
| `dau`       | INT  | DAU            |
| `new_users` | INT  | 新規ユーザー数 |

#### `weekly_monthly_active_users`

週次・月次アクティブユーザー。

| カラム名        | 型    | 説明                 |
| --------------- | ----- | -------------------- |
| `date`          | DATE  | 日付                 |
| `dau`           | INT   | DAU                  |
| `wau`           | INT   | WAU                  |
| `mau`           | INT   | MAU                  |
| `dau_mau_ratio` | FLOAT | Stickiness (DAU/MAU) |

#### `user_retention_cohorts`

ユーザーリテンションコホート。

| カラム名           | 型    | 説明                |
| ------------------ | ----- | ------------------- |
| `cohort_date`      | DATE  | コホート日付        |
| `cohort_size`      | INT   | コホートサイズ      |
| `day_1_retention`  | FLOAT | Day 1 リテンション  |
| `day_7_retention`  | FLOAT | Day 7 リテンション  |
| `day_30_retention` | FLOAT | Day 30 リテンション |

#### `user_engagement_scores`

ユーザーエンゲージメントスコア。

| カラム名           | 型   | 説明                                              |
| ------------------ | ---- | ------------------------------------------------- |
| `account_id`       | UUID | ユーザー ID                                       |
| `engagement_score` | INT  | エンゲージメントスコア                            |
| `engagement_level` | TEXT | レベル（highly_active/active/occasional/dormant） |
| `activity_days`    | INT  | アクティブ日数                                    |
| `total_sessions`   | INT  | 総セッション数                                    |

#### `quiz_analytics`

クイズ分析。

| カラム名                | 型        | 説明             |
| ----------------------- | --------- | ---------------- |
| `account_id`            | UUID      | ユーザー ID      |
| `session_id`            | UUID      | セッション ID    |
| `status`                | ENUM      | ステータス       |
| `started_at`            | TIMESTAMP | 開始時刻         |
| `completed_at`          | TIMESTAMP | 完了時刻         |
| `duration_minutes`      | FLOAT     | 所要時間（分）   |
| `answers_count`         | INT       | 回答数           |
| `travel_type_code`      | TEXT      | 旅行タイプコード |
| `travel_type_payload`   | JSONB     | 旅行タイプ情報   |
| `recommendations_count` | INT       | レコメンド数     |
| `location_permission`   | BOOL      | 位置情報許可     |

#### `quiz_completion_rates`

クイズ完了率（日次）。

| カラム名                      | 型    | 説明               |
| ----------------------------- | ----- | ------------------ |
| `date`                        | DATE  | 日付               |
| `total_sessions`              | INT   | 総セッション数     |
| `completed_sessions`          | INT   | 完了セッション数   |
| `abandoned_sessions`          | INT   | 放棄セッション数   |
| `in_progress_sessions`        | INT   | 進行中セッション数 |
| `completion_rate`             | FLOAT | 完了率（%）        |
| `avg_completion_time_minutes` | FLOAT | 平均完了時間（分） |

#### `travel_type_distribution`

旅行タイプ分布。

| カラム名            | 型        | 説明               |
| ------------------- | --------- | ------------------ |
| `travel_type_code`  | TEXT      | 旅行タイプコード   |
| `travel_type_name`  | TEXT      | 旅行タイプ名       |
| `travel_type_emoji` | TEXT      | 絵文字             |
| `result_count`      | INT       | 結果数             |
| `unique_users`      | INT       | ユニークユーザー数 |
| `percentage`        | FLOAT     | 割合（%）          |
| `last_result_at`    | TIMESTAMP | 最終結果日時       |

#### `recommendation_analytics`

レコメンデーション分析。

| カラム名                   | 型        | 説明                   |
| -------------------------- | --------- | ---------------------- |
| `activity_slug`            | TEXT      | アクティビティスラッグ |
| `activity_title`           | TEXT      | アクティビティタイトル |
| `times_recommended`        | INT       | 推薦回数               |
| `unique_users_recommended` | INT       | ユニークユーザー数     |
| `avg_relevance_score`      | FLOAT     | 平均関連スコア         |
| `avg_position`             | FLOAT     | 平均表示位置           |
| `first_recommended_at`     | TIMESTAMP | 初回推薦日時           |
| `last_recommended_at`      | TIMESTAMP | 最終推薦日時           |
| `by_travel_type`           | JSONB     | 旅行タイプ別分布       |

#### `search_analytics`

検索分析。

| カラム名             | 型        | 説明               |
| -------------------- | --------- | ------------------ |
| `search_query`       | TEXT      | 検索クエリ         |
| `search_count`       | INT       | 検索回数           |
| `unique_users`       | INT       | ユニークユーザー数 |
| `clicks_count`       | INT       | クリック数         |
| `click_through_rate` | FLOAT     | クリック率（%）    |
| `avg_results_count`  | FLOAT     | 平均結果数         |
| `by_source`          | JSONB     | ソース別分布       |
| `last_searched_at`   | TIMESTAMP | 最終検索日時       |

#### `daily_search_stats`

日次検索統計。

| カラム名                 | 型    | 説明                |
| ------------------------ | ----- | ------------------- |
| `date`                   | DATE  | 日付                |
| `total_searches`         | INT   | 総検索数            |
| `unique_searchers`       | INT   | ユニーク検索者数    |
| `unique_queries`         | INT   | ユニーククエリ数    |
| `overall_ctr`            | FLOAT | 全体 CTR（%）       |
| `avg_results_per_search` | FLOAT | 平均結果数          |
| `searches_from_hero`     | INT   | Hero からの検索数   |
| `searches_from_header`   | INT   | Header からの検索数 |
| `searches_from_chat`     | INT   | Chat からの検索数   |

#### `user_content_journey`

ユーザーコンテンツジャーニー。

| カラム名                         | 型        | 説明                     |
| -------------------------------- | --------- | ------------------------ |
| `account_id`                     | UUID      | ユーザー ID              |
| `total_quizzes`                  | INT       | クイズ総数               |
| `completed_quizzes`              | INT       | 完了クイズ数             |
| `last_quiz_completed_at`         | TIMESTAMP | 最終クイズ完了日時       |
| `total_searches`                 | INT       | 総検索数                 |
| `unique_search_queries`          | INT       | ユニーク検索クエリ数     |
| `last_search_at`                 | TIMESTAMP | 最終検索日時             |
| `travel_types_discovered`        | JSONB     | 発見した旅行タイプ       |
| `total_recommendations_received` | INT       | 受け取ったレコメンド総数 |

#### `conversation_continuation_analysis`

会話継続率分析。

| カラム名                          | 型        | 説明                               |
| --------------------------------- | --------- | ---------------------------------- |
| `account_id`                      | UUID      | ユーザー ID                        |
| `session_id`                      | UUID      | セッション ID                      |
| `started_at`                      | TIMESTAMP | 開始時刻                           |
| `last_activity_at`                | TIMESTAMP | 最終アクティビティ時刻             |
| `closed_at`                       | TIMESTAMP | 終了時刻                           |
| `message_count`                   | INT       | メッセージ数                       |
| `conversation_turns`              | INT       | 会話ターン数                       |
| `session_duration_minutes`        | FLOAT     | セッション時間（分）               |
| `avg_response_time_seconds`       | FLOAT     | 平均レスポンス時間（秒）           |
| `is_continued_session`            | BOOL      | 継続セッションか                   |
| `continuation_count`              | INT       | 継続回数                           |
| `time_since_last_session_minutes` | FLOAT     | 前回セッションからの経過時間（分） |

#### `session_quality_scores`

セッション品質スコア。

| カラム名                   | 型        | 説明                                     |
| -------------------------- | --------- | ---------------------------------------- |
| `session_id`               | UUID      | セッション ID                            |
| `account_id`               | UUID      | ユーザー ID                              |
| `started_at`               | TIMESTAMP | 開始時刻                                 |
| `quality_score`            | INT       | 品質スコア（0-100）                      |
| `engagement_level`         | TEXT      | エンゲージメントレベル                   |
| `message_count`            | INT       | メッセージ数                             |
| `conversation_turns`       | INT       | 会話ターン数                             |
| `session_duration_minutes` | FLOAT     | セッション時間（分）                     |
| `avg_message_length`       | FLOAT     | 平均メッセージ長                         |
| `tool_usage_count`         | INT       | ツール使用数                             |
| `error_count`              | INT       | エラー数                                 |
| `quality_category`         | TEXT      | 品質カテゴリ（excellent/good/fair/poor） |

#### `hourly_usage_patterns`

時間帯別利用パターン。

| カラム名                       | 型    | 説明                     |
| ------------------------------ | ----- | ------------------------ |
| `hour_of_day`                  | INT   | 時（0-23）               |
| `day_of_week`                  | INT   | 曜日（0-6）              |
| `avg_sessions`                 | INT   | 平均セッション数         |
| `avg_messages`                 | FLOAT | 平均メッセージ数         |
| `avg_session_duration_minutes` | FLOAT | 平均セッション時間（分） |
| `peak_indicator`               | BOOL  | ピーク時間帯か           |

#### `user_conversation_styles`

ユーザー会話スタイル。

| カラム名                          | 型    | 説明                                                                        |
| --------------------------------- | ----- | --------------------------------------------------------------------------- |
| `account_id`                      | UUID  | ユーザー ID                                                                 |
| `total_sessions`                  | INT   | 総セッション数                                                              |
| `total_messages`                  | INT   | 総メッセージ数                                                              |
| `avg_messages_per_session`        | FLOAT | セッションあたり平均メッセージ数                                            |
| `avg_session_duration_minutes`    | FLOAT | 平均セッション時間（分）                                                    |
| `preferred_hour`                  | INT   | 好みの時間帯                                                                |
| `preferred_day`                   | INT   | 好みの曜日                                                                  |
| `continuation_rate`               | FLOAT | 継続率（%）                                                                 |
| `avg_time_between_sessions_hours` | FLOAT | セッション間平均時間（時間）                                                |
| `most_used_features`              | JSONB | 最もよく使う機能                                                            |
| `conversation_style`              | TEXT  | 会話スタイル（deep_explorer/quick_checker/detailed_inquirer/balanced_user） |

#### `long_running_sessions`

長時間セッション。

| カラム名                   | 型        | 説明                   |
| -------------------------- | --------- | ---------------------- |
| `session_id`               | UUID      | セッション ID          |
| `account_id`               | UUID      | ユーザー ID            |
| `started_at`               | TIMESTAMP | 開始時刻               |
| `last_activity_at`         | TIMESTAMP | 最終アクティビティ     |
| `session_duration_minutes` | FLOAT     | セッション時間（分）   |
| `message_count`            | INT       | メッセージ数           |
| `conversation_turns`       | INT       | 会話ターン数           |
| `topics_discussed`         | JSONB     | 議論されたトピック     |
| `session_complexity_score` | INT       | セッション複雑度スコア |
| `is_successful_session`    | BOOL      | 成功セッションか       |

#### `session_gap_analysis`

セッション間隔分析。

| カラム名                      | 型    | 説明                                                    |
| ----------------------------- | ----- | ------------------------------------------------------- |
| `account_id`                  | UUID  | ユーザー ID                                             |
| `current_session_id`          | UUID  | 現在のセッション ID                                     |
| `previous_session_id`         | UUID  | 前回のセッション ID                                     |
| `gap_hours`                   | FLOAT | 間隔（時間）                                            |
| `gap_category`                | TEXT  | 間隔カテゴリ（immediate/same_day/within_week/long_gap） |
| `reengagement_success`        | BOOL  | リエンゲージメント成功                                  |
| `current_session_quality`     | INT   | 現在のセッション品質                                    |
| `messages_in_current_session` | INT   | 現在のセッションのメッセージ数                          |

---

## 🔑 Supabase接続情報

別プロジェクトから接続する際に必要な情報：

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"; // または SERVICE_ROLE_KEY（管理画面用）

const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 📝 次のドキュメント

詳細なSQLクエリ集は `ANALYTICS_SQL_QUERIES.md` を参照してください。

---

**最終更新**: 2025年1月20日
**バージョン**: 2.0.0

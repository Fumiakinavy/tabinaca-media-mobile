# Gappyデータ取得 仕様書（v1）

## 1. 背景
「Gappyプラットフォームから得られるデータ」8分類（スクリーンショット）を、
実データとして継続的に取得・分析できる状態にする。

## 2. 目的
- 8分類すべての項目について、**DBに永続化**し**集計可能**にする。
- 追跡/取得コードを**本番環境で確実に送信**する。
- PII/同意/RLSの運用条件を満たす。

## 3. 非目的（Non-Goals）
- ダッシュボードUIの実装は対象外（SQL/ビュー提供まで）。
- 既存の分析ビューの完全置換はしない（段階的移行）。

## 4. 取得データの分類と定義

### ① ユーザー属性
**取得項目**
- ユーザーID(UUID)
- 表示名/ニックネーム
- メールアドレス（PII）
- 電話番号（PII）
- プロフィール画像
- アカウント作成日時
- 最終サインイン日時
- 利用タイムゾーン
- 流入元（UTM/Referrer）

**保存先（最終形）**
- `accounts` を正として統一（`profile` JSONBに集約）
- `account_utm_attributions`（first/last touch）
- `account_linkages`（Supabase user紐付け）

**追加/変更**
- `accounts.profile` に以下を統一保存
  - `display_name`, `nickname`, `avatar_url`
  - `email`, `phone_number`（保存可否は運用要件で決定）
  - `timezone`, `locale`, `last_sign_in_at`
- `accounts` に `last_seen_at` を更新する処理を追加

---

### ② セッションデータ
**取得項目**
- セッションID
- ユーザーID
- 開始/終了日時
- 最終アクティビティ時刻
- ステータス
- セッションタイプ
- メッセージ総数
- 平均応答時間(AI)

**保存先**
- `chat_sessions`, `chat_messages`
- `quiz_sessions`

**追加/変更**
- `chat_sessions` に `status`, `session_end_reason` を追加
- 集計ビューで `message_count`, `avg_latency_ms` を算出

---

### ③ メッセージデータ
**取得項目**
- メッセージID
- セッションID
- 投稿日時
- 入力テキスト
- 言語
- 意図推定

**保存先**
- `chat_messages`

**追加/変更**
- `chat_messages` に `language`, `intent` を追加
- `intent` はAPI側で推定して保存（ルール or LLM）

---

### ④ 検索・ツール利用データ
**取得項目**
- 検索クエリ
- 推定カテゴリ
- 位置情報（lat/lng）
- 検索半径
- 使用ツール種別
- ツール実行回数
- 結果返却有無

**保存先**
- `search_queries`
- `chat_messages.tool_calls` / `function_usage_stats`

**追加/変更**
- `search_queries` に以下を追加
  - `location` JSONB（lat/lng/accuracy）
  - `radius_meters` INTEGER
  - `inferred_category` TEXT
  - `has_results` BOOLEAN
- `tool_calls` に **inputパラメータ保存**を有効化

---

### ⑤ 行動データ
**取得項目**
- スポットID/コンテンツID
- いいね数
- 保存数
- シェア数
- ランキング

**保存先**
- `activity_interactions`

**追加/変更**
- `interaction_type` に `share` を利用
- 集計ビューで `like/bookmark/share` 数を算出
- ランキングは集計ビューで計算

---

### ⑥ コンテンツ/スポットデータ
**取得項目**
- コンテンツID
- タイトル
- スラッグ(URL)
- 地域
- カテゴリ
- いいね/保存/シェア数
- ユーザー反応履歴
- 閲覧/表示回数

**保存先**
- `activities`, `activity_interactions`
- `user_behavior_events`, `page_dwell_events`

**追加/変更**
- `activities` に `region` / `place_id` を整理
- `page_dwell_summary` を基に閲覧回数を算出

---

### ⑦ クイズ・診断データ
**取得項目**
- クイズID
- 回答日時
- 診断タイプ
- 回答結果
- 紐づくセッションID
- Persona決定履歴

**保存先**
- `quiz_sessions`（回答/結果の正本）

**追加/変更**
- `quiz_sessions` に `diagnosis_type`, `persona_history` を追加
- 旧 `quiz_results` は移行後にアーカイブ

---

### ⑧ 集計・KPIデータ
**取得項目**
- 総ユーザー数
- アクティブユーザー数
- リピーター率
- 休眠ユーザー数
- 平均セッション時間
- 平均メッセージ数
- 満足度スコア

**保存先**
- 既存ビュー: `daily_active_users`, `weekly_monthly_active_users`, `user_retention`

**追加/変更**
- `daily_kpi_summary` マテリアライズドビュー追加
- `business_metrics_events` から満足度スコア集計

---

## 5. データ送信/取得フロー
1. クライアント
   - `useAnalytics` で tracker 起動（production限定）
   - `UserBehaviorTracker`, `BusinessMetricsTracker`, `PageDwellTracker`
   - 検索UIから `searchTracker` を必ず呼ぶ

2. API
   - `/api/track/ingest` に user_behavior / business_metrics / page_dwell
   - `/api/track/search` に search_queries
   - `/api/chat/send-message` → `chat_logger` で tool_calls

3. DB
   - Supabase public schemaへ保存

## 6. スキーマ変更（概要）
**追加/変更テーブル**
- `accounts`：profile統一（display_name, nickname, avatar_url, email, phone, timezone, last_sign_in_at）
- `chat_sessions`：status, session_end_reason
- `chat_messages`：language, intent
- `search_queries`：location, radius_meters, inferred_category, has_results
- `quiz_sessions`：diagnosis_type, persona_history
- `daily_kpi_summary`（新規MV）

## 7. コード改修（概要）
- `lib/chat/logging.ts`：tool_callsのinput保存
- `lib/searchTracker.ts`：検索UIから必ず呼び出し
- `pages/api/track/search.ts`：追加フィールド保存
- `pages/api/track/ingest.ts`：location/metrics拡張
- `pages/api/account/profile.ts`：profile統一更新

## 8. RLS / 同意管理
- `consent_history` 連携（analytics許可時のみ記録）
- `gappy_tracking_disabled` 時は送信停止
- PII保存（email/phone）は要承認

## 9. 移行・バックフィル
- `account_profiles` → `accounts.profile`
- `quiz_results` → `quiz_sessions`
- `activity_likes` → `activity_interactions`

## 10. 受け入れ条件（Acceptance Criteria）
- 8分類すべてに対し、**DBに永続化されたレコード**が確認できる
- KPIビューで日次サマリが取得できる
- 追跡送信の欠損率が10%以下

## 11. 未決事項（TBD）
- PII（email/phone）保存の可否
- 位置情報の精度/保存粒度
- データ保持期間（ローテーション）


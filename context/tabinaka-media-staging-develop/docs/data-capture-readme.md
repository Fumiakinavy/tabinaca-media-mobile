## Data Capture Roadmap

ユーザーデータを「取得できるものはすべて」へ近づけるための実装ロードマップ。各セクションを独立タスクとして進められるよう整理しています。

### 1. Consent & Governance

- 目的: 取得対象・用途・保存期間を明記し、オプトイン/アウトを制御する
- 実装ポイント
  - Cookie/データ同意バナーと設定モーダル
  - プライバシーポリシー改訂（計測項目を列挙）
  - 同意フラグを Supabase `account_profiles.preferences` に保存
  - 同意撤回時に計測停止・データ削除バッチを走らせる

### 2. Tracking Transport Layer

- 目的: ブラウザで集めた行動ログを確実にサーバへ送信
- 実装ポイント
  - `pages/api/track/ingest.ts`（仮）を作り `userBehaviorTracker`/`businessMetricsTracker` から `navigator.sendBeacon` で送信
  - ペイロード圧縮（gzip/base64）と署名
  - 失敗時の再送キュー（indexedDB など）
  - Supabase `user_behavior_events` / `business_metrics_events` テーブル作成

### 3. Chat Session Logging

- 目的: ユーザーごとのチャット利用回数・内容を完全追跡
- 実装ポイント
  - `chat_sessions` `chat_messages` テーブルを実際に利用
  - `pages/api/chat/send-message.ts` でセッション作成/更新、リクエストとレスポンス、ツールコール、トークン数、エラーを保存
  - `conversationId` と Supabase `account_id` を紐付ける
  - アナリティクス用ビュー（利用回数、最終利用日、平均トークン量）

### 4. Frontend Behavior Trackers 2.0

- 目的: DOM ベースの詳細行動ログを完全保存
- 実装ポイント
  - `userBehaviorTracker` で計測しているクリック/入力/スクロール/マウス/キー/フォーム送信を Supabase に転送
  - 個人情報欄などセンシティブ要素のマスキング
  - セッション結合キー（`sessionId` + `account_id`）で GA4 との突合も可能に
  - 30 秒ごとのスナップショットとページ離脱時の `sendBeacon`

### 5. Business Metrics Tracker 拡張

- 目的: コンバージョンファネル、収益イベント、セッションリプレイを再現
- 実装ポイント
  - マウス座標・スクロールログを間引き調整しつつ Supabase `session_replay_events` に保存
  - `touchpoints` を正規化（ページビュー/クリック/フォーム/購入/離脱）
  - 収益イベントと `form_submissions` を関連付け、LTV 計算を自動化
  - 外部 BI（BigQuery, Looker）へ ETL

### 6. GA4 & Third-Party Analytics

- 目的: 既存 GA4 送信内容を最大化し、マルチツールで冗長化
- 実装ポイント
  - GA4 でユーザープロパティ（travel_type, quiz_score, account_status など）を送信
  - サーバサイド GTM で IP/UA ベースの補完
  - Mixpanel / Amplitude / Heap などに同イベントを送る共通ラッパーを `lib/analyticsDispatcher.ts` として実装

### 7. Content & Recommendation Telemetry

- 目的: MDX 記事やレコメンド結果の閲覧/クリック/保存率を追跡
- 実装ポイント
  - `recommendation_runs` / `recommendation_items` に提示・クリック・保存と `account_id` を保存
  - MDX コンポーネントにトラッカー HOC を噛ませ、見出し閲覧・CTA クリックを送信
  - AB テスト用に `experiment_assignments` テーブルを作成し、差分分析

### 8. Data Warehouse & Monitoring

- 目的: 取得した全ログを安全に保管し、クエリ/モニタリング可能にする
- 実装ポイント
  - Supabase → BigQuery (or Snowflake) への定期同期
  - データ品質モニタリング（欠損率、イベント量アラート）
  - PII 暗号化キー管理・アクセス監査
  - ダッシュボード（Looker Studio / Metabase）で利用状況を可視化

---

## 実装完了セクション

### ✅ 1. Consent & Governance (2025-01-19)

#### 成果物

- **コンポーネント**
  - `components/CookieConsent.tsx`: Cookie同意バナーと詳細設定モーダル
    - 必須/アナリティクス/マーケティング/パーソナライゼーションの4種類のCookie制御
    - Google Analytics Consent Modeとの統合
    - バージョン管理による再同意の促進

- **APIエンドポイント**
  - `pages/api/consent/save.ts`: 同意設定の保存と履歴記録
    - account_profiles.preferencesへの保存
    - consent_historyへの監査ログ記録
    - IPアドレスとUser-Agentの記録

- **データベーステーブル**
  - `consent_history`: 同意履歴の監査ログ（GDPR/個人情報保護法対応）
  - `data_deletion_requests`: データ削除リクエスト管理
  - `account_profiles.preferences`: 同意設定をJSONBで保存

- **プライバシーポリシー**
  - `pages/privacy-policy.tsx`: 詳細なデータ収集項目を記載
    - 収集する情報（直接提供/自動収集/第三者からの取得）
    - Cookieの種類と利用目的の明記
    - データ保存期間の明示
    - お客様の権利（アクセス/訂正/削除/利用停止）

#### マイグレーションファイル

- `supabase/migrations/20250119000001_add_consent_management.sql`

---

### ✅ 2. Tracking Transport Layer (2025-01-19)

#### 成果物

- **APIエンドポイント**
  - `pages/api/track/ingest.ts`: トラッキングイベントの受信エンドポイント
    - `navigator.sendBeacon` からのデータ受信に対応
    - レート制限機能（1分間あたり100リクエスト）
    - ペイロード署名検証（将来の拡張用）
    - 3種類のイベントタイプをサポート: user_behavior / business_metrics / session_replay

- **データベーステーブル**
  - `user_behavior_events`: ユーザー行動イベント（クリック、スクロール、入力など）
  - `business_metrics_events`: ビジネスメトリクス（コンバージョン、収益、ユーザージャーニー）
  - `session_replay_events`: セッションリプレイ用イベント（将来の拡張用）
  - `daily_user_behavior_summary`: 日次サマリーのマテリアライズドビュー

- **トラッカー更新**
  - `lib/userBehaviorTracker.ts`:
    - `navigator.sendBeacon` による確実な送信
    - フォールバック機能（fetch with keepalive）
    - オフライン時のlocalStorage保存と再送機能
    - 同意状態の確認（gappy_tracking_disabled）
  - `lib/businessMetricsTracker.ts`:
    - 同様の送信メカニズムを実装
    - マウス座標とスクロールログの記録
    - コンバージョンファネル分析

#### データ保存期間

- ユーザー行動イベント: 2年間
- ビジネスメトリクス: 2年間
- セッションリプレイ: 90日間

#### マイグレーションファイル

- `supabase/migrations/20250119000002_add_tracking_tables.sql`
  - cleanup_old_tracking_events() 関数を含む（定期クリーンアップ用）

### ✅ 3. Chat Session Logging (2025-01-19)

#### 成果物

- **チャットロガー**
  - `lib/chatLogger.ts`: チャットセッションとメッセージのロギング機能
    - セッション作成/取得
    - ユーザーメッセージ、アシスタントレスポンス、ツールコールの記録
    - レイテンシ、トークン数、エラーの記録
    - セッションメトリクスの集計

- **APIエンドポイント統合**
  - `pages/api/chat/send-message.ts`: チャットログ保存機能を統合
    - セッション自動作成
    - すべてのメッセージタイプ（user/assistant/tool）を記録
    - メトリクス自動更新（totalMessages, totalTokens, totalLatencyMs, functionsUsed, placesFound, errors）

- **アナリティクス用ビュー**
  - `chat_usage_by_account`: アカウント別の利用統計
  - `daily_chat_usage`: 日次チャット利用統計
  - `function_usage_stats`: ツール/関数の使用統計
  - `session_details`: セッション詳細統計
  - `chat_performance_metrics`: レスポンス時間のパフォーマンスメトリクス
  - `account_function_usage`: アカウント別機能利用統計（マテリアライズドビュー）

#### データ追跡項目

- セッション情報: 開始時刻、最終アクティビティ時刻、セッションタイプ
- メッセージ: ロール（user/assistant/tool）、コンテンツ、ツールコール、レイテンシ
- メトリクス: トークン数、レイテンシ、使用関数、場所検索結果数、エラー数
- パフォーマンス: 平均レイテンシ、95/99パーセンタイル

#### マイグレーションファイル

- `supabase/migrations/20250119000003_add_chat_analytics_views.sql`
  - refresh_chat_analytics() 関数を含む（マテリアライズドビューの定期更新用）

---

### ✅ 4. Frontend Behavior Trackers 2.0 (2025-01-19)

#### 成果物

- **プライバシーマスキング機能**
  - `lib/privacyMasking.ts`: 個人情報自動マスキングライブラリ
    - クレジットカード番号、メールアドレス、電話番号の自動検出とマスキング
    - パスワード、CVV、SSNなどの機密フィールドの識別
    - DOM要素からの機密情報検出
    - トラッキングデータの一括サニタイズ

- **トラッカー統合**
  - `lib/userBehaviorTracker.ts`: 個人情報マスキング機能を統合
    - input イベントで機密情報フィールドを自動検出
    - valueをマスキングまたは除外
    - 送信前にすべてのデータをサニタイズ
  - `lib/businessMetricsTracker.ts`: 同様のマスキング機能を統合

#### マスキング対象

- **自動検出パターン**
  - クレジットカード番号 → `****-****-****-1234`
  - メールアドレス → `ab***@example.com`
  - 電話番号 → `***-****-5678`
  - 郵便番号 → `***-****`
  - IPアドレス → `***.***.***.*`
  - マイナンバー → `****-****-****`
  - パスポート番号 → `XX*******`

- **機密フィールド識別**
  - password, passwd, pwd
  - card, credit, ccnumber
  - cvv, cvc, securitycode
  - ssn, social security
  - tax id, ein

#### プライバシー保護機能

- 機密情報フィールドの完全除外
- URLクエリパラメータからtoken/password/keyの除去
- 要素パスからの機密識別子マスキング
- トラッキングデータの送信前自動サニタイズ

### ✅ 8. Data Warehouse & Monitoring (2025-01-19)

#### 成果物

- **アナリティクスビュー（7種類）**
  - `daily_active_users`: DAU、新規ユーザー、既存ユーザーの日次統計
  - `weekly_monthly_active_users`: DAU、WAU、MAU とそれらの比率
  - `user_retention`: ユーザーリテンション（継続率）分析
  - `weekly_cohort_analysis`: 週次コホート分析
  - `user_engagement_scores`: ユーザーごとのエンゲージメントスコアとレベル分類
  - `feature_usage_summary`: 機能別利用統計サマリー
  - `data_quality_metrics`: データ品質モニタリングメトリクス

- **ヘルパー関数（5種類）**
  - `get_retention_rates()`: Day 1/7/30のリテンション率を取得
  - `get_account_activity_summary(account_id, days)`: アカウント別アクティビティサマリー
  - `get_metric_trend(metric_name, days)`: メトリクスのトレンドデータを取得
  - `detect_data_quality_alerts()`: データ品質アラート検出
  - `run_daily_maintenance()`: 日次メンテナンス処理

- **ダッシュボードAPI**
  - `pages/api/analytics/dashboard.ts`: ダッシュボード用データ取得エンドポイント
    - 概要メトリクス（DAU、WAU、MAU、新規ユーザー数）
    - リテンション率（Day 1/7/30）
    - エンゲージメント分布（highly_active、active、occasional、dormant）
    - 機能使用統計（トップ10）
    - データ品質メトリクス

#### 主要メトリクス

**ユーザーアクティビティ:**

- DAU (Daily Active Users): 日次アクティブユーザー数
- WAU (Weekly Active Users): 週次アクティブユーザー数
- MAU (Monthly Active Users): 月次アクティブユーザー数
- DAU/MAU比率: エンゲージメントの深さを示す指標

**リテンション:**

- Day 1 Retention: 登録翌日の継続率
- Day 7 Retention: 登録1週間後の継続率
- Day 30 Retention: 登録1ヶ月後の継続率
- 週次コホート分析: 各週の登録ユーザーの継続率推移

**エンゲージメント:**

- Highly Active: 直近1日以内にアクティブ
- Active: 直近7日以内にアクティブ
- Occasional: 直近30日以内にアクティブ
- Dormant: 30日以上非アクティブ
- エンゲージメントスコア: アクティブ日数、セッション数、メッセージ数から算出

**データ品質:**

- 24時間以内のイベント数監視
- account_id のnull率チェック
- 平均レイテンシ監視
- アラート自動検出

#### マイグレーションファイル

- `supabase/migrations/20250119000004_add_analytics_dashboard.sql`
  - 7つのアナリティクスビュー
- `supabase/migrations/20250119000005_add_helper_functions.sql`
  - 5つのヘルパー関数とメンテナンス処理

---

## 📊 使い方

### 1. マイグレーション実行

```bash
# Supabase CLIでマイグレーションを実行
supabase db push

# またはSupabase Studioから手動でSQLを実行
```

### 2. ダッシュボードデータ取得

```typescript
// APIからダッシュボードデータを取得
const response = await fetch("/api/analytics/dashboard", {
  headers: {
    "x-gappy-account-id": accountId,
    "x-gappy-account-token": accountToken,
  },
});

const metrics = await response.json();
console.log("DAU:", metrics.overview.dau);
console.log("Day 7 Retention:", metrics.retention.day_7);
```

### 3. 個別メトリクスの取得

```sql
-- 直近30日のDAUトレンド
SELECT * FROM daily_active_users
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date;

-- 特定ユーザーのエンゲージメント情報
SELECT * FROM user_engagement_scores
WHERE account_id = 'user-uuid-here';

-- リテンション分析
SELECT cohort_date, days_since_signup, retention_rate
FROM user_retention
WHERE cohort_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY cohort_date DESC, days_since_signup;
```

### 4. 定期メンテナンス

```sql
-- 毎日実行（cronジョブに設定推奨）
SELECT run_daily_maintenance();

-- 手動でマテリアライズドビューをリフレッシュ
REFRESH MATERIALIZED VIEW CONCURRENTLY account_function_usage;
```

---

## 🎯 今後の拡張案

### 未実装セクション（必要に応じて実装可能）

5. **Business Metrics Tracker 拡張**
   - 収益イベントとLTV計算の自動化
   - ファネル分析の詳細化

6. **GA4 & Third-Party Analytics**
   - Google AnalyticsへのユーザープロパティPush
   - Mixpanel / Amplitude連携

7. **Content & Recommendation Telemetry**
   - MDX記事の閲覧追跡
   - レコメンデーション結果のクリック率分析
   - A/Bテスト機能

### データウェアハウス連携

- **BigQuery連携**: Supabase → BigQueryへの定期同期
- **Looker Studio**: ビジネスダッシュボード作成
- **データパイプライン**: Airbyte / Fivetranを使用した自動ETL

---

この README をベースに、上から順に or 依存の薄いセクションから実装を進めてください。各セクションを完了したら成果物とテーブル定義、API エンドポイントをこのドキュメントに追記していきます。

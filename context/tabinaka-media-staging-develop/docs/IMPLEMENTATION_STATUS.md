# 📊 データキャプチャ＆アナリティクス実装状況

## 🎯 実装完了日

2025年1月20日

---

## ✅ 実装済み機能

### 1. データ同意管理（GDPR対応）

#### ✅ できること

- ✅ Cookie同意バナーの表示
- ✅ 詳細な同意設定（必須/アナリティクス/マーケティング/パーソナライゼーション）
- ✅ Google Analytics Consent Mode v2統合
- ✅ 同意履歴の記録（Supabase `consent_history` テーブル）
- ✅ ユーザープリファレンスの保存（`account_profiles.preferences`）
- ✅ データ削除リクエストの受付（`data_deletion_requests` テーブル）

#### ❌ できないこと（未実装）

- ❌ データ削除リクエストの自動処理
- ❌ 同意の地域別カスタマイズ（EU/非EU）
- ❌ 同意の定期的な再確認（年1回など）
- ❌ サードパーティCookie管理の詳細制御

**関連ファイル:**

- `components/CookieConsent.tsx`
- `pages/api/consent/save.ts`
- `supabase/migrations/20250119000001_add_consent_management.sql`

---

### 2. ユーザー行動トラッキング

#### ✅ できること

- ✅ ページビューの記録
- ✅ クリック/スクロール/入力/フォーカスなどのDOM操作を記録
- ✅ パフォーマンスデータの収集（LCP, FID, CLS）
- ✅ エンゲージメントデータ（滞在時間、スクロール深度）
- ✅ セッション別の行動追跡
- ✅ `navigator.sendBeacon`による確実なデータ送信
- ✅ オフライン時のローカルストレージ保存＆リトライ
- ✅ プライバシーマスキング（パスワード、クレカなど自動検出）
- ✅ 同意状態のチェック（`gappy_tracking_disabled`）

#### ❌ できないこと（未実装）

- ❌ セッションリプレイの再生UI
- ❌ ヒートマップ生成
- ❌ ファネル分析
- ❌ リアルタイムユーザー追跡マップ
- ❌ エラー境界との統合（JavaScriptエラー自動キャプチャ）

**関連ファイル:**

- `lib/userBehaviorTracker.ts`
- `lib/businessMetricsTracker.ts`
- `lib/privacyMasking.ts`
- `pages/api/track/ingest.ts`
- `supabase/migrations/20250119000002_add_tracking_tables.sql`

---

### 3. チャットセッションロギング

#### ✅ できること

- ✅ すべてのチャットセッションを記録
- ✅ ユーザーメッセージ＆AIレスポンスの保存
- ✅ ツール呼び出しの詳細記録（引数、結果、レイテンシ）
- ✅ トークン使用量の追跡
- ✅ エラーの記録
- ✅ セッションメタデータ（開始時刻、終了時刻、総メッセージ数など）
- ✅ セッション保持機能との連携

#### ❌ できないこと（未実装）

- ❌ チャット履歴のエクスポート機能
- ❌ 特定の会話の共有リンク生成
- ❌ チャット内容の全文検索
- ❌ センチメント分析（ユーザーの満足度自動判定）
- ❌ 会話の自動サマリー生成
- ❌ 問題のある会話の自動検出（不適切な内容など）

**関連ファイル:**

- `lib/chatLogger.ts`
- `pages/api/chat/send-message.ts`（統合済み）
- `supabase/migrations/20251119000006_chat_sessions_newpage.sql`
- `supabase/migrations/20250119000003_add_chat_analytics_views.sql`

---

### 4. アナリティクスダッシュボード

#### ✅ できること

##### 4.1 基本メトリクス

- ✅ **DAU** (Daily Active Users)
- ✅ **WAU** (Weekly Active Users)
- ✅ **MAU** (Monthly Active Users)
- ✅ **Stickiness** (DAU/MAU比率)
- ✅ 新規ユーザー数
- ✅ リピートユーザー数

##### 4.2 リテンション分析

- ✅ Day 1 Retention
- ✅ Day 7 Retention
- ✅ Day 30 Retention
- ✅ コホート分析（週次、月次）
- ✅ リテンションのビジュアル表示

##### 4.3 エンゲージメント分析

- ✅ ユーザーレベル分類（Highly Active / Active / Occasional / Dormant）
- ✅ エンゲージメントスコア算出
- ✅ 最終アクティビティ日からの経過日数
- ✅ アクティブ日数の追跡

##### 4.4 セッション保持分析（新機能）

- ✅ **会話継続率**: ユーザーが会話を継続する割合
- ✅ **セッション品質スコア**: 0-100点で会話の質を評価
  - 会話ターン数（最大40点）
  - セッション時間（最大20点）
  - ツール使用（最大20点）
  - レスポンス速度（最大20点）
  - エラーペナルティ
- ✅ **ユーザー会話スタイル分類**:
  - 🔍 Deep Explorer（じっくり探索型）
  - ⚡ Quick Checker（素早く確認型）
  - 📝 Detailed Inquirer（詳細質問型）
  - ⚖️ Balanced User（バランス型）
- ✅ **時間帯別利用パターン**: ピーク時間帯の特定
- ✅ **セッション間隔分析**:
  - 即座（1時間以内）
  - 同日（24時間以内）
  - 1週間以内
  - 長期間後（7日以上）
- ✅ **リエンゲージメント成功率**: ユーザーが戻った後の会話継続率
- ✅ **長時間セッション追跡**: 5分以上の詳細な会話

##### 4.5 機能使用統計

- ✅ 機能別使用回数
- ✅ ユニークユーザー数
- ✅ 人気機能トップ10

##### 4.6 データ品質モニタリング

- ✅ イベント数の監視
- ✅ Null account_id率のチェック
- ✅ レイテンシ監視
- ✅ データ品質アラート

##### 4.7 リアルタイムメトリクス

- ✅ アクティブユーザー数（直近5分）
- ✅ アクティブセッション数
- ✅ メッセージ/分
- ✅ 平均レスポンス時間
- ✅ 10秒ごとの自動更新

##### 4.8 アクセス制御

- ✅ 環境変数によるメール許可リスト
- ✅ Supabase認証との統合
- ✅ 現在: `yuta@gappy.jp` のみアクセス可能

#### ❌ できないこと（未実装）

##### ダッシュボード機能

- ❌ カスタムダッシュボードの作成
- ❌ メトリクスのアラート設定（Slack/Email通知）
- ❌ ダッシュボードのエクスポート（PDF/CSV）
- ❌ リアルタイムアラート（異常値検出）
- ❌ カスタム期間フィルタ（現在は固定期間のみ）
- ❌ セグメント別分析（国、デバイス、言語など）
- ❌ A/Bテスト結果の表示
- ❌ 予測分析（将来のトレンド予測）

##### 高度な分析

- ❌ ファネル分析（コンバージョンパス）
- ❌ パス分析（ユーザージャーニー）
- ❌ セグメント間の比較分析
- ❌ LTV（顧客生涯価値）計算
- ❌ チャーン予測（離脱予測）
- ❌ RFM分析（Recency, Frequency, Monetary）

##### データエクスポート

- ❌ CSVエクスポート
- ❌ BigQuery/Snowflake連携
- ❌ データウェアハウス統合
- ❌ 外部BIツール連携（Looker, Tableauなど）

**関連ファイル:**

- `pages/dashboard/analytics.tsx`
- `pages/api/analytics/dashboard.ts`
- `pages/api/analytics/realtime.ts`
- `components/analytics/*`
- `lib/server/dashboardAuth.ts`
- `supabase/migrations/20250119000004_add_analytics_dashboard.sql`
- `supabase/migrations/20250119000006_add_session_persistence_analytics.sql`

---

### 5. データベース構造

#### ✅ 作成済みテーブル

**トラッキング関連:**

- `user_behavior_events` - ユーザー行動イベント
- `business_metrics_events` - ビジネスメトリクス
- `session_replay_events` - セッションリプレイ（将来の再生用）

**チャット関連:**

- `chat_sessions` - チャットセッション
- `chat_messages` - チャットメッセージ

**同意管理:**

- `consent_history` - 同意履歴
- `data_deletion_requests` - データ削除リクエスト
- `account_profiles.preferences` - ユーザー設定

#### ✅ 作成済みビュー（全15個）

**基本アナリティクス:**

1. `daily_active_users` - DAU
2. `weekly_monthly_active_users` - WAU/MAU
3. `user_retention` - リテンション
4. `user_retention_cohorts` - コホート分析
5. `user_engagement_scores` - エンゲージメント

**チャットアナリティクス:** 6. `chat_usage_by_account` - アカウント別利用統計 7. `daily_chat_usage` - 日次利用統計 8. `function_usage_stats` - 機能使用統計 9. `session_details` - セッション詳細 10. `chat_performance_metrics` - パフォーマンス

**セッション保持:** 11. `conversation_continuation_analysis` - 会話継続率 12. `session_quality_scores` - セッション品質 13. `hourly_usage_patterns` - 時間帯パターン 14. `user_conversation_styles` - 会話スタイル 15. `session_gap_analysis` - セッション間隔

**その他:** 16. `feature_usage_summary` - 機能別サマリー 17. `data_quality_metrics` - データ品質

#### ✅ マテリアライズドビュー（キャッシュ）

- `daily_user_behavior_summary`
- `account_function_usage`

#### ❌ 未実装のデータ構造

- ❌ ユーザーセグメント定義テーブル
- ❌ A/Bテスト設定テーブル
- ❌ アラート設定テーブル
- ❌ カスタムダッシュボード定義
- ❌ データエクスポート履歴
- ❌ 外部連携設定

---

### 6. プライバシー＆セキュリティ

#### ✅ 実装済み

- ✅ PII（個人識別情報）自動マスキング
  - パスワードフィールド
  - クレジットカード番号
  - メールアドレス
  - 電話番号
- ✅ 機密データの自動検出（data-sensitive属性）
- ✅ トラッキングの同意管理
- ✅ ダッシュボードアクセス制御（メールホワイトリスト）
- ✅ Rate Limiting（APIリクエスト制限）
- ✅ プライバシーポリシーページ

#### ❌ 未実装

- ❌ データ暗号化（保存時）
- ❌ データ保持期間の自動適用
- ❌ GDPRデータポータビリティ（データエクスポート）
- ❌ 匿名化処理の自動化
- ❌ 監査ログ（誰がいつダッシュボードにアクセスしたか）
- ❌ IP匿名化
- ❌ 2FA（二要素認証）

---

## 📊 データの流れ

### 現在の実装

```
ユーザーアクション
    ↓
フロントエンドトラッカー
  ├─ userBehaviorTracker.ts → プライバシーマスキング
  ├─ businessMetricsTracker.ts
  └─ chatLogger.ts (AIチャット)
    ↓
navigator.sendBeacon / fetch (keepalive)
    ↓
/api/track/ingest (Rate Limiting)
    ↓
Supabase PostgreSQL
  ├─ user_behavior_events
  ├─ business_metrics_events
  ├─ chat_sessions
  └─ chat_messages
    ↓
Analytics Views（リアルタイム計算）
    ↓
/api/analytics/dashboard
    ↓
React Dashboard UI
```

---

## 🎯 ビジネスインサイト能力

### ✅ 回答できる質問

#### ユーザー理解

- ✅ 「何人のユーザーが毎日使っているか？」→ DAU
- ✅ 「ユーザーは翌日戻ってくるか？」→ Day 1 Retention
- ✅ 「ユーザーの定着率は？」→ Stickiness (DAU/MAU)
- ✅ 「どのユーザーがアクティブか？」→ Engagement分類
- ✅ 「ユーザーはどの時間帯に使うか？」→ Hourly Patterns
- ✅ 「ユーザーの会話スタイルは？」→ Conversation Styles

#### セッション分析

- ✅ 「会話の質は良いか？」→ Session Quality Score
- ✅ 「ユーザーは会話を継続するか？」→ Continuation Rate
- ✅ 「長時間使うユーザーは何をしているか？」→ Long Running Sessions
- ✅ 「ユーザーはどれくらいの頻度で戻ってくるか？」→ Session Gap Analysis
- ✅ 「戻ってきたユーザーは使い続けるか？」→ Reengagement Success Rate

#### プロダクト改善

- ✅ 「どの機能が人気か？」→ Feature Usage Stats
- ✅ 「AIのレスポンス時間は？」→ Performance Metrics
- ✅ 「エラーはどれくらい発生しているか？」→ Session Details
- ✅ 「データ品質は良好か？」→ Data Quality Metrics

### ❌ 回答できない質問（未実装）

#### 高度なビジネス分析

- ❌ 「コンバージョン率は？」→ ファネル分析が必要
- ❌ 「ユーザーの典型的なジャーニーは？」→ パス分析が必要
- ❌ 「どのユーザーが離脱しそうか？」→ チャーン予測が必要
- ❌ 「セグメントAとBでどう違うか？」→ セグメント比較が必要
- ❌ 「LTVはどれくらいか？」→ 収益データとの統合が必要
- ❌ 「A/Bテストの結果は？」→ A/Bテストフレームワークが必要

#### オペレーション

- ❌ 「異常な動きがあったら通知して」→ アラート機能が必要
- ❌ 「毎週レポートをメールで送って」→ スケジュールレポートが必要
- ❌ 「このデータをTableauで見たい」→ 外部連携が必要

---

## 🚀 すぐに使える機能

### 1. ダッシュボードにアクセス

```bash
# 環境変数設定
echo "DASHBOARD_ALLOWED_EMAILS=yuta@gappy.jp" >> .env.local

# サーバー起動
npm run dev

# ブラウザでアクセス
# 1. yuta@gappy.jp でログイン
# 2. http://localhost:3000/dashboard/analytics
```

### 2. データの生成

```bash
# アプリを使ってデータを生成
# - ページを閲覧する
# - AIチャットを使う
# - 数時間〜1日待つ
```

### 3. マテリアライズドビューの更新

```sql
-- 毎日実行推奨
SELECT refresh_chat_analytics();

-- または全体メンテナンス
SELECT run_daily_maintenance();
```

---

## 📈 今後の拡張候補

### 優先度：高

1. **アラート機能**
   - Slack/Email通知
   - 異常値の自動検出
   - データ品質アラート

2. **CSVエクスポート**
   - ダッシュボードデータのダウンロード
   - カスタム期間の指定
   - スケジュールエクスポート

3. **セグメント分析**
   - 国別
   - デバイス別
   - 言語別
   - ユーザー属性別

### 優先度：中

4. **ファネル分析**
   - コンバージョンパスの可視化
   - ドロップオフポイントの特定

5. **A/Bテストフレームワーク**
   - テスト設定UI
   - 結果の自動集計
   - 統計的有意性の判定

6. **チャーン予測**
   - 機械学習モデル
   - リスクユーザーの特定
   - リテンション施策の提案

### 優先度：低

7. **外部連携**
   - BigQuery連携
   - Looker/Tableau統合
   - Webhook通知

8. **高度なビジュアライゼーション**
   - ヒートマップ
   - ユーザージャーニーマップ
   - セッションリプレイ再生UI

---

## 💾 データ保持

### 現在の設定

```sql
-- user_behavior_events: 2年間保持
-- business_metrics_events: 2年間保持
-- session_replay_events: 90日間保持
-- chat_sessions: 無期限（要検討）
-- chat_messages: 無期限（要検討）
```

### 推奨事項

- チャットデータの保持期間を設定（例: 1年）
- 古いデータの自動アーカイブ
- GDPRに準拠した削除ポリシー

---

## 🔧 メンテナンス

### 日次

```sql
SELECT run_daily_maintenance();
```

- 古いデータ削除
- マテリアライズドビュー更新
- 統計情報更新

### 週次

- データ品質チェック
- ダッシュボードのレビュー
- アラート設定の見直し

### 月次

- リテンション分析
- 機能使用トレンドの確認
- データ保持ポリシーの見直し

---

## 📚 関連ドキュメント

1. **`docs/data-capture-readme.md`** - 全体仕様
2. **`docs/ANALYTICS_USAGE.md`** - ビューとクエリの使い方
3. **`docs/DASHBOARD_USAGE.md`** - ダッシュボード使用ガイド
4. **`docs/DASHBOARD_ACCESS_SETUP.md`** - アクセス制御設定
5. **`docs/DATABASE_MIGRATION_GUIDE.md`** - マイグレーション手順

---

## 🎉 まとめ

### 現状の強み

✅ **データ収集基盤が完成**している  
✅ **セッション保持に対応した詳細分析**が可能  
✅ **プライバシー対応**がしっかりしている  
✅ **リアルタイムダッシュボード**が動作している  
✅ **ビジネス判断に必要な基本メトリクス**が揃っている

### 現状の制約

⚠️ アラート機能がない（手動確認が必要）  
⚠️ セグメント分析ができない  
⚠️ 高度な予測分析は未実装  
⚠️ 外部ツール連携がない

### 次のステップ

1. データを蓄積する（1週間〜1ヶ月）
2. ダッシュボードで傾向を把握
3. ビジネス上の質問を明確化
4. 必要に応じて機能拡張

---

**最終更新**: 2025年1月20日  
**バージョン**: 1.0.0

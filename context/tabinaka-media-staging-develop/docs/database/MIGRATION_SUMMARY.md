# データベース再設計・移行サマリー

## 実行日
2025-01-13

## 完了したタスク

### 1. レガシーテーブルのバックアップ作成 ✅
- `backup_activity_likes`
- `backup_offline_likes`
- `backup_account_quiz_results`
- `backup_user_attributes`
- `backup_user_preferences`
- `backup_chatbot_conversations`
- `backup_chatbot_messages`
- その他関連テーブル

### 2. レガシーテーブルの削除 ✅
以下のテーブルを削除：
- `activity_likes` (新スキーマ: `activity_interactions`)
- `offline_likes` (新スキーマ: `activity_interactions`)
- `account_quiz_results` (新スキーマ: `quiz_sessions` + `quiz_results`)
- `user_attributes` (新スキーマ: `account_profiles`)
- `user_preferences` (新スキーマ: `account_profiles`)
- `chatbot_conversations` (新スキーマ: `chat_sessions`)
- `chatbot_messages` (新スキーマ: `chat_messages`)

### 3. 新スキーマの作成 ✅
以下のテーブルとENUMを作成：
- `accounts`, `account_linkages`, `account_profiles`, `account_metadata`
- `activities`, `activity_interactions`, `activity_categories`, `activity_tags`
- `quiz_forms`, `quiz_sessions`, `quiz_answers`, `quiz_results`
- `chat_sessions`, `chat_messages`, `generated_activities`, `generated_activity_saves`
- `recommendation_runs`, `recommendation_items`
- `articles`, `article_versions`, `article_translations`
- その他関連テーブル

### 4. RLSポリシーの設定 ✅
すべての新テーブルにRow Level Securityポリシーを設定：
- パブリック読み取り（必要に応じて）
- ユーザー固有データのアクセス制御
- サービスロールの権限設定

### 5. データ移行スクリプトの実行 ✅
バックアップテーブルから新スキーマへのデータ移行を完了：
- `activity_interactions` への移行
- `quiz_sessions` / `quiz_results` への移行
- `account_profiles` への移行
- `chat_sessions` / `chat_messages` への移行

### 6. APIコードの更新 ✅
以下のAPIエンドポイントを新スキーマに対応：

#### `/api/likes/[slug].ts`
- `activity_likes` への依存を完全に削除
- `activity_interactions` のみを使用
- トグル処理を `activity_interactions` ベースに統一

#### `/api/likes/user.ts`
- `activity_interactions` からいいね一覧を取得
- `interaction_type = 'like'` でフィルタリング

#### `/api/account/quiz-state.ts`
- Dual write方式を実装：
  - `account_metadata.quiz_state` への保存（後方互換性）
  - `quiz_sessions` と `quiz_results` への保存（新スキーマ）
- 新スキーマへの保存失敗は警告のみ（既存機能への影響を最小化）

## マイグレーションファイル

以下のマイグレーションファイルが適用済み：

1. `20250113000000_backup_legacy_tables.sql` - レガシーテーブルのバックアップ
2. `20250113000001_create_new_schema.sql` - 新スキーマの作成
3. `20250113000002_drop_legacy_tables.sql` - レガシーテーブルの削除
4. `20250113000003_verify_migration.sql` - 移行の検証
5. `20250113000004_setup_rls_policies.sql` - RLSポリシーの設定
6. `20250113000005_migrate_backup_data.sql` - データ移行

## 動作確認が必要な項目

### 1. いいね機能
- [ ] いいねの追加/削除が正常に動作するか
- [ ] いいね数が正しく表示されるか
- [ ] いいね一覧が正しく取得できるか

### 2. クイズ状態管理
- [ ] クイズ結果の保存が正常に動作するか
- [ ] `account_metadata.quiz_state` と `quiz_results` の両方に保存されているか
- [ ] クイズ結果の取得が正常に動作するか

### 3. データ整合性
- [ ] バックアップテーブルから新スキーマへの移行が完了しているか
- [ ] データの欠損がないか
- [ ] 外部キー制約が正しく機能しているか

## 次のステップ

1. **動作確認テスト**
   - いいね機能のE2Eテスト
   - クイズ状態保存のE2Eテスト
   - データ移行の整合性確認

2. **パフォーマンス確認**
   - 新スキーマでのクエリパフォーマンス
   - インデックスの効果確認

3. **ドキュメント更新**
   - API仕様書の更新
   - データベース設計ドキュメントの更新

## 注意事項

- `account_metadata.quiz_state` への書き込みは継続（後方互換性のため）
- 新スキーマへの保存失敗は警告のみで、既存機能への影響を最小化
- バックアップテーブルは削除せず、必要に応じて参照可能

## ロールバック手順

万が一問題が発生した場合：

1. バックアップテーブルからデータを復元
2. レガシーテーブルを再作成（必要に応じて）
3. APIコードを以前のバージョンに戻す

詳細は各マイグレーションファイルのコメントを参照。


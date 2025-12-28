# レガシーテーブル削除手順

## 概要

`database_design.md` の新スキーマに合わせて、レガシーテーブルを削除する手順です。

## 削除対象テーブル

以下のテーブルは新スキーマで置き換えられるため削除します：

| レガシーテーブル | 新スキーマでの置き換え先 |
|----------------|----------------------|
| `activity_likes` | `activity_interactions` (interaction_type='like') |
| `offline_likes` | `activity_interactions` (source_type='migration') |
| `account_quiz_results` | `quiz_sessions` / `quiz_results` / `quiz_answers` |
| `user_attributes` | `account_profiles` |
| `user_preferences` | `account_profiles.preferences` / `account_metadata.flags` |
| `chatbot_conversations` | `chat_sessions` |
| `chatbot_messages` | `chat_messages` |
| `conversation_context` | `chat_sessions.state` (JSONB) |
| `activity_completions` | `activity_interactions` (interaction_type='completed') |
| `activity_feedback` | `activity_interactions` (interaction_type='feedback') |
| `ai_suggestions` | `recommendation_runs` / `recommendation_items` |

## 保持されるテーブル

以下のテーブルは新スキーマでも使用されるため保持します：

- `account_linkages`
- `account_metadata` (ただし `quiz_state` は後で `quiz_results` に移行予定)
- `activities`
- `form_submissions`
- `reviews` (一旦保持、将来拡張予定)

## 実行手順

### Step 1: バックアップの取得

**重要**: 削除前に必ずバックアップを取得してください。

```sql
-- Supabase SQL Editor で実行
-- ファイル: scripts/backup_before_drop.sql
```

または、Supabase Dashboard から手動でバックアップ：
1. Table Editor で各テーブルを開く
2. データをエクスポート（CSV または SQL）

### Step 2: 削除スクリプトの実行

```sql
-- Supabase SQL Editor で実行
-- ファイル: scripts/drop_legacy_tables.sql
```

**注意事項**:
- トランザクション（BEGIN/COMMIT）で囲まれているため、エラーが発生した場合は自動的にロールバックされます
- 実行前に必ずバックアップを取得してください
- 本番環境で実行する場合は、メンテナンス時間を確保してください

### Step 3: 削除の確認

```sql
-- Supabase SQL Editor で実行
-- ファイル: scripts/verify_drop.sql
```

期待される結果:
- 削除対象テーブルが存在しないこと
- 保持すべきテーブルが存在すること
- バックアップテーブルが存在すること

### Step 4: 新スキーマの作成

削除完了後、`database_design.md` に基づいて新スキーマを作成します。

```sql
-- 新スキーマのマイグレーションファイルを実行
-- 例: supabase/migrations/001_create_new_schema.sql
```

## トラブルシューティング

### エラー: "cannot drop table because other objects depend on it"

外部キー制約やビューが存在する場合に発生します。

**解決方法**:
1. 依存関係を確認:
   ```sql
   SELECT 
     dependent_ns.nspname AS dependent_schema,
     dependent_view.relname AS dependent_view,
     source_ns.nspname AS source_schema,
     source_table.relname AS source_table
   FROM pg_depend
   JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
   JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
   JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid
   JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
   JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
   WHERE source_table.relname = 'テーブル名';
   ```

2. 依存オブジェクトを先に削除するか、`CASCADE` オプションを使用

### エラー: "permission denied"

権限が不足している場合に発生します。

**解決方法**:
- サービスロールキーを使用して SQL Editor で実行
- または、Supabase Dashboard の管理者権限で実行

### バックアップテーブルを削除したい場合

削除が正常に完了し、問題がないことを確認した後：

```sql
DROP TABLE IF EXISTS backup_activity_likes CASCADE;
DROP TABLE IF EXISTS backup_offline_likes CASCADE;
DROP TABLE IF EXISTS backup_account_quiz_results CASCADE;
DROP TABLE IF EXISTS backup_user_attributes CASCADE;
DROP TABLE IF EXISTS backup_user_preferences CASCADE;
DROP TABLE IF EXISTS backup_chatbot_conversations CASCADE;
DROP TABLE IF EXISTS backup_chatbot_messages CASCADE;
DROP TABLE IF EXISTS backup_conversation_context CASCADE;
DROP TABLE IF EXISTS backup_activity_completions CASCADE;
DROP TABLE IF EXISTS backup_activity_feedback CASCADE;
DROP TABLE IF EXISTS backup_ai_suggestions CASCADE;
```

## 関連ドキュメント

- [データベース設計ドキュメント](../../docs/database_design.md)
- [リファクタリング計画](../../docs/refactoring/20251111-refactoring-plan.md)
- [コード冗長性分析](../../docs/refactoring/code-redundancy-analysis.md)

## 注意事項

⚠️ **本番環境で実行する前に**:
1. ステージング環境でテスト実行
2. バックアップの取得
3. メンテナンス時間の確保
4. ロールバック手順の確認

⚠️ **データ移行が必要な場合**:
削除前に、レガシーテーブルのデータを新スキーマに移行するスクリプトを作成・実行してください。



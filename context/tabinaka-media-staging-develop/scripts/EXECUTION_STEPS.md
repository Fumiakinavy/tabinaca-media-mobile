# データベース再設計実行手順

## 概要

このドキュメントは、レガシーテーブルの削除と新スキーマの作成を順序立てて実行する手順です。

## 実行順序

### Step 1: バックアップの取得

**重要**: 削除前に必ずバックアップを取得してください。

1. Supabase Dashboard を開く
2. SQL Editor に移動
3. 新しいクエリを作成
4. `scripts/backup_before_drop.sql` の内容をコピー＆ペースト
5. **Run** をクリックして実行
6. バックアップテーブルの行数を確認（結果が表示されます）

**確認クエリ**:
```sql
SELECT table_name, COUNT(*) AS row_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'backup_%'
GROUP BY table_name;
```

---

### Step 2: レガシーテーブルの削除

1. Supabase Dashboard → SQL Editor
2. 新しいクエリを作成
3. `scripts/drop_legacy_tables.sql` の内容をコピー＆ペースト
4. **Run** をクリックして実行
5. エラーがないことを確認（`Success. No rows returned` が表示される）

**注意**: このスクリプトはトランザクション（BEGIN/COMMIT）で囲まれているため、エラーが発生した場合は自動的にロールバックされます。

---

### Step 3: 削除の確認

1. Supabase Dashboard → SQL Editor
2. 新しいクエリを作成
3. `scripts/verify_drop.sql` の内容をコピー＆ペースト
4. **Run** をクリックして実行
5. 結果を確認:
   - 削除対象テーブルが存在しないこと（✅ 削除済み）
   - 保持すべきテーブルが存在すること（✅ 存在）
   - バックアップテーブルが存在すること（✅ バックアップ存在）

---

### Step 4: 新スキーマの作成

1. Supabase Dashboard → SQL Editor
2. 新しいクエリを作成
3. `supabase/migrations/20250113000001_create_new_schema.sql` の内容をコピー＆ペースト
4. **Run** をクリックして実行
5. エラーがないことを確認

**確認クエリ**:
```sql
-- 新しく作成されたテーブルを確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'accounts',
    'account_profiles',
    'activity_interactions',
    'quiz_sessions',
    'quiz_results',
    'chat_sessions',
    'chat_messages',
    'generated_activities',
    'generated_activity_saves',
    'articles',
    'article_versions',
    'article_translations'
  )
ORDER BY table_name;
```

---

## トラブルシューティング

### エラー: "relation already exists"

既にテーブルが存在する場合に発生します。

**解決方法**:
- `CREATE TABLE IF NOT EXISTS` を使用しているため、既存テーブルはスキップされます
- エラーが続く場合は、該当テーブルを手動で確認してください

### エラー: "permission denied"

権限が不足している場合に発生します。

**解決方法**:
- サービスロールキーを使用して SQL Editor で実行
- または、Supabase Dashboard の管理者権限で実行

### エラー: "foreign key constraint"

外部キー制約エラーが発生した場合。

**解決方法**:
- 依存関係を確認し、正しい順序で実行されているか確認
- 既存テーブル（account_linkages, activities など）が存在することを確認

---

## 実行後の確認事項

### 1. テーブル一覧の確認

```sql
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE 'backup_%' THEN 'バックアップ'
    WHEN table_name IN (
      'account_linkages',
      'account_metadata',
      'activities',
      'form_submissions',
      'reviews'
    ) THEN '保持（既存）'
    ELSE '新規作成'
  END AS category
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY category, table_name;
```

### 2. ENUM型の確認

```sql
SELECT typname, enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN (
  'account_status',
  'activity_status',
  'interaction_type',
  'quiz_session_status',
  'article_status'
)
ORDER BY typname, e.enumsortorder;
```

### 3. インデックスの確認

```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'activity_interactions',
    'quiz_sessions',
    'quiz_results',
    'chat_sessions',
    'articles'
  )
ORDER BY tablename, indexname;
```

---

## 次のステップ

1. **RLS ポリシーの設定**: 新しく作成したテーブルに Row Level Security を設定
2. **データ移行**: バックアップテーブルから新スキーマへのデータ移行（必要に応じて）
3. **API の更新**: アプリケーションコードを新スキーマに合わせて更新
4. **テスト**: 新スキーマでの動作確認

---

## 関連ドキュメント

- [データベース設計ドキュメント](../../docs/database_design.md)
- [リファクタリング計画](../../docs/refactoring/20251111-refactoring-plan.md)
- [削除手順の詳細](../../scripts/README_DROP_LEGACY.md)



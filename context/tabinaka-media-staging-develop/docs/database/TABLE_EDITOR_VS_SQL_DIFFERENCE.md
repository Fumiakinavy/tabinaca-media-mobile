# Table Editor と SQL クエリの結果が異なる理由

## 問題

Supabase の Table Editor で表示されるテーブル一覧と、SQL クエリ（`SELECT * FROM information_schema.tables WHERE table_schema = 'public'`）の結果が異なる場合があります。

## 考えられる原因

### 1. スキーマの違い

**Table Editor** は通常 `public` スキーマのみを表示しますが、以下のスキーマは表示されません：
- `auth` - Supabase 認証関連（`auth.users` など）
- `storage` - Supabase Storage 関連
- `extensions` - PostgreSQL 拡張機能関連
- `pg_catalog` - PostgreSQL システムカタログ

**SQL クエリ** は指定したスキーマ（例: `public`）のすべてのテーブルを返します。

### 2. RLS（Row Level Security）の影響

Table Editor は現在のユーザーの権限に基づいてテーブルをフィルタリングする場合があります。RLS ポリシーが設定されているテーブルは、権限がない場合に非表示になる可能性があります。

### 3. 権限の問題

Table Editor は Supabase Dashboard にログインしているユーザーの権限で動作します。一方、SQL クエリは実行時の権限（サービスロールキーを使用している場合は全権限）で動作します。

### 4. キャッシュの問題

Table Editor はブラウザキャッシュや Supabase の内部キャッシュを使用している可能性があります。最新の状態を反映するには、ページをリロードするか、時間を置いてから再度確認してください。

### 5. プロジェクト/ブランチの違い

Supabase CLI でリンクしているプロジェクトと、ブラウザで表示しているプロジェクトが異なる可能性があります。

## 確認方法

### 1. 正しいプロジェクトを確認

```bash
# CLI でリンクされているプロジェクトを確認
supabase projects list

# 現在のブランチを確認
cat supabase/.branches/_current_branch
```

### 2. 全スキーマのテーブルを確認

```sql
-- public スキーマのテーブル
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- すべてのスキーマのテーブル
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
```

### 3. RLS ポリシーを確認

```sql
-- テーブルごとの RLS ポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 4. 権限を確認

```sql
-- 現在のユーザーの権限を確認
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
ORDER BY table_name, privilege_type;
```

## 推奨される確認方法

**SQL クエリの結果を正として扱う**ことを推奨します。理由：

1. SQL クエリはデータベースの実際の状態を直接反映する
2. 権限やキャッシュの影響を受けにくい
3. 自動化やスクリプトで再現可能

Table Editor は UI の利便性のために一部のテーブルを非表示にしている可能性がありますが、SQL クエリは常に正確な情報を返します。

## 関連ドキュメント

- [Supabase Table Editor のドキュメント](https://supabase.com/docs/guides/database/tables)
- [RLS ポリシーの設定](https://supabase.com/docs/guides/auth/row-level-security)
- [データベース設計ドキュメント](../database_design.md)



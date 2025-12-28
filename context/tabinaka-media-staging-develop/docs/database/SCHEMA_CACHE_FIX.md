# Supabase スキーマキャッシュ問題の解決方法

## 問題
`Could not find the table 'public.activity_interactions' in the schema cache` というエラーが発生する場合、PostgREST（SupabaseのREST API）のスキーマキャッシュが更新されていない可能性があります。

## 解決方法

### 1. SQL Editorでスキーマキャッシュをリフレッシュ（推奨）

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. **SQL Editor** を開く
4. 以下のSQLを実行：

```sql
-- PostgRESTにスキーマリロードを通知
NOTIFY pgrst, 'reload schema';

-- テーブルの存在確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'activity_interactions';
```

### 2. マイグレーションの再適用（代替方法）

ターミナルで以下を実行：

```bash
supabase db push
```

これにより、マイグレーションが再適用され、スキーマキャッシュが更新される可能性があります。

### 3. 時間を置いて待つ（自動更新）

PostgRESTのスキーマキャッシュは通常、数分で自動的に更新されます。5-10分待ってから再度試してください。

### 2. マイグレーションの再適用

```bash
# マイグレーションの状態を確認
supabase migration list

# 必要に応じて再適用
supabase db push
```

### 3. 一時的な回避策

APIエンドポイントでは、スキーマキャッシュエラーが発生した場合、空配列を返すようにフォールバック処理を実装しています。これにより、エラーが発生してもアプリケーションは動作し続けます。

## 確認方法

以下のSQLクエリでテーブルの存在を確認できます：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'activity_interactions';
```

テーブルが存在する場合は、スキーマキャッシュの問題です。上記の方法で解決できます。

## 予防策

- マイグレーション適用後は、Supabaseダッシュボードでスキーマをリフレッシュする
- 本番環境では、マイグレーション適用後に数秒待ってからAPIを呼び出す
- エラーハンドリングでスキーマキャッシュエラーを適切に処理する


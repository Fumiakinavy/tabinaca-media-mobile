# Like機能実装のための環境変数設定

## 必要な環境変数

以下の環境変数を`.env.local`ファイルに追加してください：

```bash
# NextAuth設定
NEXTAUTH_URL=http://localhost:2098
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Google OAuth設定
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase設定（既存）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# データベースURL（Supabase）
DATABASE_URL=your-supabase-database-url
```

## Google OAuth設定手順

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
5. アプリケーションの種類を「ウェブアプリケーション」に設定
6. 承認済みのリダイレクト URIに以下を追加：
   - `http://localhost:2098/api/auth/callback/google` (開発環境)
   - `https://your-domain.com/api/auth/callback/google` (本番環境)
7. クライアントIDとクライアントシークレットを取得して環境変数に設定

## Supabaseテーブル作成

`create_like_system.sql`ファイルをSupabaseのSQLエディタで実行してください。

## 本番環境での設定

Vercelにデプロイする場合：
1. Vercelダッシュボードでプロジェクトを選択
2. 「Settings」→「Environment Variables」に移動
3. 上記の環境変数をすべて追加
4. 本番環境のURLに合わせて`NEXTAUTH_URL`を設定

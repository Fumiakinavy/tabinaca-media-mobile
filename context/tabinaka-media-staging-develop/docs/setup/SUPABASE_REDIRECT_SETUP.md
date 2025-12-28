# SupabaseリダイレクトURL設定手順

## 問題
現在、Googleログイン時にSupabaseのドメイン（`https://odutmcbcufocrotwlqrq.supabase.co`）にリダイレクトされ、ユーザーにSupabaseが使用されていることがバレてしまいます。

## 解決方法

### 1. Supabaseダッシュボードでの設定

1. **Supabaseダッシュボードにログイン**
   - https://supabase.com/dashboard にアクセス
   - プロジェクトを選択

2. **認証設定を更新**
   - 左サイドバーの「Authentication」をクリック
   - 「URL Configuration」タブを選択

3. **リダイレクトURLを追加**
   - 「Site URL」に本番ドメインを設定
     ```
     https://your-domain.com
     ```
   - 「Redirect URLs」に以下を追加：
     ```
     https://your-domain.com/auth/callback
     http://localhost:2098/auth/callback
     ```

### 2. Google Cloud Consoleでの設定

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com/
   - プロジェクトを選択

2. **OAuth 2.0設定を更新**
   - 「APIとサービス」→「認証情報」をクリック
   - 既存のOAuth 2.0クライアントIDを選択

3. **承認済みリダイレクトURIを更新**
   - 以下のURIを追加：
     ```
     https://your-domain.com/auth/callback
     http://localhost:2098/auth/callback
     ```

### 3. 環境変数の確認

`.env.local`ファイルで以下の設定を確認：

```bash
# 本番環境のURL
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# 開発環境のURL
NEXT_PUBLIC_SITE_URL=http://localhost:2098
```

### 4. カスタムドメインの設定（オプション）

より自然なURLにするため、カスタムドメインを設定することも可能です：

1. **カスタムドメインの取得**
   - 例：`auth.your-domain.com`

2. **Supabase設定でカスタムドメインを使用**
   - Site URL: `https://auth.your-domain.com`
   - Redirect URLs: `https://auth.your-domain.com/auth/callback`

## 実装された機能

### 1. カスタム認証コールバックページ
- `/auth/callback` - 認証後の処理を担当
- ユーザーフレンドリーなUI
- エラーハンドリング

### 2. 更新された認証フロー
- Supabaseの直接URLではなく、カスタムドメインにリダイレクト
- 元のページへの自動リダイレクト
- エラー時の適切な処理

### 3. 改善されたユーザー体験
- ブランディングの一貫性
- 自然なリダイレクトフロー
- エラーメッセージの日本語化

## テスト手順

1. **開発環境でのテスト**
   ```bash
   npm run dev
   ```
   - `http://localhost:2098` でアクセス
   - ログインボタンをクリック
   - `/auth/callback` にリダイレクトされることを確認

2. **本番環境でのテスト**
   - 本番ドメインでアクセス
   - ログインフローをテスト
   - リダイレクトが正常に動作することを確認

## 注意事項

- Supabaseの設定変更後、数分かかる場合があります
- Google Cloud Consoleの設定変更は即座に反映されます
- 本番環境では必ずHTTPSを使用してください

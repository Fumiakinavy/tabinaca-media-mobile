# Supabase OAuth リダイレクト設定の修正手順

## 現在の問題
Googleログイン時にSupabaseドメイン（`odutmcbcufocrotwlqrq.supabase.co`）が表示されてしまう

## 解決手順

### 1. Supabaseダッシュボードでの設定

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard
   - プロジェクトを選択

2. **認証設定を更新**
   - 左サイドバーの「Authentication」をクリック
   - 「URL Configuration」タブを選択

3. **Site URLを設定**
   ```
   https://tabinaka-media.gappy.jp
   ```

4. **Redirect URLsを追加**
   ```
   https://tabinaka-media.gappy.jp/auth/callback
   http://localhost:2098/auth/callback
   ```

### 2. Google Cloud Consoleでの設定

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com/
   - プロジェクトを選択

2. **OAuth 2.0設定を更新**
   - 「APIとサービス」→「認証情報」をクリック
   - 既存のOAuth 2.0クライアントIDを選択

3. **承認済みリダイレクトURIを追加**
   ```
   https://tabinaka-media.gappy.jp/auth/callback
   http://localhost:2098/auth/callback
   ```

### 3. 環境変数の確認

`.env.local`ファイルで以下を確認：

```bash
NEXT_PUBLIC_SITE_URL=https://tabinaka-media.gappy.jp
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. 実装済みの機能

✅ **カスタム認証コールバックページ** (`/auth/callback`)
- ユーザーフレンドリーなUI
- 元のページへの自動リダイレクト
- エラーハンドリング

✅ **更新された認証フロー**
- `SmartBookingForm.tsx` - カスタムリダイレクトURL使用
- `LikeButton.tsx` - カスタムリダイレクトURL使用

### 5. テスト手順

1. **開発環境でのテスト**
   ```bash
   npm run dev
   ```
   - `http://localhost:2098` でアクセス
   - ログインボタンをクリック
   - `/auth/callback` にリダイレクトされることを確認

2. **本番環境でのテスト**
   - `https://tabinaka-media.gappy.jp` でアクセス
   - ログインフローをテスト
   - リダイレクトが正常に動作することを確認

### 6. 設定変更後の確認

設定変更後、以下を確認してください：

1. **Supabaseの設定が反映されているか**
   - Authentication → URL Configuration
   - Site URL: `https://tabinaka-media.gappy.jp`
   - Redirect URLs: `https://tabinaka-media.gappy.jp/auth/callback`

2. **Google Cloud Consoleの設定が反映されているか**
   - 承認済みリダイレクトURIに `https://tabinaka-media.gappy.jp/auth/callback` が追加されているか

3. **実際のログインフロー**
   - Googleアカウント選択画面で「tabinaka-media.gappy.jp」にリダイレクトされることを確認

## 注意事項

- Supabaseの設定変更後、数分かかる場合があります
- Google Cloud Consoleの設定変更は即座に反映されます
- 本番環境では必ずHTTPSを使用してください
- 設定変更後は必ずテストを行ってください

## トラブルシューティング

もし設定後もSupabaseドメインが表示される場合：

1. **ブラウザのキャッシュをクリア**
2. **Supabaseの設定を再確認**
3. **Google Cloud Consoleの設定を再確認**
4. **環境変数を再確認**

設定が正しく反映されれば、Googleアカウント選択画面で「tabinaka-media.gappy.jp」にリダイレクトされるようになります。

# 環境設定ガイド（Supabaseブランチ機能用）

## 問題の解決手順

現在の404エラーの原因は、開発ブランチの環境設定が正しく行われていないことです。Supabaseのブランチ機能を使用している場合の設定手順です。

## 1. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の内容を設定してください：

```bash
# Supabase設定（開発ブランチ用）
NEXT_PUBLIC_SUPABASE_URL=your_dev_branch_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_branch_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_dev_branch_service_role_key_here

# SendGrid設定
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=your_sendgrid_from_email_here

# Google Analytics
NEXT_PUBLIC_GTM_ID=your_gtm_id_here

# Google Maps API（オプション）
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# アプリケーション設定
NEXT_PUBLIC_BASE_URL=http://localhost:2098  # ローカル開発環境のURL
NODE_ENV=development  # ローカル開発時はdevelopment

# Slack通知（オプション）
SLACK_WEBHOOK_URL=your_slack_webhook_url_here
SLACK_USER_SIGNUP_WEBHOOK_URL=your_signup_notification_webhook_url_here
SLACK_BOT_USERNAME=Gappy Bot
SLACK_ICON_EMOJI=:robot_face:

# Google Sheets（オプション）
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email_here
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=your_private_key_here
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_WORKSHEET_NAME=Form Submissions
```

## デプロイ環境での重要な設定

### NEXT_PUBLIC_BASE_URL の設定
デプロイ環境では、`NEXT_PUBLIC_BASE_URL` を正しく設定することが重要です：

- **Vercel**: 環境変数として `NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app` を設定
- **Netlify**: 環境変数として `NEXT_PUBLIC_BASE_URL=https://your-app.netlify.app` を設定
- **その他のホスティング**: 実際のドメインを設定

この設定がないと、QRコードのリンクが正しく生成されず、500エラーが発生する可能性があります。

## 2. Supabaseブランチでの設定

### 2.1 ブランチの確認
1. Supabaseダッシュボードにログイン
2. 開発ブランチのプロジェクトを選択
3. ブランチ機能を使用していることを確認

### 2.2 RLSポリシーの設定
開発ブランチのSupabaseで以下のSQLを実行してください：

```sql
-- setup_rls_policies.sql の内容を実行
```

または、SQL Editorで以下のクエリを実行：

```sql
-- activitiesテーブルのRLSを有効化
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 公開閲覧用ポリシー
CREATE POLICY "public_read_active_activities"
ON public.activities
FOR SELECT
TO anon
USING (is_active = true);

-- service_role用ポリシー
CREATE POLICY "service_role_all_access_activities"
ON public.activities
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

## 3. アプリケーションの再起動

環境変数を設定した後、開発サーバーを再起動してください：

```bash
npm run dev
```

## 4. デバッグ情報の確認

フォーム送信時に、コンソールに以下のようなデバッグ情報が表示されます：

```
🔍 Form Submission Debug Info:
  - Environment: {
    url: "https://your-dev-project.supabase.co...",
    keyPrefix: "eyJhbGciOiJ...",
    schema: "core_v2",
    serviceKeyPrefix: "eyJhbGciOiJ..."
  }
  - Experience Slug: kimono-dressing-experience
🔍 Querying experiences table...
🔍 Experience Query Result: { data: {...}, error: null }
```

## 5. よくある問題と解決方法

### 5.1 PGRST116エラー
- **原因**: スキーマが公開されていない
- **解決**: Supabaseダッシュボードで `core_v2` スキーマを公開

### 5.2 Permission deniedエラー
- **原因**: RLSポリシーが設定されていない
- **解決**: 上記のRLSポリシーを設定

### 5.3 テーブルが存在しないエラー
- **原因**: スキーマ名が間違っている
- **解決**: `NEXT_PUBLIC_DB_SCHEMA` を正しいスキーマ名に設定

### 5.4 データが0件
- **原因**: `is_active = true` のレコードがない
- **解決**: データベースで `is_active` を `true` に更新

## 6. 確認方法

設定完了後、以下のコマンドで動作確認：

```bash
# 開発サーバー起動
npm run dev

# ブラウザでフォーム送信をテスト
# コンソールでデバッグ情報を確認
```

## 7. ブランチ機能の利点

- **開発ブランチ**: 独立したデータベースインスタンス
- **本番ブランチ**: 独立したデータベースインスタンス
- **スキーマ**: 両方とも`public`スキーマを使用
- **分離**: データベースレベルで完全に分離されているため、スキーマ分離は不要

この設定により、開発環境と本番環境で完全に独立したデータベースを使用できます。

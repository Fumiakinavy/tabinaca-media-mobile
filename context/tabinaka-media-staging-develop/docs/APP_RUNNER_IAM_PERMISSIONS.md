# App Runner 環境変数設定に必要なIAM権限

## 現在の状況

IAMユーザー `BedrockAPIKey-qmll` には、App Runnerの環境変数を設定するために必要な権限が不足しています。

## 必要なIAM権限

以下の権限が必要です：

### 必須権限

1. **`apprunner:DescribeService`**
   - 現在のサービス設定を取得するために必要
   - リソース: `arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media/*`

2. **`apprunner:UpdateService`**
   - 環境変数を更新するために必要
   - リソース: `arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media/*`

### オプション権限（サービス一覧取得用）

3. **`apprunner:ListServices`**
   - サービス一覧を取得するために必要（スクリプトで使用）
   - リソース: `arn:aws:apprunner:ap-southeast-2:149843772536:service/*/*`

## 推奨されるIAMポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:DescribeService",
        "apprunner:UpdateService"
      ],
      "Resource": "arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:ListServices"
      ],
      "Resource": "*"
    }
  ]
}
```

## 解決方法

### 方法1: IAM管理者に権限追加を依頼（推奨）

IAM管理者に上記のポリシーを追加してもらいます。

1. AWS IAMコンソールを開く
2. ユーザー `BedrockAPIKey-qmll` を選択
3. 「アクセス権限」タブ > 「インラインポリシーの追加」または「ポリシーのアタッチ」
4. 上記のポリシーを追加

### 方法2: AWSコンソールから手動で設定

CLIの権限がない場合、AWSコンソールから直接設定できます：

1. **AWS App Runnerコンソールを開く**
   - https://ap-southeast-2.console.aws.amazon.com/apprunner/

2. **サービスを選択**
   - `tabinaka-media` を選択

3. **環境変数を設定**
   - 「設定」タブ > 「環境変数」> 「編集」
   - 以下の環境変数を追加：

**必須環境変数:**
- `NEXT_PUBLIC_SUPABASE_URL` = (Supabase URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Supabase Anon Key)
- `SUPABASE_SERVICE_ROLE_KEY` = (Supabase Service Role Key)
- `ACCOUNT_TOKEN_SECRET` = `e+kdtI5VyIui//afbhRtM8jYxBXAzKktooQ0NhE4urA=`

**推奨環境変数:**
- `CORS_ORIGIN` = `https://gappytravel.com`
- `ALLOWED_ORIGINS` = (必要に応じて)
- `GOOGLE_PLACES_API_KEY_SERVER` = (必要に応じて)
- `NEXT_PUBLIC_BASE_URL` = (App RunnerのURL)
- `NEXT_PUBLIC_SITE_URL` = (フロントエンドのURL)

4. **保存**
   - 「保存」をクリック
   - 自動的に再デプロイが開始されます

### 方法3: 別のIAMユーザー/ロールを使用

App Runnerの操作権限がある別のIAMユーザーまたはロールを使用します。

```bash
# 別のプロファイルを使用
aws configure --profile apprunner-admin

# プロファイルを指定して実行
AWS_PROFILE=apprunner-admin ./scripts/set-apprunner-env.sh <SERVICE_ARN>
```

## 現在のIAMユーザーの用途

`BedrockAPIKey-qmll` という名前から、このユーザーは主にAWS Bedrock API用に作成されたものと思われます。App Runnerの操作には別の権限が必要です。

## 次のステップ

1. **IAM管理者に権限追加を依頼**（方法1）
2. **または、AWSコンソールから手動で設定**（方法2）

どちらの方法でも環境変数を設定できます。権限が追加されれば、CLIスクリプトも使用可能になります。

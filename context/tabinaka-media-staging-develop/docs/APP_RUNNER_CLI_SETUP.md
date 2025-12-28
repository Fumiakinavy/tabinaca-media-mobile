# AWS CLI で App Runner 環境変数を設定する手順

## 前提条件

1. **AWS CLI がインストールされていること**
   ```bash
   aws --version
   ```

2. **AWS認証情報が設定されていること**
   ```bash
   aws configure list
   ```

3. **jq がインストールされていること**（スクリプトで使用）
   ```bash
   jq --version
   # インストール: brew install jq (macOS)
   ```

## 手順1: ACCOUNT_TOKEN_SECRET を生成

まず、セキュアなランダムな文字列を生成します：

```bash
./scripts/generate-account-token-secret.sh
```

生成された値をメモしておきます（例: `HZq1cKJ8cfywYU6rFJbcVDyaxK7QzaHCuEakX9SFX4I=`）

## 手順2: 必要な環境変数の値を準備

以下の環境変数の値を準備してください：

### 必須環境変数

| 環境変数名 | 説明 | 取得方法 |
|-----------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL | Supabaseダッシュボード > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | Supabaseダッシュボード > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー | Supabaseダッシュボード > Settings > API |
| `ACCOUNT_TOKEN_SECRET` | アカウントトークン署名用秘密鍵 | 手順1で生成した値 |

### 推奨環境変数

| 環境変数名 | 説明 | デフォルト値 |
|-----------|------|------------|
| `CORS_ORIGIN` | メインの許可オリジン | `https://gappytravel.com` |
| `ALLOWED_ORIGINS` | 複数オリジン（カンマ区切り） | （任意） |
| `GOOGLE_PLACES_API_KEY_SERVER` | Google Places APIキー | （任意） |
| `NEXT_PUBLIC_BASE_URL` | App RunnerのURL | （任意） |
| `NEXT_PUBLIC_SITE_URL` | フロントエンドのURL | （任意） |

## 手順3: スクリプトを実行

### 方法A: 対話的に実行（推奨）

```bash
chmod +x scripts/set-apprunner-env.sh
./scripts/set-apprunner-env.sh
```

スクリプトが以下を実行します：

1. **サービスARNの取得**
   - サービスARNを引数で指定しない場合、利用可能なサービス一覧を表示
   - サービスARNを入力

2. **環境変数の入力**
   - 必須環境変数を順番に入力
   - 推奨環境変数は Enter でスキップ可能

3. **設定内容の確認**
   - 入力した内容を表示（機密情報は一部のみ表示）

4. **更新の実行**
   - 確認後、AWS CLIで環境変数を更新
   - 自動的に再デプロイが開始されます

### 方法B: サービスARNを指定して実行

```bash
./scripts/set-apprunner-env.sh <SERVICE_ARN>
```

例：
```bash
./scripts/set-apprunner-env.sh arn:aws:apprunner:ap-northeast-1:123456789012:service/tabinaka-media/abc123
```

## 手順4: サービスARNの確認方法

サービスARNがわからない場合：

```bash
# サービス一覧を表示
aws apprunner list-services --query 'ServiceSummaryList[*].[ServiceName,ServiceArn]' --output table
```

または、スクリプトを引数なしで実行すると、自動的に一覧が表示されます。

## 手順5: 設定の確認

環境変数が正しく設定されたか確認：

```bash
# サービスARNを指定
SERVICE_ARN="arn:aws:apprunner:ap-northeast-1:123456789012:service/tabinaka-media/abc123"

# 環境変数を確認
aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --query 'Service.SourceConfiguration.CodeRepository.CodeConfiguration.CodeConfigurationValues.RuntimeEnvironmentVariables' \
  --output json
```

または、ECRイメージデプロイの場合：

```bash
aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --query 'Service.SourceConfiguration.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables' \
  --output json
```

## 手順6: デプロイ状況の確認

環境変数を更新すると、自動的に再デプロイが開始されます。進行状況を確認：

```bash
# サービスARNを指定
SERVICE_ARN="arn:aws:apprunner:ap-northeast-1:123456789012:service/tabinaka-media/abc123"

# ステータスを確認
aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --query 'Service.Status' \
  --output text

# 詳細な情報を確認
aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --query 'Service.{Status:Status,ServiceUrl:ServiceUrl,UpdatedAt:UpdatedAt}' \
  --output json
```

## トラブルシューティング

### エラー: `jq: command not found`

```bash
# macOS
brew install jq

# Linux (Ubuntu/Debian)
sudo apt-get install jq
```

### エラー: `AccessDeniedException`

IAMユーザーに以下の権限が必要です：
- `apprunner:DescribeService`
- `apprunner:UpdateService`
- `apprunner:ListServices`

### エラー: `InvalidParameterException`

- 環境変数名が正しいか確認（大文字小文字、アンダースコアなど）
- 値に特殊文字が含まれている場合、適切にエスケープされているか確認

### 環境変数が反映されない

1. 再デプロイが完了しているか確認
2. ビルドログを確認（`NEXT_PUBLIC_` で始まる環境変数はビルド時に必要）
3. 実行時のログを確認

## 手動でAWS CLIコマンドを実行する場合

スクリプトを使わずに、直接AWS CLIコマンドを実行する場合：

### ソースベースデプロイの場合

```bash
# 現在の設定を取得
CURRENT_CONFIG=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --output json)

# 環境変数を更新
aws apprunner update-service \
  --service-arn "$SERVICE_ARN" \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "YOUR_REPO_URL",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "CodeConfiguration": {
        "ConfigurationSource": "API",
        "CodeConfigurationValues": {
          "Runtime": "nodejs18",
          "BuildCommand": "npm ci && npm run build",
          "StartCommand": "npm start",
          "RuntimeEnvironmentVariables": {
            "NODE_ENV": "production",
            "PORT": "8080",
            "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
            "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
            "ACCOUNT_TOKEN_SECRET": "your-account-token-secret",
            "CORS_ORIGIN": "https://gappytravel.com"
          }
        }
      }
    }
  }'
```

### ECRイメージデプロイの場合

```bash
aws apprunner update-service \
  --service-arn "$SERVICE_ARN" \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "YOUR_ECR_IMAGE",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "8080",
          "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
          "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
          "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
          "ACCOUNT_TOKEN_SECRET": "your-account-token-secret",
          "CORS_ORIGIN": "https://gappytravel.com"
        }
      }
    }
  }'
```

## 次のステップ

環境変数の設定が完了したら：

1. **デプロイの完了を待つ**（通常5-10分）
2. **ログを確認**してエラーがないか確認
3. **アプリケーションにアクセス**して動作確認

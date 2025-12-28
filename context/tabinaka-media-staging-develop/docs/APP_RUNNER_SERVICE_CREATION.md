# AWS App Runner サービス作成ガイド（CLI - ECRデプロイ）

このドキュメントでは、AWS CLIを使用してECRイメージからApp Runnerサービスを作成する手順を説明します。

## 前提条件

1. **AWS CLI がインストールされていること**
   ```bash
   aws --version
   ```

2. **AWS認証情報が設定されていること**
   ```bash
   aws configure list
   ```

3. **必要なIAM権限**
   - `apprunner:CreateService`
   - `apprunner:DescribeService` (サービス情報取得用)
   - `ecr:CreateRepository` (ECRリポジトリ作成用)
   - `ecr:DescribeRepositories` (ECRリポジトリ確認用)
   - `ecr:GetAuthorizationToken` (ECRログイン用)
   - `ecr:BatchCheckLayerAvailability` (ECRプッシュ用)
   - `ecr:GetDownloadUrlForLayer` (ECRプッシュ用)
   - `ecr:BatchGetImage` (ECRプッシュ用)
   - `ecr:PutImage` (ECRプッシュ用)
   - `ecr:InitiateLayerUpload` (ECRプッシュ用)
   - `ecr:UploadLayerPart` (ECRプッシュ用)
   - `ecr:CompleteLayerUpload` (ECRプッシュ用)
   - `iam:CreateRole` (サービスロール作成用)
   - `iam:AttachRolePolicy` (サービスロール作成用)
   - `iam:GetRole` (既存ロール確認用)

4. **jq がインストールされていること**（スクリプトで使用）
   ```bash
   jq --version
   # インストール: brew install jq (macOS)
   ```

## デプロイ方法

このスクリプトは **ECRイメージからデプロイ** する方式を使用します。

- 事前にビルドしたDockerイメージをECRにプッシュ
- より細かい制御が可能
- CI/CDパイプラインと統合しやすい
- Dockerfileを使用したビルドプロセス

## 手順1: IAMロールの作成（オプション）

サービス作成スクリプトが自動的にIAMロールを作成しますが、事前に作成したい場合：

```bash
./scripts/create-apprunner-role.sh [ロール名]
```

例：
```bash
./scripts/create-apprunner-role.sh AppRunnerServiceRole-tabinaka-media
```

## 手順2: 必要なツールの確認

ECRデプロイには以下のツールが必要です：

1. **Docker** がインストールされていること
   ```bash
   docker --version
   ```

2. **AWS CLI** がインストールされていること
   ```bash
   aws --version
   ```

## 手順3: App Runnerサービスの作成

### 方法A: スクリプトを使用（推奨）

```bash
./scripts/create-apprunner-service.sh [サービス名] [イメージタグ]
```

スクリプトが自動的に以下を実行します：
- IAMロールの作成
- ECRリポジトリの作成
- Dockerイメージのビルド
- ECRへのイメージプッシュ
- App Runnerサービスの作成

例：
```bash
./scripts/create-apprunner-service.sh tabinaka-media latest
```

または、対話形式で実行：
```bash
./scripts/create-apprunner-service.sh
```

### 方法B: AWS CLIで直接作成

#### 手順1: ECRリポジトリの作成

```bash
REGION="ap-southeast-2"
SERVICE_NAME="tabinaka-media"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ECRリポジトリの作成
aws ecr create-repository \
  --repository-name "$SERVICE_NAME" \
  --region "$REGION" \
  --image-scanning-configuration scanOnPush=true
```

#### 手順2: Dockerイメージのビルドとプッシュ

```bash
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${SERVICE_NAME}:latest"

# ECRへのログイン
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_URI"

# イメージのビルド
docker build -t "$SERVICE_NAME:latest" -f Dockerfile .

# タグ付け
docker tag "$SERVICE_NAME:latest" "$ECR_URI"

# プッシュ
docker push "$ECR_URI"
```

#### 手順3: App Runnerサービスの作成

```bash
REGION="ap-southeast-2"
SERVICE_NAME="tabinaka-media"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${SERVICE_NAME}:latest"

# サービス作成
aws apprunner create-service \
  --service-name "$SERVICE_NAME" \
  --source-configuration "{
    \"ImageRepository\": {
      \"ImageIdentifier\": \"$ECR_URI\",
      \"ImageRepositoryType\": \"ECR\",
      \"ImageConfiguration\": {
        \"Port\": \"8080\",
        \"RuntimeEnvironmentVariables\": {
          \"NODE_ENV\": \"production\",
          \"PORT\": \"8080\"
        }
      }
    },
    \"AutoDeploymentsEnabled\": false
  }" \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }' \
  --region "$REGION"
```

## 手順4: 環境変数の設定

サービス作成後、環境変数を設定します：

```bash
./scripts/set-apprunner-env.sh <SERVICE_ARN>
```

詳細は [APP_RUNNER_CLI_SETUP.md](./APP_RUNNER_CLI_SETUP.md) を参照してください。

## 手順5: デプロイ状況の確認

```bash
# サービスARNを取得
SERVICE_ARN=$(aws apprunner list-services \
  --region ap-southeast-2 \
  --query 'ServiceSummaryList[?ServiceName==`tabinaka-media`].ServiceArn' \
  --output text)

# ステータスを確認
aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --region ap-southeast-2 \
  --query 'Service.{Status:Status,ServiceUrl:ServiceUrl,UpdatedAt:UpdatedAt}' \
  --output json
```

## トラブルシューティング

### エラー: `AccessDeniedException`

必要なIAM権限が不足しています。以下の権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:CreateService",
        "apprunner:DescribeService",
        "ecr:CreateRepository",
        "ecr:DescribeRepositories",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:GetRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### エラー: `RepositoryNotFoundException`

ECRリポジトリが存在しない場合：
```bash
aws ecr create-repository --repository-name <リポジトリ名> --region <リージョン>
```

### エラー: `ImageNotFoundException`

ECRイメージが存在しない場合：
- Dockerイメージをビルドしてプッシュしてください
- イメージタグが正しいか確認してください

### エラー: `Docker build failed`

Dockerイメージのビルドに失敗する場合：
- Dockerfileが正しいか確認
- ビルドに必要な環境変数が設定されているか確認（NEXT_PUBLIC_* など）
- ローカルで `docker build` が成功するか確認

### デプロイが失敗する

1. **ビルドログを確認**
   ```bash
   # デプロイ履歴を確認
   aws apprunner list-operations \
     --service-arn "$SERVICE_ARN" \
     --region ap-southeast-2
   ```

2. **ログを確認**
   - AWS App Runnerコンソール > サービス > ログタブ

3. **環境変数の確認**
   - `NEXT_PUBLIC_` で始まる環境変数はビルド時に必要
   - 環境変数が正しく設定されているか確認

## 次のステップ

1. **環境変数の設定** - [APP_RUNNER_CLI_SETUP.md](./APP_RUNNER_CLI_SETUP.md)
2. **カスタムドメインの設定** - AWS App Runnerコンソールから設定
3. **自動スケーリングの設定** - 必要に応じて設定
4. **監視とアラートの設定** - CloudWatchで設定

## 新しいイメージのデプロイ

サービス作成後、新しいイメージをデプロイする場合：

```bash
# 1. イメージをビルド
docker build -t tabinaka-media:新しいタグ -f Dockerfile .

# 2. ECRにタグ付け
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/tabinaka-media:新しいタグ"
docker tag tabinaka-media:新しいタグ "$ECR_URI"

# 3. ECRにプッシュ
docker push "$ECR_URI"

# 4. App Runnerサービスを更新
aws apprunner update-service \
  --service-arn "$SERVICE_ARN" \
  --source-configuration "{
    \"ImageRepository\": {
      \"ImageIdentifier\": \"$ECR_URI\",
      \"ImageRepositoryType\": \"ECR\"
    }
  }" \
  --region "$REGION"
```

## 参考資料

- [AWS App Runner ドキュメント](https://docs.aws.amazon.com/apprunner/)
- [AWS ECR ドキュメント](https://docs.aws.amazon.com/ecr/)
- [App Runner 環境変数設定ガイド](./APP_RUNNER_ENV_SETUP.md)
- [ワンショットデプロイ手順](./ONE_SHOT_DEPLOY.md)

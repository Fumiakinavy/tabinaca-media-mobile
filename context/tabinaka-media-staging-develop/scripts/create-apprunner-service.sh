#!/bin/bash
# App Runner サービスを作成するスクリプト（ECRデプロイ専用）

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "App Runner サービス作成スクリプト（ECRデプロイ）"
echo "=========================================="
echo ""

# リージョンの設定
REGION="${AWS_REGION:-ap-southeast-2}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${BLUE}リージョン: ${REGION}${NC}"
echo -e "${BLUE}アカウントID: ${ACCOUNT_ID}${NC}"
echo ""

# サービス名の入力
if [ -z "$1" ]; then
  echo -e "${YELLOW}サービス名を入力してください（デフォルト: tabinaka-media）:${NC}"
  read -r SERVICE_NAME
  SERVICE_NAME=${SERVICE_NAME:-tabinaka-media}
else
  SERVICE_NAME=$1
fi

echo -e "${GREEN}サービス名: ${SERVICE_NAME}${NC}"
echo ""

# ECRリポジトリ名（サービス名と同じにする）
ECR_REPO="${SERVICE_NAME}"

# イメージタグの入力
if [ -z "$2" ]; then
  echo -e "${YELLOW}イメージタグを入力してください（デフォルト: latest）:${NC}"
  read -r IMAGE_TAG
  IMAGE_TAG=${IMAGE_TAG:-latest}
else
  IMAGE_TAG=$2
fi

echo -e "${GREEN}ECRリポジトリ名: ${ECR_REPO}${NC}"
echo -e "${GREEN}イメージタグ: ${IMAGE_TAG}${NC}"
echo ""

# IAMロール名
ROLE_NAME="AppRunnerServiceRole-${SERVICE_NAME}"

# IAMロールの作成
echo "=========================================="
echo "IAMロールの設定"
echo "=========================================="
echo ""

# 既存のロールARNを直接指定するオプション
echo "IAMロールの設定方法を選択してください:"
echo "  1) 既存のIAMロールARNを指定する（推奨）"
echo "  2) 新しいIAMロールを作成する（権限が必要）"
echo ""
read -p "選択 (1 or 2, デフォルト: 1): " ROLE_OPTION
ROLE_OPTION=${ROLE_OPTION:-1}

if [ "$ROLE_OPTION" = "1" ]; then
  # 既存のロールARNを指定
  echo ""
  echo "既存のIAMロールARNを入力してください:"
  echo "例: arn:aws:iam::149843772536:role/AppRunnerExecutionRole-GappyProd"
  read -p "IAMロールARN: " ROLE_ARN
  
  if [ -z "$ROLE_ARN" ]; then
    echo -e "${RED}エラー: IAMロールARNが指定されていません${NC}"
    exit 1
  fi
  
  # ARN形式の簡易チェック
  if [[ ! "$ROLE_ARN" =~ ^arn:aws:iam::[0-9]+:role/ ]]; then
    echo -e "${YELLOW}警告: 入力されたARNが正しい形式でない可能性があります${NC}"
    read -p "続行しますか？ (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
      exit 0
    fi
  fi
  
  echo -e "${GREEN}使用するIAMロールARN: ${ROLE_ARN}${NC}"
else
  # ロールが既に存在するか確認
  if aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null; then
    echo -e "${YELLOW}IAMロール ${ROLE_NAME} は既に存在します${NC}"
    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
    echo -e "${GREEN}既存のロールARN: ${ROLE_ARN}${NC}"
  else
    echo "IAMロールを作成を試みています..."
  
  # Trust Policyの作成
  TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)
  
  # ロールの作成を試みる
  echo "IAMロールを作成中..."
  echo -e "${YELLOW}（権限がない場合は数秒でエラーが表示されます）${NC}"
  
  # タイムアウト付きでロール作成を試みる（macOSではtimeoutコマンドがないため、別の方法を使用）
  CREATE_ROLE_OUTPUT=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "App Runner service role for ${SERVICE_NAME}" \
    --query 'Role.Arn' \
    --output text 2>&1)
  CREATE_ROLE_EXIT_CODE=$?
  
  # エラー出力を確認
  if [ $CREATE_ROLE_EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  IAMロールの作成に失敗しました${NC}"
  fi
  
  # 出力がARN形式かチェック
  if [ $CREATE_ROLE_EXIT_CODE -eq 0 ] && [[ "$CREATE_ROLE_OUTPUT" =~ ^arn:aws:iam::[0-9]+:role/ ]]; then
    ROLE_ARN="$CREATE_ROLE_OUTPUT"
    
    # App Runnerサービスロールポリシーのアタッチを試みる
    echo "App Runnerサービスロールポリシーをアタッチしています..."
    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess" 2>&1 || {
      echo -e "${YELLOW}⚠️  ECRアクセスポリシーのアタッチに失敗しました（権限不足の可能性）${NC}"
      echo -e "${YELLOW}IAM管理者に iam:AttachRolePolicy 権限の追加を依頼してください${NC}"
    }
    
    echo -e "${GREEN}✅ IAMロールが作成されました: ${ROLE_ARN}${NC}"
  else
    echo -e "${YELLOW}⚠️  IAMロールの作成に失敗しました（権限不足の可能性）${NC}"
    echo ""
    echo "エラー内容:"
    echo "$CREATE_ROLE_OUTPUT"
    echo ""
    echo "IAMロールを作成する権限がない場合、既存のロールARNを指定できます。"
    echo ""
    read -p "既存のIAMロールARNを入力してください（Enterでスキップ）: " MANUAL_ROLE_ARN
    
    if [ -z "$MANUAL_ROLE_ARN" ]; then
      echo -e "${YELLOW}IAMロールARNが指定されませんでした${NC}"
      echo ""
      echo "App RunnerサービスにはIAMロールが必要です。"
      echo "以下のいずれかの方法で対応してください："
      echo ""
      echo "1. IAM管理者に以下の権限の追加を依頼："
      echo "   - iam:CreateRole"
      echo "   - iam:AttachRolePolicy"
      echo ""
      echo "2. 既存のApp RunnerサービスロールARNを取得して指定"
      echo "   例: arn:aws:iam::149843772536:role/AppRunnerServiceRole-tabinaka-media"
      echo ""
      echo "3. 別のIAMユーザー/ロールで実行"
      echo ""
      exit 1
    else
      ROLE_ARN="$MANUAL_ROLE_ARN"
      echo -e "${GREEN}指定されたロールARNを使用します: ${ROLE_ARN}${NC}"
    fi
  fi
  fi
fi

echo ""
echo -e "${GREEN}使用するIAMロールARN: ${ROLE_ARN}${NC}"
echo ""

# ECRリポジトリの作成
echo "=========================================="
echo "ECRリポジトリの確認"
echo "=========================================="
echo ""

# ECRリポジトリの存在確認
if aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$REGION" 2>/dev/null; then
  echo -e "${GREEN}ECRリポジトリ ${ECR_REPO} は既に存在します${NC}"
else
  echo -e "${YELLOW}ECRリポジトリ ${ECR_REPO} が見つかりません${NC}"
  echo ""
  echo "ECRリポジトリの作成を試みますか？"
  echo "（権限がない場合は、既存のECRリポジトリ名を指定することもできます）"
  echo ""
  read -p "ECRリポジトリを作成しますか？ (y/N): " CREATE_ECR_REPO
  
  if [ "$CREATE_ECR_REPO" = "y" ] || [ "$CREATE_ECR_REPO" = "Y" ]; then
    echo "ECRリポジトリを作成しています..."
    aws ecr create-repository \
      --repository-name "$ECR_REPO" \
      --region "$REGION" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 2>&1 || {
      echo -e "${YELLOW}⚠️  ECRリポジトリの作成に失敗しました（権限不足の可能性）${NC}"
      echo ""
      echo "既存のECRリポジトリ名を指定するか、IAM管理者に ecr:CreateRepository 権限の追加を依頼してください。"
      echo ""
      read -p "別のECRリポジトリ名を指定しますか？ (y/N): " USE_DIFFERENT_REPO
      
      if [ "$USE_DIFFERENT_REPO" = "y" ] || [ "$USE_DIFFERENT_REPO" = "Y" ]; then
        read -p "ECRリポジトリ名を入力してください: " ECR_REPO
        # リポジトリの存在確認
        if ! aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$REGION" 2>/dev/null; then
          echo -e "${RED}❌ 指定されたECRリポジトリ ${ECR_REPO} が見つかりません${NC}"
          exit 1
        fi
        echo -e "${GREEN}ECRリポジトリ ${ECR_REPO} を使用します${NC}"
      else
        echo -e "${RED}❌ ECRリポジトリが必要です。処理を終了します${NC}"
        exit 1
      fi
    }
    
    if aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$REGION" 2>/dev/null; then
      echo -e "${GREEN}✅ ECRリポジトリが作成されました${NC}"
    fi
  else
    # 既存のECRリポジトリ名を指定
    echo ""
    read -p "既存のECRリポジトリ名を入力してください: " ECR_REPO
    
    # リポジトリの存在確認
    if ! aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$REGION" 2>/dev/null; then
      echo -e "${RED}❌ 指定されたECRリポジトリ ${ECR_REPO} が見つかりません${NC}"
      echo "IAM管理者に ecr:DescribeRepositories 権限の追加を依頼するか、"
      echo "ECRリポジトリが存在することを確認してください。"
      exit 1
    fi
    echo -e "${GREEN}ECRリポジトリ ${ECR_REPO} を使用します${NC}"
  fi
fi

# ECRリポジトリのURI
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"
ECR_BASE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}"

echo ""
echo -e "${GREEN}ECR URI: ${ECR_URI}${NC}"
echo ""

# Dockerイメージのビルドとプッシュ
echo "=========================================="
echo "Dockerイメージのビルドとプッシュ"
echo "=========================================="
echo ""

read -p "Dockerイメージをビルドしてプッシュしますか？ (Y/n): " BUILD_IMAGE
BUILD_IMAGE=${BUILD_IMAGE:-Y}

if [ "$BUILD_IMAGE" = "Y" ] || [ "$BUILD_IMAGE" = "y" ]; then
  # ECRへのログイン
  echo "ECRにログインしています..."
  aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_BASE_URI" || {
    echo -e "${RED}❌ ECRへのログインに失敗しました${NC}"
    exit 1
  }
  
  # Dockerイメージのビルド
  echo "Dockerイメージをビルドしています..."
  docker build -t "$ECR_REPO:$IMAGE_TAG" -f Dockerfile . || {
    echo -e "${RED}❌ Dockerイメージのビルドに失敗しました${NC}"
    exit 1
  }
  
  # イメージにタグを付ける
  echo "イメージにタグを付けています..."
  docker tag "$ECR_REPO:$IMAGE_TAG" "$ECR_URI"
  
  # ECRにプッシュ
  echo "ECRにイメージをプッシュしています..."
  docker push "$ECR_URI" || {
    echo -e "${RED}❌ ECRへのプッシュに失敗しました${NC}"
    exit 1
  }
  
  echo -e "${GREEN}✅ Dockerイメージのビルドとプッシュが完了しました${NC}"
  echo ""
else
  echo -e "${YELLOW}Dockerイメージのビルドとプッシュをスキップしました${NC}"
  echo -e "${YELLOW}既存のイメージ ${ECR_URI} を使用します${NC}"
  echo ""
fi

# サービス作成設定の確認
echo "=========================================="
echo "サービス作成設定の確認"
echo "=========================================="
echo ""
echo "サービス名: $SERVICE_NAME"
echo "ECRイメージ: $ECR_URI"
echo "IAMロールARN: $ROLE_ARN"
echo ""

read -p "この設定でサービスを作成しますか？ (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "キャンセルされました"
  exit 0
fi

echo ""
echo "App Runnerサービスを作成しています..."

# 既存サービスの確認
EXISTING_SERVICE=$(aws apprunner list-services --region "$REGION" --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" --output text 2>/dev/null)

if [ -n "$EXISTING_SERVICE" ]; then
  echo -e "${YELLOW}⚠️  サービス名 '$SERVICE_NAME' は既に存在します${NC}"
  echo ""
  echo "既存のサービスARN: $EXISTING_SERVICE"
  
  # 既存サービスのソースタイプを確認
  EXISTING_SOURCE_TYPE=$(aws apprunner describe-service \
    --service-arn "$EXISTING_SERVICE" \
    --region "$REGION" \
    --query 'Service.SourceConfiguration.CodeRepository.RepositoryUrl' \
    --output text 2>/dev/null)
  
  EXISTING_IMAGE_REPO=$(aws apprunner describe-service \
    --service-arn "$EXISTING_SERVICE" \
    --region "$REGION" \
    --query 'Service.SourceConfiguration.ImageRepository.ImageRepositoryType' \
    --output text 2>/dev/null)
  
  if [ "$EXISTING_IMAGE_REPO" = "ECR" ]; then
    EXISTING_IMAGE_ID=$(aws apprunner describe-service \
      --service-arn "$EXISTING_SERVICE" \
      --region "$REGION" \
      --query 'Service.SourceConfiguration.ImageRepository.ImageIdentifier' \
      --output text 2>/dev/null)
    echo "既存のソースタイプ: ECR"
    echo "既存のイメージ: $EXISTING_IMAGE_ID"
  elif [ -n "$EXISTING_SOURCE_TYPE" ]; then
    echo "既存のソースタイプ: Code Repository (GitHub/CodeCommit)"
    echo "既存のリポジトリ: $EXISTING_SOURCE_TYPE"
  else
    echo "既存のソースタイプ: 不明"
  fi
  echo ""
  echo "選択してください:"
  echo "  1) 既存のサービスを更新する（新しいイメージをデプロイ）"
  echo "  2) 別のサービス名で新規作成する"
  echo "  3) キャンセル"
  echo ""
  read -p "選択 (1/2/3, デフォルト: 1): " SERVICE_OPTION
  SERVICE_OPTION=${SERVICE_OPTION:-1}
  
  if [ "$SERVICE_OPTION" = "2" ]; then
    read -p "新しいサービス名を入力してください: " SERVICE_NAME
    if [ -z "$SERVICE_NAME" ]; then
      echo -e "${RED}❌ サービス名が指定されていません${NC}"
      exit 1
    fi
    # 新しいサービス名で再確認
    EXISTING_SERVICE=$(aws apprunner list-services --region "$REGION" --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" --output text 2>/dev/null)
    if [ -n "$EXISTING_SERVICE" ]; then
      echo -e "${RED}❌ 指定されたサービス名 '$SERVICE_NAME' も既に存在します${NC}"
      exit 1
    fi
  elif [ "$SERVICE_OPTION" = "3" ]; then
    echo "キャンセルされました"
    exit 0
  fi
fi

AUTO_SCALING_ARGS=()
if [ -n "$AUTO_SCALING_CONFIGURATION_ARN" ]; then
  AUTO_SCALING_ARGS=(--auto-scaling-configuration-arn "$AUTO_SCALING_CONFIGURATION_ARN")
fi

# サービス作成または更新
if [ -n "$ROLE_ARN" ]; then
  SOURCE_CONFIGURATION_JSON=$(cat <<EOF
{
    "AuthenticationConfiguration": {
      "AccessRoleArn": "$ROLE_ARN"
    },
    "ImageRepository": {
      "ImageIdentifier": "$ECR_URI",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "8080"
        }
      }
    },
    "AutoDeploymentsEnabled": false
}
EOF
)
else
  SOURCE_CONFIGURATION_JSON=$(cat <<EOF
{
    "ImageRepository": {
      "ImageIdentifier": "$ECR_URI",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "8080"
        }
      }
    },
    "AutoDeploymentsEnabled": false
}
EOF
)
fi

if [ -n "$EXISTING_SERVICE" ] && [ "$SERVICE_OPTION" = "1" ]; then
  # 既存サービスのソースタイプを再確認
  EXISTING_IMAGE_REPO=$(aws apprunner describe-service \
    --service-arn "$EXISTING_SERVICE" \
    --region "$REGION" \
    --query 'Service.SourceConfiguration.ImageRepository.ImageRepositoryType' \
    --output text 2>/dev/null)
  
  if [ "$EXISTING_IMAGE_REPO" != "ECR" ]; then
    echo -e "${RED}❌ 既存のサービスはECRソースではありません${NC}"
    echo ""
    echo "既存のサービスはECR以外のソースタイプ（GitHub/CodeCommitなど）で作成されています。"
    echo "ECRソースに変更することはできません。"
    echo ""
    echo "以下のいずれかを選択してください:"
    echo "  1. 別のサービス名で新規作成する（オプション2を選択）"
    echo "  2. 既存のサービスを削除してから再作成する"
    echo ""
    exit 1
  fi
  
  # 既存サービスの更新（ECRソースの場合）
  echo "既存のサービスを更新しています..."
  UPDATE_OUTPUT=$(aws apprunner update-service \
    --service-arn "$EXISTING_SERVICE" \
    --source-configuration "$SOURCE_CONFIGURATION_JSON" \
    --region "$REGION" \
    --query 'Service.ServiceArn' \
    --output text 2>&1) || {
    echo -e "${RED}❌ サービスの更新に失敗しました${NC}"
    echo ""
    echo "エラー内容:"
    echo "$UPDATE_OUTPUT"
    echo ""
    echo "考えられる原因:"
    echo "  1. 必要なIAM権限が不足している"
    echo "  2. サービスが更新可能な状態ではない"
    echo "  3. ソース設定が無効"
    echo "  4. リポジトリタイプの変更は許可されていない"
    echo ""
    echo "別の方法として、新しいイメージをプッシュした後、"
    echo "App Runnerコンソールから手動でデプロイを開始することもできます。"
    exit 1
  }
  
  SERVICE_ARN="$EXISTING_SERVICE"
  echo -e "${GREEN}✅ サービスの更新を開始しました${NC}"
else
  # 新規サービスの作成
  SERVICE_ARN=$(aws apprunner create-service \
    --service-name "$SERVICE_NAME" \
    --source-configuration "$SOURCE_CONFIGURATION_JSON" \
    --instance-configuration "{
      \"Cpu\": \"1 vCPU\",
      \"Memory\": \"2 GB\"
    }" \
    "${AUTO_SCALING_ARGS[@]}" \
    --network-configuration "{
      \"EgressConfiguration\": {
        \"EgressType\": \"DEFAULT\"
      }
    }" \
    --region "$REGION" \
    --query 'Service.ServiceArn' \
    --output text 2>&1) || {
    echo -e "${RED}❌ サービスの作成に失敗しました${NC}"
    echo ""
    echo "エラー内容:"
    echo "$SERVICE_ARN"
    echo ""
    echo "考えられる原因:"
    echo "  1. 必要なIAM権限が不足している"
    echo "  2. ECRイメージが存在しない"
    echo "  3. ECRリポジトリへのアクセス権限がない"
    echo "  4. サービス名が既に使用されている"
    exit 1
  }
fi

if [ -n "$SERVICE_ARN" ] && [[ "$SERVICE_ARN" == arn:* ]]; then
  echo ""
  echo -e "${GREEN}✅ App Runnerサービスが作成されました！${NC}"
  echo ""
  echo "サービスARN: $SERVICE_ARN"
  echo ""
  
  # サービスURLの取得
  echo "サービス情報を取得しています..."
  sleep 3
  
  SERVICE_URL=$(aws apprunner describe-service \
    --service-arn "$SERVICE_ARN" \
    --region "$REGION" \
    --query 'Service.ServiceUrl' \
    --output text 2>&1) || SERVICE_URL="（デプロイ完了後に利用可能）"
  
  echo ""
  echo "=========================================="
  echo "次のステップ"
  echo "=========================================="
  echo ""
  echo "1. 環境変数を設定:"
  echo "   ./scripts/set-apprunner-env.sh $SERVICE_ARN"
  echo ""
  echo "2. デプロイ状況を確認:"
  echo "   aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION"
  echo ""
  if [ "$SERVICE_URL" != "（デプロイ完了後に利用可能）" ]; then
    echo "3. サービスURL:"
    echo "   $SERVICE_URL"
    echo ""
  fi
  echo "4. ログを確認:"
  echo "   AWS App Runnerコンソール > サービス > ログタブ"
  echo ""
  echo "5. 新しいイメージをデプロイする場合:"
  echo "   docker build -t $ECR_REPO:新しいタグ -f Dockerfile ."
  echo "   docker tag $ECR_REPO:新しいタグ $ECR_URI"
  echo "   docker push $ECR_URI"
  echo "   # その後、App RunnerコンソールまたはCLIでサービスを更新"
  echo ""
else
  echo -e "${RED}❌ サービスARNの取得に失敗しました${NC}"
  exit 1
fi

#!/bin/bash

# 既存のApp Runnerサービスの環境変数のみを更新するスクリプト
# サービスを再作成せずに環境変数だけを更新します

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== App Runner 環境変数更新スクリプト ===${NC}"

# 設定
SERVICE_NAME="${1:-tabinaka-media-apprunner-new}"
REGION="ap-southeast-2"

echo -e "${YELLOW}サービス名: ${SERVICE_NAME}${NC}"

# .env.localファイルの存在確認
if [ ! -f ".env.local" ]; then
    echo -e "${RED}エラー: .env.localファイルが見つかりません${NC}"
    exit 1
fi

echo -e "${YELLOW}ステップ 1: .env.localから環境変数を読み込み中...${NC}"

# 環境変数の配列を作成
declare -a ENV_VARS

while IFS='=' read -r key value; do
    # コメント行と空行をスキップ
    if [[ $key =~ ^#.*$ ]] || [[ -z "$key" ]]; then
        continue
    fi
    
    # 前後の空白を削除
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    # 値が引用符で囲まれている場合は削除
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    
    # 環境変数を配列に追加
    ENV_VARS+=("Name=${key},Value=${value}")
    
done < .env.local

echo -e "${GREEN}✓ ${#ENV_VARS[@]} 個の環境変数を読み込みました${NC}"

echo -e "${YELLOW}ステップ 2: サービスARNを取得中...${NC}"

# サービスARNを取得
SERVICE_ARN=$(aws apprunner list-services --region ${REGION} --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn" --output text)

if [ -z "$SERVICE_ARN" ]; then
    echo -e "${RED}エラー: サービス '${SERVICE_NAME}' が見つかりません${NC}"
    exit 1
fi

echo -e "${GREEN}✓ サービスARN: ${SERVICE_ARN}${NC}"

echo -e "${YELLOW}ステップ 3: 現在の設定を取得中...${NC}"

# 現在のサービス設定を取得
CURRENT_CONFIG=$(aws apprunner describe-service --service-arn "${SERVICE_ARN}" --region ${REGION})

# 必要な情報を抽出
IMAGE_ID=$(echo "$CURRENT_CONFIG" | jq -r '.Service.SourceConfiguration.ImageRepository.ImageIdentifier')
PORT=$(echo "$CURRENT_CONFIG" | jq -r '.Service.SourceConfiguration.ImageRepository.ImageConfiguration.Port')
ACCESS_ROLE_ARN=$(echo "$CURRENT_CONFIG" | jq -r '.Service.SourceConfiguration.AuthenticationConfiguration.AccessRoleArn')

echo -e "${GREEN}✓ 現在の設定を取得しました${NC}"

echo -e "${YELLOW}ステップ 4: 環境変数を更新中...${NC}"

# 環境変数をJSON形式に変換
ENV_VARS_JSON="{"
first=true
for env_var in "${ENV_VARS[@]}"; do
    key=$(echo "$env_var" | cut -d'=' -f2 | cut -d',' -f1)
    value=$(echo "$env_var" | cut -d'=' -f3-)
    
    # JSONエスケープ
    value=$(echo "$value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
    
    if [ "$first" = true ]; then
        first=false
    else
        ENV_VARS_JSON="${ENV_VARS_JSON},"
    fi
    ENV_VARS_JSON="${ENV_VARS_JSON}\"${key}\":\"${value}\""
done
ENV_VARS_JSON="${ENV_VARS_JSON}}"

# 一時設定ファイルを作成
TEMP_CONFIG=$(mktemp)
cat > "$TEMP_CONFIG" <<EOF
{
    "ImageRepository": {
        "ImageIdentifier": "${IMAGE_ID}",
        "ImageConfiguration": {
            "Port": "${PORT}",
            "RuntimeEnvironmentVariables": ${ENV_VARS_JSON}
        },
        "ImageRepositoryType": "ECR"
    },
    "AuthenticationConfiguration": {
        "AccessRoleArn": "${ACCESS_ROLE_ARN}"
    }
}
EOF

# サービスを更新
aws apprunner update-service \
    --service-arn "${SERVICE_ARN}" \
    --source-configuration file://${TEMP_CONFIG} \
    --region ${REGION}

# 一時ファイルを削除
rm "$TEMP_CONFIG"

echo -e "${GREEN}✓ 環境変数の更新を開始しました${NC}"

echo -e "${YELLOW}ステップ 5: デプロイ状況を確認中...${NC}"

# デプロイ状況を表示
aws apprunner describe-service --service-arn "${SERVICE_ARN}" --region ${REGION} --query 'Service.{Status:Status,URL:ServiceUrl,UpdatedAt:UpdatedAt}' --output table

echo -e "${GREEN}=== 更新完了 ===${NC}"
echo -e "${YELLOW}注意: 更新の反映には数分かかる場合があります${NC}"
echo -e "${YELLOW}以下のコマンドでステータスを確認できます:${NC}"
echo -e "aws apprunner describe-service --service-arn ${SERVICE_ARN} --region ${REGION}"

#!/bin/bash

# ===========================================
# App Runner ログ確認スクリプト
# ===========================================

set -e

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE_NAME="tabinaka-media-ecr"
REGION="ap-southeast-2"

echo -e "${GREEN}=== App Runner ログ確認 ===${NC}"

# サービスARNを取得
SERVICE_ARN=$(aws apprunner list-services --region ${REGION} --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn" --output text 2>/dev/null || echo "")

if [ -z "$SERVICE_ARN" ]; then
    echo -e "${YELLOW}サービスが見つかりません: ${SERVICE_NAME}${NC}"
    exit 1
fi

echo -e "${BLUE}サービスARN: ${SERVICE_ARN}${NC}"

# サービスIDを抽出
SERVICE_ID="${SERVICE_ARN##*/}"

# ログストリームのパス
LOG_GROUP="/aws/apprunner/${SERVICE_NAME}/${SERVICE_ID}/application"

echo -e "${YELLOW}ログを確認中...${NC}"
echo -e "${BLUE}ログストリーム: ${LOG_GROUP}${NC}"
echo -e ""

# ログをフォロー
aws logs tail "${LOG_GROUP}" --follow --region ${REGION}

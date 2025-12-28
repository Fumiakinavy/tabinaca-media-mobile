#!/bin/bash

# App Runnerサービスが起動するまで待機するスクリプト

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICE_NAME="${1:-tabinaka-media-apprunner-new}"
REGION="ap-southeast-2"
MAX_WAIT_MINUTES=15

echo -e "${BLUE}=== App Runner サービス起動待機 ===${NC}"
echo -e "${YELLOW}サービス名: ${SERVICE_NAME}${NC}"

# サービスARNを取得
echo -e "${YELLOW}サービスARNを取得中...${NC}"
SERVICE_ARN=$(aws apprunner list-services --region ${REGION} --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn" --output text)

if [ -z "$SERVICE_ARN" ]; then
    echo -e "${RED}エラー: サービス '${SERVICE_NAME}' が見つかりません${NC}"
    exit 1
fi

echo -e "${GREEN}✓ サービスARN: ${SERVICE_ARN}${NC}"
echo ""

# 現在のステータスを表示
CURRENT_STATUS=$(aws apprunner describe-service --service-arn "${SERVICE_ARN}" --region ${REGION} --query 'Service.Status' --output text)
echo -e "${YELLOW}現在のステータス: ${CURRENT_STATUS}${NC}"

if [ "$CURRENT_STATUS" = "RUNNING" ]; then
    echo -e "${GREEN}✓ サービスは既に起動しています！${NC}"
    SERVICE_URL=$(aws apprunner describe-service --service-arn "${SERVICE_ARN}" --region ${REGION} --query 'Service.ServiceUrl' --output text)
    echo -e "${GREEN}URL: https://${SERVICE_URL}${NC}"
    exit 0
fi

echo -e "${YELLOW}サービスが起動するまで待機します（最大${MAX_WAIT_MINUTES}分）...${NC}"
echo ""

# 待機ループ
START_TIME=$(date +%s)
MAX_WAIT_SECONDS=$((MAX_WAIT_MINUTES * 60))
CHECK_INTERVAL=30  # 30秒ごとにチェック

while true; do
    # 経過時間を計算
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    ELAPSED_MINUTES=$((ELAPSED / 60))
    ELAPSED_SECONDS=$((ELAPSED % 60))
    
    # タイムアウトチェック
    if [ $ELAPSED -ge $MAX_WAIT_SECONDS ]; then
        echo -e "${RED}✗ タイムアウト: ${MAX_WAIT_MINUTES}分経過しました${NC}"
        echo -e "${YELLOW}サービスのログを確認してください:${NC}"
        echo -e "aws logs tail /aws/apprunner/${SERVICE_NAME}/service --region ${REGION}"
        exit 1
    fi
    
    # ステータスを取得
    STATUS=$(aws apprunner describe-service --service-arn "${SERVICE_ARN}" --region ${REGION} --query 'Service.Status' --output text)
    
    # 進捗表示
    printf "\r${BLUE}[%02d:%02d]${NC} ステータス: ${YELLOW}%-25s${NC}" $ELAPSED_MINUTES $ELAPSED_SECONDS "$STATUS"
    
    # ステータスチェック
    if [ "$STATUS" = "RUNNING" ]; then
        echo ""
        echo -e "${GREEN}✓ サービスが起動しました！${NC}"
        echo ""
        
        # サービス情報を表示
        aws apprunner describe-service --service-arn "${SERVICE_ARN}" --region ${REGION} --query 'Service.{Status:Status,URL:ServiceUrl,UpdatedAt:UpdatedAt}' --output table
        
        SERVICE_URL=$(aws apprunner describe-service --service-arn "${SERVICE_ARN}" --region ${REGION} --query 'Service.ServiceUrl' --output text)
        echo ""
        echo -e "${GREEN}🎉 デプロイ完了！${NC}"
        echo -e "${GREEN}URL: https://${SERVICE_URL}${NC}"
        echo ""
        echo -e "${YELLOW}次のステップ:${NC}"
        echo -e "1. ブラウザでアクセス: ${BLUE}https://${SERVICE_URL}${NC}"
        echo -e "2. ログを確認: ${BLUE}aws logs tail /aws/apprunner/${SERVICE_NAME}/service --follow --region ${REGION}${NC}"
        echo -e "3. 環境変数を更新: ${BLUE}./scripts/update-env-vars.sh ${SERVICE_NAME}${NC}"
        exit 0
    elif [ "$STATUS" = "CREATE_FAILED" ] || [ "$STATUS" = "OPERATION_FAILED" ]; then
        echo ""
        echo -e "${RED}✗ サービスの作成に失敗しました${NC}"
        echo -e "${YELLOW}詳細を確認:${NC}"
        aws apprunner describe-service --service-arn "${SERVICE_ARN}" --region ${REGION}
        exit 1
    fi
    
    # 待機
    sleep $CHECK_INTERVAL
done

#!/bin/bash
# App Runner サービスの状態とログを確認するスクリプト

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "App Runner サービス状態確認スクリプト"
echo "=========================================="
echo ""

# サービスARNの取得
if [ -z "$1" ]; then
  echo -e "${YELLOW}サービスARNを取得しています...${NC}"
  echo ""
  if aws apprunner list-services --query 'ServiceSummaryList[*].[ServiceName,ServiceArn]' --output table 2>/dev/null; then
    echo ""
  else
    echo -e "${YELLOW}サービス一覧の取得に失敗しました（権限不足の可能性）。${NC}"
    echo -e "${YELLOW}サービスARNを直接入力してください:${NC}"
  fi
  read -r SERVICE_ARN
else
  SERVICE_ARN=$1
fi

if [ -z "$SERVICE_ARN" ]; then
  echo -e "${RED}エラー: サービスARNが指定されていません${NC}"
  exit 1
fi

# サービスARNからリージョンを抽出
REGION=$(echo "$SERVICE_ARN" | cut -d: -f4)
if [ -z "$REGION" ] || [ "$REGION" = "$SERVICE_ARN" ]; then
  REGION="${AWS_REGION:-ap-southeast-2}"
fi

echo -e "${GREEN}サービスARN: ${SERVICE_ARN}${NC}"
echo -e "${GREEN}リージョン: ${REGION}${NC}"
echo ""

# サービスの基本情報を取得
echo "=========================================="
echo "サービス基本情報"
echo "=========================================="
echo ""

SERVICE_INFO=$(aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --region "$REGION" \
  --output json 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ サービスの情報を取得できませんでした${NC}"
  echo ""
  echo "エラー詳細:"
  echo "$SERVICE_INFO" | head -5
  exit 1
fi

# サービス状態
SERVICE_STATUS=$(echo "$SERVICE_INFO" | jq -r '.Service.Status // "unknown"')
SERVICE_URL=$(echo "$SERVICE_INFO" | jq -r '.Service.ServiceUrl // "N/A"')
SERVICE_NAME=$(echo "$SERVICE_INFO" | jq -r '.Service.ServiceName // "N/A"')

echo -e "サービス名: ${SERVICE_NAME}"
echo -e "状態: ${SERVICE_STATUS}"
echo -e "URL: ${SERVICE_URL}"
echo ""

# 状態に応じた色付け
if [ "$SERVICE_STATUS" = "RUNNING" ]; then
  echo -e "${GREEN}✅ サービスは正常に実行中です${NC}"
elif [ "$SERVICE_STATUS" = "OPERATION_IN_PROGRESS" ] || [ "$SERVICE_STATUS" = "CREATE_IN_PROGRESS" ] || [ "$SERVICE_STATUS" = "UPDATE_IN_PROGRESS" ]; then
  echo -e "${YELLOW}⏳ サービスは処理中です${NC}"
elif [ "$SERVICE_STATUS" = "CREATE_FAILED" ] || [ "$SERVICE_STATUS" = "UPDATE_FAILED" ] || [ "$SERVICE_STATUS" = "DELETE_FAILED" ]; then
  echo -e "${RED}❌ サービスは失敗状態です${NC}"
else
  echo -e "${YELLOW}⚠️  サービスの状態: ${SERVICE_STATUS}${NC}"
fi

echo ""

# 最新のデプロイ操作を確認
echo "=========================================="
echo "最新のデプロイ操作"
echo "=========================================="
echo ""

LATEST_OPERATION=$(aws apprunner list-operations \
  --service-arn "$SERVICE_ARN" \
  --region "$REGION" \
  --max-results 1 \
  --output json 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$LATEST_OPERATION" ]; then
  OPERATION_STATUS=$(echo "$LATEST_OPERATION" | jq -r '.OperationSummaryList[0].Status // "unknown"')
  OPERATION_TYPE=$(echo "$LATEST_OPERATION" | jq -r '.OperationSummaryList[0].Type // "unknown"')
  OPERATION_ID=$(echo "$LATEST_OPERATION" | jq -r '.OperationSummaryList[0].Id // "unknown"')
  STARTED_AT=$(echo "$LATEST_OPERATION" | jq -r '.OperationSummaryList[0].StartedAt // "unknown"')
  ENDED_AT=$(echo "$LATEST_OPERATION" | jq -r '.OperationSummaryList[0].EndedAt // "N/A"')
  
  echo "操作ID: $OPERATION_ID"
  echo "タイプ: $OPERATION_TYPE"
  echo "状態: $OPERATION_STATUS"
  echo "開始時刻: $STARTED_AT"
  echo "終了時刻: $ENDED_AT"
  echo ""
  
  if [ "$OPERATION_STATUS" = "FAILED" ]; then
    echo -e "${RED}❌ 最新のデプロイが失敗しました${NC}"
    echo ""
    echo "失敗の詳細を確認するには:"
    echo "  1. AWS App Runnerコンソール > サービス > デプロイタブ"
    echo "  2. 最新のデプロイを選択してログを確認"
    echo ""
  elif [ "$OPERATION_STATUS" = "IN_PROGRESS" ]; then
    echo -e "${YELLOW}⏳ デプロイが進行中です${NC}"
  elif [ "$OPERATION_STATUS" = "SUCCEEDED" ]; then
    echo -e "${GREEN}✅ 最新のデプロイは成功しました${NC}"
  fi
else
  echo -e "${YELLOW}デプロイ操作の情報を取得できませんでした${NC}"
fi

echo ""

# 環境変数の確認
echo "=========================================="
echo "環境変数の確認"
echo "=========================================="
echo ""

# ソースタイプを確認
SOURCE_CONFIG=$(echo "$SERVICE_INFO" | jq -r '.Service.SourceConfiguration // {}')

# ImageRepositoryかCodeRepositoryかを確認
if echo "$SOURCE_CONFIG" | jq -e '.ImageRepository' > /dev/null 2>&1; then
  SOURCE_TYPE="ImageRepository"
  ENV_VARS=$(echo "$SOURCE_CONFIG" | jq -r '.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables // {}')
elif echo "$SOURCE_CONFIG" | jq -e '.CodeRepository' > /dev/null 2>&1; then
  SOURCE_TYPE="CodeRepository"
  ENV_VARS=$(echo "$SOURCE_CONFIG" | jq -r '.CodeRepository.CodeConfiguration.CodeConfigurationValues.RuntimeEnvironmentVariables // {}')
else
  SOURCE_TYPE="unknown"
  ENV_VARS="{}"
fi

echo "ソースタイプ: $SOURCE_TYPE"
echo ""

if [ "$SOURCE_TYPE" = "ImageRepository" ] || [ "$SOURCE_TYPE" = "CodeRepository" ]; then
  # 環境変数が空オブジェクトでないか、またはnullでないか確認
  if [ "$ENV_VARS" != "{}" ] && [ "$ENV_VARS" != "null" ] && [ -n "$ENV_VARS" ]; then
    ENV_COUNT=$(echo "$ENV_VARS" | jq 'length // 0')
    if [ "$ENV_COUNT" -gt 0 ]; then
      echo "設定されている環境変数 ($ENV_COUNT 個):"
      echo "$ENV_VARS" | jq -r 'to_entries[] | "  \(.key): \(if (.value | type) == "string" and (.value | length) > 50 then (.value[:47] + "...") else .value end)"' 2>/dev/null || echo "  (環境変数の解析に失敗しました)"
      echo ""
      
      # 必須環境変数のチェック
      REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "ACCOUNT_TOKEN_SECRET")
      MISSING_VARS=()
      
      for VAR in "${REQUIRED_VARS[@]}"; do
        if ! echo "$ENV_VARS" | jq -e ".$VAR" > /dev/null 2>&1; then
          MISSING_VARS+=("$VAR")
        fi
      done
      
      if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo -e "${RED}❌ 以下の必須環境変数が設定されていません:${NC}"
        for VAR in "${MISSING_VARS[@]}"; do
          echo -e "  ${RED}- $VAR${NC}"
        done
        echo ""
        echo "環境変数を設定するには:"
        echo "  ./scripts/set-apprunner-env.sh $SERVICE_ARN"
        echo ""
      else
        echo -e "${GREEN}✅ 必須環境変数は全て設定されています${NC}"
        echo ""
      fi
    else
      echo -e "${RED}❌ 環境変数が設定されていません（空）${NC}"
      echo ""
      echo "環境変数を設定するには:"
      echo "  ./scripts/set-apprunner-env.sh $SERVICE_ARN"
      echo ""
    fi
  else
    echo -e "${RED}❌ 環境変数が設定されていません${NC}"
    echo ""
    echo "環境変数を設定するには:"
    echo "  ./scripts/set-apprunner-env.sh $SERVICE_ARN"
    echo ""
  fi
else
  echo -e "${YELLOW}⚠️  ソースタイプが不明です（$SOURCE_TYPE）${NC}"
  echo -e "${YELLOW}   サービスが失敗状態のため、設定情報を取得できません${NC}"
  echo ""
  echo "サービスを再作成するか、環境変数を設定してから再デプロイしてください。"
  echo ""
fi

# トラブルシューティングの推奨事項
echo "=========================================="
echo "トラブルシューティング"
echo "=========================================="
echo ""

if [ "$SERVICE_STATUS" != "RUNNING" ]; then
  echo "1. ログを確認:"
  echo "   AWS App Runnerコンソール > サービス > ログタブ"
  echo ""
  echo "2. デプロイログを確認:"
  echo "   AWS App Runnerコンソール > サービス > デプロイタブ > 最新のデプロイ"
  echo ""
  echo "3. CloudWatch Logsでログを確認:"
  LOG_GROUP="/aws/apprunner/$SERVICE_NAME"
  echo "   ロググループ: $LOG_GROUP"
  echo ""
  echo "   最新のログを表示:"
  echo "   aws logs tail $LOG_GROUP --follow --region $REGION"
  echo ""
  echo "   エラーログを検索:"
  echo "   aws logs filter-log-events --log-group-name $LOG_GROUP --filter-pattern 'ERROR' --region $REGION --max-items 20"
  echo ""
  echo "4. よくある原因:"
  echo "   - 環境変数の不足（特に NEXT_PUBLIC_* で始まる変数）"
  echo "   - アプリケーションの起動エラー"
  echo "   - ポート8080でリッスンしていない"
  echo "   - ヘルスチェックの失敗"
  echo "   - 必須環境変数の検証エラー"
  echo ""
  echo "5. デプロイ失敗時の確認事項:"
  echo "   a) 環境変数が設定されているか確認:"
  echo "      ./scripts/check-apprunner-status.sh $SERVICE_ARN"
  echo ""
  echo "   b) ローカルでDockerイメージをテスト:"
  echo "      docker run -p 8080:8080 -e PORT=8080 -e NODE_ENV=production \\"
  echo "        -e NEXT_PUBLIC_SUPABASE_URL=test -e NEXT_PUBLIC_SUPABASE_ANON_KEY=test \\"
  echo "        -e SUPABASE_SERVICE_ROLE_KEY=test -e ACCOUNT_TOKEN_SECRET=test \\"
  echo "        149843772536.dkr.ecr.ap-southeast-2.amazonaws.com/tabinaka-media:latest"
  echo ""
  echo "   c) アプリケーションログでエラーを確認:"
  echo "      App Runnerコンソール > サービス > ログタブ"
  echo ""
fi

echo "6. サービスを再デプロイ:"
echo "   AWS App Runnerコンソール > サービス > デプロイタブ > 新しいデプロイを開始"
echo ""
echo "7. 環境変数を設定/更新:"
echo "   ./scripts/set-apprunner-env.sh $SERVICE_ARN"
echo ""

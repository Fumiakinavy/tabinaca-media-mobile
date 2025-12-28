#!/bin/bash
# App Runner の環境変数を設定するスクリプト

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "App Runner 環境変数設定スクリプト"
echo "=========================================="
echo ""

# サービスARNの取得
if [ -z "$1" ]; then
  echo -e "${YELLOW}サービスARNを取得しています...${NC}"
  echo ""
  # 権限がない場合でもエラーで止まらないように
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
# ARN形式: arn:aws:apprunner:REGION:ACCOUNT:service/NAME/ID
REGION=$(echo "$SERVICE_ARN" | cut -d: -f4)
if [ -z "$REGION" ] || [ "$REGION" = "$SERVICE_ARN" ]; then
  # 抽出に失敗した場合はデフォルト値を使用
  REGION="${AWS_REGION:-ap-southeast-2}"
fi

echo ""
echo -e "${GREEN}サービスARN: ${SERVICE_ARN}${NC}"
echo -e "${GREEN}リージョン: ${REGION}${NC}"
echo ""

# 現在の設定を取得
echo "現在の設定を取得しています..."
CURRENT_CONFIG=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --region "$REGION" --output json 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo -e "${RED}❌ エラー: サービスの設定を取得できませんでした${NC}"
  echo ""
  echo "エラー詳細:"
  echo "$CURRENT_CONFIG" | head -5
  echo ""
  echo "考えられる原因:"
  echo "  1. IAM権限が不足している"
  echo "  2. サービスARNが正しくない"
  echo "  3. サービスが存在しない、または別のリージョンにある"
  echo ""
  echo "必要な権限:"
  echo "  - apprunner:DescribeService"
  echo "  - apprunner:UpdateService"
  echo ""
  echo "解決方法:"
  echo "  1. IAM管理者に権限の追加を依頼する"
  echo "  2. サービスARNが正しいか確認する"
  echo "  3. リージョンが正しいか確認する（現在のリージョン: ${AWS_REGION:-ap-southeast-2}）"
  echo "  4. または、AWSコンソールから手動で環境変数を設定する"
  echo ""
  if [ -f "docs/APP_RUNNER_IAM_PERMISSIONS.md" ]; then
    echo "詳細は docs/APP_RUNNER_IAM_PERMISSIONS.md を参照してください"
  fi
  echo ""
  exit 1
fi

# ソースタイプを確認
SOURCE_TYPE=$(echo "$CURRENT_CONFIG" | jq -r '.Service.SourceConfiguration.CodeRepository.RepositoryUrl // .Service.SourceConfiguration.ImageRepository.ImageRepositoryType // "unknown"')

if [ "$SOURCE_TYPE" = "unknown" ]; then
  echo -e "${RED}エラー: サービスの設定を取得できませんでした${NC}"
  exit 1
fi

echo -e "${GREEN}ソースタイプ: ${SOURCE_TYPE}${NC}"
echo ""

# 環境変数の入力
echo "=========================================="
echo "環境変数の設定"
echo "=========================================="
echo ""
echo -e "${YELLOW}必須環境変数を入力してください:${NC}"
echo ""

read -p "NEXT_PUBLIC_SUPABASE_URL: " NEXT_PUBLIC_SUPABASE_URL
read -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " NEXT_PUBLIC_SUPABASE_ANON_KEY
read -p "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
read -p "ACCOUNT_TOKEN_SECRET: " ACCOUNT_TOKEN_SECRET

echo ""
echo -e "${YELLOW}推奨環境変数を入力してください（Enterでスキップ）:${NC}"
echo ""

read -p "CORS_ORIGIN [https://gappytravel.com]: " CORS_ORIGIN
CORS_ORIGIN=${CORS_ORIGIN:-https://gappytravel.com}

read -p "ALLOWED_ORIGINS: " ALLOWED_ORIGINS
read -p "GOOGLE_PLACES_API_KEY_SERVER: " GOOGLE_PLACES_API_KEY_SERVER
read -p "NEXT_PUBLIC_BASE_URL: " NEXT_PUBLIC_BASE_URL
read -p "NEXT_PUBLIC_SITE_URL: " NEXT_PUBLIC_SITE_URL

echo ""
echo "=========================================="
echo "設定内容の確認"
echo "=========================================="
echo ""
echo "必須環境変数:"
echo "  NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:30}..."
echo "  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:30}..."
echo "  ACCOUNT_TOKEN_SECRET: ${ACCOUNT_TOKEN_SECRET:0:30}..."
echo ""
echo "推奨環境変数:"
echo "  CORS_ORIGIN: ${CORS_ORIGIN}"
[ -n "$ALLOWED_ORIGINS" ] && echo "  ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}"
[ -n "$GOOGLE_PLACES_API_KEY_SERVER" ] && echo "  GOOGLE_PLACES_API_KEY_SERVER: ${GOOGLE_PLACES_API_KEY_SERVER:0:30}..."
[ -n "$NEXT_PUBLIC_BASE_URL" ] && echo "  NEXT_PUBLIC_BASE_URL: ${NEXT_PUBLIC_BASE_URL}"
[ -n "$NEXT_PUBLIC_SITE_URL" ] && echo "  NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL}"
echo ""

read -p "この設定で更新しますか？ (y/N): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "キャンセルされました"
  exit 0
fi

echo ""
echo "環境変数を更新しています..."

# サービスが更新可能な状態になるまで待機
echo "サービスの状態を確認しています..."
MAX_WAIT_TIME=600  # 最大10分待機
WAIT_INTERVAL=15   # 15秒ごとに確認
ELAPSED_TIME=0
IN_PROGRESS_COUNT=0

while [ $ELAPSED_TIME -lt $MAX_WAIT_TIME ]; do
  SERVICE_STATUS=$(aws apprunner describe-service \
    --service-arn "$SERVICE_ARN" \
    --region "$REGION" \
    --query 'Service.Status' \
    --output text 2>/dev/null)
  
  if [ -z "$SERVICE_STATUS" ]; then
    echo -e "${YELLOW}警告: サービスの状態を取得できませんでした。再試行します...${NC}"
    sleep $WAIT_INTERVAL
    ELAPSED_TIME=$((ELAPSED_TIME + WAIT_INTERVAL))
    continue
  fi
  
  if [ "$SERVICE_STATUS" = "RUNNING" ]; then
    echo -e "${GREEN}✅ サービスは更新可能な状態です（状態: $SERVICE_STATUS）${NC}"
    break
  elif [ "$SERVICE_STATUS" = "OPERATION_IN_PROGRESS" ] || [ "$SERVICE_STATUS" = "CREATE_IN_PROGRESS" ] || [ "$SERVICE_STATUS" = "UPDATE_IN_PROGRESS" ] || [ "$SERVICE_STATUS" = "DELETE_IN_PROGRESS" ]; then
    IN_PROGRESS_COUNT=$((IN_PROGRESS_COUNT + 1))
    REMAINING_TIME=$((MAX_WAIT_TIME - ELAPSED_TIME))
    echo -e "${YELLOW}⏳ サービスが処理中です（状態: $SERVICE_STATUS）${NC}"
    echo -e "${YELLOW}   待機中... (経過: ${ELAPSED_TIME}秒 / 残り: ${REMAINING_TIME}秒)${NC}"
    sleep $WAIT_INTERVAL
    ELAPSED_TIME=$((ELAPSED_TIME + WAIT_INTERVAL))
  elif [ "$SERVICE_STATUS" = "PAUSED" ] || [ "$SERVICE_STATUS" = "DELETED" ]; then
    echo -e "${RED}❌ エラー: サービスが $SERVICE_STATUS 状態のため、更新できません${NC}"
    exit 1
  else
    echo -e "${YELLOW}⚠️  サービスの状態: $SERVICE_STATUS${NC}"
    echo -e "${YELLOW}   この状態では更新できない可能性があります${NC}"
    read -p "この状態で更新を続行しますか？ (y/N): " CONTINUE_ANYWAY
    if [ "$CONTINUE_ANYWAY" != "y" ] && [ "$CONTINUE_ANYWAY" != "Y" ]; then
      echo "キャンセルされました"
      exit 0
    fi
    break
  fi
done

if [ $ELAPSED_TIME -ge $MAX_WAIT_TIME ]; then
  echo ""
  echo -e "${RED}❌ タイムアウト: サービスが更新可能な状態になるまで待機しましたが、時間切れです${NC}"
  echo ""
  echo "現在のサービス状態: $SERVICE_STATUS"
  echo ""
  echo "解決方法:"
  echo "  1. しばらく待ってから再度実行してください"
  echo "  2. サービスの状態を確認:"
  echo "     aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION --query 'Service.Status'"
  echo "  3. サービスが 'RUNNING' 状態になるまで待機してください"
  echo ""
  exit 1
fi

if [ $IN_PROGRESS_COUNT -gt 0 ]; then
  echo -e "${GREEN}待機が完了しました（${IN_PROGRESS_COUNT}回の状態確認を実施）${NC}"
  echo ""
fi

echo ""

# 環境変数のJSONオブジェクトを作成
ENV_VARS_JSON=$(jq -n \
  --arg NODE_ENV "production" \
  --arg PORT "8080" \
  --arg NEXT_PUBLIC_SUPABASE_URL "$NEXT_PUBLIC_SUPABASE_URL" \
  --arg NEXT_PUBLIC_SUPABASE_ANON_KEY "$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --arg SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY" \
  --arg ACCOUNT_TOKEN_SECRET "$ACCOUNT_TOKEN_SECRET" \
  --arg CORS_ORIGIN "$CORS_ORIGIN" \
  '{
    NODE_ENV: $NODE_ENV,
    PORT: $PORT,
    NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: $NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: $SUPABASE_SERVICE_ROLE_KEY,
    ACCOUNT_TOKEN_SECRET: $ACCOUNT_TOKEN_SECRET,
    CORS_ORIGIN: $CORS_ORIGIN
  }' | jq --arg ALLOWED_ORIGINS "$ALLOWED_ORIGINS" \
         --arg GOOGLE_PLACES_API_KEY_SERVER "$GOOGLE_PLACES_API_KEY_SERVER" \
         --arg NEXT_PUBLIC_BASE_URL "$NEXT_PUBLIC_BASE_URL" \
         --arg NEXT_PUBLIC_SITE_URL "$NEXT_PUBLIC_SITE_URL" \
         '. + (
           if $ALLOWED_ORIGINS != "" then {ALLOWED_ORIGINS: $ALLOWED_ORIGINS} else {} end +
           if $GOOGLE_PLACES_API_KEY_SERVER != "" then {GOOGLE_PLACES_API_KEY_SERVER: $GOOGLE_PLACES_API_KEY_SERVER} else {} end +
           if $NEXT_PUBLIC_BASE_URL != "" then {NEXT_PUBLIC_BASE_URL: $NEXT_PUBLIC_BASE_URL} else {} end +
           if $NEXT_PUBLIC_SITE_URL != "" then {NEXT_PUBLIC_SITE_URL: $NEXT_PUBLIC_SITE_URL} else {} end
         )')

# ソースタイプに応じて設定を更新
if echo "$CURRENT_CONFIG" | jq -e '.Service.SourceConfiguration.CodeRepository' > /dev/null 2>&1; then
  # ソースベースデプロイ（GitHub等）
  echo "ソースベースデプロイとして更新します..."
  
  SOURCE_CONFIG=$(echo "$CURRENT_CONFIG" | jq '.Service.SourceConfiguration')
  
  UPDATE_CONFIG=$(jq -n \
    --argjson SOURCE_CONFIG "$SOURCE_CONFIG" \
    --argjson ENV_VARS "$ENV_VARS_JSON" \
    '{
      CodeRepository: ($SOURCE_CONFIG.CodeRepository | .CodeConfiguration.CodeConfigurationValues.RuntimeEnvironmentVariables = $ENV_VARS)
    }')
  
  UPDATE_OUTPUT=$(aws apprunner update-service \
    --service-arn "$SERVICE_ARN" \
    --region "$REGION" \
    --source-configuration "$UPDATE_CONFIG" \
    --output json 2>&1)
  UPDATE_EXIT_CODE=$?
  
elif echo "$CURRENT_CONFIG" | jq -e '.Service.SourceConfiguration.ImageRepository' > /dev/null 2>&1; then
  # ECRイメージデプロイ
  echo "ECRイメージデプロイとして更新します..."
  
  IMAGE_CONFIG=$(echo "$CURRENT_CONFIG" | jq '.Service.SourceConfiguration.ImageRepository')
  
  UPDATE_CONFIG=$(jq -n \
    --argjson IMAGE_CONFIG "$IMAGE_CONFIG" \
    --argjson ENV_VARS "$ENV_VARS_JSON" \
    '{
      ImageRepository: ($IMAGE_CONFIG | .ImageConfiguration.RuntimeEnvironmentVariables = $ENV_VARS)
    }')
  
  UPDATE_OUTPUT=$(aws apprunner update-service \
    --service-arn "$SERVICE_ARN" \
    --region "$REGION" \
    --source-configuration "$UPDATE_CONFIG" \
    --output json 2>&1)
  UPDATE_EXIT_CODE=$?
else
  echo -e "${RED}エラー: サポートされていないソースタイプです${NC}"
  exit 1
fi

if [ $UPDATE_EXIT_CODE -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ 環境変数の更新が完了しました${NC}"
  echo ""
  echo "サービスが自動的に再デプロイされます。"
  echo "デプロイの進行状況は以下で確認できます:"
  echo "  aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION --query 'Service.Status'"
  echo ""
else
  echo ""
  echo -e "${RED}❌ 環境変数の更新に失敗しました${NC}"
  echo ""
  echo "エラー詳細:"
  echo "$UPDATE_OUTPUT" | head -10
  echo ""
  
  if echo "$UPDATE_OUTPUT" | grep -q "OPERATION_IN_PROGRESS"; then
    echo -e "${YELLOW}原因: サービスが現在処理中（デプロイ中または更新中）のため、更新できません。${NC}"
    echo ""
    echo "現在のサービス状態を確認中..."
    CURRENT_STATUS=$(aws apprunner describe-service \
      --service-arn "$SERVICE_ARN" \
      --region "$REGION" \
      --query 'Service.Status' \
      --output text 2>/dev/null || echo "取得失敗")
    echo "  現在の状態: $CURRENT_STATUS"
    echo ""
    echo "解決方法:"
    echo "  1. 数分待ってから再度実行してください"
    echo "  2. サービスの状態を継続的に確認:"
    echo "     watch -n 5 'aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION --query \"Service.Status\" --output text'"
    echo "  3. サービスが 'RUNNING' 状態になるまで待機してください"
    echo ""
    echo "自動的に再試行する場合は、以下のコマンドを実行してください:"
    echo "  while true; do"
    echo "    STATUS=\$(aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION --query 'Service.Status' --output text)"
    echo "    if [ \"\$STATUS\" = \"RUNNING\" ]; then"
    echo "      echo 'サービスが更新可能な状態になりました'"
    echo "      break"
    echo "    fi"
    echo "    echo \"待機中... (状態: \$STATUS)\""
    echo "    sleep 15"
    echo "  done"
  elif echo "$UPDATE_OUTPUT" | grep -q "InvalidStateException"; then
    echo -e "${YELLOW}原因: サービスが更新できない状態です。${NC}"
    echo ""
    echo "現在のサービス状態を確認中..."
    CURRENT_STATUS=$(aws apprunner describe-service \
      --service-arn "$SERVICE_ARN" \
      --region "$REGION" \
      --query 'Service.Status' \
      --output text 2>/dev/null || echo "取得失敗")
    echo "  現在の状態: $CURRENT_STATUS"
    echo ""
    echo "解決方法:"
    echo "  1. サービスの状態を確認してください"
    echo "  2. サービスが 'RUNNING' 状態になるまで待機してください"
    echo "  3. 状態が 'RUNNING' になったら、再度このスクリプトを実行してください"
  fi
  echo ""
  exit 1
fi

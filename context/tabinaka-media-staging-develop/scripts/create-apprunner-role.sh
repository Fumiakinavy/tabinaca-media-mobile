#!/bin/bash
# App Runner サービスロールを作成するスクリプト

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "App Runner サービスロール作成スクリプト"
echo "=========================================="
echo ""

# ロール名の入力
if [ -z "$1" ]; then
  echo -e "${YELLOW}ロール名を入力してください（デフォルト: AppRunnerServiceRole-tabinaka-media）:${NC}"
  read -r ROLE_NAME
  ROLE_NAME=${ROLE_NAME:-AppRunnerServiceRole-tabinaka-media}
else
  ROLE_NAME=$1
fi

echo -e "${GREEN}ロール名: ${ROLE_NAME}${NC}"
echo ""

# ロールが既に存在するか確認
if aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null; then
  echo -e "${YELLOW}IAMロール ${ROLE_NAME} は既に存在します${NC}"
  ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
  echo -e "${GREEN}ロールARN: ${ROLE_ARN}${NC}"
  exit 0
fi

echo "IAMロールを作成しています..."

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

# ロールの作成
ROLE_ARN=$(aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document "$TRUST_POLICY" \
  --description "App Runner service role for ${ROLE_NAME}" \
  --query 'Role.Arn' \
  --output text 2>&1) || {
  echo -e "${RED}❌ IAMロールの作成に失敗しました${NC}"
  echo ""
  echo "エラー内容:"
  echo "$ROLE_ARN"
  echo ""
  echo "必要な権限:"
  echo "  - iam:CreateRole"
  echo "  - iam:AttachRolePolicy"
  echo "  - iam:PutRolePolicy"
  exit 1
}

echo -e "${GREEN}✅ IAMロールが作成されました: ${ROLE_ARN}${NC}"
echo ""

# App Runnerサービスロールポリシーのアタッチ
echo "App Runnerサービスロールポリシーをアタッチしています..."

# ECRアクセスポリシー（ECRを使用する場合）
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess" 2>&1 && {
  echo -e "${GREEN}✅ ECRアクセスポリシーをアタッチしました${NC}"
} || {
  echo -e "${YELLOW}警告: ECRアクセスポリシーのアタッチに失敗しました（ECRを使用しない場合は問題ありません）${NC}"
}

echo ""
echo "=========================================="
echo "作成完了"
echo "=========================================="
echo ""
echo "ロール名: $ROLE_NAME"
echo "ロールARN: $ROLE_ARN"
echo ""
echo "このロールARNをApp Runnerサービス作成時に使用してください。"

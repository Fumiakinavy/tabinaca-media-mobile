#!/bin/bash
# App Runner 権限ポリシーをIAMユーザーに適用するスクリプト

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "App Runner 権限ポリシー適用スクリプト"
echo "=========================================="
echo ""

# ポリシーファイルの確認
POLICY_FILE="apprunner-permissions-policy.json"
if [ ! -f "$POLICY_FILE" ]; then
  echo -e "${RED}エラー: $POLICY_FILE が見つかりません${NC}"
  exit 1
fi

# IAMユーザー名の取得
if [ -z "$1" ]; then
  echo -e "${YELLOW}IAMユーザー名を入力してください:${NC}"
  read -r IAM_USER_NAME
else
  IAM_USER_NAME=$1
fi

if [ -z "$IAM_USER_NAME" ]; then
  echo -e "${RED}エラー: IAMユーザー名が指定されていません${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}IAMユーザー: ${IAM_USER_NAME}${NC}"
echo -e "${GREEN}ポリシーファイル: ${POLICY_FILE}${NC}"
echo ""

# ポリシー名
POLICY_NAME="AppRunnerPermissionsPolicy"

echo "ポリシーの内容:"
cat "$POLICY_FILE" | jq '.'
echo ""

read -p "このポリシーを適用しますか？ (y/N): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "キャンセルされました"
  exit 0
fi

echo ""
echo "ポリシーを適用しています..."

# インラインポリシーとして追加
aws iam put-user-policy \
  --user-name "$IAM_USER_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://$POLICY_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ ポリシーの適用が完了しました${NC}"
  echo ""
  echo "適用されたポリシー:"
  echo "  ユーザー: $IAM_USER_NAME"
  echo "  ポリシー名: $POLICY_NAME"
  echo ""
  echo "次のステップ:"
  echo "  ./scripts/set-apprunner-env.sh <SERVICE_ARN>"
  echo ""
else
  echo ""
  echo -e "${RED}❌ ポリシーの適用に失敗しました${NC}"
  echo ""
  echo "考えられる原因:"
  echo "  1. IAMユーザーが存在しない"
  echo "  2. 権限が不足している（IAMポリシーの管理権限が必要）"
  echo "  3. ポリシーファイルの形式が正しくない"
  echo ""
  exit 1
fi

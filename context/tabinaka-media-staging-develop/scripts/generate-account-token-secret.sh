#!/bin/bash
# ACCOUNT_TOKEN_SECRET を生成するスクリプト
# HMAC-SHA256の秘密鍵として使用されるため、32バイト（256ビット）のランダムデータを生成

echo "ACCOUNT_TOKEN_SECRET を生成しています..."
echo "（32バイト = 256ビットの暗号学的に安全な乱数）"
echo ""

SECRET=$(openssl rand -base64 32)
BYTE_LENGTH=$(echo -n "$SECRET" | base64 -d | wc -c | tr -d ' ')

echo "生成された値:"
echo "ACCOUNT_TOKEN_SECRET=$SECRET"
echo ""
echo "検証:"
echo "  - 長さ: ${#SECRET} 文字"
echo "  - バイト数: $BYTE_LENGTH バイト"
echo ""

if [ "$BYTE_LENGTH" -lt 32 ]; then
  echo "⚠️  警告: 32バイト未満です。セキュリティ上推奨されません。"
else
  echo "✅ 32バイト以上です。セキュリティ要件を満たしています。"
fi

echo ""
echo "この値を App Runner の環境変数に設定してください:"
echo "1. AWS App Runner コンソールを開く"
echo "2. サービスを選択 > 「設定」タブ > 「環境変数」"
echo "3. 環境変数名: ACCOUNT_TOKEN_SECRET"
echo "4. 環境変数の値: $SECRET"
echo "5. 保存して再デプロイ"
echo ""
echo "⚠️  重要: この値を安全に保管してください。"
echo "   一度設定したら、本番環境では変更しないでください。"
echo ""

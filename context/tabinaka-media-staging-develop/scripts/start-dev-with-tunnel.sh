#!/bin/bash

# Gappy開発環境 + ngrok トンネル起動スクリプト

echo "🚀 Gappy開発環境を起動中..."
echo "📡 ngrokトンネルも同時に起動します"
echo ""

# 依存関係をインストール（必要に応じて）
if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストール中..."
    npm install
fi

# concurrentlyを使って開発サーバーとngrokを同時起動
echo "🔧 開発サーバーとngrokトンネルを起動中..."
npm run dev:tunnel

echo ""
echo "✅ 起動完了！"
echo "🌐 ローカル: http://localhost:3001"
echo "🌍 外部アクセス: ngrokのURLを確認してください"

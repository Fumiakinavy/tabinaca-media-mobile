# ngrok セットアップガイド

このプロジェクトでは、ローカル開発環境を外部からアクセス可能にするためにngrokを使用しています。

## 前提条件

- ngrokがインストールされていること
- ngrokアカウントを持っていること（無料アカウントでOK）

## セットアップ

### 1. ngrok認証トークンの設定

```bash
# ngrokアカウントから取得した認証トークンを設定
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 2. 依存関係のインストール

```bash
npm install
```

## 使用方法

### 基本的な使用方法

```bash
# 開発サーバーとngrokトンネルを同時起動
npm run dev:tunnel

# または個別に起動
npm run dev          # 開発サーバーのみ
npm run tunnel       # ngrokトンネルのみ
```

### 便利なスクリプト

```bash
# 開発環境 + トンネルを一括起動
./scripts/start-dev-with-tunnel.sh
```

### 利用可能なコマンド

- `npm run dev` - 開発サーバーを起動（ポート3001）
- `npm run tunnel` - ngrokトンネルを起動
- `npm run dev:tunnel` - 開発サーバーとngrokを同時起動
- `npm run tunnel:https` - HTTPS対応のngrokトンネル

## 設定ファイル

`ngrok.yml`ファイルでngrokの設定を管理しています：

- `gappy-dev`: HTTPS対応のトンネル
- `gappy-dev-http`: HTTP対応のトンネル

## トラブルシューティング

### ポートが使用中の場合

```bash
# ポート3001を使用しているプロセスを確認
lsof -i :3001

# プロセスを終了
kill -9 PID
```

### ngrokが起動しない場合

```bash
# ngrokのバージョンを確認
ngrok version

# 設定ファイルの構文をチェック
ngrok config check
```

## 外部アクセス

ngrokが起動すると、以下のようなURLが表示されます：

```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        Asia Pacific (Tokyo)
Latency                       50ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3001
```

このURL（例：`https://abc123.ngrok.io`）を外部の人と共有することで、ローカル開発環境にアクセスしてもらえます。

## 注意事項

- 無料プランでは、ngrokのURLは再起動するたびに変わります
- 有料プランでは、固定のサブドメインを使用できます
- 開発用のため、本番環境では使用しないでください

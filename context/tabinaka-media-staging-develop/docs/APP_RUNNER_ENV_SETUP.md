# AWS App Runner 環境変数設定ガイド

## 概要

VercelからAWS App Runnerへ移行する際に必要な環境変数の設定ガイドです。

## クイックスタート

ビルドログに環境変数の警告が表示されている場合、以下の手順で設定してください：

1. **AWS App Runnerコンソールを開く**
2. **サービスを選択** > 「設定」タブ > 「環境変数」> 「編集」
3. **以下の必須環境変数を追加**（値は実際の値に置き換えてください）：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
ACCOUNT_TOKEN_SECRET=<openssl rand -base64 32 で生成>
CORS_ORIGIN=https://gappytravel.com
```

4. **保存**してサービスを再デプロイ

詳細は以下のセクションを参照してください。

---

## 必須環境変数

### 1. Supabase設定

| 環境変数名 | 説明 | 例 |
|-----------|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー（公開可） | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー（秘密） | `eyJhbGciOiJIUzI1NiIs...` |

### 2. アカウント認証

| 環境変数名 | 説明 | 生成方法 |
|-----------|------|---------|
| `ACCOUNT_TOKEN_SECRET` | アカウントトークン署名用秘密鍵（HMAC-SHA256用） | `openssl rand -base64 32` |

**セキュリティ要件**:
- **長さ**: 最低32バイト（256ビット）のランダムデータが必要
- **エントロピー**: 暗号学的に安全な乱数生成器で生成すること
- **形式**: base64エンコードされた文字列（約44文字）
- **用途**: HMAC-SHA256の秘密鍵として使用されるため、予測不可能である必要がある

**推奨される生成方法**:
```bash
# 方法1: openssl（推奨）
openssl rand -base64 32

# 方法2: スクリプトを使用
./scripts/generate-account-token-secret.sh
```

**禁止事項**:
- ❌ `replace-this-with-a-long-random-string` などのプレースホルダー値
- ❌ 短すぎる文字列（32バイト未満）
- ❌ 予測可能な文字列（連番、日付、単語など）
- ❌ 既知の値やサンプル値の再利用

**例**:
- ✅ `HZq1cKJ8cfywYU6rFJbcVDyaxK7QzaHCuEakX9SFX4I=` (44文字、32バイト)
- ❌ `my-secret-key` (短すぎる、予測可能)
- ❌ `12345678901234567890123456789012` (連番、予測可能)

### 3. アプリケーション設定

| 環境変数名 | 説明 | 値 |
|-----------|------|-----|
| `NODE_ENV` | 実行環境 | `production` |
| `PORT` | リッスンポート | `8080` |

### 4. CORS設定 (App Runner用に追加)

| 環境変数名 | 説明 | 例 |
|-----------|------|-----|
| `CORS_ORIGIN` | メインの許可オリジン | `https://gappytravel.com` |
| `ALLOWED_ORIGINS` | 複数オリジン（カンマ区切り） | `https://gappytravel.com,https://www.gappytravel.com` |

### 5. サイトURL設定

| 環境変数名 | 説明 | 例 |
|-----------|------|-----|
| `NEXT_PUBLIC_BASE_URL` | APIのベースURL（App RunnerのURL） | `https://xxxxx.ap-northeast-1.awsapprunner.com` |
| `NEXT_PUBLIC_SITE_URL` | フロントエンドのURL | `https://gappytravel.com` |

### 6. Google Places API

| 環境変数名 | 説明 | 備考 |
|-----------|------|------|
| `GOOGLE_PLACES_API_KEY_SERVER` | サーバーサイド用APIキー | 必須: Places API, Maps APIを有効化 |

### 7. Cookie設定 (クロスオリジン対応)

App RunnerのドメインとフロントエンドのURLが異なる場合に設定が必要です。

| 環境変数名 | 説明 | 値 |
|-----------|------|-----|
| `COOKIE_SAME_SITE` | SameSite属性 | `Lax`（デフォルト）/ `None`（クロスオリジン時） |
| `COOKIE_DOMAIN` | Domain属性（サブドメイン共有用） | `.gappytravel.com`（先頭にドット） |

**重要**: 
- `COOKIE_SAME_SITE=None` を設定する場合、HTTPS（Secure属性）が必須です
- クロスオリジンリクエストでCookieを送信する場合は `SameSite=None` が必要です
- 同一ドメインで運用する場合は設定不要（デフォルトの `Lax` で動作します）

---

## オプション環境変数

### Google Maps API (クライアントサイド)

| 環境変数名 | 説明 |
|-----------|------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | クライアント用Maps APIキー |

### Google Analytics

| 環境変数名 | 説明 |
|-----------|------|
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager ID |

### AWS Bedrock (チャット機能)

| 環境変数名 | 説明 |
|-----------|------|
| `AWS_BEDROCK_ACCESS_KEY_ID` | Bedrock用IAMアクセスキー |
| `AWS_BEDROCK_SECRET_ACCESS_KEY` | Bedrock用IAMシークレットキー |
| `AWS_BEDROCK_REGION` | Bedrockリージョン（例: `us-east-1`） |

### Slack通知

| 環境変数名 | 説明 |
|-----------|------|
| `SLACK_WEBHOOK_URL` | 一般通知用Webhook URL |
| `SLACK_USER_SIGNUP_WEBHOOK_URL` | 新規登録通知用Webhook URL |
| `SLACK_BOT_USERNAME` | Bot表示名（デフォルト: Gappy Bot） |
| `SLACK_ICON_EMOJI` | Botアイコン（デフォルト: :robot_face:） |

### SendGrid (メール送信)

| 環境変数名 | 説明 |
|-----------|------|
| `SENDGRID_API_KEY` | SendGrid APIキー |
| `SENDGRID_FROM_EMAIL` | 送信元メールアドレス |

### Cloudinary (画像管理)

| 環境変数名 | 説明 |
|-----------|------|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | クラウド名 |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | APIキー |
| `CLOUDINARY_API_SECRET` | APIシークレット |

---

## App Runner での設定方法

### 方法1: AWS Console（推奨）

1. AWS App Runnerコンソールを開く
2. サービスを選択
3. 「設定」タブ > 「環境変数」
4. 「編集」をクリック
5. 以下の必須環境変数を追加：

**必須環境変数（ビルドログの警告を解消するために必要）:**
- `NEXT_PUBLIC_SUPABASE_URL` - SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase匿名キー
- `SUPABASE_SERVICE_ROLE_KEY` - Supabaseサービスロールキー（機密情報）
- `ACCOUNT_TOKEN_SECRET` - アカウントトークン署名用秘密鍵（機密情報）

**推奨環境変数:**
- `CORS_ORIGIN` - メインの許可オリジン（例: `https://gappytravel.com`）
- `ALLOWED_ORIGINS` - 複数オリジン（カンマ区切り）
- `GOOGLE_PLACES_API_KEY_SERVER` - Google Places APIキー
- `NEXT_PUBLIC_BASE_URL` - App RunnerのURL（例: `https://xxxxx.ap-northeast-1.awsapprunner.com`）
- `NEXT_PUBLIC_SITE_URL` - フロントエンドのURL（例: `https://gappytravel.com`）

6. 「保存」をクリック
7. サービスを再デプロイ（自動的に再デプロイが開始される場合があります）

### 方法2: AWS CLI

```bash
aws apprunner update-service \
  --service-arn arn:aws:apprunner:ap-northeast-1:ACCOUNT_ID:service/SERVICE_NAME/SERVICE_ID \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "YOUR_ECR_IMAGE",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "CORS_ORIGIN": "https://gappytravel.com",
          "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co"
        }
      }
    }
  }'
```

### 方法3: apprunner.yaml

```yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - npm ci
      - npm run build
run:
  command: npm start
  network:
    port: 8080
  env:
    - name: NODE_ENV
      value: "production"
    - name: PORT
      value: "8080"
    - name: CORS_ORIGIN
      value: "https://gappytravel.com"
```

---

## 機密情報の管理

機密性の高い環境変数は **AWS Secrets Manager** で管理することを推奨:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCOUNT_TOKEN_SECRET`
- `GOOGLE_PLACES_API_KEY_SERVER`
- `AWS_BEDROCK_SECRET_ACCESS_KEY`
- `SENDGRID_API_KEY`
- `CLOUDINARY_API_SECRET`

### Secrets Manager との連携

```bash
# シークレット作成
aws secretsmanager create-secret \
  --name gappy/production/env \
  --secret-string '{
    "SUPABASE_SERVICE_ROLE_KEY": "your_key",
    "ACCOUNT_TOKEN_SECRET": "your_secret"
  }'
```

---

## 環境変数チェックリスト

デプロイ前に以下を確認:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` が正しいSupabaseプロジェクトを指している
- [ ] `CORS_ORIGIN` が本番ドメインに設定されている
- [ ] `NEXT_PUBLIC_BASE_URL` がApp RunnerのURLに設定されている
- [ ] `GOOGLE_PLACES_API_KEY_SERVER` が有効で、必要なAPIが有効化されている
- [ ] `ACCOUNT_TOKEN_SECRET` が32文字以上のランダムな文字列である
- [ ] `NODE_ENV` が `production` に設定されている

---

---

## 静的ファイルのデプロイ

### standaloneモードでの注意点

`next.config.js` で `output: "standalone"` を設定している場合、静的ファイル（`public/` フォルダと `.next/static/`）は自動的にコピーされません。

Dockerfileまたはデプロイスクリプトで手動でコピーする必要があります:

```dockerfile
# ビルドステージ
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 実行ステージ
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# standaloneのサーバーをコピー
COPY --from=builder /app/.next/standalone ./

# 静的ファイルをコピー（重要!）
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080
CMD ["node", "server.js"]
```

### 不足している静的ファイル

現在、以下のファイルが参照されていますが存在しない可能性があります:

- `/images/hero.jpg` - OGP画像として参照されている

これらのファイルを `public/images/` フォルダに配置してください。

---

## ビルドログの警告について

ビルドログに以下のような警告が表示される場合があります：

```
❌ Missing environment variables: [ 'ACCOUNT_TOKEN_SECRET', 'SUPABASE_SERVICE_ROLE_KEY' ]
```

これは**ビルド時の警告**であり、ビルド自体は成功します。ただし、**実行時にこれらの環境変数が必要**です。

### 対処方法

1. **ビルド時**: 環境変数がなくてもビルドは成功します（CI環境ではスキップされます）
2. **実行時**: 以下の環境変数が必須です：
   - `ACCOUNT_TOKEN_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

これらの環境変数をApp Runnerコンソールで設定してください（上記「方法1: AWS Console」を参照）。

### その他の警告

- **非推奨パッケージの警告**: `rimraf@3.0.2`, `eslint@8.57.1` などは警告のみで、ビルドには影響しません
- **セキュリティ脆弱性**: `npm audit fix` で修正可能ですが、本番環境への影響を確認してから実行してください
- **大きなページデータ**: `/articles/[slug]` や `/liked-activities` のデータサイズが大きい場合の警告です。パフォーマンス最適化を検討してください

---

## トラブルシューティング

### 環境変数を設定してもエラーが出る場合

#### 1. 環境変数が正しく設定されているか確認

App Runnerコンソールで以下を確認してください：

- **環境変数名のスペルミス**: 大文字小文字を正確に（例: `NEXT_PUBLIC_SUPABASE_URL`）
- **値が空でないか**: 環境変数の値が設定されているか確認
- **特殊文字のエスケープ**: 値に特殊文字が含まれる場合、適切にエスケープされているか

#### 2. よくあるエラーメッセージと対処法

**エラー: `Missing required server environment variables: ACCOUNT_TOKEN_SECRET, SUPABASE_SERVICE_ROLE_KEY`**

- **原因**: 必須環境変数が設定されていない
- **対処法**: 
  1. App Runnerコンソール > 「設定」> 「環境変数」で以下を確認：
     - `ACCOUNT_TOKEN_SECRET`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  2. 環境変数を追加/修正後、**サービスを再デプロイ**（重要！）

**エラー: `Environment variable NEXT_PUBLIC_SUPABASE_URL is not set`**

- **原因**: `NEXT_PUBLIC_`プレフィックスが付く環境変数は**ビルド時**にも必要です
- **対処法**: 
  - App Runnerのソースベースデプロイを使用している場合、環境変数を設定してから再デプロイ
  - または、`apprunner.yaml`の`build`セクションで環境変数を設定

**エラー: サービスが起動しない / ヘルスチェックが失敗する**

- **原因**: 環境変数の設定が反映されていない、またはポート設定の問題
- **対処法**:
  1. App Runnerのログを確認（「ログ」タブ）
  2. 環境変数設定後、必ず**再デプロイ**を実行
  3. `PORT=8080`が設定されているか確認

#### 3. 環境変数の設定を確認する方法

App Runnerコンソールで：
1. サービスを選択
2. 「設定」タブ > 「環境変数」
3. 設定されている環境変数の一覧を確認

または、AWS CLIで確認：
```bash
aws apprunner describe-service \
  --service-arn <SERVICE_ARN> \
  --query 'Service.SourceConfiguration.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables'
```

#### 4. 再デプロイが必要な場合

環境変数を追加/変更した後は、**必ず再デプロイ**が必要です：

1. **自動再デプロイ**: 環境変数を保存すると自動的に再デプロイが開始される場合があります
2. **手動再デプロイ**: 「デプロイ」タブから「新しいデプロイを開始」をクリック

#### 5. NEXT_PUBLIC_ プレフィックスの環境変数について

`NEXT_PUBLIC_`で始まる環境変数は、**ビルド時**にクライアント側のコードに埋め込まれます。

- **ソースベースデプロイ**: `apprunner.yaml`の`build`セクションで環境変数を設定するか、App Runnerコンソールで設定（ビルド時に利用可能）
- **ECRイメージデプロイ**: ビルド時に環境変数が必要なため、Dockerfileのビルドステージで設定するか、ビルド前に設定

### CORS エラーが発生する場合

1. `CORS_ORIGIN` が正しく設定されているか確認
2. `ALLOWED_ORIGINS` に全ての必要なオリジンが含まれているか確認
3. App Runnerを再起動して環境変数を反映

### 401 Unauthorized エラーが発生する場合

1. `ACCOUNT_TOKEN_SECRET` が設定されているか確認
2. `SUPABASE_SERVICE_ROLE_KEY` が有効か確認
3. Cookie設定（SameSite, Secure）を確認

### 500 Internal Server Error が発生する場合

1. App Runnerのログを確認
2. 必須環境変数が全て設定されているか確認
3. Supabaseへの接続が可能か確認


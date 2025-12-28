# App Runner クイックスタートガイド

## 🚀 新しいサービスが作成されました！

### サービス情報
- **サービス名**: `tabinaka-media-apprunner-new`
- **サービスURL**: `https://63pxjeg5fm.ap-southeast-2.awsapprunner.com`
- **サービスARN**: `arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-apprunner-new/9af43d3142d04500b6bf45128809f1d9`
- **ステータス**: デプロイ中（5-10分かかります）

### 環境変数
`.env.local`から以下の環境変数が自動的に読み込まれました：
- ACCOUNT_TOKEN_SECRET
- AWS_BEDROCK_ACCESS_KEY_ID
- AWS_BEDROCK_SECRET_ACCESS_KEY
- AWS_BEDROCK_REGION
- AWS_BEDROCK_MODEL_ID
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SITE_URL
- NGROK_AUTHTOKEN

## 📋 よく使うコマンド

### サービスのステータスを確認
```bash
aws apprunner describe-service \
    --service-arn arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-apprunner-new/9af43d3142d04500b6bf45128809f1d9 \
    --region ap-southeast-2 \
    --query 'Service.{Status:Status,URL:ServiceUrl}' \
    --output table
```

### ログを確認（リアルタイム）
```bash
aws logs tail /aws/apprunner/tabinaka-media-apprunner-new/service \
    --follow \
    --region ap-southeast-2
```

### 環境変数を更新
```bash
# .env.localを編集した後
./scripts/update-env-vars.sh tabinaka-media-apprunner-new
```

### サービスを再デプロイ（最新のECRイメージを使用）
```bash
aws apprunner start-deployment \
    --service-arn arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-apprunner-new/9af43d3142d04500b6bf45128809f1d9 \
    --region ap-southeast-2
```

### サービスを一時停止
```bash
aws apprunner pause-service \
    --service-arn arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-apprunner-new/9af43d3142d04500b6bf45128809f1d9 \
    --region ap-southeast-2
```

### サービスを再開
```bash
aws apprunner resume-service \
    --service-arn arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-apprunner-new/9af43d3142d04500b6bf45128809f1d9 \
    --region ap-southeast-2
```

### サービスを削除
```bash
aws apprunner delete-service \
    --service-arn arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-apprunner-new/9af43d3142d04500b6bf45128809f1d9 \
    --region ap-southeast-2
```

## ⚠️ 重要な注意事項

### 1. NEXT_PUBLIC_SITE_URLの更新が必要
現在、`NEXT_PUBLIC_SITE_URL`は`http://localhost:2098`に設定されています。
本番環境では、App RunnerのURLに更新する必要があります：

```bash
# .env.localを編集
NEXT_PUBLIC_SITE_URL=https://63pxjeg5fm.ap-southeast-2.awsapprunner.com

# 環境変数を更新
./scripts/update-env-vars.sh tabinaka-media-apprunner-new
```

### 2. カスタムドメインの設定
App RunnerのデフォルトURLではなく、独自ドメインを使用する場合：

```bash
aws apprunner associate-custom-domain \
    --service-arn arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-apprunner-new/9af43d3142d04500b6bf45128809f1d9 \
    --domain-name yourdomain.com \
    --region ap-southeast-2
```

### 3. 環境変数の追加
新しい環境変数を追加する場合：
1. `.env.local`に追加
2. `./scripts/update-env-vars.sh tabinaka-media-apprunner-new`を実行

### 4. コスト管理
- App Runnerは使用時間に応じて課金されます
- 使用していない時は`pause-service`で一時停止することをお勧めします
- 完全に不要になったら`delete-service`で削除してください

## 🔍 トラブルシューティング

### サービスが起動しない場合
1. ログを確認：
```bash
aws logs tail /aws/apprunner/tabinaka-media-apprunner-new/service --region ap-southeast-2
```

2. ヘルスチェックの確認：
```bash
curl https://63pxjeg5fm.ap-southeast-2.awsapprunner.com/
```

3. 環境変数の確認：
```bash
aws apprunner describe-service \
    --service-arn arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-apprunner-new/9af43d3142d04500b6bf45128809f1d9 \
    --region ap-southeast-2 \
    --query 'Service.SourceConfiguration.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables'
```

## 📚 関連ドキュメント

- 詳細なデプロイ手順: `docs/APPRUNNER_DEPLOYMENT.md`
- デプロイスクリプト: `scripts/deploy-apprunner.sh`
- 環境変数更新スクリプト: `scripts/update-env-vars.sh`

## 🎉 次のステップ

1. サービスが`RUNNING`ステータスになるまで待つ（5-10分）
2. `https://63pxjeg5fm.ap-southeast-2.awsapprunner.com`にアクセスして動作確認
3. 必要に応じて`NEXT_PUBLIC_SITE_URL`を更新
4. カスタムドメインを設定（オプション）

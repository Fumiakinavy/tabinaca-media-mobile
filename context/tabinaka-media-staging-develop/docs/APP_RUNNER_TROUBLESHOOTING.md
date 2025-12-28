# AWS App Runner トラブルシューティングガイド

## 環境変数エラーの解決方法

### エラーメッセージ別の対処法

#### 1. `Missing required server environment variables: ...`

**症状**: アプリケーションが起動しない、またはエラーログにこのメッセージが表示される

**原因**: 必須環境変数が設定されていない、または正しく読み込まれていない

**解決手順**:

1. **App Runnerコンソールで環境変数を確認**
   - サービスを選択 > 「設定」タブ > 「環境変数」
   - 以下の環境変数が設定されているか確認：
     - `ACCOUNT_TOKEN_SECRET`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **環境変数名の確認**
   - 大文字小文字が正確か（例: `NEXT_PUBLIC_SUPABASE_URL`）
   - スペースや特殊文字が含まれていないか
   - 値が空でないか

3. **再デプロイ**
   - 環境変数を追加/変更した後は、必ず再デプロイが必要
   - 「デプロイ」タブから「新しいデプロイを開始」をクリック

4. **ログの確認**
   - 「ログ」タブでエラーメッセージの詳細を確認
   - 環境変数の値は表示されませんが、どの環境変数が不足しているかは確認できます

#### 2. `Environment variable ... is not set`

**症状**: 特定の環境変数が設定されていないというエラー

**原因**: 環境変数が設定されていない、またはビルド時に利用できない

**解決手順**:

1. **NEXT_PUBLIC_ プレフィックスの環境変数**
   - `NEXT_PUBLIC_`で始まる環境変数は**ビルド時**に必要です
   - App Runnerコンソールで設定した環境変数はビルド時にも利用可能です
   - 環境変数を設定してから**再デプロイ**してください

2. **環境変数の設定場所**
   - App Runnerコンソール: 「設定」> 「環境変数」
   - または `apprunner.yaml` の `run.env` セクション（非推奨: 機密情報は含めない）

3. **Secrets Manager の使用**
   - 機密情報は AWS Secrets Manager で管理することを推奨
   - App Runnerコンソールで Secrets Manager の ARN を指定

#### 3. サービスが起動しない / ヘルスチェックが失敗する

**症状**: サービスが「実行中」にならない、またはヘルスチェックが失敗する

**原因**: 
- 環境変数の不足
- ポート設定の問題
- アプリケーションの起動エラー

**解決手順**:

1. **ログの確認**
   ```
   App Runnerコンソール > サービス > 「ログ」タブ
   ```
   - エラーメッセージを確認
   - スタックトレースがある場合は、エラーの発生箇所を特定

2. **ポート設定の確認**
   - `apprunner.yaml` で `port: 8080` が設定されているか
   - `package.json` の `start` スクリプトが `next start` になっているか（`PORT`環境変数を自動読み取り）

3. **環境変数の再確認**
   - 必須環境変数が全て設定されているか
   - 値が正しいか（URLの形式、キーの長さなど）

4. **ビルドログの確認**
   - 「デプロイ」タブ > 最新のデプロイ > 「ビルドログ」を確認
   - ビルド時のエラーがないか確認

### 環境変数の設定確認方法

#### AWS CLI で確認

```bash
# サービスARNを取得
aws apprunner list-services --query 'ServiceSummaryList[*].[ServiceName,ServiceArn]' --output table

# 環境変数を確認
aws apprunner describe-service \
  --service-arn <SERVICE_ARN> \
  --query 'Service.SourceConfiguration.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables' \
  --output json
```

#### App Runnerコンソールで確認

1. サービスを選択
2. 「設定」タブ > 「環境変数」
3. 設定されている環境変数の一覧を確認

### よくある間違い

1. **プレースホルダー値の使用**
   - ❌ `ACCOUNT_TOKEN_SECRET=replace-this-with-a-long-random-string`
   - ✅ `ACCOUNT_TOKEN_SECRET=vuwMc34RGUO4kvgfUyRyZp4wEuYwivpe2vtvnMj9GpI=`
   - プレースホルダー値は使用せず、必ず実際のランダムな文字列を生成して設定してください
   - 生成方法: `openssl rand -base64 32`

2. **.env.local ファイルの誤解**
   - `.env.local` はローカル開発環境用で、App Runnerでは使用されません
   - App Runnerでは、コンソールまたは `apprunner.yaml` で環境変数を設定する必要があります

3. **環境変数名のタイプミス**
   - `NEXT_PUBLIC_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URI` ❌
   - `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_KEY` ❌

4. **値の前後にスペース**
   - 値の前後に不要なスペースが入っていないか確認

5. **再デプロイを忘れる**
   - 環境変数を追加/変更した後は、必ず再デプロイが必要

6. **NEXT_PUBLIC_ プレフィックスの理解不足**
   - `NEXT_PUBLIC_`で始まる環境変数はビルド時にクライアント側のコードに埋め込まれます
   - ビルド後に変更しても反映されません

### デバッグのヒント

1. **ログを詳しく見る**
   - App Runnerのログには、環境変数の値は表示されませんが、どの環境変数が不足しているかは確認できます

2. **ローカルでテスト**
   - 同じ環境変数でローカル環境で `npm run build && npm start` を実行
   - エラーが再現するか確認

3. **段階的に環境変数を追加**
   - まず必須環境変数のみを設定して動作確認
   - その後、オプション環境変数を追加

4. **環境変数の検証スクリプトを使用**
   ```bash
   npm run check:env
   ```
   ローカル環境で環境変数が正しく設定されているか確認

### サポートが必要な場合

1. **エラーメッセージの全文を記録**
2. **App Runnerのログをエクスポート**
3. **環境変数名の一覧を確認**（値は含めない）
4. **デプロイ履歴を確認**

これらの情報があれば、問題の特定が容易になります。

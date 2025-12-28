# ワンショットデプロイ（ECR push → App Runner main/develop）

Cursor の auto モードでも余計なことをしないよう、**この手順だけ**を実行する前提のドキュメントです。

## 目的

- **ECR に `latest` を push**
- **App Runner の develop / main をデプロイ開始**
- それ以外（環境変数の上書きやサービス再作成）はしない

## 前提

- AWS CLI が認証済み
- Docker が起動済み
- `jq` がインストール済み

## ワンショットプロンプト（AIに渡す用）

```
ECRにプッシュしてからmainとdevelopにデプロイしてください。
作業は ./scripts/deploy-oneshot.sh の実行だけに限定してください。
新規ファイル作成や編集、環境変数の更新、他スクリプト実行は不要です。
エラーが出たら中断して内容だけ報告してください。
```

## 実行コマンド（人が直接叩く場合）

```bash
./scripts/deploy-oneshot.sh --env both
```

### 片方だけ実行したい場合

```bash
./scripts/deploy-oneshot.sh --env develop
./scripts/deploy-oneshot.sh --env main
```

## 仕様

- ビルド引数は **Secrets Manager** から取得する（デフォルトは main/prod の Secret ARN）
- App Runner の **環境変数は更新しない**
  - 理由: RuntimeEnvironmentVariables のサイズ制限で失敗するため
- `latest` を push 後に `start-deployment` を実行する

## 変数の上書き（必要な場合のみ）

```bash
AWS_REGION=ap-southeast-2 \
AWS_ACCOUNT_ID=149843772536 \
ECR_REPOSITORY=tabinaka-media \
IMAGE_TAG=latest \
SECRET_ARN=arn:aws:secretsmanager:ap-southeast-2:149843772536:secret:tabinaka-media-main/prod/env-XXXX \
./scripts/deploy-oneshot.sh --env both
```

## 進捗確認

```bash
aws apprunner list-operations \
  --service-arn arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-ecr/224f6e7bb3704861a07e75bb98f7aed5 \
  --region ap-southeast-2 \
  --max-results 3 \
  --output table

aws apprunner list-operations \
  --service-arn arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media-main-ecr/ba6c8aa3894446d68e21f041f56cf6a3 \
  --region ap-southeast-2 \
  --max-results 3 \
  --output table
```

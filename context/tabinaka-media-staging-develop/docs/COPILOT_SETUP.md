# AWS Copilot セットアップガイド

## 現在の状況

このプロジェクトは現在 **AWS App Runner** を使用しています。Copilot に移行する場合は、以下の手順を参照してください。

## Copilot を使用する場合の必要な権限

現在のIAMユーザー `BedrockAPIKey-qmll` には、Copilotに必要な権限が不足しています。

### 必要なIAM権限

Copilotは以下のAWSサービスを使用します：

1. **AWS Systems Manager (SSM)**
   - `ssm:GetParameter`
   - `ssm:PutParameter`
   - `ssm:DeleteParameter`
   - `ssm:GetParameters`
   - `ssm:GetParametersByPath`

2. **AWS CloudFormation**
   - `cloudformation:*` (スタックの作成・更新・削除)

3. **Amazon ECS / Fargate**
   - `ecs:*`
   - `iam:*` (タスクロールの作成)

4. **Amazon ECR**
   - `ecr:*` (Dockerイメージのプッシュ)

5. **その他**
   - `logs:*` (CloudWatch Logs)
   - `application-autoscaling:*`
   - `servicediscovery:*`

### 推奨されるIAMポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:PutParameter",
        "ssm:DeleteParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/copilot/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "ecs:*",
        "ecr:*",
        "iam:*",
        "logs:*",
        "application-autoscaling:*",
        "servicediscovery:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## App Runner vs Copilot

### App Runner（現在使用中）

**メリット**:
- シンプルな設定（`apprunner.yaml`のみ）
- 自動スケーリング
- ソースコードから直接デプロイ可能
- 管理が簡単

**デメリット**:
- カスタマイズ性が低い
- 複雑なインフラ構成には不向き

### Copilot

**メリット**:
- より柔軟な構成
- 複数のサービスを管理可能
- ECS/Fargateベースでより細かい制御

**デメリット**:
- 設定が複雑
- より多くのAWS権限が必要
- 学習コストが高い

## 推奨事項

現在のプロジェクトでは **App Runner を継続使用することを推奨**します：

1. 既に `apprunner.yaml` と `Dockerfile` が設定済み
2. 環境変数の設定を完了すれば動作する
3. シンプルで管理しやすい

Copilot に移行する場合は、IAM管理者に権限の追加を依頼してください。

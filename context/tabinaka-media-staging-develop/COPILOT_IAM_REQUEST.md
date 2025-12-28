# IAM管理者への権限追加依頼（Copilot用）

## 依頼内容

以下のIAMユーザーにAWS Copilotを使用するために必要なSSM権限を追加してください。

## 対象ユーザー

- **IAMユーザー名**: `BedrockAPIKey-qmll`
- **アカウントID**: `149843772536`
- **リージョン**: `ap-northeast-1` (CopilotのSSMパラメータはこのリージョンに作成されます)

## エラー内容

`copilot init` コマンド実行時に以下のエラーが発生しています：

```
AccessDeniedException: User: arn:aws:iam::149843772536:user/BedrockAPIKey-qmll is not authorized to perform: ssm:GetParameter on resource: arn:aws:ssm:ap-northeast-1:149843772536:parameter/copilot/applications/tabinaka-media because no identity-based policy allows the ssm:GetParameter action
```

## 必要な権限

以下のSSM権限を付与してください：

- `ssm:GetParameter` - Copilotアプリケーションの設定を取得
- `ssm:PutParameter` - Copilotアプリケーションの設定を保存
- `ssm:DeleteParameter` - Copilotアプリケーションの設定を削除
- `ssm:GetParameters` - 複数のパラメータを取得
- `ssm:GetParametersByPath` - パスでパラメータを検索

## 適用するポリシー

以下のJSONポリシーをインラインポリシーとして追加してください：

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
      "Resource": "arn:aws:ssm:*:149843772536:parameter/copilot/*"
    }
  ]
}
```

## 手順（AWSコンソール）

1. AWS IAMコンソールを開く: https://console.aws.amazon.com/iam/
2. 「ユーザー」> `BedrockAPIKey-qmll` を選択
3. 「アクセス権限」タブ > 「インラインポリシーの追加」
4. 「JSON」タブを選択して、上記のJSONを貼り付け
5. ポリシー名: `CopilotSSMPermissionsPolicy`
6. 「ポリシーの追加」をクリック

## 手順（AWS CLI）

```bash
aws iam put-user-policy \
  --user-name BedrockAPIKey-qmll \
  --policy-name CopilotSSMPermissionsPolicy \
  --policy-document file://copilot-ssm-permissions-policy.json
```

## セキュリティ

- このポリシーは `/copilot/*` パスのSSMパラメータのみに権限を付与
- 他のSSMパラメータには影響しません
- 最小権限の原則に従っています
- すべてのリージョン（`*`）を対象としています（Copilotは複数リージョンで使用可能なため）

## 注意事項

⚠️ **Copilotを使用するには、SSM権限以外にも多くのAWS権限が必要です**

SSM権限のみを追加した場合、`copilot init` は動作するようになりますが、実際にデプロイするには以下の追加権限が必要になります：

- CloudFormation (`cloudformation:*`)
- ECS/Fargate (`ecs:*`)
- ECR (`ecr:*`)
- IAM (`iam:*` - タスクロール作成用)
- CloudWatch Logs (`logs:*`)
- Application Auto Scaling (`application-autoscaling:*`)
- Service Discovery (`servicediscovery:*`)

詳細は `docs/COPILOT_SETUP.md` を参照してください。

## 関連ドキュメント

- `docs/COPILOT_SETUP.md` - Copilotのセットアップガイド
- `copilot-ssm-permissions-policy.json` - ポリシーJSONファイル








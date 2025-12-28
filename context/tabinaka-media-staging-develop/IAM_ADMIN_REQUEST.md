# IAM管理者への権限追加依頼

## 依頼内容

以下のIAMユーザーにApp Runnerの操作権限を追加してください。

## 対象ユーザー

- **IAMユーザー名**: `BedrockAPIKey-qmll`
- **アカウントID**: `149843772536`
- **リージョン**: `ap-southeast-2`

## 必要な権限

以下の権限を付与してください：

- `apprunner:DescribeService` - App Runnerサービスの設定を取得
- `apprunner:UpdateService` - App Runnerサービスの環境変数を更新
- `apprunner:ListServices` - App Runnerサービスの一覧を取得（オプション）

## 適用するポリシー

以下のJSONポリシーをインラインポリシーとして追加してください：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:DescribeService",
        "apprunner:UpdateService"
      ],
      "Resource": "arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:ListServices"
      ],
      "Resource": "*"
    }
  ]
}
```

## 手順（AWSコンソール）

1. AWS IAMコンソールを開く: https://console.aws.amazon.com/iam/
2. 「ユーザー」> `BedrockAPIKey-qmll` を選択
3. 「アクセス権限」タブ > 「インラインポリシーの追加」
4. 「JSON」タブを選択して、上記のJSONを貼り付け
5. ポリシー名: `AppRunnerPermissionsPolicy`
6. 「ポリシーの追加」をクリック

## 手順（AWS CLI）

```bash
aws iam put-user-policy \
  --user-name BedrockAPIKey-qmll \
  --policy-name AppRunnerPermissionsPolicy \
  --policy-document file://apprunner-permissions-policy.json
```

## セキュリティ

- このポリシーは特定のApp Runnerサービス（`tabinaka-media`）のみに権限を付与
- 他のApp Runnerサービスには影響しません
- 最小権限の原則に従っています

## 詳細

詳細な手順は `docs/IAM_ADMIN_GUIDE.md` を参照してください。

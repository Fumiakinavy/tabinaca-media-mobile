# IAM管理者向け: App Runner権限の付与手順

## 対象ユーザー

- **IAMユーザー名**: `BedrockAPIKey-qmll`
- **アカウントID**: `149843772536`
- **リージョン**: `ap-southeast-2`

## 必要な権限

以下の権限を付与する必要があります：

1. **`apprunner:DescribeService`** - App Runnerサービスの設定を取得
2. **`apprunner:UpdateService`** - App Runnerサービスの環境変数を更新
3. **`apprunner:ListServices`** - App Runnerサービスの一覧を取得（オプション）

## 権限付与方法

### 方法1: AWSコンソールから（推奨）

1. **AWS IAMコンソールを開く**
   - https://console.aws.amazon.com/iam/

2. **ユーザーを選択**
   - 左メニューから「ユーザー」をクリック
   - `BedrockAPIKey-qmll` を検索して選択

3. **インラインポリシーを追加**
   - 「アクセス権限」タブを開く
   - 「インラインポリシーの追加」をクリック
   - 「JSON」タブを選択

4. **ポリシーを貼り付け**
   以下のJSONをコピー＆ペースト：

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

5. **ポリシー名を設定**
   - ポリシー名: `AppRunnerPermissionsPolicy`

6. **保存**
   - 「ポリシーの追加」をクリック

### 方法2: AWS CLIで適用

IAM管理者権限があるアカウントで実行：

```bash
aws iam put-user-policy \
  --user-name BedrockAPIKey-qmll \
  --policy-name AppRunnerPermissionsPolicy \
  --policy-document file://apprunner-permissions-policy.json
```

または、直接JSONを指定：

```bash
aws iam put-user-policy \
  --user-name BedrockAPIKey-qmll \
  --policy-name AppRunnerPermissionsPolicy \
  --policy-document '{
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
  }'
```

### 方法3: マネージドポリシーを作成してアタッチ

1. **IAMコンソール > ポリシー > ポリシーの作成**
2. **JSONタブ**で上記のポリシーを貼り付け
3. **ポリシー名**: `AppRunnerPermissionsPolicy`
4. **ユーザーにアタッチ**: `BedrockAPIKey-qmll`

## 権限の確認

権限が正しく付与されたか確認：

```bash
# ユーザーのポリシーを確認
aws iam list-user-policies --user-name BedrockAPIKey-qmll

# ポリシーの内容を確認
aws iam get-user-policy \
  --user-name BedrockAPIKey-qmll \
  --policy-name AppRunnerPermissionsPolicy
```

## セキュリティ考慮事項

### 最小権限の原則

- このポリシーは特定のApp Runnerサービス（`tabinaka-media`）のみに権限を付与
- 他のApp Runnerサービスには影響しません

### リソース制限

- `DescribeService` と `UpdateService` は特定のサービスARNに制限
- `ListServices` は全リソースに許可（サービス一覧取得のため）

### 必要に応じて調整

より厳格な制御が必要な場合：

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
      "Resource": "arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media/3627665f05c4454c9a8702f9130cbbf1"
    }
  ]
}
```

特定のサービスIDまで指定することで、より厳格に制御できます。

## トラブルシューティング

### 権限が反映されない場合

1. **数分待つ**: IAM権限の反映には数分かかることがあります
2. **認証情報を再取得**: ユーザーが新しい認証情報でログインしているか確認
3. **ポリシーの構文を確認**: JSONの構文エラーがないか確認

### エラーメッセージ

- `AccessDenied`: 権限が不足している、またはリソースARNが間違っている
- `NoSuchEntity`: ユーザーまたはポリシーが存在しない

## 次のステップ

権限が付与されたら、以下のコマンドで環境変数を設定できます：

```bash
./scripts/set-apprunner-env.sh arn:aws:apprunner:ap-southeast-2:149843772536:service/tabinaka-media/3627665f05c4454c9a8702f9130cbbf1
```

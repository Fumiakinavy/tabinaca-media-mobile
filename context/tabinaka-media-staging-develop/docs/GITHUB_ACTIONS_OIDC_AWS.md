# GitHub Actions OIDC で AWS AssumeRoleWithWebIdentity が失敗する時の確認ポイント

`aws-actions/configure-aws-credentials@v4` で以下のようなエラーが出る場合の切り分け手順です。

```
Error: Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

## まず確認すること（GitHub Actions 側）

- `.github/workflows/deploy.yml` に `permissions: id-token: write` があること
- 実行トリガーが **fork からの PR** ではないこと（fork の PR では OIDC トークンが付与されない/制限されるケースがあります）
- `role-to-assume` が **IAM Role の ARN** になっていること（`arn:aws:iam::<account-id>:role/<role-name>`）

## 次に確認すること（AWS 側）

このエラーの多くは **IAM Role の信頼ポリシー（Trust policy）** の条件不一致です。

### 1) OIDC Provider が存在するか

AWS アカウントに OIDC Provider が作成されている必要があります。

- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

### 2) Role の Trust policy が GitHub の Claim と一致しているか

このリポジトリ（`YutaKatayama/tabinaka-media-staging`）の `deploy.yml` は `jobs.deploy.environment: ${{ github.ref_name }}` を設定しているため、
OIDC の `sub` が `ref` ベースではなく `environment` ベースになることがあります（例: `repo:...:environment:develop`）。

最小例（`main`/`develop` の **branch ref と environment の両方**を許可）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::149843772536:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:YutaKatayama/tabinaka-media-staging:ref:refs/heads/main",
            "repo:YutaKatayama/tabinaka-media-staging:ref:refs/heads/develop",
            "repo:YutaKatayama/tabinaka-media-staging:environment:main",
            "repo:YutaKatayama/tabinaka-media-staging:environment:develop"
          ]
        }
      }
    }
  ]
}
```

## Claim の確認（deploy.yml のデバッグ）

このリポジトリの `.github/workflows/deploy.yml` には、`workflow_dispatch` 実行時に
OIDC の Claim を表示するデバッグステップがあります。

- `Actions` → `Deploy to App Runner` → `Run workflow`
- `debug_oidc` を `true` にして実行

出力される `sub` / `aud` と、AWS 側 Trust policy の `Condition` が一致しているかを確認してください。

### `Run workflow` が出ない場合（デフォルトブランチに workflow が無い等）

`[debug oidc]` をコミットメッセージに含めて `develop` に push すると、デプロイはスキップされ
Claim 出力だけを行う `OIDC Debug` ジョブが実行されます。

- 例: `git commit -m "[debug oidc] print claims"` → `git push origin develop`

## 追加の注意

- GitHub 組織側で **OIDC の subject claim がカスタマイズ** されている場合、`sub` の形式が変わります。
  その場合はデバッグ出力の `sub` に合わせて Trust policy を調整してください。
- Role の **Permission policy**（ECR push / App Runner update 等）は Trust policy とは別です。
  今回のエラーは基本的に Trust policy 側の問題です。

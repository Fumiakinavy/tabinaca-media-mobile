# IAM管理者への依頼（GitHub Actions OIDC / AssumeRoleWithWebIdentity）

## 目的

GitHub Actions から `aws-actions/configure-aws-credentials@v4` を使って OIDC でロール引き受け（`sts:AssumeRoleWithWebIdentity`）できるようにしたいです。

現在のエラー:

```
Error: Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

## 事実（GitHub OIDC の Claim）

デバッグ出力より:

- `iss`: `https://token.actions.githubusercontent.com`
- `aud`: `sts.amazonaws.com`
- `sub`: `repo:YutaKatayama/tabinaka-media-staging:environment:main`
- `job_workflow_ref`: `YutaKatayama/tabinaka-media-staging/.github/workflows/deploy.yml@refs/heads/main`

## 依頼内容

`secrets.AWS_ROLE_ARN` で指定している IAM Role の **Trust policy**（Assume role policy）を更新し、
上記 Claim を満たす GitHub Actions からの引き受けを許可してください。

## 適用するTrust policy（案）

`oidc-trust-policy-github-actions.json` を使用してください。

この案は以下を許可します:

- `aud=sts.amazonaws.com`
- `sub=repo:YutaKatayama/tabinaka-media-staging:environment:{main|develop}`
- `job_workflow_ref=.../deploy.yml@refs/heads/{main|develop}`

## 手順（AWSコンソール）

1. IAM → Roles → 対象 Role を開く
2. 「Trust relationships」→「Edit trust policy」
3. `oidc-trust-policy-github-actions.json` の内容に更新して保存

## 手順（AWS CLI）

Role 名が分かっている場合:

```bash
aws iam update-assume-role-policy \
  --role-name <ROLE_NAME> \
  --policy-document file://oidc-trust-policy-github-actions.json
```

Role 名は Role ARN の末尾（`...:role/<ROLE_NAME>`）です。

## 注意

- これは **Permission policy**（ECR push / App Runner 更新など）ではなく、**Trust policy** の修正です。
- 組織設定等で OIDC の `sub` 形式が変わる場合があります。その場合は `docs/GITHUB_ACTIONS_OIDC_AWS.md` を参照し、デバッグ出力の `sub` に合わせて調整してください。


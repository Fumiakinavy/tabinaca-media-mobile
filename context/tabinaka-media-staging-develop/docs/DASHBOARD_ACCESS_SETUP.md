# 🔐 ダッシュボードアクセス制御 セットアップガイド

## 概要

アナリティクスダッシュボードは、特定のメールアドレスを持つユーザーのみがアクセスできるように保護されています。

## 🔑 環境変数の設定

`.env.local` ファイルに以下を追加してください：

```bash
# ダッシュボードアクセス許可リスト
# カンマ区切りで複数のメールアドレスを指定可能
DASHBOARD_ALLOWED_EMAILS=yuta@gappy.jp
```

### 複数のユーザーを許可する場合

```bash
DASHBOARD_ALLOWED_EMAILS=yuta@gappy.jp,admin@example.com,manager@example.com
```

## 🚀 使い方

### 1. ユーザーのログイン

ダッシュボードにアクセスするには、まず **Supabase認証でログイン** する必要があります。

```
https://your-domain.com/auth/login
```

### 2. ダッシュボードへのアクセス

ログイン後、ダッシュボードにアクセス：

```
https://your-domain.com/dashboard/analytics
```

### 3. アクセス権限の確認

- ✅ **許可されたメールアドレス**: ダッシュボードが表示されます
- ❌ **許可されていないメールアドレス**: 403エラーが表示されます

## 🔒 セキュリティの仕組み

### バックエンド保護

すべてのダッシュボードAPIエンドポイントは、以下のチェックを行います：

1. **Supabase認証の確認**
   - `Authorization: Bearer <access_token>` ヘッダーを検証
   - 有効なSupabaseセッションが必要

2. **メールアドレスの検証**
   - ログインユーザーのメールアドレスを取得
   - 環境変数 `DASHBOARD_ALLOWED_EMAILS` のリストと照合

3. **アクセス許可/拒否**
   - リストに含まれている → ✅ アクセス許可
   - リストに含まれていない → ❌ 403エラー

### 保護されたエンドポイント

以下のAPIエンドポイントが保護されています：

- `GET /api/analytics/dashboard`
- `GET /api/analytics/realtime`

## 🛠️ トラブルシューティング

### 問題: 「このダッシュボードへのアクセス権限がありません」

**原因:**

- ログインしているメールアドレスが許可リストに含まれていない
- 環境変数が設定されていない

**解決方法:**

1. `.env.local` ファイルを確認
2. `DASHBOARD_ALLOWED_EMAILS` にメールアドレスが正しく設定されているか確認
3. サーバーを再起動:

```bash
npm run dev
```

### 問題: 「ログインが必要です」

**原因:**

- Supabase認証セッションが期限切れまたは存在しない

**解決方法:**

1. ログインページにアクセス
2. 認証を完了
3. ダッシュボードに再度アクセス

### 問題: 環境変数が読み込まれない

**確認事項:**

1. `.env.local` ファイルがプロジェクトルートに存在するか
2. ファイル名が正確か（`.env.local.example` ではなく `.env.local`）
3. サーバーを再起動したか

## 📝 実装の詳細

### ダッシュボード認証ライブラリ

`lib/server/dashboardAuth.ts` に実装されています：

```typescript
import { requireDashboardAccess } from "@/lib/server/dashboardAuth";

export default async function handler(req, res) {
  // アクセス権限チェック
  const accessCheck = await requireDashboardAccess(req, res);
  if (!accessCheck) {
    // 403エラーが既に返されている
    return;
  }

  // 許可されたユーザーのメールアドレスが accessCheck.email に含まれる
  console.log(`Dashboard accessed by: ${accessCheck.email}`);

  // 通常の処理を続行
  // ...
}
```

### フロントエンド実装

`pages/dashboard/analytics.tsx` では、Supabaseセッションを取得してAuthorizationヘッダーに含めます：

```typescript
const {
  data: { session },
} = await supabase.auth.getSession();

const response = await fetch("/api/analytics/dashboard", {
  headers: {
    "x-gappy-account-id": accountId,
    "x-gappy-account-token": accountToken,
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

## 🎯 ベストプラクティス

### 本番環境での設定

1. **環境変数を安全に管理**
   - Vercel/Netlifyなどのプラットフォーム設定で環境変数を設定
   - `.env.local` はgitにコミットしない（`.gitignore` に含まれている）

2. **最小権限の原則**
   - 必要最小限のユーザーのみを許可リストに追加
   - 定期的にリストを見直し

3. **監視とログ**
   - アクセス拒否のログを監視
   - 不審なアクセス試行を検出

### セキュリティチェックリスト

- [ ] `DASHBOARD_ALLOWED_EMAILS` が設定されている
- [ ] 許可リストに正しいメールアドレスが含まれている
- [ ] `.env.local` がバージョン管理から除外されている
- [ ] 本番環境の環境変数が設定されている
- [ ] Supabase認証が正しく動作している

## 🚨 重要な注意事項

1. **メールアドレスは小文字で比較されます**
   - `YUTA@GAPPY.JP` と `yuta@gappy.jp` は同じとして扱われます

2. **環境変数の変更後は再起動が必要**
   - 開発環境: `npm run dev` を再起動
   - 本番環境: デプロイまたは再起動

3. **認証とアカウントIDの両方が必要**
   - Supabase認証セッション（メールアドレス確認用）
   - Gappyアカウント認証（`x-gappy-account-id` と `x-gappy-account-token`）

## 📞 サポート

問題が解決しない場合は、以下を確認してください：

1. ブラウザのコンソールでエラーメッセージを確認
2. サーバーログで認証エラーを確認
3. ネットワークタブでAPIレスポンスを確認

---

**最終更新日**: 2025年1月20日

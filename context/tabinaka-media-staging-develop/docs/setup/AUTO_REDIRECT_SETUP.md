# 自動リダイレクトURL設定

## 概要

環境に応じて自動的にリダイレクトURLを切り替える機能を実装しました。これにより、開発環境と本番環境で手動設定する必要がなくなります。

## 自動判定ロジック

### 1. 環境変数が設定されている場合
```bash
NEXT_PUBLIC_SITE_URL=https://your-custom-domain.com
```
→ この値が使用されます

### 2. 環境変数が未設定の場合
- **開発環境** (`NODE_ENV=development`): `http://localhost:2098`
- **本番環境** (`NODE_ENV=production`): `https://tabinaka-media.gappy.jp`

## 設定方法

### 開発環境での設定（オプション）

`.env.local`ファイルに以下を追加：

```bash
# 開発環境用（オプション）
NEXT_PUBLIC_SITE_URL=http://localhost:2098
```

### 本番環境での設定（オプション）

Vercelの環境変数に以下を追加：

```bash
# 本番環境用（オプション）
NEXT_PUBLIC_SITE_URL=https://tabinaka-media.gappy.jp
```

### カスタムドメインの場合

```bash
# カスタムドメインの場合
NEXT_PUBLIC_SITE_URL=https://your-custom-domain.com
```

## 実装された機能

### 1. 自動リダイレクトURL生成
```typescript
import { getAuthRedirectUrl } from "@/lib/env";

// 現在のURLを取得してリダイレクトURLを生成
const currentUrl = window.location.href;
const redirectUrl = getAuthRedirectUrl(currentUrl);
```

### 2. 環境に応じた自動判定
- 開発環境: `http://localhost:2098/auth/callback`
- 本番環境: `https://tabinaka-media.gappy.jp/auth/callback`
- カスタムドメイン: `https://your-domain.com/auth/callback`

### 3. 更新されたコンポーネント
- `SmartBookingForm.tsx` - 自動リダイレクトURL使用
- `LikeButton.tsx` - 自動リダイレクトURL使用

## Supabase設定

### 開発環境
```
Site URL: http://localhost:2098
Redirect URLs: 
  - http://localhost:2098/auth/callback
```

### 本番環境
```
Site URL: https://tabinaka-media.gappy.jp
Redirect URLs: 
  - https://tabinaka-media.gappy.jp/auth/callback
```

### カスタムドメイン
```
Site URL: https://your-custom-domain.com
Redirect URLs: 
  - https://your-custom-domain.com/auth/callback
```

## Google Cloud Console設定

### 開発環境
```
承認済みリダイレクトURI:
  - http://localhost:2098/auth/callback
```

### 本番環境
```
承認済みリダイレクトURI:
  - https://tabinaka-media.gappy.jp/auth/callback
```

### カスタムドメイン
```
承認済みリダイレクトURI:
  - https://your-custom-domain.com/auth/callback
```

## テスト手順

### 1. 開発環境でのテスト
```bash
npm run dev
# http://localhost:2098 でアクセス
# ログインボタンをクリック
# リダイレクトURLが自動で設定されることを確認
```

### 2. 本番環境でのテスト
```bash
# 本番環境でデプロイ
# ログインフローをテスト
# リダイレクトURLが自動で設定されることを確認
```

## メリット

### 1. 自動化
- 環境に応じて自動的にリダイレクトURLを設定
- 手動設定の手間を削減

### 2. 柔軟性
- 環境変数でカスタマイズ可能
- デフォルト値で動作保証

### 3. 保守性
- 設定の一元管理
- 環境間での設定ミスを防止

## トラブルシューティング

### リダイレクトURLが正しく設定されない場合

1. **環境変数の確認**
   ```bash
   echo $NEXT_PUBLIC_SITE_URL
   ```

2. **NODE_ENVの確認**
   ```bash
   echo $NODE_ENV
   ```

3. **ブラウザの開発者ツールで確認**
   - NetworkタブでリダイレクトURLを確認
   - Consoleタブでエラーメッセージを確認

### 設定が反映されない場合

1. **ブラウザのキャッシュをクリア**
2. **開発サーバーを再起動**
3. **環境変数を再設定**

## 注意事項

- 環境変数は`NEXT_PUBLIC_`プレフィックスが必要
- 設定変更後は開発サーバーの再起動が必要
- 本番環境では必ずHTTPSを使用
- SupabaseとGoogle Cloud Consoleの設定も更新が必要

この自動化により、環境に応じたリダイレクトURLの設定が簡単になります！

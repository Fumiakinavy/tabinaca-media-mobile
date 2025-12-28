# 🔧 環境設定ガイド

プロジェクトのセットアップと環境構築に関するドキュメント集です。

---

## 📋 ドキュメント一覧

### 🌍 [ENV_SETUP.md](./ENV_SETUP.md)
**概要**: 環境変数の設定ガイド  
**用途**: Supabaseブランチ機能を使用した環境変数の設定手順

**主な内容**:
- Supabase設定
- SendGrid設定
- Google Analytics設定
- Slack通知設定
- デプロイ環境での重要な設定

---

### 🔐 [README_ENVIRONMENT_SETUP.md](./README_ENVIRONMENT_SETUP.md)
**概要**: Supabaseブランチ機能用の詳細な環境設定  
**用途**: 開発ブランチと本番ブランチの設定方法

**主な内容**:
- 環境変数の設定
- Supabaseブランチでの設定
- RLSポリシーの設定
- よくある問題と解決方法

---

### 🔑 [SUPABASE_OAUTH_FIX.md](./SUPABASE_OAUTH_FIX.md)
**概要**: Supabase OAuth設定の修正方法  
**用途**: OAuth認証エラーが発生した場合の対処法

**主な内容**:
- OAuth設定の確認方法
- リダイレクトURLの設定
- トラブルシューティング

---

### 🔄 [SUPABASE_REDIRECT_SETUP.md](./SUPABASE_REDIRECT_SETUP.md)
**概要**: Supabaseリダイレクト設定  
**用途**: 認証後のリダイレクト先を設定する

**主な内容**:
- Site URLの設定
- Redirect URLsの設定
- 開発環境と本番環境の違い

---

### ⚡ [AUTO_REDIRECT_SETUP.md](./AUTO_REDIRECT_SETUP.md)
**概要**: 自動リダイレクトの設定  
**用途**: ログイン後の自動リダイレクトを実装する

**主な内容**:
- Next.jsでのリダイレクト実装
- Supabase Auth Helpersの使用方法
- エラーハンドリング

---

## 🚀 セットアップの順序

### 1. 基本環境設定
```bash
# 1. 環境変数ファイルを作成
cp .env.example .env

# 2. ENV_SETUP.mdを参照して環境変数を設定
```

### 2. Supabase設定
```
1. README_ENVIRONMENT_SETUP.md を読む
2. Supabaseダッシュボードで設定を行う
3. RLSポリシーを設定する
```

### 3. OAuth設定
```
1. SUPABASE_OAUTH_FIX.md を参照
2. リダイレクトURLを設定
```

### 4. 動作確認
```bash
npm run dev
# ブラウザで http://localhost:2098 を開く
```

---

## ⚠️ よくある問題

### 問題1: "PGRST116エラー"
**解決**: [README_ENVIRONMENT_SETUP.md](./README_ENVIRONMENT_SETUP.md) の「5.1 PGRST116エラー」を参照

### 問題2: "Permission denied"
**解決**: [README_ENVIRONMENT_SETUP.md](./README_ENVIRONMENT_SETUP.md) の「5.2 Permission deniedエラー」を参照

### 問題3: "OAuth認証エラー"
**解決**: [SUPABASE_OAUTH_FIX.md](./SUPABASE_OAUTH_FIX.md) を参照

---

## 📞 サポート

設定で問題が発生した場合:
- 📧 Email: mitsuki@gappy.jp
- 💬 Slack: #tabinaka-media-setup

---

[← メインドキュメントに戻る](../README.md)


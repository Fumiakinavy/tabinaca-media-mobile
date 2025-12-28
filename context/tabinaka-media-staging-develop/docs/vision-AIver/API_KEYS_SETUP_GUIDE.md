# API Keys Setup Guide 🔑

This document provides a complete list of API keys required for the Gappy AI Chat system and instructions on how to obtain each one.

---

## 📋 Required API Keys

### **1. Supabase (Database & Authentication)** - ✅ 既存

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Optional
```

#### 取得方法：
1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. 対象プロジェクトを選択
3. 左サイドバーの **Settings** > **API** をクリック
4. 以下をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (Project API keys セクション) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (必要な場合) → `SUPABASE_SERVICE_ROLE_KEY`

#### 注意点：
- `NEXT_PUBLIC_` プレフィックスはクライアント側でアクセス可能
- `service_role` はサーバーサイドのみで使用（RLS をバイパス）
- 既存の実装では `anon` キーで十分

---

### **2. OpenAI API** - 🆕 今回追加

```bash
OPENAI_API_KEY=sk-proj-...
```

#### 取得方法：
1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. アカウント作成 or ログイン
3. 右上のアカウントメニュー > **API keys** をクリック
4. **Create new secret key** ボタンをクリック
5. キー名を入力（例: "Gappy AI Chat"）
6. 生成されたキーをコピー（⚠️ 一度しか表示されません）
7. `.env.local` に保存

#### 料金について：
- **無料枠**: 新規アカウントには $5 のクレジットが付与（3ヶ月有効）
- **従量課金**: 
  - GPT-4o: $5.00 / 1M input tokens, $15.00 / 1M output tokens
  - GPT-4o-mini: $0.150 / 1M input tokens, $0.600 / 1M output tokens
  - Embeddings (text-embedding-3-small): $0.020 / 1M tokens
- **推奨**: 開発中は GPT-4o-mini を使用（コスト効率◎）

#### 使用量の確認：
- [Usage Dashboard](https://platform.openai.com/usage)

#### セキュリティ設定（推奨）：
1. **Usage limits** で月額上限を設定
2. **API keys** ページで IP制限を設定（本番環境）

---

### **3. Google Maps API** - 🆕 今回追加

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

**注意**: `NEXT_PUBLIC_` プレフィックスが必要です（クライアント側で使用）

#### 取得方法：

##### Step 1: Google Cloud Projectの作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
   - プロジェクト名: 例 "Gappy Maps Integration"
   - 組織: 任意
3. **Select Project** でプロジェクトを選択

##### Step 2: 請求先アカウントの設定（必須）
1. 左メニュー > **Billing** > **Link a billing account**
2. クレジットカードを登録
   - ⚠️ 無料枠内でも請求先設定は必須
   - 💡 無料枠: 月 $200 のクレジット（Maps, Routes, Places API）

##### Step 3: 必要なAPIの有効化
1. 左メニュー > **APIs & Services** > **Library**
2. 以下のAPIを検索して **Enable**:
   - ✅ **Maps JavaScript API** （地図表示用）
   - ✅ **Places API (New)** （場所検索用）
   - ✅ **Geocoding API** （住所⇔座標変換用、オプション）

##### Step 4: API Keyの作成
1. 左メニュー > **APIs & Services** > **Credentials**
2. **+ CREATE CREDENTIALS** > **API key**
3. 生成されたキーをコピー

##### Step 5: API Keyの制限設定（重要！）
1. 作成したキーの名前をクリック
2. **Application restrictions** セクション:
   - 開発中: **None** or **HTTP referrers** で localhost を追加
     ```
     http://localhost:3000/*
     http://localhost:*/*
     ```
   - 本番環境: **HTTP referrers** で本番ドメインを追加
     ```
     https://yourdomain.com/*
     https://*.yourdomain.com/*
     ```
3. **API restrictions** セクション:
   - **Restrict key** を選択
   - 以下のAPIのみ許可:
     - Maps JavaScript API
     - Places API (New)
     - Geocoding API
4. **Save** をクリック

#### 料金について：
- **無料枠**: 月 $200 のクレジット（ほとんどの開発に十分）
- **従量課金**:
  - Maps JavaScript API: $7.00 / 1,000 loads
  - Places API Text Search: $32.00 / 1,000 requests
  - Places API Details: $17.00 / 1,000 requests
- **使用量の確認**: [Google Cloud Console > Billing](https://console.cloud.google.com/billing)

#### セキュリティのベストプラクティス：
- ✅ API Key制限を必ず設定
- ✅ 本番環境では HTTP referrer 制限
- ✅ 使用量アラートを設定（$50, $100, $180）
- ✅ 定期的にキーをローテーション

---

### **4. Cloudinary (画像管理)** - ⏳ Phase 7で必要

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

#### 取得方法：
1. [Cloudinary](https://cloudinary.com/) にアクセス
2. 無料アカウント作成（Free tier: 25 GB storage, 25 GB bandwidth/月）
3. Dashboard にログイン
4. **Account Details** セクションから以下をコピー：
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

#### 使用用途：
- Google Places の写真を自動アップロード
- アクティビティ画像の一元管理
- 画像の自動最適化・リサイズ

**注意**: Phase 7（アクティビティ自動生成）実装時に必要になります。

---

## 📝 .env.local ファイルの設定

プロジェクトルートに `.env.local` を作成し、以下をコピー＆ペースト：

```bash
# ============================================
# Supabase (既存)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# OpenAI API (Phase 3で追加)
# ============================================
OPENAI_API_KEY=sk-proj-...

# ============================================
# Google Maps API (Phase 5-6で追加)
# ============================================
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
# 注意: NEXT_PUBLIC_ プレフィックスが必要（クライアント側で使用）

# ============================================
# Cloudinary (Phase 7で必要)
# ============================================
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=123456789012345
# CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

---

## ✅ 設定確認方法

### 環境変数が正しく読み込まれているか確認：

```bash
npm run dev
```

ブラウザで開発者ツール (Console) を開き、以下を実行：

```javascript
// Supabase確認
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);

// Google Maps API確認
console.log(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
```

### API接続テスト：

1. **OpenAI API**:
   - `/chat` ページでメッセージを送信
   - レスポンスが返ってくればOK

2. **Google Maps API**:
   - `/chat` ページでマップが表示されればOK
   - Console にエラーがないか確認

3. **Supabase**:
   - オンボーディングを完了
   - Supabase Dashboard > Table Editor で `user_attributes` にデータが入っているか確認

---

## 🚨 トラブルシューティング

### OpenAI API Key エラー

**エラー**: `Error: OpenAI API key not configured`

**解決方法**:
1. `.env.local` に `OPENAI_API_KEY` が設定されているか確認
2. 開発サーバーを再起動: `npm run dev` (Ctrl+C → 再実行)
3. キーが正しいか確認（`sk-proj-` で始まる）

---

### Google Maps API エラー

**エラー**: `Google Maps JavaScript API error: ApiNotActivatedMapError`

**解決方法**:
1. Google Cloud Console で **Maps JavaScript API** が有効化されているか確認
2. 請求先アカウントが設定されているか確認

**エラー**: `Google Maps JavaScript API error: RefererNotAllowedMapError`

**解決方法**:
1. API Key の HTTP referrer 制限を確認
2. 開発中は制限を解除 or `http://localhost:3000/*` を追加

---

### Supabase 接続エラー

**エラー**: `Failed to fetch`

**解決方法**:
1. Supabase URL が正しいか確認（`https://` で始まる）
2. Supabase Dashboard > Settings > API で anon key を再確認
3. RLS (Row Level Security) ポリシーが設定されているか確認

---

## 📌 まとめ

### 今すぐ設定が必要なキー（Phase 1-6）:
- ✅ **NEXT_PUBLIC_SUPABASE_URL** (既存)
- ✅ **NEXT_PUBLIC_SUPABASE_ANON_KEY** (既存)
- 🆕 **OPENAI_API_KEY** (Phase 3)
- 🆕 **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY** (Phase 5-6)

### 後で設定するキー（Phase 7以降）:
- ⏳ **CLOUDINARY_CLOUD_NAME** (Phase 7)
- ⏳ **CLOUDINARY_API_KEY** (Phase 7)
- ⏳ **CLOUDINARY_API_SECRET** (Phase 7)

---

## 🔗 参考リンク

- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Google Maps Platform Docs](https://developers.google.com/maps/documentation)
- [Cloudinary Docs](https://cloudinary.com/documentation)


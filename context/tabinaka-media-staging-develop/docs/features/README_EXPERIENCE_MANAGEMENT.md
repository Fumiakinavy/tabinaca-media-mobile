# アクティビティ管理ガイド

## 概要

このドキュメントでは、Gappy-tabinaka-mediaプロジェクトに新しいアクティビティを追加する際の詳細な手順を説明します。

## 現在の実装状況

### 1. メール送信システム
- **SendGrid**を使用したメール送信
- **2種類のメールテンプレート**：
  - **クーポンアクティビティ**：着付け体験専用テンプレート
  - **Shibuya Passアクティビティ**：その他の体験用汎用テンプレート
- **判定ロジック**：`experienceSlug !== "Kimono Dressing Experience"`で着付け体験以外はShibuya Pass

### 2. MDXファイル構造
- **テンプレート**：`content/experiences/en/_template.mdx`
- **必須フィールド**：title, summary, coverImage, price, duration, locationFromStation, level, couponCode, discount, date, tags, motivationTags, address, location, mapIframe
- **多言語対応**：en, ja, ko, zh, fr, esの6言語

### 3. 設定管理
- **`config/experienceSettings.ts`**でアクティビティの掲載状態を管理
- **統一フォーム**：`showUnifiedForm: true`で制御
- **地図表示**：`showMap: true`で制御

### 4. データベース
- **Supabase**を使用
- **クーポンコード生成**：PostgreSQL関数`generate_coupon_code()`で自動生成
- **テーブル**：`coupon_requests`にフォームデータを保存

### 5. 画像管理
- **Cloudinary**を使用
- **フォルダ構造**：`public/images/activities/`配下に番号フォルダまたは体験名フォルダ

## 新しいアクティビティ追加手順

### Step 1: 基本情報の決定
1. **アクティビティ名**（英語）
2. **スラッグ**（URL用、英数字とハイフンのみ）
3. **アクティビティタイプ**の決定：
   - **クーポンアクティビティ**：着付け体験のように直接クーポンを提供
   - **Shibuya Passアクティビティ**：Shibuya Pass経由で予約

### Step 2: 画像の準備
1. **メイン画像**（coverImage用）
2. **アクティビティ画像**（複数枚推奨）
3. **画像フォルダ作成**：
   - クーポンアクティビティ：`public/images/activities/体験名/`
   - Shibuya Passアクティビティ：`public/images/activities/番号/`

### Step 3: MDXファイルの作成
1. **英語版**：`content/experiences/en/アクティビティ名.mdx`
2. **他言語版**：ja, ko, zh, fr, esフォルダにも同様のファイル
3. **必須フィールドの設定**：
   ```yaml
   title: "アクティビティ名"
   summary: "1行の説明"
   coverImage: "/images/activities/フォルダ/画像.jpg"
   price: 価格
   duration: "所要時間"
   locationFromStation: "駅からの距離"
   level: "難易度"
   couponCode: "クーポンコード" # クーポンアクティビティのみ
   discount: "割引率" # クーポンアクティビティのみ
   tags: ["タグ1", "タグ2"]
   motivationTags: ["motivation1", "motivation2"]
   address: "住所"
   location:
     lat: 緯度
     lng: 経度
   ```

### Step 4: 設定ファイルの更新
`config/experienceSettings.ts`に追加：
```typescript
{
  slug: "アクティビティスラッグ",
  isActive: true,
  displayName: "表示名",
  description: "説明",
  showUnifiedForm: true,
  showMap: true,
  price: 価格, // オプション
  discount: "割引率", // オプション
}
```

### Step 5: メールテンプレートの作成（クーポンアクティビティのみ）
1. **テンプレートファイル作成**：`lib/emailTemplates/experiences/アクティビティ名.ts`
2. **テンプレート登録**：`lib/emailTemplates/experiences/index.ts`に追加
3. **テンプレート内容**：
   - アクティビティ固有の情報
   - クーポンコードの表示
   - 使用方法の説明
   - 連絡先情報

### Step 6: データベースの確認
- **クーポンコード生成関数**：既存の`generate_coupon_code()`を使用
- **テーブル構造**：既存の`coupon_requests`テーブルを使用

### Step 7: テスト
1. **フォーム送信テスト**
2. **メール送信テスト**
3. **クーポンコード生成テスト**
4. **データベース保存テスト**

### Step 8: 本番デプロイ
1. **画像のアップロード**
2. **MDXファイルのデプロイ**
3. **設定ファイルの更新**
4. **メールテンプレートのデプロイ**

## 重要な注意点

### 1. アクティビティタイプの判定
- 着付け体験以外はすべてShibuya Passアクティビティとして扱われる
- 新しいクーポンアクティビティを追加する場合は、メール送信ロジックの修正が必要
- 修正箇所：`pages/api/sendCoupon-sendgrid.ts`の判定ロジック

### 2. スラッグの一意性
- 既存のスラッグと重複しないよう注意
- 英数字とハイフンのみ使用
- 大文字小文字は区別される

### 3. 多言語対応
- 6言語すべてのMDXファイルを作成
- 翻訳の品質を確保
- 各言語の文化的な違いを考慮

### 4. 画像の最適化
- WebP形式での保存を推奨
- 適切なサイズと圧縮
- レスポンシブ対応を考慮

### 5. セキュリティ
- 環境変数の適切な設定
- APIキーの管理
- データベースアクセス権限の確認

## トラブルシューティング

### よくある問題と解決方法

1. **メールが送信されない**
   - SendGrid APIキーの確認
   - 環境変数の設定確認
   - メールテンプレートの構文エラー確認

2. **クーポンコードが生成されない**
   - データベース接続の確認
   - `generate_coupon_code()`関数の確認
   - Supabaseの権限設定確認

3. **アクティビティが表示されない**
   - `experienceSettings.ts`の設定確認
   - MDXファイルの構文エラー確認
   - ファイルパスの確認

4. **画像が表示されない**
   - ファイルパスの確認
   - 画像ファイルの存在確認
   - Cloudinaryの設定確認

## 開発環境でのテスト

### ローカルテスト手順
1. `npm run dev`でローカルサーバー起動
2. 新しいアクティビティのページにアクセス
3. フォーム送信テスト
4. メール送信テスト
5. データベース保存確認

### テスト用データ
- テスト用メールアドレスの使用
- テスト用クーポンコードの確認
- データベースのテストデータ確認

## 本番環境での運用

### デプロイ前チェックリスト
- [ ] すべての言語版MDXファイルの作成
- [ ] 画像ファイルのアップロード
- [ ] 設定ファイルの更新
- [ ] メールテンプレートの作成（必要に応じて）
- [ ] テストの完了
- [ ] 環境変数の設定確認

### デプロイ後確認事項
- [ ] アクティビティページの表示確認
- [ ] フォーム送信の動作確認
- [ ] メール送信の動作確認
- [ ] データベース保存の確認
- [ ] 各言語版の表示確認

## 関連ファイル一覧

### 設定ファイル
- `config/experienceSettings.ts` - アクティビティ設定
- `config/constants.ts` - 定数設定
- `config/categories.ts` - カテゴリ設定

### メールテンプレート
- `lib/emailTemplates/experiences/index.ts` - テンプレート登録
- `lib/emailTemplates/experiences/kimono-dressing-experience.ts` - 着付け体験テンプレート
- `lib/emailTemplates/experiences/shibuya-pass-registration.ts` - Shibuya Passテンプレート

### API
- `pages/api/sendCoupon-sendgrid.ts` - メール送信API

### データベース
- `database_schema_clean.sql` - データベーススキーマ
- `utils/generateCouponCode.ts` - クーポンコード生成

### コンポーネント
- `components/UnifiedForm.tsx` - 統一フォーム
- `components/ExperienceTemplate.tsx` - アクティビティテンプレート

## 更新履歴

- 2024-01-01: 初版作成
- 2024-01-15: メールテンプレート情報追加
- 2024-01-30: トラブルシューティングセクション追加

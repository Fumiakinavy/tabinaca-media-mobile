# 🚀 開発ガイド

開発・デプロイ・最適化に関するドキュメント集です。

---

## 📋 ドキュメント一覧

### 🚀 [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
**概要**: デプロイチェックリスト  
**用途**: 本番環境へのデプロイ前に確認すべき項目

**主な内容**:
- 環境変数の確認
- ビルドテスト
- データベースマイグレーション
- DNS設定
- SSL証明書
- 動作確認

---

### 📈 [SEO_CHECKLIST.md](./SEO_CHECKLIST.md)
**概要**: SEO最適化チェックリスト  
**用途**: 検索エンジン最適化のための確認項目

**主な内容**:
- メタタグの設定
- 構造化データ
- サイトマップ
- robots.txt
- パフォーマンス最適化
- モバイルフレンドリー

---

### ⚡ [OPTIMIZATION_RECOMMENDATIONS.md](./OPTIMIZATION_RECOMMENDATIONS.md)
**概要**: パフォーマンス最適化の推奨事項  
**用途**: アプリケーションのパフォーマンスを改善する

**主な内容**:
- 画像最適化
- コード分割
- キャッシング戦略
- レンダリング最適化
- データベースクエリ最適化

---

### 📊 [OPTIMIZATION_REPORT.md](./OPTIMIZATION_REPORT.md)
**概要**: 最適化レポート  
**用途**: 実施した最適化の結果と効果測定

**主な内容**:
- Before/After比較
- パフォーマンスメトリクス
- 改善箇所の詳細
- 今後の推奨事項

---

## 🔄 開発ワークフロー

### 1. 開発環境のセットアップ
```bash
# リポジトリをクローン
git clone [repository-url]

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
# .envファイルを編集

# 開発サーバーを起動
npm run dev
```

---

### 2. 機能開発
```bash
# 新しいブランチを作成
git checkout -b feature/new-feature

# コードを書く
# ...

# テストを実行
npm run test

# Lintを実行
npm run lint

# コミット
git add .
git commit -m "feat: add new feature"

# プッシュ
git push origin feature/new-feature
```

---

### 3. デプロイ前チェック
[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) を参照

```bash
# ビルドテスト
npm run build

# 本番環境で動作確認
npm run start

# SEOチェック
# SEO_CHECKLIST.mdを確認
```

---

### 4. デプロイ
```bash
# mainブランチにマージ
git checkout main
git merge feature/new-feature

# プッシュ（自動デプロイ）
git push origin main
```

---

## ⚡ パフォーマンス最適化

### 画像最適化
```typescript
// Next.js Imageコンポーネントを使用
import Image from 'next/image';

<Image
  src="/images/activity.jpg"
  alt="Activity"
  width={800}
  height={600}
  quality={85}
  loading="lazy"
/>
```

詳細: [OPTIMIZATION_RECOMMENDATIONS.md](./OPTIMIZATION_RECOMMENDATIONS.md)

---

### コード分割
```typescript
// 動的インポートを使用
const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

---

### データベースクエリ最適化
```typescript
// 必要なカラムのみを選択
const { data } = await supabase
  .from('activities')
  .select('id, title, slug')
  .eq('is_active', true);
```

---

## 📈 SEO最適化

### メタタグの設定
```tsx
import Head from 'next/head';

<Head>
  <title>Activity Title | Gappy</title>
  <meta name="description" content="Activity description" />
  <meta property="og:title" content="Activity Title" />
  <meta property="og:image" content="/images/activity.jpg" />
</Head>
```

詳細: [SEO_CHECKLIST.md](./SEO_CHECKLIST.md)

---

### 構造化データ
```typescript
const structuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Activity Name",
  "description": "Activity description",
  "image": "https://example.com/image.jpg"
};
```

---

## 🧪 テスト

### ユニットテスト
```bash
# すべてのテストを実行
npm run test

# 特定のテストを実行
npm run test -- ExperienceCard.test.tsx

# カバレッジレポート
npm run test:coverage
```

---

### E2Eテスト
```bash
# Cypressを起動
npm run cypress:open

# ヘッドレスモードで実行
npm run cypress:run
```

---

## 📊 モニタリング

### パフォーマンスメトリクス
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

詳細: [OPTIMIZATION_REPORT.md](./OPTIMIZATION_REPORT.md)

---

### エラー監視
```typescript
// エラーハンドリング
try {
  await submitForm(data);
} catch (error) {
  console.error('Form submission error:', error);
  // Slackに通知
  await sendSlackNotification(error);
}
```

---

## 🔧 トラブルシューティング

### ビルドエラー
1. `node_modules`を削除して再インストール
2. `.next`フォルダを削除
3. TypeScriptエラーを確認

### パフォーマンス問題
1. [OPTIMIZATION_RECOMMENDATIONS.md](./OPTIMIZATION_RECOMMENDATIONS.md) を確認
2. Chrome DevToolsでプロファイリング
3. Lighthouse レポートを確認

### SEO問題
1. [SEO_CHECKLIST.md](./SEO_CHECKLIST.md) を確認
2. Google Search Console を確認
3. メタタグを検証

---

## 📞 サポート

開発に関する質問:
- 📧 Email: mitsuki@gappy.jp
- 💬 Slack: #tabinaka-media-dev

---

[← メインドキュメントに戻る](../README.md)


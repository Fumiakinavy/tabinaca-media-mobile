# ⚡ 機能説明ドキュメント

各機能の使い方と実装詳細に関するドキュメント集です。

---

## 📋 機能一覧

### 👍 [README_LIKE_FEATURE.md](./README_LIKE_FEATURE.md)
**機能**: いいね機能  
**説明**: ユーザーがアクティビティに「いいね」できる機能

**主な機能**:
- いいねの追加・削除
- いいね数の表示
- ユーザーごとのいいね管理
- リアルタイム更新

**使い方**:
```typescript
// いいねを追加
await addLike(activityId, userId);

// いいねを削除
await removeLike(activityId, userId);
```

---

### 📱 [README_QR_CODE_SYSTEM.md](./README_QR_CODE_SYSTEM.md)
**機能**: QRコードシステム  
**説明**: 予約確認用のQRコード生成と管理

**主な機能**:
- QRコード生成
- スキャン回数制限
- トラッキングURL生成
- メール添付

**使い方**:
```typescript
const qrCode = await generateEmailQRCode(
  bookingId,
  couponCode,
  userInfo,
  activityInfo,
  bookingDate
);
```

---

### 🗺️ [README_GOOGLE_MAPS_REVIEWS.md](./README_GOOGLE_MAPS_REVIEWS.md)
**機能**: Google Mapsレビュー表示  
**説明**: アクティビティページにGoogle Mapsのレビューを表示

**主な機能**:
- レビューの取得
- 評価の表示
- 口コミの表示
- リアルタイム更新

**使い方**:
```tsx
<GoogleMapsReviews placeId="ChIJxxxxxxx" />
```

---

### 🎯 [README_EXPERIENCE_MANAGEMENT.md](./README_EXPERIENCE_MANAGEMENT.md)
**機能**: 体験管理システム  
**説明**: アクティビティの掲載状態を一元管理

**主な機能**:
- アクティビティの有効/無効切り替え
- 設定の一元管理
- 多言語対応
- 統一フォームの表示制御

**使い方**:
```typescript
// アクティビティの状態を確認
const isActive = getExperienceStatus('kimono-dressing-experience');

// 統一フォームの表示状態を確認
const showForm = getExperienceUnifiedFormStatus('kimono-dressing-experience');
```

---

### 🌐 [README_NGROK.md](./README_NGROK.md)
**機能**: ngrok開発環境  
**説明**: ローカル開発環境を外部からアクセス可能にする

**主な機能**:
- HTTPSトンネルの作成
- Webhook テスト
- モバイルデバイステスト
- 外部サービス連携テスト

**使い方**:
```bash
# ngrokを起動
ngrok http 2098

# 生成されたURLを使用
https://xxxx-xx-xxx-xxx-xx.ngrok.io
```

---

## 🎯 機能の使い方ガイド

### いいね機能を実装する

1. [README_LIKE_FEATURE.md](./README_LIKE_FEATURE.md) を読む
2. データベース設定を確認
3. コンポーネントにLikeButtonを追加

```tsx
import LikeButton from '@/components/LikeButton';

<LikeButton activityId={id} userId={user?.id} />
```

---

### QRコードを生成する

1. [README_QR_CODE_SYSTEM.md](./README_QR_CODE_SYSTEM.md) を読む
2. 必要な情報を準備
3. `generateEmailQRCode`関数を呼び出す

```typescript
const qrCode = await generateEmailQRCode(
  'booking_123',
  'GAPPY2025ABC',
  { name: 'John Doe', email: 'john@example.com' },
  { title: 'Kimono Experience', location: 'Shibuya' },
  new Date()
);
```

---

### Google Mapsレビューを表示する

1. [README_GOOGLE_MAPS_REVIEWS.md](./README_GOOGLE_MAPS_REVIEWS.md) を読む
2. Place IDを取得
3. コンポーネントを追加

```tsx
import GoogleMapsReviews from '@/components/GoogleMapsReviews';

<GoogleMapsReviews placeId="ChIJxxxxxxx" />
```

---

## 🔧 トラブルシューティング

### いいね機能が動作しない
- Supabase RLSポリシーを確認
- ユーザー認証状態を確認
- [README_LIKE_FEATURE.md](./README_LIKE_FEATURE.md) のトラブルシューティングセクションを参照

### QRコードが生成されない
- 環境変数（NEXT_PUBLIC_BASE_URL）を確認
- [README_QR_CODE_SYSTEM.md](./README_QR_CODE_SYSTEM.md) のエラーハンドリングを参照

### Google Mapsレビューが表示されない
- Google Maps API Keyを確認
- Place IDが正しいか確認
- [README_GOOGLE_MAPS_REVIEWS.md](./README_GOOGLE_MAPS_REVIEWS.md) のトラブルシューティングを参照

---

## 📞 サポート

機能に関する質問や提案:
- 📧 Email: mitsuki@gappy.jp
- 💬 Slack: #tabinaka-media-features

---

[← メインドキュメントに戻る](../README.md)


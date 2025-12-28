# アフィリエイトリンクカード作成に必要な情報

## 📋 必須情報

### 1. **PlaceCard（既存カードにアフィリエイトリンクを追加）**

```typescript
{
  // 必須
  place_id: string;        // Google Place ID
  name: string;             // 場所の名前
  
  // アフィリエイトリンク（必須）
  affiliateUrl: string;     // アフィリエイトリンクURL
  
  // 推奨（表示を充実させるため）
  photos?: Array<{          // 画像（Google Places APIから取得）
    photo_reference: string;
    height: number;
    width: number;
  }>;
  rating?: number;          // 評価（1-5）
  user_ratings_total?: number; // レビュー数
  types?: string[];         // 場所のタイプ（restaurant, cafe等）
  formatted_address?: string; // 住所
  geometry?: {              // 位置情報
    location: {
      lat: number;
      lng: number;
    };
  };
  distance_m?: number;      // 距離（メートル）
  opening_hours?: {         // 営業時間
    open_now?: boolean;
  };
  hook?: string;            // カスタムタイトル（オプション）
}
```

### 2. **AffiliateCard（専用カード）**

```typescript
{
  // 必須
  title: string;            // カードのタイトル
  affiliateUrl: string;     // アフィリエイトリンクURL
  
  // 推奨
  imageUrl?: string;       // 画像URL（任意、なければプレースホルダー）
  description?: string;     // 説明文（任意）
  price?: string;           // 価格表示（例: "¥5,000"）
  discount?: string;        // 割引バッジ（例: "20%"）
  badge?: string;          // おすすめバッジ（例: "おすすめ"）
}
```

## 🔄 データ取得方法

### Google Places APIから取得できる情報

```typescript
// Google Places APIのレスポンス例
{
  place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
  name: "レストラン名",
  formatted_address: "東京都渋谷区...",
  rating: 4.5,
  user_ratings_total: 1234,
  price_level: 2,
  types: ["restaurant", "food", "point_of_interest"],
  photos: [{
    photo_reference: "xxx",
    height: 1080,
    width: 1920
  }],
  geometry: {
    location: {
      lat: 35.6580,
      lng: 139.7016
    }
  },
  opening_hours: {
    open_now: true
  }
}
```

### アフィリエイトリンクの追加方法

#### 方法1: データベースのmetadataに保存

```typescript
// activitiesテーブルのmetadata JSONBに保存
{
  "affiliate_url": "https://example.com/affiliate-link?ref=gappy",
  "affiliate_provider": "booking.com",
  "affiliate_tracking_id": "gappy-123"
}
```

#### 方法2: experienceSettingsに追加

```typescript
// config/experienceSettings.ts
{
  slug: "restaurant-name",
  isActive: true,
  displayName: "レストラン名",
  affiliateUrl: "https://example.com/affiliate-link", // 追加
  // ... その他の設定
}
```

#### 方法3: APIレスポンスに含める

```typescript
// AI ChatやRecommendation APIのレスポンスに追加
{
  place_id: "xxx",
  name: "レストラン名",
  affiliateUrl: "https://example.com/affiliate-link", // 追加
  // ... その他の情報
}
```

## 📊 実装例

### PlaceCardを使用する場合

```typescript
<PlaceCard
  place={{
    place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    name: "レストラン名",
    affiliateUrl: "https://example.com/affiliate-link", // 必須
    photos: [...],
    rating: 4.5,
    // ... その他の情報
  }}
/>
```

### AffiliateCardを使用する場合

```typescript
<AffiliateCard
  title="レストラン名"
  description="美味しい料理を楽しめるレストラン"
  imageUrl="/images/restaurant.jpg"
  affiliateUrl="https://example.com/affiliate-link" // 必須
  price="¥5,000"
  discount="20%"
  badge="おすすめ"
/>
```

## 🎯 最小限の情報でカードを作成する場合

### PlaceCard（最小構成）

```typescript
{
  place_id: "xxx",           // 必須
  name: "場所名",              // 必須
  affiliateUrl: "https://...", // 必須（アフィリエイトリンク用）
}
```

### AffiliateCard（最小構成）

```typescript
{
  title: "タイトル",          // 必須
  affiliateUrl: "https://...", // 必須
}
```

## 💡 推奨される追加情報

カードの見栄えとコンバージョンを向上させるため、以下も追加推奨：

1. **画像**: 視覚的な魅力を高める
2. **評価・レビュー数**: 信頼性を示す
3. **価格**: ユーザーの判断材料
4. **割引情報**: クリック率を向上
5. **説明文**: 詳細情報で興味を引く
6. **距離**: 位置情報がある場合

## 🔗 トラッキング

両方のコンポーネントで、クリック時にGoogle Analyticsイベントを自動送信：

```typescript
gtag("event", "affiliate_click", {
  place_id: "xxx",
  place_name: "レストラン名",
  affiliate_url: "https://..."
});
```


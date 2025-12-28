# SavedページでのGoogle Maps API呼び出し

## 概要

`/liked-activities`ページ（Savedページ）では、**Google Maps API（Google Places API）を呼び出しています**。

## API呼び出しの目的

savedページでは、**MDXアクティビティの星評価（レーティング）を表示するため**にGoogle Places APIを呼び出しています。

## 呼び出しフロー

### 1. `useBatchRatings` フック（バッチ取得）

**場所**: `pages/liked-activities.tsx` の359行目

```typescript
const { getRating } = useBatchRatings({
  placeIds: mdxPlaceIds,
  enabled: mdxPlaceIds.length > 0,
});
```

**処理内容**:
- MDXアクティビティから`googlePlaceId`を抽出
- 複数のplaceIdを一度に取得するためにバッチAPIを使用
- `/api/google-places-reviews-batch`を呼び出す

**APIエンドポイント**: `/api/google-places-reviews-batch`
- 複数のplaceIdに対して**Google Places APIのPlace Details API**を並列で呼び出す
- 最大50件まで一度に取得可能

---

### 2. `LazyGoogleMapsRating` コンポーネント（個別取得）

**場所**: `pages/liked-activities.tsx` の501行目

```typescript
{it.googlePlaceId && (
  <LazyGoogleMapsRating
    placeId={it.googlePlaceId}
    size="sm"
    showCount={false}
    className="text-xs"
    rating={getRating(it.googlePlaceId)?.rating}
    userRatingsTotal={
      getRating(it.googlePlaceId)?.user_ratings_total
    }
  />
)}
```

**処理内容**:
- ビューポートに入ったときに評価情報を表示
- まず`useBatchRatings`の結果（`getRating`）を使用
- もしデータがなければ、`GoogleMapsRating`が`/api/google-places-reviews`を呼び出す

**APIエンドポイント**: `/api/google-places-reviews`
- 1つのplaceIdに対して**Google Places APIのPlace Details API**を呼び出す

---

## Google Places API呼び出しの詳細

### `/api/google-places-reviews` (単一取得)

**実装**: `pages/api/google-places-reviews.ts`

```typescript
const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&language=en&region=jp&key=${apiKey}`;
```

**呼び出すAPI**: Google Places API - Place Details API
- **エンドポイント**: `https://maps.googleapis.com/maps/api/place/details/json`
- **フィールド**: `rating`, `user_ratings_total`, `reviews`
- **目的**: 場所の評価（星の数）とレビュー数を取得

---

### `/api/google-places-reviews-batch` (バッチ取得)

**実装**: `pages/api/google-places-reviews-batch.ts`

```typescript
// 複数のplaceIdに対して並列で取得
const promises = placeIds.map(async (placeId) => {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&language=en&region=jp&key=${apiKey}`;
  // ...
});
```

**呼び出すAPI**: Google Places API - Place Details API（複数回）
- 各placeIdに対して個別にAPIを呼び出す
- 並列実行で効率化
- 最大50件まで

---

## キャッシュ戦略

### クライアント側（localStorage）
- **TTL**: 7日間
- **キー**: `client_cache:place_reviews:{placeId}`
- ブラウザのlocalStorageに保存

### サーバー側（apiCache）
- **TTL**: `CACHE_TTL.PLACE_REVIEWS`に基づく
- メモリキャッシュ（サーバー再起動でクリア）

## 実際の呼び出しタイミング

### 初回アクセス時（キャッシュなし）

1. `useBatchRatings`が動作
   - MDXアクティビティの`googlePlaceId`を抽出
   - `/api/google-places-reviews-batch`を呼び出す
   - 最大で**保存されているMDXアクティビティの数だけ**APIを呼び出す可能性

2. 各MDXアクティビティカードに`LazyGoogleMapsRating`が表示される
   - ビューポートに入ったときに評価を表示
   - `useBatchRatings`の結果があればそれを使用（API呼び出しなし）
   - なければ`/api/google-places-reviews`を呼び出す

### 2回目以降（キャッシュあり）

- localStorageのキャッシュ（7日間有効）を使用
- **Google Maps APIを呼び出さない**

## 最適化ポイント

1. **バッチ取得**: 複数の評価を一度に取得
2. **Lazy Loading**: ビューポートに入ったときだけ読み込む
3. **キャッシュ**: 7日間のクライアントサイドキャッシュ
4. **props渡し**: `useBatchRatings`の結果をpropsで渡すことで、重複API呼び出しを回避

## まとめ

✅ **SavedページはGoogle Maps APIを呼び出しています**

- **目的**: MDXアクティビティの星評価を表示
- **API**: Google Places API - Place Details API
- **エンドポイント**:
  - `/api/google-places-reviews` (単一取得)
  - `/api/google-places-reviews-batch` (バッチ取得)
- **最適化**: バッチ取得、Lazy Loading、7日間のキャッシュ

**注意**: AIカード（Gappychatのカード）には`LazyGoogleMapsRating`は使用されていないため、AIカード表示時はGoogle Maps APIを呼び出しません。










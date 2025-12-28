# Google Maps レビュー機能

この機能を使用すると、Google Mapsのレビューから星評価を取得して表示できます。

## セットアップ

### 1. Google Places API キーの取得

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. Places API を有効化
4. API キーを作成
5. 環境変数に追加:

```bash
GOOGLE_PLACES_API_KEY=your_api_key_here
```

### 2. Place ID の取得

Google Maps で場所を検索し、URLから Place ID を取得するか、[Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id) を使用してください。

例: `ChIJN1t_tDeuEmsRUsoyG83frY4`

## 使用方法

### 基本的な星評価表示

```tsx
import GoogleMapsRating from '@/components/GoogleMapsRating';

function MyComponent() {
  return (
    <GoogleMapsRating 
      placeId="ChIJN1t_tDeuEmsRUsoyG83frY4"
      showCount={true}
      size="md"
    />
  );
}
```

### 詳細なレビュー表示

```tsx
import GoogleMapsReviews from '@/components/GoogleMapsReviews';

function MyComponent() {
  return (
    <GoogleMapsReviews 
      placeId="ChIJN1t_tDeuEmsRUsoyG83frY4"
      showReviews={true}
      maxReviews={5}
    />
  );
}
```


## コンポーネントのプロパティ

### GoogleMapsRating

| プロパティ | 型 | デフォルト | 説明 |
|-----------|-----|----------|------|
| placeId | string | - | Google Places API の Place ID |
| showCount | boolean | true | レビュー数を表示するか |
| size | 'sm' \| 'md' \| 'lg' | 'md' | 表示サイズ |
| className | string | '' | 追加のCSSクラス |

### GoogleMapsReviews

| プロパティ | 型 | デフォルト | 説明 |
|-----------|-----|----------|------|
| placeId | string | - | Google Places API の Place ID |
| showReviews | boolean | true | 個別レビューを表示するか |
| maxReviews | number | 5 | 表示するレビューの最大数 |
| className | string | '' | 追加のCSSクラス |

## API エンドポイント

### GET /api/google-places-reviews

Google Places API からレビュー情報を取得します。

**クエリパラメータ:**
- `placeId`: Google Places API の Place ID

**レスポンス:**
```json
{
  "rating": 4.5,
  "user_ratings_total": 123,
  "reviews": [
    {
      "author_name": "ユーザー名",
      "rating": 5,
      "relative_time_description": "2週間前",
      "time": 1234567890
    }
  ]
}
```

## エラーハンドリング

- API キーが設定されていない場合
- Place ID が無効な場合
- Google Places API からのエラーレスポンス
- ネットワークエラー

すべてのエラーは適切にハンドリングされ、ユーザーフレンドリーなメッセージが表示されます。

## 料金について

Google Places API は使用量に応じて料金が発生します。詳細は [Google Places API の料金](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) を確認してください。

## 制限事項

- Google Places API の利用制限に従います
- レビューテキストは表示されません（星評価のみ）
- API レスポンスはキャッシュされません（必要に応じて実装を追加してください）

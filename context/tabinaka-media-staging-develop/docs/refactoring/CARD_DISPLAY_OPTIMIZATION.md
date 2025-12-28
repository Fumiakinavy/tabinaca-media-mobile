# カード表示のAPI呼び出し最適化

## 問題点

カードが表示されるたびに、各カードごとに`/api/google-places-reviews`を呼び出していました。複数のカードが同時に表示されると、複数のAPIリクエストが同時に発生し、パフォーマンスとAPIコストに影響がありました。

## 最適化内容

### 1. バッチAPIの作成

`/api/google-places-reviews-batch`エンドポイントを作成し、複数のplaceIdを一度に取得できるようにしました。

- 最大50件まで一度に取得可能
- キャッシュをチェックしてからAPIを呼び出す
- 並列でAPIリクエストを実行

### 2. カスタムフックの作成

`useBatchRatings`フックを作成し、カードリスト表示時に一括で評価情報を取得できるようにしました。

- クライアントサイドキャッシュ（localStorage）を活用
- サーバーサイドキャッシュと連携
- 必要なplaceIdのみをAPIから取得

### 3. コンポーネントの最適化

#### `GoogleMapsRating`
- propsで評価情報を受け取れるように変更
- propsが渡されている場合はAPI呼び出しをスキップ

#### `ExperienceMeta`
- `rating`と`userRatingsTotal`をpropsで受け取れるように変更
- 親コンポーネントから評価情報を渡すことでAPI呼び出しを回避

#### `ExperiencesCarousel`
- `useBatchRatings`フックを使用して一括取得
- 取得した評価情報を`ExperienceMeta`に渡す

## 使用方法

### カードリスト表示時（推奨）

```tsx
import { useBatchRatings } from '@/hooks/useBatchRatings';

function MyComponent({ items }) {
  const placeIds = items
    .map(item => item.googlePlaceId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const { getRating } = useBatchRatings({ placeIds, enabled: placeIds.length > 0 });

  return (
    <div>
      {items.map(item => (
        <ExperienceCard
          key={item.slug}
          experience={item}
          rating={getRating(item.googlePlaceId)?.rating}
          userRatingsTotal={getRating(item.googlePlaceId)?.user_ratings_total}
        />
      ))}
    </div>
  );
}
```

### 単一カード表示時（従来通り）

```tsx
<ExperienceCard experience={experience} />
```

propsで評価情報が渡されない場合は、従来通り`GoogleMapsRating`が個別にAPIを呼び出します。

## 効果

- **API呼び出し回数の削減**: カードリスト表示時に、複数のAPI呼び出しが1回のバッチAPI呼び出しに集約
- **パフォーマンス向上**: 並列処理により、複数の評価情報を効率的に取得
- **キャッシュの活用**: クライアントサイドとサーバーサイドの両方でキャッシュを活用

## 今後の改善案

1. **SSG/SSRでの事前取得**: `getStaticProps`や`getServerSideProps`で評価情報も取得し、propsとして渡す
2. **ISRの活用**: 評価情報を定期的に再生成してキャッシュに保存
3. **SWR/React Queryの導入**: より高度なキャッシュ戦略の実装


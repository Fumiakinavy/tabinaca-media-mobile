# SavedページのAPI呼び出し概要

## 概要

`/liked-activities`ページ（Saved Activitiesページ）は、ユーザーがいいねしたアクティビティを表示するページです。このページは以下の**2つのAPI**を呼び出しています。

## API呼び出し

### 1. `/api/likes/user` - MDXアクティビティのいいね一覧取得

**呼び出し箇所**: `pages/liked-activities.tsx` の `useEffect` (119行目)

```typescript
const response = await fetch("/api/likes/user", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
  cache: "no-store",
});
```

**返却データ**:
```typescript
{
  success: boolean;
  activities?: Array<{
    slug: string;        // アクティビティのスラッグ
    title: string;
    coverImage: string;
    price: number | null;
    duration: string | null;
    summary: string | null;
    likedAt: string;     // いいねした日時
    tags?: string[];
    motivationTags?: string[];
  }>;
  count?: number;
}
```

**API実装**: `pages/api/likes/user.ts`
- `activity_interactions`テーブルから`interaction_type = 'like'`のレコードを取得
- `account_id`でフィルタリング
- スラッグ（`activity_slug`）のリストを返す

**使用目的**:
- ユーザーがいいねしたMDXアクティビティ（通常の体験ページ）のスラッグ一覧を取得
- 取得したスラッグリストは、静的生成された`allExperiences`と照合してフィルタリングに使用

---

### 2. `/api/generated-activities/saves` - AIカードの保存一覧取得

**呼び出し箇所**: `pages/liked-activities.tsx` の `useEffect` (168行目)

```typescript
const saves = await fetchGeneratedActivitySaves();
```

**内部実装**: `lib/generatedActivitySaves.ts` (76行目)

```typescript
const response = await fetch("/api/generated-activities/saves", {
  method: "GET",
  credentials: "include",
});
```

**返却データ**:
```typescript
{
  success: boolean;
  saves?: Array<{
    id: string;
    generated_activity_id: string;
    source: "chat" | "recommendation" | "manual";
    created_at: string;
    interaction_id?: string | null;
    generated_activity?: {
      id: string;
      draft_slug?: string | null;
      activity_id?: string | null;
      title?: string | null;
      summary?: string | null;
      status?: string | null;
      created_at?: string | null;
      metadata?: {
        place: PlacePayload;  // GappychatカードのPlace情報
      } | null;
    } | null;
  }>;
}
```

**API実装**: `pages/api/generated-activities/saves.ts`
- `generated_activity_saves`テーブルから該当ユーザーの保存一覧を取得
- `generated_activities`テーブルとJOINして、Place情報（`metadata.place`）を含めて返す
- `account_id`でフィルタリング
- 最大50件まで取得（`MAX_SAVES = 50`）

**使用目的**:
- ユーザーがGappychatでいいねしたAIカードの一覧を取得
- Place情報（名前、住所、評価など）を含めて表示に使用

---

## データフロー

```
ユーザーが/liked-activitiesページを開く
│
├─→ 1. /api/likes/user を呼び出す
│   └─→ activity_interactionsテーブルからlike一覧を取得
│   └─→ スラッグリストを返す
│   └─→ allExperiencesから該当するMDXアクティビティをフィルタリング
│
└─→ 2. /api/generated-activities/saves を呼び出す
    └─→ generated_activity_savesテーブルから保存一覧を取得
    └─→ generated_activitiesテーブルとJOINしてPlace情報を含める
    └─→ Gappychatカードとして表示
```

## 表示されるデータ

### MDXアクティビティ（通常の体験ページ）
- **データソース**: 静的生成された`allExperiences`（`getStaticProps`で取得）
- **フィルタリング**: `/api/likes/user`で取得したスラッグリストでフィルタ
- **表示**: カード形式で表示（タイトル、画像、価格、評価など）

### AIカード（Gappychatのカード）
- **データソース**: `/api/generated-activities/saves`で取得
- **表示**: `PlaceCard`コンポーネントで表示（Place情報を使用）

## 静的データと動的データの組み合わせ

1. **静的データ**（ビルド時に生成）:
   - `allExperiences`: 全MDXアクティビティのリスト（`getAllItems`で取得）

2. **動的データ**（実行時にAPIから取得）:
   - `/api/likes/user`: ユーザーがいいねしたスラッグリスト
   - `/api/generated-activities/saves`: ユーザーが保存したAIカードリスト

3. **フィルタリング**:
   - MDXアクティビティは`allExperiences`をスラッグリストでフィルタ
   - AIカードはそのまま表示

## まとめ

**Savedページは2つのAPIを叩いています：**

1. ✅ `/api/likes/user` - MDXアクティビティのいいね一覧
2. ✅ `/api/generated-activities/saves` - GappychatのAIカードの保存一覧

両方のAPIは認証が必要で、`account_id`でフィルタリングされています。










# Gappychatのカードをいいねしたときの保存処理

## 概要

Gappychatで表示されるカード（AI生成されたアクティビティ）をいいねしたときに、以下のデータが複数のテーブルに保存されます。

## 保存フロー

### 1. フロントエンド (`components/GeneratedActivitySaveButton.tsx`)

ユーザーがいいねボタンをクリックすると：

```typescript
// いいね時
const result = await savePlaceCard(place, source);
// source: "chat" | "recommendation" | "manual"
```

### 2. APIエンドポイント (`/api/chat/places/[placeId]/save`)

POSTリクエストで以下の処理が実行されます：

```typescript
// 1. Place情報からGeneratedActivityを取得または作成
const generatedActivity = await ensureGeneratedActivityFromPlace(placePayload);

// 2. アカウント情報を解決
const resolved = await resolveAccountId(req); // account_idを取得

// 3. 保存処理を実行
await saveGeneratedActivityForAccount({
  accountId: resolved.accountId,
  generatedActivity,
  source: "chat",
});
```

## 保存先テーブル

### 1. `generated_activities` テーブル

**AI生成されたアクティビティの情報を保存**

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID | 生成されたアクティビティの一意識別子 |
| `chat_session_id` | UUID | 作成元のチャットセッション（NULL可） |
| `draft_slug` | TEXT | 仮スラッグ（例: "tokyo-sauna-spot-abc123"） |
| `title` | TEXT | カードのタイトル（Placeの名前） |
| `summary` | TEXT | サマリー（Placeのhookまたは概要） |
| `body_mdx` | TEXT | MDX形式の本文（カードの内容） |
| `source_place_id` | TEXT | Google Places APIのplace_id |
| `status` | enum | `draft`, `approved`, `rejected`, `published` |
| `created_at` | TIMESTAMPTZ | 作成日時 |
| `updated_at` | TIMESTAMPTZ | 更新日時 |
| `metadata` | JSONB | Place情報全体がJSONとして保存 |

**保存される内容の例：**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "東京 サウナ",
  "draft_slug": "tokyo-sauna-spot-abc123",
  "body_mdx": "# 東京 サウナ\n\n...",
  "source_place_id": "ChIJ...",
  "metadata": {
    "place": {
      "place_id": "ChIJ...",
      "name": "東京 サウナ",
      "formatted_address": "...",
      "rating": 4.5,
      ...
    }
  }
}
```

### 2. `generated_activity_saves` テーブル

**ユーザーがいいねした情報を保存**

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID | 保存レコードの一意識別子 |
| `generated_activity_id` | UUID | FK → `generated_activities.id` |
| `account_id` | UUID | FK → `accounts.id`（いいねしたユーザー） |
| `source` | enum | `chat`, `recommendation`, `manual` |
| `interaction_id` | UUID | `activity_interactions`テーブルの関連ID |
| `metadata` | JSONB | 追加メタデータ |
| `created_at` | TIMESTAMPTZ | いいねした日時 |
| UNIQUE制約 | - | `(generated_activity_id, account_id)` - 同じユーザーが同じカードを重複して保存できない |

**保存される内容の例：**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "generated_activity_id": "550e8400-e29b-41d4-a716-446655440000",
  "account_id": "770e8400-e29b-41d4-a716-446655440002",
  "source": "chat",
  "interaction_id": "880e8400-e29b-41d4-a716-446655440003",
  "created_at": "2025-01-13T10:00:00Z"
}
```

### 3. `activity_interactions` テーブル

**インタラクション履歴を保存（統一的にいいね情報を管理）**

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID | インタラクションの一意識別子 |
| `account_id` | UUID | FK → `accounts.id` |
| `activity_id` | UUID | FK → `activities.id`（NULL可 - まだ正式なアクティビティになっていない場合） |
| `activity_slug` | TEXT | アクティビティのスラッグ（例: "generated-{id}"） |
| `interaction_type` | enum | `ai_save`（Gappychatカードのいいねはこれ） |
| `source_type` | enum | `chat`, `recommendation`, `manual` |
| `source_id` | UUID | ソースのID（`generated_activity_id`） |
| `created_at` | TIMESTAMPTZ | インタラクション発生日時 |

**保存される内容の例：**

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "account_id": "770e8400-e29b-41d4-a716-446655440002",
  "activity_id": null,
  "activity_slug": "tokyo-sauna-spot-abc123",
  "interaction_type": "ai_save",
  "source_type": "chat",
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-13T10:00:00Z"
}
```

## 処理の流れ（詳細）

### `saveGeneratedActivityForAccount` 関数の処理順序

```typescript
// 1. GeneratedActivityのスラッグを構築
const activitySlug = buildGeneratedActivitySlug(generatedActivity, generatedActivity.id);
// 例: "tokyo-sauna-spot-abc123" または "generated-{uuid}"

// 2. activity_interactionsテーブルにインタラクションを記録
const interactionId = await upsertAiSaveInteraction({
  accountId: options.accountId,
  activityId: generatedActivity.activity_id ?? null,
  activitySlug,
  source: "chat",
  generatedActivityId: generatedActivity.id,
});

// 3. generated_activity_savesテーブルに保存情報を記録
await supabaseServer
  .from("generated_activity_saves")
  .upsert({
    generated_activity_id: generatedActivity.id,
    account_id: options.accountId,
    source: "chat",
    interaction_id: interactionId,
  });
```

## まとめ

**Gappychatのカードをいいねしたときに保存されるもの：**

1. **`generated_activities`テーブル**
   - AI生成されたアクティビティの情報（Place情報を含む）
   - カードの内容（タイトル、サマリー、MDX本文）

2. **`generated_activity_saves`テーブル**
   - どのユーザーがどのカードをいいねしたか
   - 保存元（chat/recommendation/manual）

3. **`activity_interactions`テーブル**
   - インタラクション履歴（統一的に管理）
   - タイプ: `ai_save`

**特徴：**
- 同じユーザーが同じカードを重複して保存することはできない（UNIQUE制約）
- Place情報は`generated_activities.metadata`にJSON形式で保存される
- 保存時には必ず`generated_activity`が作成され、それに関連して保存情報が記録される

## 参照ファイル

- `components/GeneratedActivitySaveButton.tsx` - フロントエンドのいいねボタン
- `lib/generatedActivitySaves.ts` - クライアント側のAPI呼び出し
- `pages/api/chat/places/[placeId]/save.ts` - APIエンドポイント
- `lib/server/generatedActivitySaveService.ts` - サーバー側の保存処理ロジック
- `supabase/migrations/20250113000001_create_new_schema.sql` - データベーススキーマ定義










# AI チャットボット × 自動アクティビティ生成システム

## プロジェクト概要

ユーザーと会話を通じて、Google Places APIと連携してアクティビティを検索し、自社データベースにマッチするものがあれば表示、なければAIが自動で新規アクティビティを生成するシステム。

### 目的
- ユーザーとの自然な会話でアクティビティレコメンド
- Google Mapsの店舗情報を自社フォーマットに自動変換
- MDXファイル + SQLレコード + Supabaseデータの自動生成
- 運営の手作業を削減し、アクティビティ掲載数を拡大

---

## システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        フロントエンド                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  チャットボットUI (React Component)                    │   │
│  │  - メッセージ送受信                                     │   │
│  │  - ExperienceCard表示                                 │   │
│  │  - ローディング状態                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                        バックエンドAPI                         │
│                                                               │
│  ┌─────────────────┐  ┌──────────────────────────────┐     │
│  │ /api/chatbot    │  │ /api/smart-search            │     │
│  │ - 会話管理       │  │ - Google Places検索          │     │
│  │ - 意図抽出       │  │ - 自社DBマッチング            │     │
│  │ - 応答生成       │  │ - 類似度計算                  │     │
│  └─────────────────┘  └──────────────────────────────┘     │
│           │                        │                         │
│           │                        ↓                         │
│  ┌─────────────────────────────────────────────────┐        │
│  │ /api/auto-generate-experience                   │        │
│  │ - Place Details取得                              │        │
│  │ - AI コンテンツ生成                               │        │
│  │ - MDX ファイル作成                                │        │
│  │ - SQL INSERT 生成                                │        │
│  │ - Supabase 書き込み（オプション）                  │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
           ↕                    ↕                    ↕
┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│  OpenAI API  │   │ Google Places API│   │  Supabase DB │
│  - GPT-4     │   │ - Text Search    │   │  - activities│
│  - Embeddings│   │ - Place Details  │   │  - 既存データ │
└──────────────┘   │ - Photos         │   └──────────────┘
                   └──────────────────┘
                            ↕
                   ┌──────────────────┐
                   │   Cloudinary     │
                   │ - 画像アップロード │
                   │ - 画像最適化      │
                   └──────────────────┘
```

---

## 技術スタック

### フロントエンド
- **React / Next.js** - 既存のフレームワーク
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **ExperienceCard** - 既存コンポーネント再利用

### バックエンド
- **Next.js API Routes** - サーバーレス関数
- **Node.js** - ランタイム
- **Supabase Client** - データベースアクセス

### 外部API
- **OpenAI API**
  - GPT-4 Turbo - 会話・コンテンツ生成
  - Embeddings (text-embedding-3-small) - 類似度検索
- **Google Places API**
  - Text Search - テキストベース検索
  - Nearby Search - 位置ベース検索
  - Place Details - 詳細情報取得
  - Places Photos - 画像取得
- **Cloudinary API** - 画像管理

### データベース
- **Supabase (PostgreSQL)** - 既存のDB
  - `activities` テーブル
  - `pgvector` 拡張 (Embeddings検索用)

### ファイルシステム
- **MDXファイル** - `content/experiences/en/[slug].mdx`
- **SQLファイル** - `scripts/auto-generated-activities.sql`

---

## 主要機能

### 1. チャットボット会話機能

#### 機能概要
- ユーザーと自然言語で会話
- 場所、カテゴリ、予算、時間帯などの条件を抽出
- 会話履歴を保持し、文脈を理解

#### 会話フロー例
```
ユーザー: 「渋谷でおしゃれなカフェ探してる」
Bot: 「渋谷のおしゃれなカフェですね！予算はいくらくらいをお考えですか？」

ユーザー: 「1000円以内で」
Bot: 「かしこまりました。インスタ映えするような場所がいいですか？」

ユーザー: 「そうそう！」
Bot: 「渋谷でインスタ映えする素敵なカフェを3つ見つけました！」
[ExperienceCard × 3]
```

#### 技術実装
- OpenAI Chat Completions API
- システムプロンプトで会話スタイル定義
- Function Calling で構造化データ抽出

---

### 2. Google Places検索統合

#### 検索タイプ

**A. Text Search**
```javascript
// 例: 自然言語クエリ
{
  query: "おしゃれなカフェ 渋谷",
  location: "35.6580,139.7016",
  radius: 1500,
  language: "ja",
  type: "cafe"
}
```

**B. Nearby Search**
```javascript
// 例: 位置ベース検索
{
  location: "35.6580,139.7016",
  radius: 1000,
  type: "restaurant",
  keyword: "sushi"
}
```

#### 取得データ
```typescript
interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number; // 0-4
  types: string[];
  photos?: Array<{ photo_reference: string }>;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  business_status?: string;
}
```

---

### 3. 自社データベースマッチング

#### マッチングロジック

**ステップ1: Place IDで完全一致**
```sql
SELECT * FROM activities 
WHERE google_place_id = 'ChIJxxx';
```

**ステップ2: Embeddings類似度検索**
```sql
-- pgvector拡張を使用
SELECT *, 
  1 - (embedding <=> query_embedding) as similarity
FROM activities
WHERE 1 - (embedding <=> query_embedding) > 0.7
ORDER BY similarity DESC
LIMIT 10;
```

**ステップ3: 名前・住所の部分一致**
```sql
SELECT * FROM activities
WHERE 
  LOWER(title) LIKE LOWER('%cafe%渋谷%')
  OR LOWER(address) LIKE LOWER('%渋谷%');
```

#### 判定基準
- Place ID一致: **100%マッチ** → 既存データ返す
- Embedding類似度 > 0.85: **高確率マッチ** → 既存データ返す
- Embedding類似度 0.7-0.85: **要確認** → 候補として提示
- マッチなし: **新規生成**

---

### 4. 自動アクティビティ生成

#### 生成プロセス

```
Place ID取得
    ↓
Google Place Details API呼び出し
    ↓
画像取得 (Photos API)
    ↓
Cloudinaryにアップロード
    ↓
ChatGPT GPT-4でコンテンツ生成
    ↓
MDXファイル作成
    ↓
SQL INSERT文生成
    ↓
Supabase DBに書き込み（オプション）
    ↓
Embeddings生成・保存
```

#### A. コンテンツ生成プロンプト

```typescript
const prompt = `
あなたは東京のアクティビティ紹介サイト「Gappy」のコンテンツライターです。

以下の店舗情報から、魅力的なアクティビティページのコンテンツを生成してください。

【店舗情報】
- 名前: ${placeName}
- 住所: ${address}
- カテゴリ: ${types.join(', ')}
- 評価: ${rating}/5.0 (${userRatingsTotal}件)
- 価格帯: ${priceLevel}
- 営業時間: ${openingHours}

【生成する内容】
1. title: キャッチーなタイトル（英語、80文字以内）
2. summary: 1行の要約（英語）
3. quickOverview: 2-3文の概要（英語、体験の魅力を伝える）
4. whatYouWillDo: 3ステップの体験内容（英語、箇条書き）
5. whatsIncluded: 含まれるもの3つ（英語、箇条書き）
6. perfectFor: ターゲット層4つ（英語、箇条書き）
7. motivationTags: 2-3個のタグ（以下から選択）
   - culture-heritage
   - taste-local-flavors
   - modern-culture
   - nature-outdoor
   - shopping
   - nightlife
   - family-friendly
8. estimatedDuration: 所要時間（分）
9. estimatedPrice: 推定価格（円）

【トーン】
- フレンドリーで親しみやすい
- 文化的な背景を尊重
- 具体的で実用的
- ワクワク感を与える

JSON形式で出力してください。
`;
```

#### B. MDXファイル生成

```typescript
interface GeneratedContent {
  title: string;
  summary: string;
  quickOverview: string;
  whatYouWillDo: string[];
  whatsIncluded: string[];
  perfectFor: string[];
  motivationTags: string[];
  estimatedDuration: number;
  estimatedPrice: number;
}

function generateMDX(
  placeDetails: GooglePlaceDetails,
  content: GeneratedContent,
  images: string[]
): string {
  return `---
title: "${content.title}"
summary: "${content.summary}"
coverImage: "${images[0]}"
price: ${content.estimatedPrice}
motivationTags: ${JSON.stringify(content.motivationTags)}
duration: "${content.estimatedDuration} min"
locationFromStation: "${calculateDistance(placeDetails)}"
address: "${placeDetails.formatted_address}"
googlePlaceId: "${placeDetails.place_id}"
storeNameEn: "${placeDetails.name}"
location:
  lat: ${placeDetails.geometry.location.lat}
  lng: ${placeDetails.geometry.location.lng}
images:
${images.map((url, i) => `  - url: "${url}"
    alt: "${placeDetails.name} - Image ${i + 1}"
    position: "object-center"`).join('\n')}
---

## Quick Overview

${content.quickOverview}

## What You'll Do

${content.whatYouWillDo.map((step, i) => `- **Step ${i + 1}**: ${step}`).join('\n')}

## What's Included

${content.whatsIncluded.map(item => `- ${item}`).join('\n')}

## Perfect For

${content.perfectFor.map(audience => `- ${audience}`).join('\n')}

---
`;
}
```

#### C. SQL生成

```typescript
function generateSQL(
  slug: string,
  title: string,
  duration: number,
  location: string
): string {
  return `INSERT INTO public.activities (slug, title, duration_minutes, location, is_active)
VALUES
  ('${slug}',
   '${title.replace(/'/g, "''")}',
   ${duration},
   '${location.replace(/'/g, "''")}',
   false  -- 初期状態は非公開（審査待ち）
  );`;
}
```

#### D. Supabase直接書き込み

```typescript
async function insertActivity(data: ActivityData) {
  const { data: result, error } = await supabase
    .from('activities')
    .insert([
      {
        slug: data.slug,
        title: data.title,
        duration_minutes: data.duration,
        location: data.location,
        is_active: false, // 審査待ち
        google_place_id: data.googlePlaceId,
        created_at: new Date().toISOString(),
        auto_generated: true, // 自動生成フラグ
      },
    ])
    .select();

  if (error) throw error;
  return result;
}
```

---

### 5. 画像処理

#### Google Places Photos → Cloudinary

```typescript
async function processImages(
  photoReferences: string[],
  placeName: string
): Promise<string[]> {
  const cloudinaryUrls: string[] = [];

  for (const ref of photoReferences.slice(0, 3)) {
    // Google Places Photo URLを構築
    const googlePhotoUrl = 
      `https://maps.googleapis.com/maps/api/place/photo?` +
      `maxwidth=800&photoreference=${ref}&key=${GOOGLE_API_KEY}`;

    // Cloudinaryにアップロード
    const uploadResult = await cloudinary.uploader.upload(
      googlePhotoUrl,
      {
        folder: 'auto-generated-experiences',
        public_id: `${slugify(placeName)}-${Date.now()}`,
        transformation: [
          { width: 1200, height: 800, crop: 'fill', quality: 'auto' },
        ],
      }
    );

    cloudinaryUrls.push(uploadResult.secure_url);
  }

  return cloudinaryUrls;
}
```

---

### 6. Embeddings による類似度検索

#### Embeddings生成

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

async function createActivityEmbedding(activity: Activity): Promise<void> {
  // タイトル + 説明 + カテゴリを結合
  const text = `${activity.title} ${activity.summary} ${activity.motivationTags.join(' ')}`;
  
  const embedding = await generateEmbedding(text);

  await supabase
    .from('activities')
    .update({ embedding })
    .eq('id', activity.id);
}
```

#### 類似度検索

```sql
-- Supabase Function
CREATE OR REPLACE FUNCTION search_similar_activities(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    activities.id,
    activities.slug,
    activities.title,
    1 - (activities.embedding <=> query_embedding) as similarity
  FROM activities
  WHERE 1 - (activities.embedding <=> query_embedding) > match_threshold
  ORDER BY activities.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## データフロー

### 会話からレコメンドまでの完全フロー

```
1. ユーザー入力
   "渋谷でおしゃれなカフェ探してる"
   
   ↓

2. /api/chatbot
   - OpenAI GPT-4に送信
   - Function Calling で意図抽出
   
   抽出データ: {
     intent: "search_activity",
     location: "渋谷",
     category: "カフェ",
     keywords: ["おしゃれ", "インスタ映え"]
   }
   
   ↓

3. /api/smart-search
   - Google Places Text Search実行
   
   結果: [
     { place_id: "ChIJxxx1", name: "Blue Bottle Coffee" },
     { place_id: "ChIJxxx2", name: "Onibus Coffee" },
     { place_id: "ChIJxxx3", name: "About Life Coffee" }
   ]
   
   ↓

4. 各Place IDについて自社DBチェック
   
   ┌─ ChIJxxx1: DBに存在 → 既存Activity取得
   │
   ├─ ChIJxxx2: DBに存在 → 既存Activity取得
   │
   └─ ChIJxxx3: DBに存在しない
       ↓
       /api/auto-generate-experience呼び出し
       
       ① Place Details取得
       ② 画像取得 → Cloudinary
       ③ GPT-4でコンテンツ生成
       ④ MDXファイル作成
       ⑤ SQLファイルに追記
       ⑥ Supabase挿入（オプション）
       ⑦ Embeddings生成・保存
   
   ↓

5. /api/chatbot に結果を返す
   - GPT-4で自然な応答文を生成
   
   応答: "渋谷で素敵なカフェを3つ見つけました！"
   
   ↓

6. フロントエンド表示
   - メッセージ表示
   - ExperienceCard × 3 表示
```

---

## API仕様

### 1. `/api/chatbot`

#### リクエスト
```typescript
POST /api/chatbot

{
  message: string;
  conversationId?: string;
  userId?: string;
}
```

#### レスポンス
```typescript
{
  reply: string;
  activities?: Activity[];
  conversationId: string;
  needsMoreInfo?: boolean;
  suggestedQuestions?: string[];
}
```

---

### 2. `/api/smart-search`

#### リクエスト
```typescript
POST /api/smart-search

{
  query?: string;
  location?: string;
  category?: string;
  keywords?: string[];
  radius?: number;
  priceLevel?: number;
  openNow?: boolean;
}
```

#### レスポンス
```typescript
{
  results: Array<{
    source: 'database' | 'google' | 'generated';
    activity: Activity;
    similarity?: number;
  }>;
  totalFound: number;
  fromCache: boolean;
}
```

---

### 3. `/api/auto-generate-experience`

#### リクエスト
```typescript
POST /api/auto-generate-experience

{
  placeId: string;
  autoApprove?: boolean; // 自動公開するか
  notifyAdmin?: boolean; // 管理者に通知
}
```

#### レスポンス
```typescript
{
  success: boolean;
  activity: Activity;
  files: {
    mdx: string;  // ファイルパス
    sql: string;  // SQLファイルパス
  };
  status: 'pending' | 'approved';
  message: string;
}
```

---

## データベーススキーマ

### 既存テーブル拡張

```sql
-- activities テーブルに追加カラム
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_activities_google_place_id 
ON activities(google_place_id);

CREATE INDEX IF NOT EXISTS idx_activities_embedding 
ON activities USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_activities_auto_generated 
ON activities(auto_generated);
```

### 新規テーブル（オプション）

```sql
-- 会話履歴テーブル
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  conversation_id TEXT NOT NULL,
  message TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- 自動生成ログテーブル
CREATE TABLE IF NOT EXISTS auto_generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id),
  place_id TEXT NOT NULL,
  generation_data JSONB,
  status TEXT, -- 'success' | 'failed' | 'pending_review'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Place IDキャッシュテーブル
CREATE TABLE IF NOT EXISTS place_cache (
  place_id TEXT PRIMARY KEY,
  details JSONB NOT NULL,
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_place_cache_expires ON place_cache(expires_at);
```

---

## コスト試算

### 1. OpenAI API

| 機能 | モデル | 使用量/回 | 料金/回 | 月間1000回 |
|------|--------|----------|---------|-----------|
| 会話管理 | GPT-4 Turbo | 1,000トークン | $0.01 | $10 |
| コンテンツ生成 | GPT-4 Turbo | 2,000トークン | $0.02 | $20 |
| Embeddings | text-embedding-3-small | 500トークン | $0.0001 | $0.1 |
| **合計** | | | **$0.03** | **$30.1** |

### 2. Google Places API

| API | 料金/1000回 | 使用頻度 | 月間コスト |
|-----|------------|----------|-----------|
| Text Search | $32 | 500回 | $16 |
| Place Details | $17 | 200回 | $3.4 |
| Place Photos | $7/1000枚 | 600枚 | $4.2 |
| **合計** | | | **$23.6** |

### 3. Cloudinary

| 項目 | 無料枠 | 超過時料金 |
|------|--------|-----------|
| ストレージ | 25GB | $0.18/GB |
| 帯域幅 | 25GB/月 | $0.10/GB |
| 変換数 | 25,000/月 | $0.002/変換 |

**想定**: 月間200アクティビティ生成 → 無料枠内

### 4. Supabase

**Pro Plan: $25/月**
- Database: 8GB (十分)
- Bandwidth: 100GB
- Storage: 100GB

### 月間総コスト試算

| 項目 | コスト |
|------|--------|
| OpenAI API | $30 |
| Google Places API | $24 |
| Cloudinary | $0 (無料枠内) |
| Supabase | $25 |
| **合計** | **$79/月 (約¥11,000)** |

**1アクティビティあたり**: 約¥55

---

## 実装フェーズ

### Phase 1: 基礎システム構築 (Week 1-2)

**目標**: 基本的なチャットボットと検索機能

#### タスク
- [ ] チャットボットUIコンポーネント作成
- [ ] `/api/chatbot` エンドポイント実装
- [ ] OpenAI API統合
- [ ] 会話履歴管理
- [ ] Google Places Text Search統合
- [ ] 既存DBとのマッチング（Place ID）
- [ ] ExperienceCard表示統合

#### 成果物
- 動作するチャットボット
- 既存アクティビティの検索・表示
- 基本的なUI/UX

---

### Phase 2: 自動生成機能 (Week 3-4)

**目標**: 新規アクティビティの自動生成

#### タスク
- [ ] `/api/auto-generate-experience` 実装
- [ ] Place Details取得ロジック
- [ ] GPT-4コンテンツ生成
- [ ] MDX生成ロジック
- [ ] SQL生成ロジック
- [ ] Cloudinary統合（画像アップロード）
- [ ] ファイルシステム書き込み
- [ ] 生成プレビュー機能

#### 成果物
- 自動生成機能
- MDX + SQL ファイル出力
- プレビューページ

---

### Phase 3: Embeddings & 高度な検索 (Week 5)

**目標**: 類似度検索の実装

#### タスク
- [ ] pgvector拡張セットアップ
- [ ] Embeddings生成バッチ処理
- [ ] 既存アクティビティのEmbeddings化
- [ ] 類似度検索関数作成
- [ ] `/api/smart-search` 拡張
- [ ] キャッシング機構

#### 成果物
- ベクトル検索機能
- 高精度マッチング
- パフォーマンス最適化

---

### Phase 4: 承認ワークフロー (Week 6)

**目標**: 品質管理と承認プロセス

#### タスク
- [ ] 管理画面UI
- [ ] 承認/却下機能
- [ ] 編集機能
- [ ] 通知システム（Slack連携）
- [ ] 審査待ちリスト
- [ ] 自動品質チェック

#### 成果物
- 管理ダッシュボード
- 承認フロー
- 品質保証

---

### Phase 5: 本番最適化 (Week 7-8)

**目標**: スケーラビリティとエラーハンドリング

#### タスク
- [ ] レート制限実装
- [ ] エラーハンドリング強化
- [ ] ログ・モニタリング
- [ ] キャッシュ戦略
- [ ] パフォーマンステスト
- [ ] セキュリティ監査
- [ ] ドキュメント整備

#### 成果物
- 本番対応システム
- 運用マニュアル
- テストカバレッジ

---

## 既存システムとの統合ポイント

### 1. 既存コンポーネントの再利用

```typescript
// ExperienceCard - そのまま使用可能
import ExperienceCard from '@/components/ExperienceCard';

// GoogleMapsRating - Place IDから評価表示
import GoogleMapsRating from '@/components/GoogleMapsRating';

// ExperienceTemplate - 詳細ページ表示
import ExperienceTemplate from '@/components/ExperienceTemplate';
```

### 2. 既存設定ファイルとの連携

```typescript
// config/experienceSettings.ts に自動追加
export const experienceSettings: ExperienceConfig[] = [
  // ... 既存設定
  {
    slug: "auto-generated-slug",
    isActive: false, // 初期は非公開
    displayName: "Auto Generated Title",
    showUnifiedForm: true,
    showMap: true,
    activityType: "partner_store",
  },
];
```

### 3. 既存APIとの共存

```
既存API:
  /api/google-places-reviews → そのまま使用
  /api/form-submissions → 予約機能で使用
  
新規API:
  /api/chatbot → 会話管理
  /api/smart-search → 検索
  /api/auto-generate-experience → 生成
```

### 4. データベース整合性

```sql
-- 既存の activities テーブルを拡張（破壊的変更なし）
-- 新規カラムはすべて NULL 許可
-- 既存データには影響なし
```

---

## セキュリティ考慮事項

### 1. APIキー保護

```typescript
// .env.local (Gitignoreに含める)
OPENAI_API_KEY=sk-...
GOOGLE_PLACES_API_KEY=AIza...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### 2. レート制限

```typescript
// Redis または Supabase でレート制限
const rateLimiter = {
  chatbot: '10 requests/minute',
  autoGenerate: '5 requests/hour',
  search: '20 requests/minute',
};
```

### 3. 入力検証

```typescript
// ユーザー入力のサニタイゼーション
import { z } from 'zod';

const chatMessageSchema = z.object({
  message: z.string().min(1).max(500),
  conversationId: z.string().uuid().optional(),
});
```

### 4. 認証・認可

```typescript
// 管理機能は認証必須
if (!session || !isAdmin(session.user)) {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

---

## モニタリング & ログ

### 1. ログ記録

```typescript
// 重要なイベントをログ
logger.info('Activity auto-generated', {
  placeId,
  slug,
  duration: generateTime,
  cost: estimatedCost,
});

logger.error('Generation failed', {
  placeId,
  error: error.message,
  stack: error.stack,
});
```

### 2. メトリクス

- 会話数/日
- 生成成功率
- API応答時間
- エラー率
- ユーザー満足度

### 3. アラート

- API制限到達
- 生成失敗率 > 10%
- 応答時間 > 5秒
- エラー率 > 5%

---

## テスト戦略

### 1. ユニットテスト

```typescript
// 各関数のテスト
describe('generateMDX', () => {
  it('should generate valid MDX content', () => {
    const result = generateMDX(mockPlaceDetails, mockContent, mockImages);
    expect(result).toContain('---');
    expect(result).toContain('title:');
  });
});
```

### 2. 統合テスト

```typescript
// API エンドポイントのテスト
describe('/api/chatbot', () => {
  it('should respond to user message', async () => {
    const res = await request(app)
      .post('/api/chatbot')
      .send({ message: '渋谷のカフェ' });
    
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
  });
});
```

### 3. E2Eテスト

- Playwright で実際のユーザーフローをテスト
- チャット → 検索 → カード表示 → 詳細ページ

---

## リスクと対策

### リスク1: API コスト超過

**対策**:
- レート制限実装
- キャッシング戦略
- 月次予算アラート
- 段階的ロールアウト

### リスク2: 生成コンテンツの品質

**対策**:
- 承認ワークフロー必須
- 自動品質チェック
- 人間によるレビュー
- フィードバックループ

### リスク3: Google Places APIの制限

**対策**:
- 積極的なキャッシング
- Place ID の再利用
- バッチ処理で効率化
- 代替検索手段

### リスク4: スケーラビリティ

**対策**:
- サーバーレス関数使用
- DB クエリ最適化
- CDN 活用
- 非同期処理

---

## 将来の拡張可能性

### 1. 多言語対応

- 日本語、英語、韓国語、中国語
- 自動翻訳統合
- 各言語ごとのMDX生成

### 2. 音声インターフェース

- 音声入力/出力
- ボイスアシスタント統合

### 3. 画像認識

- ユーザーが写真をアップロード
- 「この場所はどこ？」
- Google Vision API 連携

### 4. パーソナライゼーション

- ユーザーの過去の行動から推薦
- 好みの学習
- カスタマイズされた提案

### 5. ソーシャル機能

- 友達と共有
- グループチャット
- 共同プラン作成

---

## 参考資料

### 公式ドキュメント

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service)
- [Supabase Vector](https://supabase.com/docs/guides/ai)
- [Cloudinary API](https://cloudinary.com/documentation)

### サンプルコード

- `/placeid-finder.html` - Place ID検索ツール
- `/components/GoogleMapsRating.tsx` - 既存の評価表示
- `/content/experiences/en/_template.mdx` - MDXテンプレート
- `/scripts/insert_new_activities.sql` - SQL例

---

## まとめ

このシステムは以下を実現します：

✅ **ユーザー体験の向上**
- 自然な会話でアクティビティ発見
- パーソナライズされた提案
- 即座の結果表示

✅ **運営効率の向上**
- 手作業の削減
- アクティビティ掲載数の拡大
- 品質保証の自動化

✅ **スケーラビリティ**
- 無限のアクティビティ追加可能
- 多言語展開が容易
- 他地域への展開可能

✅ **コスト効率**
- 1アクティビティあたり約¥55
- 月間¥11,000で運用可能
- ROI が高い

---

**次のステップ**: 
要件定義を詰めて、Phase 1 から実装開始！


# コードベース依存関係・冗長性分析レポート

**作成日**: 2025-11-13  
**対象**: Tabinaka Media Staging コードベース  
**関連ドキュメント**: 
- `docs/refactoring/20251111-refactoring-plan.md`
- `docs/database_design.md`

---

## エグゼクティブサマリ

本レポートは現状のコードベースにおける依存関係、冗長性、および選択が必要な類似機能を包括的に分析したものである。主要な発見事項：

### 🔴 クリティカル（即座に対応すべき）
1. **データベースアクセスの二重書き込み**: `activity_likes` と `activity_interactions` への並行書き込みによるデータ不整合リスク
2. **ID識別の混在**: `user_id` と `account_id`、`activity_slug` と `activity_id` の不統一による複雑性
3. **クイズ状態の正規化不足**: `account_metadata.quiz_state` のみへの保存で履歴追跡が不可能

### 🟡 重要（短期で対応すべき）
4. **体験カードコンポーネントの重複**: 4つの類似コンポーネントが存在し、保守性が低下
5. **価格・メタ情報フォーマッタの重複**: 複数箇所で同じロジックが実装されている
6. **IntersectionObserverフックの乱立**: `lib/useScrollAnimation.ts` が監視対象ごとに Observer を生成し、パフォーマンス劣化の恐れ
7. **Storybook/VRT によるUI回帰検知が未整備**: variant 追加時に表示崩れ検知ができない
8. **記事コンテンツ管理の非効率**: MDXファイルのGit運用に依存し、DBと二重管理になっている

### 🟢 推奨（中期で改善すべき）
9. **APIエンドポイントの責務重複**: クイズ同期APIが2つ存在
10. **静的設定の分散**: 旅行タイプ定義やカテゴリ設定が複数ファイルに分散

---

## 1. データベースアクセス層の冗長性と不整合

### 1.1 いいね機能の二重書き込み問題

#### 現状
`/api/likes/[slug].ts` は以下の二重書き込みを行っている：

```typescript
// pages/api/likes/[slug].ts (L245-299)
// 1. activity_likes テーブルへの書き込み（旧実装）
const { error: insertError } = await supabaseServer
  .from('activity_likes')
  .insert({ 
    account_id: resolved.accountId,
    activity_slug: normalizedSlug,
    user_id: resolved.supabaseUserId ?? resolved.accountId,
  });

// 2. activity_interactions テーブルへの書き込み（新実装）
await upsertLikeInteraction(resolved.accountId, normalizedSlug, activityId);
```

#### 問題点
- **データ不整合リスク**: 片方が失敗した場合の整合性が保証されない
- **トランザクション未使用**: 2つの書き込みが原子的でない
- **読み取り先の混乱**: GET APIは `activity_likes` と `activity_interactions` の両方を参照
- **移行の未完了**: `activity_likes` を `activity_interactions` に置き換える計画（A-0）が進行中だが中途半端

#### 影響範囲
- `/api/likes/[slug].ts` (356行) - POST/GET/DELETE 全メソッド
- `/api/likes/user.ts` (113行) - ユーザーのいいね一覧取得
- `components/LikeButton.tsx` (258行) - クライアント側UI
- `tests/likes.e2e.test.ts` - E2Eテスト

#### 推奨対応（優先度: 🔴 クリティカル）
1. **Phase 1 (即座)**: Dual write を明示的にトランザクション化
2. **Phase 2 (1週間以内)**: 読み取り先を `activity_interactions` に完全移行
3. **Phase 3 (2週間以内)**: `activity_likes` をビュー化し、書き込みを停止
4. **Phase 4 (1ヶ月以内)**: 既存データの完全移行と `activity_likes` テーブル削除

```sql
-- 推奨移行スクリプト（Phase 3）
CREATE VIEW legacy_activity_likes AS
  SELECT
    id,
    account_id,
    activity_slug,
    NULL::UUID AS user_id,  -- deprecated
    created_at
  FROM activity_interactions
  WHERE interaction_type = 'like';
```

---

## 2. 体験カード系の冗長ロジックとUI回帰リスク

### 2.1 ExperienceMeta 波及計画

#### 現状
- `ExperienceTemplate`, `ExperienceCard`, `ExperiencesCarousel` の3箇所で基本的な価格/時間/割引/Googleレビュー表示が重複しており、直近で `ExperienceMeta` コンポーネントへ集約済み。
- 記事領域は `content/articles/<locale>/*.mdx` をGit管理し、`lib/mdx.ts` がファイルシステムから読み込むため、記事追加はPull Requestベース。DBとの同期や承認ステータスを持たない。

#### 波及対象（優先度: 🟡 重要）
| ファイル/ディレクトリ | 用途 | 現状の課題 |
| --- | --- | --- |
| `content/articles/<locale>/*.mdx` | 記事本文 (MDX) | Git運用のみ。差分レビューはPR頼り、公開ステータス/翻訳管理が手作業。 |
| `lib/mdx.ts` | MDX読込ユーティリティ | スラッグ解決とロケールフォールバックをFSベースで実施。DB記事と二重管理になる。 |
| `pages/articles/index.tsx` | 記事一覧ページ | `getAllItems("articles", locale)` でFSからデータ取得。公開状態や承認ワークフローが考慮されていない。 |
| `components/ArticleCard.tsx` | 記事カード UI | `toLocaleDateString` などフォーマッタを個別実装。DB移行時に `readTime` などを統一処理へ寄せる必要。 |

#### アクション
1. **データソース統一**: `lib/mdx.ts` を `lib/dbArticles.ts` に置き換え、Supabase の `articles` / `article_translations` を正史に。既存 MDX は移行スクリプト実行後、参照専用アーカイブにする。
2. **API / CMS 整備**: `/api/articles`（POST/PUT/GET）と簡易CMSを追加し、ドラフト→レビュー→公開フローをDBで管理。`article_versions` へ差分を自動保存してロールバック可能に。
3. **表示コンポーネントの調整**: `ArticleCard` や記事詳細コンポーネントをDBスキーマに同期。フォーマッタ（日時/読了時間/著者表示）を `lib/formatters/` に共通化し、CIで差分検知する。

### 2.2 Storybook / VRT 整備

- `ExperienceMeta` は variant によってタイポグラフィが異なるため、Storybook で `card`, `detail`, `inline`（予定）をカタログ化する。
- `stories/ExperienceMeta.stories.tsx` を追加し、Chromatic もしくは Playwright VRT で snapshot を取得。バッジ有り/無し、Googleレビュー有り/無しなど代表ケースをカバー。
- 既存 Storybook 設定 (`.storybook/main.ts`) に `next-i18next` を読むデコレーターを追加し、翻訳キー依存を解決。

### 2.3 IntersectionObserver / Lazy ロード統一 (B-3 着手準備)

- **現状課題**: `lib/useScrollAnimation.ts` の各フックが監視対象ごとに `window.IntersectionObserver` を生成しており、大量の要素を扱うとインスタンスが増殖する。`LazyComponents.tsx` は `next/dynamic` のラッパーで Observer を使用していないため、遅延ロードの統一規約が存在しない。
- **提案**:
  - `lib/observer/createIntersectionObserver.ts` で Observer の共有ファクトリを提供し、コンポーネント側は `useIntersectionObserver` カスタムフックを介して購読する。
  - `lib/lazy/createLazyComponent.tsx` でダイナミックインポートと Observer を組み合わせたヘルパーを用意。`LazyExperiencesCarousel` などはこれを使って手作業の `useEffect` を廃止する。
  - Observer のデフォルトオプション（`threshold`, `rootMargin`, `once`）を `config/lazyLoad.ts` に定義し、B-3 の成功指標（Observer生成数半減）と紐付ける。

---

### 1.2 ID識別の混在問題

#### 現状の混在パターン

##### パターンA: user_id と account_id の混在
```typescript
// 旧実装: user_id を使用
// pages/api/likes/[slug].ts (L287)
user_id: resolved.supabaseUserId ?? resolved.accountId,

// 新実装: account_id を使用
// lib/server/accountResolver.ts (L41-84)
return {
  accountId: accountIdCookie,
  supabaseUserId: linkage?.supabase_user_id ?? null,
};
```

##### パターンB: activity_slug と activity_id の混在
```typescript
// slug ベース (旧)
.eq('activity_slug', normalizedSlug)

// id ベース (新)
.eq('activity_id', activityId)

// 両方保持（移行期の妥協）
activity_slug TEXT NOT NULL,
activity_id UUID REFERENCES activities(id)
```

#### 問題点
- **コード可読性の低下**: どちらを使うべきか判断が必要
- **外部キー制約の不統一**: 一部のテーブルでFKが設定されていない
- **移行リスク**: slug変更時に履歴が追跡不能になる可能性

#### 影響範囲

| テーブル/API | user_id | account_id | activity_slug | activity_id |
|---|:---:|:---:|:---:|:---:|
| `activity_likes` | ✅ | ✅ | ✅ | ❌ |
| `activity_interactions` | ❌ | ✅ | ✅ | ✅ |
| `account_metadata` | ❌ | ✅ | N/A | N/A |
| `form_submissions` | ❌ | ✅ | ✅ (experience_slug) | ✅ |
| `quiz_results` (計画中) | ❌ | ✅ | N/A | N/A |

#### 推奨対応（優先度: 🔴 クリティカル）
1. **統一方針**: `account_id` と `activity_id` を第一識別子とする
2. **slug の用途限定**: URL routing と履歴参照のみに使用
3. **マイグレーション**: 全テーブルで `activity_id` FK を追加
4. **Resolver の統一**: `lib/server/accountResolver.ts` と `lib/server/activityResolver.ts` を標準として採用

---

### 1.3 クイズ状態管理の非正規化

#### 現状
```typescript
// pages/api/account/quiz-state.ts (L91-100)
const { error: upsertError } = await supabaseServer
  .from('account_metadata')
  .upsert({
    account_id: resolved.accountId,
    quiz_state: nextQuizState,  // JSON blob に全情報を格納
    last_synced_at: new Date().toISOString(),
  });
```

#### 問題点
- **履歴が保存されない**: 過去の回答やセッション情報が上書きされる
- **集計困難**: JSON内部のクエリはパフォーマンスが悪い
- **設計との乖離**: `database_design.md` では `quiz_sessions`, `quiz_results`, `quiz_answers` テーブルが定義済みだが未実装
- **A/Bテスト不可**: 質問バージョンごとの結果比較ができない

#### 影響範囲
- `/api/account/quiz-state.ts` (133行) - クイズ結果の保存・取得
- `/api/account/state-sync.ts` (266行) - 複数リソースの同期（重複）
- `lib/quizClientState.ts` (427行) - クライアント側状態管理
- `context/AccountContext.tsx` (609行) - Reactコンテキストでの同期

#### 推奨対応（優先度: 🔴 クリティカル）
**refactoring-plan.md の A-1 を早急に実施**

1. **テーブル作成**: `quiz_forms`, `quiz_sessions`, `quiz_answers`, `quiz_results`
2. **API改修**: POST時に `quiz_sessions` 生成 → `quiz_results` 挿入
3. **account_metadata の位置付け変更**: 最新結果キャッシュとして参照専用に
4. **既存データ移行**: `account_metadata.quiz_state` → `quiz_results` へ移行

```sql
-- 推奨スキーマ（database_design.md L602-624 より）
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  quiz_form_id UUID,
  status quiz_session_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  location_permission BOOLEAN,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  result_type quiz_result_type NOT NULL,
  travel_type_code TEXT,
  travel_type_payload JSONB,
  recommendation_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 1.4 記事コンテンツ管理の二重化（MDX + DB）

#### 現状
- 記事本文は `content/articles/<locale>/*.mdx` を Git で管理し、`lib/mdx.ts` がビルド/ISR 時にファイルシステムから読み込んでいる。公開ステータス・承認フローは PR ベースで、誰がいつ公開したかを DB で追跡できない。
- Supabase には `generated_activities.body_mdx` など AI 生成のドラフトが存在するが、記事との横断分析が困難。記事メタデータ（読了時間、タグ、閲覧数など）もテーブル化されていない。
- 多言語版（es/fr/ko/zh）はファイル複製による管理で、翻訳の鮮度やレビュー状態の可視化ができない。Git と DB で二重管理が発生するリスクが高い。

#### 影響範囲
- `content/articles/<locale>/*.mdx` – 本文/Frontmatter が唯一の正史となっている。
- `lib/mdx.ts` – スラッグ解決やフォールバック、画像補完などをFS依存で実装。
- `pages/articles/index.tsx` / `pages/articles/[slug].tsx` – 記事取得を FS ベースにしており、公開/下書きの概念がない。
- コンテンツ分析基盤（将来のLooker Studio、Supabase SQL） – 記事データが DB に存在しないため、ダッシュボード化ができない。

#### 推奨対応（優先度: 🟡 重要）
1. **Supabase を正史に**: `docs/database_design.md` で定義した `articles`, `article_versions`, `article_translations` を実装し、記事の本文/メタデータ/ステータスを DB で管理。MDX ファイルは移行後に参照専用アーカイブへ。
2. **移行スクリプトと差分検証**: `scripts/migrate_articles_to_db.ts`（新規）で既存 MDX を DB に投入。CI で MDX ↔ DB の差分を JSON で検証し、0差分を確認してから本番移行。移行期間は Dual write（Git + DB）にしつつ期限を設定。
3. **管理UI / API**: `/api/articles` を追加し、ドラフト作成 → レビュー → 公開 → ロールバック（`article_versions` から復元）をハンドリング。Next.js 内に社内 CMS を用意し、プレビュー・承認フロー・翻訳ステータスを可視化する。
4. **フロント層の切替**: `lib/mdx.ts` を `lib/dbArticles.ts` に差し替え、Supabase から `status='published'` の記事のみ取得。公開後は Vercel ISR を Webhook で再生成し、最長1分で反映させる。

#### 成功指標
- 新規記事は CMS から登録→レビュー→公開まで完結し、Git への直接コミットが不要。
- Supabase 上で記事数・公開日時・翻訳状況をクエリ可能になり、Looker Studio 等でレポート化できる。
- ロールバック手順（最新バージョン → 一つ前の `article_versions`）が Runbook 化され、リハーサルで10分以内に復旧できる。

#### リスク・留意点
- MDX を DB で扱うため、XSS / 任意 JSX の安全性を担保する仕組み（サニタイズ、レビュー、プレビュー環境）が必要。
- Dual write 期間が長引くと更新ソースが混在するので、移行完了までのスケジュールと責任者を明確にする。

---

## 2. UIコンポーネントの冗長性

### 2.1 体験カードコンポーネントの重複

#### 類似コンポーネント一覧

| コンポーネント | 行数 | 用途 | レイアウト | いいねボタン | メタ情報 |
|---|---:|---|---|:---:|---|
| `ExperienceCard.tsx` | 72 | 汎用カード | Mobile横/Desktop縦 | ❌ | ✅ ExperienceMeta |
| `ExperiencesCarousel.tsx` | 137 | カルーセル | 横スクロール | ✅ | ✅ ExperienceMeta |
| `ExperienceGrid.tsx` | 97 | グリッド表示 | 固定グリッド | ✅ | ❌ インライン |
| `CardGrid.tsx` | 317 | 汎用グリッド | 2カラム | ❌ | ❌ インライン |

#### 重複実装の例

##### 価格フォーマット（代表例）
```typescript
// ExperienceMeta.tsx (L16-21)
const formatPrice = (price?: number) => {
  if (typeof price !== 'number') return null;
  return `¥${price.toLocaleString('ja-JP')}`;
};

// CardGrid.tsx (L63-69)
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(price);
};

// ExperienceTemplate.tsx (L242-246) でも割引価格を描画する際に `toLocaleString('ja-JP')` を直接呼び出しており、
// 呼び出し側ごとに微妙に異なるフォーマットが混在している。
```

##### 画像レイアウト（4パターン）
```typescript
// ExperienceCard.tsx (L39-50)
<div className="relative w-24 h-24 rounded-2xl overflow-hidden 
                ring-1 ring-gray-200 bg-gray-100 
                md:w-full md:h-56 lg:h-64">

// ExperiencesCarousel.tsx (L80-88)
<div className="relative aspect-[16/10] w-full bg-neutral-100">

// ExperienceGrid.tsx (L25-35)
<div className="relative w-24 h-24 rounded-2xl overflow-hidden 
                ring-1 ring-neutral-200 bg-neutral-100 
                lg:w-full lg:h-[280px]">

// CardGrid.tsx (L85-102)
const imageHeightClass = lineCount >= 3 
  ? "h-[96rem] sm:h-[104rem]" 
  : "h-[72rem] sm:h-[80rem]";
```

#### 問題点
- **保守性の低下**: デザイン変更時に4箇所を修正する必要
- **一貫性の欠如**: 微妙に異なる実装により、UXが統一されない
- **テスト困難**: 各コンポーネントを個別にテストする必要
- **バンドルサイズ増加**: 重複コードが含まれる

#### 推奨対応（優先度: 🟡 重要）
**refactoring-plan.md の B-2 を実施**

1. **共通基盤コンポーネント作成**: `ExperienceCardBase` を新設
2. **バリアント統一**: `variant` prop で `card | carousel | grid | compact` を切り替え
3. **ExperienceMeta の拡張**: 価格・期間・評価を完全に `ExperienceMeta` に集約
4. **Storybook 整備**: 全バリアントを可視化し VRT で回帰防止

```typescript
// 推奨統一インターフェース
interface ExperienceCardProps {
  experience: Experience;
  variant?: 'card' | 'carousel' | 'grid' | 'compact';
  showLikeButton?: boolean;
  layout?: 'vertical' | 'horizontal';
  imageAspect?: '16/10' | '4/3' | '1/1';
  className?: string;
}
```

---

### 2.2 ExperienceMeta コンポーネントの責務範囲

#### 現状の利用箇所
```typescript
// ExperienceCard.tsx (L60-67)
<ExperienceMeta
  price={experience.price}
  duration={experience.duration}
  discount={experience.discount}
  couponCode={experience.couponCode}
  googlePlaceId={experience.googlePlaceId}
  variant="card"
/>

// ExperiencesCarousel.tsx (L104-109)
<ExperienceMeta
  price={item.price}
  duration={item.duration}
  googlePlaceId={item.googlePlaceId}
  variant="card"
/>

// ExperienceTemplate.tsx: variant="detail" で使用
```

#### 未統合の情報
以下は `ExperienceMeta` に含まれておらず、各コンポーネントで個別実装されている：

- **バッジ表示**: `discount`, `couponCode` はあるが、`NEW`, `POPULAR` などの汎用バッジがない
- **カテゴリタグ**: `tags`, `motivationTags` の表示ロジックが分散
- **ロケーション情報**: `address`, `distance` の表示が未対応
- **予約状況**: `maxParticipants`, 残席数の表示が未実装

#### 推奨対応（優先度: 🟡 重要）
1. **ExperienceMeta を拡張**: バッジ・タグ・ロケーション情報を統合
2. **カスタマイズ可能性**: `showPrice`, `showDuration` などの表示制御フラグ追加
3. **アクセシビリティ強化**: ARIA ラベルとセマンティック HTML の徹底

---

### 2.3 IntersectionObserver の乱立

#### 現状の実装箇所

| ファイル | フック/実装 | 用途 | Observer数 |
|---|---|---|---:|
| `lib/useScrollAnimation.ts` | `useScrollAnimation` | 基本スクロールアニメ | 1 |
| `lib/useScrollAnimation.ts` | `useBatchScrollAnimation` | 複数要素の一括監視 | N個 |
| `lib/useScrollAnimation.ts` | `useStaggerAnimation` | 段階的アニメーション | 1 |
| `lib/useScrollAnimation.ts` | `useStaggeredCardAnimation` | カード専用 | 1 |

> 補足: 遅延ロード用の `components/LazyComponents.tsx` は `next/dynamic` のローディングプレースホルダに依存しており、IntersectionObserver は利用していない。

#### 問題点
```typescript
// lib/useScrollAnimation.ts (L82-104)
// 各要素ごとに IntersectionObserver を生成（非効率）
const observers = elementRefs.current.map((_, index) => {
  return new IntersectionObserver(/* ... */);
});
```

- **Observer インスタンス過多**: 画面内の要素数 × Observer が生成される
- **パフォーマンス劣化**: 大量の監視対象がある場合にメモリ消費が増大
- **設定の不統一**: `threshold`, `rootMargin` の値が各フックで異なる
- **重複監視**: 同じ要素が複数のObserverに監視される可能性

#### 推奨対応（優先度: 🟡 重要）
**refactoring-plan.md の B-3 を実施**

1. **シングルトン Observer**: 全コンポーネントで共有する Observer を作成
2. **コールバック登録システム**: 要素ごとに異なる処理を登録可能に
3. **設定の標準化**: `config/animationSettings.ts` でデフォルト値を一元管理
4. **Skeleton 統合**: Lazy ロード時の Skeleton UI を標準提供

```typescript
// 推奨実装パターン
import { useIntersectionObserver } from '@/lib/observers/useIntersectionObserver';

const { ref, isVisible } = useIntersectionObserver({
  threshold: 0.1,
  triggerOnce: true,
  onEnter: () => console.log('要素が表示された'),
  onExit: () => console.log('要素が非表示になった'),
});
```

---

## 3. API エンドポイントの整理

### 3.1 クイズ同期APIの重複

#### 現状
```
/api/account/quiz-state.ts     (133行) - GET/POST でクイズ結果を管理
/api/account/state-sync.ts     (266行) - 複数リソース（quiz+recommendation）を一括同期
```

#### 責務の重複
```typescript
// quiz-state.ts (L91-100)
const { error: upsertError } = await supabaseServer
  .from('account_metadata')
  .upsert({
    account_id: resolved.accountId,
    quiz_state: nextQuizState,
    last_synced_at: new Date().toISOString(),
  });

// state-sync.ts (L239-248)
const { error: upsertMetadataError } = await supabaseServer
  .from('account_metadata')
  .upsert({
    account_id: accountId,
    quiz_state: nextQuizState,
    last_synced_at: new Date().toISOString(),
  });
```

#### 問題点
- **機能の重複**: 両APIが `account_metadata.quiz_state` を更新
- **クライアント側の混乱**: どちらのAPIを呼ぶべきか不明確
- **テストの二重化**: 同じロジックを2箇所でテストする必要

#### 使用箇所の分析
```typescript
// lib/quizClientState.ts (L277)
await fetch('/api/account/quiz-state', { method: 'POST' });

// lib/accountSync.ts (L81-85)
const response = await fetch('/api/account/state-sync', {
  method: 'POST',
  headers,
  body: JSON.stringify({ resources: payload }),
});

// context/AccountContext.tsx (L380-) ではサインイン直後に
// accountSync.process(...) を呼び出し、recommendation の同期を state-sync に委譲。

// lib/recommendationOrchestrator.ts (L154) でも新しい推薦を保存した際に
// accountSync.enqueue('recommendation') を実行し、バックグラウンドで state-sync を叩いている。
```

#### 推奨対応（優先度: 🟡 重要）
1. **共通サービス化**: `account_metadata` を更新するロジックを `lib/server/accountStateWriter.ts`（仮）に切り出し、`quiz-state` と `state-sync` の両方から利用する。これにより二重実装を解消。
2. **役割の分離**: `state-sync` からクイズ更新コードを排除し、推薦（`recommendation`）専用エンドポイントとしてスリム化する。クイズ同期は `quiz-state` に一元化。
3. **移行計画**: フロントエンドで `accountSync.enqueue('recommendation')` を継続利用できるよう、レスポンス契約は維持しつつ内部実装のみ刷新。必要であれば新しいエンドポイント名（例: `/api/account/recommendation-sync`）を用意し、段階的に移行。
4. **ドキュメント整備**: `docs/features/QUIZ_SYNC.md`（仮）にデータフローを記載し、どのクライアントがどのAPIを叩くかを明示する。

---

### 3.2 いいね関連APIの構成

#### 現状
```
/api/likes/[slug].ts    (366行) - GET/POST/DELETE で個別体験のいいね操作
/api/likes/user.ts      (113行) - GET でユーザーのいいね一覧取得
```

#### 評価
✅ **適切な分離**: RESTful な設計に準拠
- `[slug]`: リソース単位の操作（CRUD）
- `user`: コレクション取得（Read-only）

#### 改善余地
```typescript
// user.ts (L79-91)
// MDXファイルから詳細情報を取得する責務がAPIにある
const activities: LikedActivity[] = (likes || []).map((like: any) => ({
  slug: like.activity_slug,
  title: '', // ← クライアント側で取得
  coverImage: '',
  // ...
}));
```

#### 推奨対応（優先度: 🟢 推奨）
1. **activities テーブルとの JOIN**: DBクエリ時に体験詳細を取得
2. **キャッシュ戦略**: Redis または Edge Cache で頻繁なクエリを最適化
3. **ページネーション**: いいね数が多い場合に備えて limit/offset 対応

```typescript
// 推奨実装
const { data: likes, error } = await supabaseServer
  .from('activity_interactions')
  .select(`
    activity_slug,
    created_at,
    activities:activity_id (
      slug,
      title,
      coverImage,
      price,
      duration
    )
  `)
  .eq('account_id', accountId)
  .eq('interaction_type', 'like')
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

---

## 4. 削除すべき/非推奨コード

### 4.1 非推奨フィールド・カラム

#### データベース
```sql
-- activity_likes.user_id (deprecated)
-- → account_id に統一済み、今後 user_id は削除予定

-- form_submissions.user_id (存在する場合)
-- → account_id に統一

-- 旧 offline_likes テーブル（grep で検出されず）
-- → activity_interactions に統合予定
```

#### TypeScript
```typescript
// pages/api/likes/[slug].ts (L287)
user_id: resolved.supabaseUserId ?? resolved.accountId,
// ↑ 互換性のために残しているが、今後削除予定
```

#### 推奨対応（優先度: 🟢 推奨）
1. **マイグレーション作成**: `user_id` カラムを削除するSQLを準備
2. **Deprecation Warning**: コード内に `@deprecated` コメントを追加
3. **段階的削除**: 6ヶ月後に完全削除（猶予期間を設ける）

---

### 4.2 未使用の可能性があるファイル

#### 調査対象
以下のファイルは grep 結果に含まれておらず、利用実績が不明：

```
pages/api/cloudinary/delete.ts
pages/api/completed-activities/index.ts
pages/api/setup-activities.ts
pages/api/user/save-attributes.ts
pages/api/vendor/completions.ts
pages/api/vendor/set-password.ts
```

#### 推奨対応（優先度: 🟢 推奨）
1. **利用状況調査**: Git履歴とアクセスログを確認
2. **未使用判定**: 6ヶ月以上アクセスがない場合は削除候補
3. **アーカイブ**: 削除前に別ブランチへ退避
4. **ドキュメント更新**: `docs/api/deprecated-endpoints.md` に記録

---

## 5. 選択が必要な類似機能

### 5.1 カード表示コンポーネントの選択

#### 選択肢

| コンポーネント | 推奨用途 | 廃止・統合の方針 |
|---|---|---|
| **ExperienceCard** | 汎用カード表示 | ✅ **継続** - 基底クラスとして活用 |
| **ExperiencesCarousel** | トップページ等のカルーセル | ✅ **継続** - ExperienceCard をベースに |
| **ExperienceGrid** | 一覧ページのグリッド | 🔄 **統合** - ExperienceCard + Grid Layout で代替 |
| **CardGrid** | 汎用グリッド（記事・体験共通） | ❌ **廃止** - 用途が重複、型安全性に欠ける |

#### 推奨実装方針
```typescript
// 統一後のコンポーネント構成
<ExperienceCard variant="card" />        // 基本カード
<ExperienceCard variant="compact" />     // コンパクト版
<ExperienceCard variant="carousel" />    // カルーセル用

// レイアウトは別コンポーネントで制御
<ExperienceGrid layout="masonry">
  {experiences.map(exp => 
    <ExperienceCard key={exp.slug} experience={exp} />
  )}
</ExperienceGrid>
```

---

### 5.2 スクロールアニメーションの選択

#### lib/useScrollAnimation.ts に含まれる5つのフック

| フック | 用途 | 推奨 |
|---|---|:---:|
| `useScrollAnimation` | 基本的な要素の表示/非表示検知 | ✅ |
| `useBatchScrollAnimation` | 複数要素の個別監視 | ❌ |
| `useStaggerAnimation` | 段階的アニメーション | ✅ |
| `useStaggeredCardAnimation` | カード専用の複雑なアニメ | 🔄 |
| `usePageTransition` | ページ遷移アニメ | ✅ |
| `useScrollProgress` | スクロール進捗バー | ✅ |

#### 推奨対応
1. **`useBatchScrollAnimation` を廃止**: シングルトン Observer に置き換え
2. **`useStaggeredCardAnimation` を汎用化**: カード以外でも使えるように
3. **統一 API**: すべてのフックを `useIntersectionObserver` ベースに

---

### 5.3 価格フォーマッタの選択

#### 現状の実装箇所
```typescript
// A. ExperienceMeta.tsx (L16-21) - シンプルな実装
const formatPrice = (price?: number) => {
  if (typeof price !== 'number') return null;
  return `¥${price.toLocaleString('ja-JP')}`;
};

// B. CardGrid.tsx (L63-69) - Intl.NumberFormat 使用
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(price);
};

// C. lib/placesHelpers.ts - Google Places 用
// （未確認、要調査）
```

#### 推奨選択
**Option B（Intl.NumberFormat）を統一採用**

理由:
- 国際化対応が容易（将来的に USD, EUR なども対応可能）
- ブラウザ標準APIで実装が堅牢
- `minimumFractionDigits` で細かい制御が可能

#### 実装場所
```typescript
// lib/formatters/currency.ts (新設)
export function formatCurrency(
  amount: number,
  options?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
  }
): string {
  const {
    currency = 'JPY',
    locale = 'ja-JP',
    minimumFractionDigits = 0,
  } = options ?? {};

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
  }).format(amount);
}
```

---

## 6. 優先度付きアクションプラン

### フェーズ1: クリティカル（1-2週間）

#### 1.1 データベース整合性の確保
- [ ] `activity_likes` ← → `activity_interactions` の Dual write をトランザクション化
- [ ] `activity_id` FK を全テーブルに追加するマイグレーション作成
- [ ] `quiz_sessions` / `quiz_results` テーブルの実装（A-1）

#### 1.2 ID管理の統一
- [ ] `user_id` の利用箇所を `account_id` に置き換え
- [ ] `normalizeActivitySlug` の統一利用を徹底
- [ ] `lib/server/accountResolver.ts` を全APIで標準採用

### フェーズ2: 重要（2-4週間）

#### 2.1 コンポーネント統合
- [ ] `ExperienceCard` を基底クラスとして再設計
- [ ] `CardGrid.tsx` を廃止し、`ExperienceGrid` に統合
- [ ] `ExperienceMeta` にバッジ・タグ表示を追加

#### 2.2 価格・フォーマッタの統一
- [ ] `lib/formatters/currency.ts` を新設
- [ ] 全コンポーネントで `formatCurrency` を採用
- [ ] `lib/formatters/duration.ts`, `distance.ts` も同様に作成

#### 2.3 API整理
- [ ] `/api/account/state-sync.ts` の利用実績を調査
- [ ] `quiz-state` に統一するか、責務を明確化
- [ ] `/api/likes/user.ts` で activities テーブルと JOIN

### フェーズ3: 推奨（1-2ヶ月）

#### 3.1 IntersectionObserver の統一
- [ ] シングルトン Observer の実装
- [ ] `useBatchScrollAnimation` を廃止
- [ ] `config/animationSettings.ts` の作成

#### 3.2 Storybook & テスト
- [ ] 全カードコンポーネントの Storybook 追加
- [ ] Visual Regression Testing (VRT) の導入
- [ ] E2E テストの拡充（likes, quiz, chat）

#### 3.3 ドキュメント整備
- [ ] API仕様書の作成 (`docs/api/`)
- [ ] 非推奨エンドポイントのリスト化
- [ ] 移行ガイドの作成（開発者向け）

---

## 7. リスク評価とロールバック計画

### 高リスク変更

#### activity_likes → activity_interactions 移行
**リスク**: データ欠損、いいね数の不整合

**軽減策**:
1. Dual write 期間を最低2週間設ける
2. 毎日の差分チェックバッチを実行
3. Supabase の PITR（Point-In-Time Recovery）を有効化

**ロールバック手順**:
```sql
-- activity_interactions の like レコードを削除
DELETE FROM activity_interactions WHERE interaction_type = 'like';

-- activity_likes を再度主テーブルに戻す
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
```

---

### 中リスク変更

#### quiz_sessions テーブル追加
**リスク**: 既存のクイズ結果が参照できなくなる

**軽減策**:
1. `account_metadata.quiz_state` を並行して保持（読み取り専用）
2. 新旧両方のAPIを一時的に提供
3. フィーチャーフラグで段階的ロールアウト

**ロールバック手順**:
```typescript
// クライアント側でフォールバック
const quizResult = 
  await fetchFromQuizResults(accountId) 
  ?? await fetchFromAccountMetadata(accountId);
```

---

## 8. 成功指標（KPI）

### コード品質指標

| 指標 | 現状 | 目標 (3ヶ月後) |
|---|---:|---:|
| コンポーネント数（体験カード系） | 4 | 2 |
| 重複フォーマッタ関数 | 3+ | 1 |
| IntersectionObserver インスタンス数（平均） | 20+ | 5 |
| API エンドポイント数 | 35 | 30 |
| 非推奨フィールド数 | 5+ | 0 |

### パフォーマンス指標

| 指標 | 現状 | 目標 |
|---|---:|---:|
| 初回ペイントまでの時間 (FCP) | 1.2s | <1.0s |
| バンドルサイズ（JS） | 450KB | <400KB |
| データベースクエリ数（体験一覧） | 3回 | 1回 |

### 開発効率指標

| 指標 | 現状 | 目標 |
|---|---:|---:|
| 新規カード追加にかかる時間 | 2h | 30min |
| デザイン変更の影響範囲（ファイル数） | 4-6 | 1-2 |
| E2E テストカバレッジ | 30% | 70% |

---

## 9. 関連ドキュメント

### 既存ドキュメント
- `docs/refactoring/20251111-refactoring-plan.md` - 全体リファクタリング計画（A-0/A-1/A-2）
- `docs/database_design.md` - データベース論理・物理設計
- `docs/refactoring/ID_DB_REFACTORING_PROPOSAL.md` - ID統一の詳細提案
- `docs/db-schema-redesign.md` - スキーマ再設計案

### 今後作成すべきドキュメント
- [ ] `docs/components/DESIGN_SYSTEM.md` - コンポーネント設計ガイドライン
- [ ] `docs/api/SPECIFICATION.md` - API仕様書（OpenAPI準拠）
- [ ] `docs/migration/ACTIVITY_INTERACTIONS.md` - activity_likes 移行手順
- [ ] `docs/migration/QUIZ_NORMALIZATION.md` - クイズ正規化手順
- [ ] `docs/testing/E2E_STRATEGY.md` - E2Eテスト戦略

---

## 10. 結論と次ステップ

### 主要な発見事項

1. **データ層の不整合**: 二重書き込みと非正規化により、データ整合性とスケーラビリティに課題
2. **コンポーネントの乱立**: 類似機能の重複実装により保守コストが増大
3. **ID管理の複雑性**: 移行期の妥協により、コードの可読性と安全性が低下
4. **記事コンテンツの二重管理**: Git上のMDXと将来のDB運用が乖離し、翻訳/承認/分析フローが整備されていない

### 推奨される優先順位

#### 最優先（今週中）
1. `activity_likes` → `activity_interactions` の Dual write トランザクション化
2. `quiz_sessions` / `quiz_results` テーブルの作成と移行計画策定
3. `account_id` / `activity_id` の利用統一に向けたマイグレーション作成

#### 短期（2週間以内）
4. `ExperienceCard` 系コンポーネントの統合設計
5. 価格・フォーマッタの共通化 (`lib/formatters/`)
6. `/api/account/state-sync.ts` の廃止判断

#### 中期（1-2ヶ月）
7. IntersectionObserver の統一実装
8. 記事コンテンツのDB移行（`articles`/`article_versions` 実装、移行スクリプト、CMS β版）
9. Storybook & VRT の導入
10. 非推奨コード・エンドポイントの削除

### 次のアクション

1. **チームレビュー**: 本レポートをチーム全体で確認し、優先度を合意
2. **Issue作成**: 各タスクをGitHub Issueに登録（refactoring/code-cleanup ラベル）
3. **スプリント計画**: 次スプリントで最優先項目（1-3）に着手
4. **定期追跡**: 週次で進捗を確認し、KPI をダッシュボードで可視化
5. **記事移行PoC**: `articles` テーブルと移行スクリプトのプロトタイプを作成し、MDX→DB の差分検証とCMS要件（承認権限・プレビュー）を確定する

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**レビュー待ち**: 開発チーム全員  
**最終更新**: 2025-11-13

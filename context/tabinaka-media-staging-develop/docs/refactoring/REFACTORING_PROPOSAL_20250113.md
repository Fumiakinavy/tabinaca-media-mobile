# リファクタリング提案書 (2025-01-13)

**作成日**: 2025-01-13  
**対象**: Tabinaka Media Staging コードベース  
**関連ドキュメント**: 
- `docs/refactoring/code-redundancy-analysis.md`
- `docs/refactoring/20251111-refactoring-plan.md`
- `docs/refactoring/ID_DB_REFACTORING_PROPOSAL.md`

---

## エグゼクティブサマリ

本提案書は、コードベースの現状分析に基づき、優先度別に整理したリファクタリング案を提示する。主要な改善領域は以下の通り：

### 🔴 クリティカル（即座に対応すべき）
1. **Like読み取り経路の単一化と `activity_likes` 廃止計画の再定義**
2. **`activity_id` 必須化に向けた backfill・制約追加と resolver 活用**
3. **クイズ状態読み取りの正規化（`quiz_sessions`/`quiz_results` への移行完了）**

### 🟡 重要（短期で対応すべき）
4. **体験カードコンポーネントの統合**
5. **フォーマッタ関数の共通化**
6. **IntersectionObserverの最適化**

### 🟢 推奨（中期で改善すべき）
7. **APIエンドポイントの整理**
8. **静的設定の集約**
9. **記事コンテンツ管理のDB移行**

---

## 1. 🔴 クリティカル: Like読み取り経路の単一化と `activity_likes` 廃止計画の再定義

### 1.1 現状の問題

- `pages/api/likes/[slug].ts` / `lib/server/likeStorage.ts` は書き込みを `activity_interactions` のみに行っており、いわゆる「二重書き込み」は既に解消済み。
- しかし読み取りでは `activity_interactions` が利用できない場合に `activity_likes` へフォールバックし続けており（例: `fetchLikeState`, `fetchLikeCount`, `listLikes`）、旧テーブルのダーティデータがクライアントへ返ったり、テーブル未作成環境では 503 を返す挙動が残っている。
- `activity_likes` を DROP するマイグレーション（`supabase/migrations/20250113000002_drop_legacy_tables.sql`）が用意されている一方、監視・アラート・データ検証手順が提案書と乖離したままのため、安心して適用できない。

### 1.2 推奨対応

#### Phase 0: 現状把握と観測（0.5日）
1. `LikeStorageUnavailableError` ログと Supabase メトリクスから、`activity_interactions` が存在しない/権限不足な環境がどの程度残っているか棚卸し。
2. `activity_likes` にしか存在しない行数をバッチで算出（差分レポートをダッシュボード化）。

#### Phase 1: 読み取り経路の段階的縮退（1〜2日）
1. API レスポンスに `backend: 'interactions' | 'legacy'` を埋め込み、クライアントの観測ログで fallback 率を可視化。
2. `fetchLikeState` などの fallback を Feature Flag で切り替えられるようにし、Staging→本番の順に `legacy` 読み取りを無効化。
3. fallback 無効化後は `activity_interactions` の missing-table エラーハンドリングを 503 ではなく 500 + 操作ガイドに変更し、インフラ側で検知できるようにする。

#### Phase 2: データサニタイズとテーブル撤去（1〜2日）
1. 差分バッチで `activity_likes` にのみ存在する行を `activity_interactions` へ再投入（`activity_id` 解決済み slug のみ許可）。
2. `activity_likes` を `legacy_activity_likes` ビューに差し替え、1 週間の監視期間を設けてから DROP。
3. 監視完了後に `LikeStorageUnavailableError` で `activity_likes` を参照するコードを削除し、警告ログを簡素化。

---

## 2. 🔴 クリティカル: `activity_id` 必須化と resolver 活用

### 2.1 現状の問題

- `lib/server/activityResolver.ts` / `lib/server/accountResolver.ts` は既に存在するが、`activity_interactions` では `activity_id` が NULL 許容のままで slug で照会している。
- `unique_like_interactions` のユニークインデックスは `activity_id` が NULL の行には適用されず、同一 slug に対して複数行が作成されるリスクが残っている。
- `LikeButton` だけでなく、推薦や分析系の SQL でも slug ベース JOIN が残っており、slug 正規化ルール逸脱時に整合性が崩れる。

### 2.2 推奨対応

1. **Backfill スクリプト（1日）**: すべての `activity_interactions.activity_id` を `activities.slug` から解決し、未解決 slug をレポート。Supabase migration (`ALTER TABLE ... SET NOT NULL`) 実行の前提条件にする。
2. **制約・インデックスの強化（1日）**: `activity_interactions.activity_id` を `NOT NULL` / `REFERENCES activities(id)` に変更し、`unique_like_interactions` を `activity_slug` ではなく `activity_id` ベースに付け替える。slug カラムは参照専用として `LOWER(slug)` インデックスだけ残す。
3. **コード改修（2〜3日）**:
   - `fetchLikeState`/`fetchLikeCount` などのクエリを `activity_id` 条件に切り替え、`resolveActivityId` の結果を必須化。
   - `recordLike` で `activity_id` が解決できない場合は 400/422 応答に変更し、slug のみでの insert を禁止。
   - Supabase 側 view（`legacy_activity_likes`）も `activity_id` を source に持つよう再作成し、slug は派生列にする。

この一連の変更により、`activity_slug` は UI/URL 用の補助識別子に限定され、DB の一貫性を `activity_id` FK で担保できる。

---

## 3. 🔴 クリティカル: クイズ状態読み取りの正規化

### 3.1 現状の問題

- `/api/account/quiz-state` は POST 時に `account_metadata` と `quiz_sessions`/`quiz_results` へ dual write 済みだが、GET と下位ライブラリ（`lib/server/quizState.ts`）は依然として `account_metadata.quiz_state` の JSON を唯一の正史として扱っている。
- 既存 JSON から履歴テーブルへ移行するバッチが未実装のため、過去のセッションは `quiz_sessions` 側に反映されていない。
- `/api/account/state-sync` も recommendation 用に縮小されているにもかかわらず `quiz_results` ブランチが残存し、保守コストが発生している。

### 3.2 推奨対応

1. **読み取り経路の切り替え（1日）**: GET API / `lib/server/quizState.ts` を `quiz_results`（最新1件）→`account_metadata` の優先順で取得するよう変更し、feature flag で段階的に切り替える。
2. **移行バッチ（1日）**: `account_metadata.quiz_state` から `quiz_sessions`/`quiz_results` への移行スクリプトを作成し、timestamp・recommendation snapshot・answers を補完。移行結果をレポート化。
3. **API 整理（0.5日）**: `/api/account/state-sync` から `quiz_results` コードを削除し、recommendation のみに責務を限定。不要になった `resources.quiz_results` payload をクライアント SDK からも排除。
4. **監視と削除（0.5日）**: `account_metadata.quiz_state` を「最新結果キャッシュ」と明示し、`quiz_sessions`/`quiz_results` への書き込み失敗を Sentry/Datadog で監視。十分な期間を経て問題なければ JSON の書き込み/参照を段階的に削除する。

これにより、履歴取得・A/B テスト・分析が `quiz_sessions` 系に一本化され、JSON の上書きによる情報欠損を解消できる。

---

## 4. 🟡 重要: 体験カードコンポーネントの統合

### 4.1 現状の問題

4つの類似コンポーネントが存在：
- `ExperienceCard.tsx` (72行)
- `ExperiencesCarousel.tsx` (137行)
- `ExperienceGrid.tsx` (97行)
- `CardGrid.tsx` (317行)

各コンポーネントで価格フォーマット、画像レイアウト、メタ情報表示が重複実装されている。
- 特に `CardGrid.tsx` は記事・イベント・体験の混在や距離/徒歩時間の表示、summary 行数によるレイアウト調整など固有ロジックが多く、他の3コンポーネントと単純に統合すると props が過度に複雑化するリスクがある。

### 4.2 推奨対応

#### 統合アーキテクチャ

**Step 1: 共通コンポーネントの強化（2日）**
```typescript
// components/ExperienceCardBase.tsx (新規作成)
interface ExperienceCardBaseProps {
  experience: Experience;
  variant: 'card' | 'carousel' | 'grid';
  showLikeButton?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export const ExperienceCardBase: React.FC<ExperienceCardBaseProps> = ({
  experience,
  variant,
  showLikeButton = false,
  layout = 'vertical',
}) => {
  // 共通ロジックを集約
  // ExperienceMeta を使用
  // レイアウトのバリエーションを props で制御
};
```

**Step 2: 既存コンポーネントのリファクタリング（2日）**
- `ExperienceCard`/`ExperiencesCarousel`/`ExperienceGrid` を `ExperienceCardBase` ベースに統一
- `CardGrid` は記事・イベント向けの汎用グリッドとして切り離し、共有できる要素は `ExperienceMeta` や `formatters` 経由で再利用
- 各 variant で必要な props を洗い出し、variant ごとの境界線を明示して props 爆発を避ける

---

## 5. 🟡 重要: フォーマッタ関数の共通化

### 5.1 現状の問題

価格、距離、時間などのフォーマッタが複数箇所に分散：
- `ExperienceMeta.tsx`: `formatPrice` (シンプル版)
- `CardGrid.tsx`: `formatPrice` (Intl.NumberFormat版)
- `lib/distanceUtils.ts`: `formatDistance`
- `lib/maps/photos.ts`: `formatDistance` (重複)

### 5.2 推奨対応

#### 共通フォーマッタライブラリの作成

**Step 1: lib/formatters/ ディレクトリの作成（1日）**
```typescript
// lib/formatters/currency.ts
export function formatCurrency(
  amount: number,
  options?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
  }
): string {
  return new Intl.NumberFormat(options?.locale || 'ja-JP', {
    style: 'currency',
    currency: options?.currency || 'JPY',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  }).format(amount);
}

// lib/formatters/distance.ts
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// lib/formatters/time.ts
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
}
```

**Step 2: 既存コードの置き換え（2日）**
- すべてのコンポーネントで共通フォーマッタを使用
- 重複実装を削除

---

## 6. 🟡 重要: IntersectionObserverの最適化

### 6.1 現状の問題

`lib/useScrollAnimation.ts` で各フックが個別に `IntersectionObserver` を生成：
- `useScrollAnimation`: 1つのObserver
- `useBatchScrollAnimation`: N個のObserver（N = 要素数）
- `useStaggerAnimation`: 1つのObserver
- `useStaggeredCardAnimation`: 1つのObserver

大量の要素を扱うと、Observerインスタンスが増殖し、パフォーマンスが劣化する。

### 6.2 推奨対応

#### シングルトン Observer パターンの実装

**Step 1: 共有Observerファクトリの作成（1日）**
```typescript
// lib/observer/createIntersectionObserver.ts (新規作成)
class IntersectionObserverManager {
  private observer: IntersectionObserver | null = null;
  private callbacks: Map<Element, Set<(entry: IntersectionObserverEntry) => void>> = new Map();

  getObserver(options: IntersectionObserverInit): IntersectionObserver {
    if (!this.observer) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const callbacks = this.callbacks.get(entry.target);
          callbacks?.forEach((cb) => cb(entry));
        });
      }, options);
    }
    return this.observer;
  }

  observe(element: Element, callback: (entry: IntersectionObserverEntry) => void): () => void {
    const callbacks = this.callbacks.get(element) || new Set();
    callbacks.add(callback);
    this.callbacks.set(element, callbacks);
    
    this.observer?.observe(element);
    
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.callbacks.delete(element);
        this.observer?.unobserve(element);
      }
    };
  }
}

export const observerManager = new IntersectionObserverManager();
```

**Step 2: 統一フックの作成（1日）**
```typescript
// lib/hooks/useIntersectionObserver.ts (新規作成)
export function useIntersectionObserver(
  options: IntersectionObserverInit & { triggerOnce?: boolean }
) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const unobserve = observerManager.observe(element, (entry) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        if (options.triggerOnce) {
          unobserve();
        }
      } else if (!options.triggerOnce) {
        setIsVisible(false);
      }
    });

    return unobserve;
  }, [options.triggerOnce]);

  return { elementRef, isVisible };
}
```

**Step 3: 既存フックの置き換え（2日）**
- `useScrollAnimation` → `useIntersectionObserver` を使用
- `useBatchScrollAnimation` を廃止し、`useIntersectionObserver` を複数要素に適用
- 他のフックも同様に置き換え

---

## 7. 🟢 推奨: APIエンドポイントの整理

### 7.1 現状の問題

- クイズ同期APIが2つ存在（`/api/account/quiz-state` と `/api/account/state-sync`）
- 責務が重複している可能性
- 実際には `state-sync` が recommendation 同期にほぼ限定されており、`resources.quiz_results` ブランチはデッドコード化している。

### 7.2 推奨対応

#### API統合と責務の明確化

**Step 1: API仕様書の作成（1日）**
- OpenAPI形式でAPI仕様を定義
- 各エンドポイントの責務を明確化

**Step 2: 重複APIの統合（2日）**
- `state-sync` を recommendation 同期専用として正式に位置付け、`quiz_results` payload を廃止
- クイズ関連の読み書きは `/api/account/quiz-state` に一元化し、`state-sync` 経由での更新をブレーク
- 非推奨エンドポイント/パラメータをマークし、SDK の payload から削除

---

## 8. 🟢 推奨: 静的設定の集約

### 8.1 現状の問題

旅行タイプ定義やカテゴリ設定が複数ファイルに分散：
- `content/travelTypeResults.ts`
- `config/categories.ts`
- `config/experienceSettings.ts`
- それぞれ参照サイクル・利用タイミング（ビルド時, リクエスト時）が異なるため、無造作に1ファイルへ集約すると循環依存や不要な再読み込みを誘発する。

### 8.2 推奨対応

#### 設定ファイルの集約

**Step 1: 共通型とバリデーションユーティリティの定義（1日）**
- `types/config.ts` に TravelType/Category/Experience の共通フィールドを定義
- Zod などでスキーマ検証を行い、各設定ファイル読み込み時に validate

**Step 2: エントリーポイント整理（1日）**
- `config/index.ts` では再エクスポートのみ行い、各設定ファイル自体は責務を分離
- Next.js/ビルド時に必要な設定と runtime で必要な設定を分け、不要な import 連鎖を避ける

---

## 9. 🟢 推奨: 記事コンテンツ管理のDB移行

### 9.1 現状の問題

- 記事は `content/articles/*.mdx` をGit管理
- DBとの二重管理になっている
- 公開ステータス/翻訳管理が手作業

### 9.2 推奨対応

#### DB移行計画

**Step 1: スキーマ設計（1日）**
```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, review, published
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE article_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id),
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, locale)
);
```

**Step 2: 移行スクリプトの作成（2日）**
- MDXファイルからDBへの移行スクリプト
- 既存データの整合性チェック

**Step 3: API/CMSの整備（3日）**
- `/api/articles` エンドポイントの作成
- 簡易CMSの実装
- ドラフト→レビュー→公開フローの実装

---

## 実装優先順位とタイムライン

### Phase 1: クリティカル対応（2週間）
1. Like読み取り経路の単一化＆`activity_likes` 撤去計画（3日）
2. `activity_id` 必須化と resolver 活用（6日）
3. クイズ状態読み取りの正規化（3〜4日）

### Phase 2: 重要対応（3週間）
4. 体験カードコンポーネントの統合（4日）
5. フォーマッタ関数の共通化（3日）
6. IntersectionObserverの最適化（4日）

### Phase 3: 推奨対応（4週間）
7. APIエンドポイントの整理（3日）
8. 静的設定の集約（2日）
9. 記事コンテンツ管理のDB移行（6日）

---

## 成功指標（KPI）

### コード品質指標

| 指標 | 現状 | 目標（3ヶ月後） |
|------|------|----------------|
| コンポーネント数（体験カード系） | 4 | 2 |
| 重複フォーマッタ関数 | 3+ | 1 |
| IntersectionObserver インスタンス数（平均） | 20+ | 5 |
| API エンドポイント数 | 35 | 30 |
| 非推奨フィールド数 | 5+ | 0 |

### パフォーマンス指標

| 指標 | 現状 | 目標 |
|------|------|------|
| 初回ペイントまでの時間 (FCP) | 1.2s | <1.0s |
| バンドルサイズ（JS） | 450KB | <400KB |
| データベースクエリ数（体験一覧） | 3回 | 1回 |

### 開発効率指標

| 指標 | 現状 | 目標 |
|------|------|------|
| 新規カード追加にかかる時間 | 2h | 30min |
| デザイン変更の影響範囲（ファイル数） | 4-6 | 1-2 |
| E2E テストカバレッジ | 30% | 70% |

---

## リスク評価とロールバック計画

### 高リスク変更

#### Like読み取り経路の縮退と `activity_likes` 撤去
**リスク**: fallback 無効化による 503 応答増加、旧テーブルの削除によるデータ喪失

**軽減策**:
1. Feature Flag で `activity_likes` フォールバックを段階的に停止し、観測を確認してから本番適用
2. 差分チェックバッチを用意し、`activity_likes` にしか存在しない行を監査→再書き込み
3. Supabase PITR とバックアップ SQL (`20250113000000_backup_legacy_tables.sql`) を用意した上で DROP

**ロールバック手順**:
```sql
-- ビュー化を解除して元テーブルを戻す
CREATE TABLE IF NOT EXISTS activity_likes AS SELECT * FROM legacy_activity_likes;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_likes TO service_role;
```

### 中リスク変更

#### クイズ状態読み取りの切り替え
**リスク**: `quiz_sessions`/`quiz_results` からの読み取り不具合により、クライアントがクイズ未完了扱いになる

**軽減策**:
1. GET API を `quiz_results` → `account_metadata` のフォールバック順にし、feature flag で切り替え
2. 失敗時はメトリクスと Sentry 通知を出して即座に flag を戻せるようにする
3. 移行スクリプト完了後も一定期間 `account_metadata` を読み取り専用で保持し、緊急時に参照できるようにしておく

---

## 関連ドキュメント

### 既存ドキュメント
- `docs/refactoring/code-redundancy-analysis.md` - 詳細なコード分析
- `docs/refactoring/20251111-refactoring-plan.md` - 以前のリファクタリング計画
- `docs/refactoring/ID_DB_REFACTORING_PROPOSAL.md` - ID統一の詳細提案
- `docs/database_design.md` - データベース論理・物理設計

### 今後作成すべきドキュメント
- [ ] `docs/components/DESIGN_SYSTEM.md` - コンポーネント設計ガイドライン
- [ ] `docs/api/SPECIFICATION.md` - API仕様書（OpenAPI準拠）
- [ ] `docs/migration/ACTIVITY_INTERACTIONS.md` - activity_likes 移行手順
- [ ] `docs/migration/QUIZ_NORMALIZATION.md` - クイズ正規化手順
- [ ] `docs/testing/E2E_STRATEGY.md` - E2Eテスト戦略

---

## 結論

本リファクタリング提案は、コードベースの技術的負債を段階的に解消し、将来の機能追加に耐えられる基盤を構築することを目的としている。優先度の高い項目から順次実装を進めることで、リスクを最小化しながら改善を実現できる。

**次のステップ**:
1. チームレビューと優先順位の最終確認
2. Phase 1（クリティカル対応）の実装開始
3. 週次進捗レビューの実施



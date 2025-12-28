# Tabinaka Media リファクタリング提案 (2025-11-11)

## 概要
- 目的: 体験カード保存・クイズ結果同期・AIカード拡張など、アカウント基盤と密接に絡む領域を中心に、コードとデータモデルの乖離を是正し、将来の機能追加に耐えられる形へ再設計する。
- スコープ: `pages/api/likes`, `lib/quizClientState`, `account_metadata` 連携、`generated_activities` 周辺のコードおよび `docs/database_design.md` で定義済みの論理モデル。
- 成功指標:
  - 体験保存系エンドポイントが `activity_interactions` に一本化され、`account_id` ベースで整合性が取れている。
  - クイズの回答履歴と最新結果が `quiz_sessions` / `quiz_results` と `accounts` のリレーションで欠落なく保存される。
  - AIチャットのカードに「保存」導線を追加できるよう、スキーマ・API・UI の準備が完了する。

## エグゼクティブサマリ

| ID  | 狙い | 主要成果指標 | 想定工数 |
| --- | --- | --- | --- |
| **A-0** | 体験カード保存基盤の再構築 | `activity_likes` → `activity_interactions` への移行完了、existing データ100%移行、API/フロント差分テスト合格 | 4人日 |
| **A-1** | クイズ状態管理の正規化 | `quiz_sessions`/`quiz_results`/`quiz_answers` を運用開始し、`account_metadata.quiz_state` はビュー/キャッシュ位置付けに | 5人日 |
| **A-2** | AI生成カードの保存導線準備 | `generated_activity_saves` 新設、チャットUIのSaveボタン試験導入、`accounts` との紐付け確認 | 3人日 |
| B-1 | JSON-LDの統合とSEO整合性維持 | 共通ビルダー導入、手書き JSON-LD を全廃 | 3人日 |
| B-2 | 体験カードUIロジック共通化 | フォーマッタ重複 3 箇所→0、Storybook/VRT整備 | 4人日 |
| B-3 | IntersectionObserver/Lazyロード基盤整理 | Observer生成数半減、Skeleton設定一本化 | 各2人日 |
| B-4 | 記事コンテンツのDB移行準備 | `articles` テーブル稼働、MDX→DB同期スクリプト、CMS/承認フロー試験運用 | 5人日 |

### 成功指標と検証基準
- データ整合性: Supabase で `activity_interactions`, `quiz_sessions`, `generated_activity_saves` に対する RLS テストを自動化。
- API 回帰: `/api/likes`, `/api/account/quiz-state`, 追加予定 `/api/generated-activities/save` の e2e を Playwright で記録。
- フロント動作: Like/Quiz/Chat の保存導線が SSR/CSR 双方で同じ結果になることを Snapshot で確認。

### 現状コードとの差分チェック (2025-11-12)
- `/api/likes` は依然として `activity_likes` を読み書きしており、`activity_interactions` 未利用。

```156:178:pages/api/likes/[slug].ts
    if (existing) {
      // いいねを削除
      const { error: deleteError } = await supabaseServer
        .from('activity_likes')
        .delete()
        .eq('id', existing.id);
      // ... existing code ...
```

- クイズ同期 API は `account_metadata.quiz_state` への upsert のみで、`quiz_sessions` / `quiz_results` が存在しない。

```91:118:pages/api/account/quiz-state.ts
  const { error: upsertError } = await supabaseServer
    .from('account_metadata')
    .upsert(
      {
        account_id: resolved.accountId,
        quiz_state: nextQuizState,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' },
    );
  // ... existing code ...
```

- QR スキャン処理は `qr_scan_history` / `bookings` の更新に留まり、`activity_interactions` への `qr_scan` 記録が未実装。

```49:89:pages/api/qr/verify.ts
    const { error } = await supabaseServer
      .from('qr_scan_history')
      .insert([scanRecord]);
    // ... existing code ...
    const { error: updateError } = await supabaseServer
      .from('bookings')
      .update({ 
        scans_used: newScansUsed,
        last_scanned_at: new Date().toISOString()
      })
```

- `generated_activity_saves` を参照するコード・API は現状存在せず、文書のみで定義されている（`grep 'generated_activity_saves'` で docs のみヒット）。

---

## 優先度A（早期着手で効果大）

### A-0 体験カード保存基盤の再構築

#### 現状と課題
- UI は `LikeButton` から `/api/likes/[slug]` を叩き、`activity_likes` テーブルに slug ベースで保存している。

```18:178:components/LikeButton.tsx
export default function LikeButton({ 
  activitySlug, 
  source = "card",
  className = ""
}: LikeButtonProps) {
  // ... existing code ...
```

```156:178:pages/api/likes/[slug].ts
    if (existing) {
      // いいねを削除
      const { error: deleteError } = await supabaseServer
        .from('activity_likes')
        .delete()
        .eq('id', existing.id);
      // ... existing code ...
```

- データベース設計ドキュメントでは `activity_interactions` を中心とした保存設計を推奨しており、`activity_likes` は過渡的な位置付け (`docs/database_design.md` を参照)。
- 現行実装は slug のみで `activity_id` が欠落しており、`activities` テーブルとの整合性 (ドラフト変更や slug 変更時) にリスクがある。
- `resolveAccountId` は `account_linkages` を利用して `account_id` を解決するが、`activity_likes` には移行後のサマリが欠落。

```126:170:lib/server/accountResolver.ts
      const { data: linkage, error: linkageError } = await supabaseServer
        .from('account_linkages')
        .select('account_id')
        .eq('supabase_user_id', data.user.id)
        // ... existing code ...
```

#### 推奨アクション
1. **スキーマ移行**: `activity_interactions` テーブルを `accounts` と `activities` の FK で作成。種別 `interaction_type` を `like` として登録。
2. **API 更新**: `/api/likes` エンドポイントを `activity_interactions` へ書き込むよう変更し、`activity_id` を `normalizeActivitySlug` + 新しい resolver で取得する。`activity_likes` はビュー化 (後方互換)。
3. **データ移行**: 既存 `activity_likes` を `activity_interactions` に移し、ゲスト/ログイン双方について `account_id` の欠損を修正。移行後は `activity_likes` を削除 or read-only view。
4. **分析/可視化**: `activity_interactions` から最新 N 件を取得する Supabase View を用意し、ダッシュボード連携 (`docs/database_design.md` の統計連携方針に沿う)。
5. **QR スキャン統合**: `/api/qr/verify` に `activity_interactions` への `interaction_type='qr_scan'` 追記を追加し、既存 `qr_scan_history` との二重記録 (移行期間は Dual write) を構成。

#### 成果指標
- `/api/likes` の POST/GET が `activity_interactions` のみを参照している。
- Like/Unlike の e2e テストで `account_id` が正しく紐付くことを確認。
- slug 変更後のマイグレーションを想定し、`activity_id` で整合性が保たれることを QA。
- QR スキャン完了後に `activity_interactions` に `qr_scan` 記録が生成され、ダッシュボード連携できる。

#### リスク・留意点
- 既存 `activity_likes` 参照部分 (例: アナリティクス集計) の洗い出しが必要。
- ゲスト保存フローが導入される場合は `accounts` 側でゲストIDを確保する仕組み (Cookie) を強化。

---

### A-1 クイズ状態管理の正規化

#### 現状と課題
- クイズ結果はローカルストレージと `account_metadata.quiz_state` に保存されるのみで、回答履歴は保持されない。

```136:173:lib/quizClientState.ts
export const persistQuizResultLocal = (
  accountId: string | null,
  result: StoredQuizResult,
  options: PersistOptions = {},
): boolean => {
  if (!accountId) {
    return false;
  }
  try {
    const normalized = normalizeQuizResult(result);
    // ... existing code ...
```

```91:118:pages/api/account/quiz-state.ts
  const { error: upsertError } = await supabaseServer
    .from('account_metadata')
    .upsert(
      {
        account_id: resolved.accountId,
        quiz_state: nextQuizState,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' },
    );
  // ... existing code ...
```

- `docs/database_design.md` では `quiz_forms`, `quiz_sessions`, `quiz_answers`, `quiz_results` を定義済みだが、コード上未実装。
- 多人数/複数端末での回答履歴再現が難しく、`recommendation_runs` との追跡も `quiz_state` の JSON 依存に留まっている。

#### 推奨アクション
1. **テーブル実装**: `docs/database_design.md` の定義に沿って `quiz_forms`, `quiz_sessions`, `quiz_answers`, `quiz_results` を Supabase に追加。`quiz_results` に最新結果を保持し、`account_metadata.quiz_state` はビュー or キャッシュに変更。
2. **API 分割**: `/api/account/quiz-state` を `GET` → `quiz_results` 参照, `POST` → `quiz_sessions` を起こしてから `quiz_results` に挿入する構造へ改修。
3. **クライアント同期**: `lib/quizClientState` を改修し、ローカル→サーバー同期時に `quiz_sessions` を生成。未ログイン時は Pending Queue に保持し、ログイン時に移行する (既存 `transferPendingQuizResult` を活用)。
4. **レコメンド連携**: `recommendation_runs` に `quiz_result_id` を外部キーとして追加し、AIレコメンドとの因果関係を追跡。

#### 成果指標
- Quiz完了時に `quiz_sessions` と `quiz_results` が必ず生成され、`account_metadata` は参照専用になる。
- 過去回答履歴を Looker Studio で分析可能 (セッション別クエリ)。
- `recommendation_runs` との JOIN により、利用実績が追跡できる。

#### リスク・留意点
- 旧データ移行 (既存 `account_metadata.quiz_state`) を忘れず実行。最低限最新結果を `quiz_results` にコピー。
- 複数バージョンのクイズ (`quiz_forms.version`) を回す場合のマイグレーション設計を前倒しで合意。

---

### A-2 AI生成カードの保存導線準備

#### 現状と課題
- DB設計には `generated_activities` が存在するが、チャットUIには「保存」導線が未実装。保存済みカードを後で参照する仕組みがない。

```409:420:docs/database_design.md
###### `generated_activities`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | |
| `chat_session_id` | UUID | 作成元の会話 |
| `draft_slug` | TEXT | 仮スラッグ |
| `title` | TEXT | |
| `summary` | TEXT | |
| `body_mdx` | TEXT | MDX草案 |
| `source_place_id` | TEXT | Google Place 参考 |
| `status` | `generated_activity_status` enum (`draft`,`approved`,`rejected`,`published`) |
| `created_at` / `updated_at` | TIMESTAMP WITH TZ | |
| `metadata` | JSONB | 執筆プロンプトなど |
```

- 将来的に AI チャットカードにも保存ボタンを付ける方針のため、`accounts` との紐付けを事前に整える必要がある。

#### 推奨アクション
1. **新テーブル追加**: `generated_activity_saves` を追加し、`account_id`, `generated_activity_id`, `source`(`chat`, `recommendation`, `manual`), `created_at` を保持。RLS で本人のみ参照可能に。
2. **API 設計**: `/api/generated-activities/[id]/save` (POST/DELETE) を実装し、`resolveAccountId` を利用して保存/解除を制御。
3. **UI 更新**: チャット UI (`components/ChatInterface.tsx` など) に Save ボタンを追加し、`LikeButton` と同じデザインシステムを活用。保存後は `activity_interactions` (`interaction_type = 'ai_save'`) にも記録して行動履歴を一本化。
4. **通知/同期**: 保存済み AI カードを `liked-activities` ページで一覧できるよう API を拡張。後続で `activities` に昇格する際のリンク (`generated_activity_id` → `activity_id`) を保持する。

#### 成果指標
- AIカード保存 API が動作し、保存結果が `generated_activity_saves` と `activity_interactions` に記録される。
- E2E テストで保存/解除/再表示が行える。
- `docs/database_design.md` の Vendor & Operations 章と整合するデータ可視化 (AI起点の掲載率) が可能。

#### リスク・留意点
- 生成カードの承認フロー (ステータス遷移) と保存履歴の整合性に注意。Draft → Published 時に `generated_activity_id` を `activities.id` へ正規化する処理を別途設計。
- 長期的には `ai_save` を `activity_interactions` の１種別として統合することも検討。

---

## 優先度B（中期で進めたい改善）

### B-1 JSON-LD / SEO 構造化データの一元化
- 現状の手書き JSON-LD を `lib/structuredData` に統合し、`<SeoStructuredData>` コンポーネントを新設。
- `config/seo.ts` に共通情報を集約し、`pages/index.tsx` や `_app.tsx` の重複を排除。

### B-2 体験カード UI とメタ情報ロジックの共通化
- 価格/バッジ/評価のフォーマットを `ExperienceMeta` コンポーネントへ集約し、`ExperienceCard`, `ExperiencesCarousel`, `ExperienceTemplate` から重複削除。
- Storybook でカード状態を網羅し、VRT で回帰防止。

### B-3 IntersectionObserver / Lazyロード基盤整理
- `useIntersectionObserver` ファクトリを導入し、既存のスクロールアニメーションフックを統一。
- `createLazyComponent` で動的インポート設定を一括管理し、Skeleton のアクセシビリティを確保。

### B-4 記事コンテンツのDB移行準備
- 現状は `content/articles/<locale>/*.mdx` をGit管理し、`lib/mdx.ts` がファイルシステムから読み込む構成。多言語差分や承認フローがGit/GitHub依存となり、AI生成コンテンツ（`generated_activities.body_mdx`）との統合が難しい。
- 完全移行ではなく「MDX + DB ハイブリッド」から段階的に脱却することを目標に、DBを正史とした運用体制を整える。

#### 推奨アクション
1. **記事テーブルの実装**: `articles`（公開用）と `article_versions`（履歴管理）を Supabase に追加。`id`, `slug`, `language`, `title`, `summary`, `body_mdx`, `status`, `metadata(JSONB)` を保持し、`status` は `draft`/`in_review`/`published` を想定。
2. **移行・同期スクリプト**: 既存 MDX から DB へ一括移行する CLI (`scripts/migrate_articles_to_db.ts` 仮) を作成。移行後は Git 上の MDX をリードレプリカとして維持し、変更があれば DB → Git へ逆同期するジョブ（もしくは完全移行後に削除）を計画。
3. **管理UI/API 整備**: `/api/articles` を作成し、ドラフト作成・レビュー・公開をハンドリング。社内CMS（簡易エディタ）を `pages/business/articles/*` などに追加し、権限チェックと `body_mdx` のプレビューを実装。
4. **公開フロー刷新**: ISR 再生成のWebhook、`res.revalidate()` 連携、翻訳フォールバックなど、ファイル運用時のロジックを `lib/dbArticles.ts`（仮）へ集約。公開時には `article_versions` に履歴を必ず残す。

#### 成果指標
- Supabase 上で `articles` テーブルの稼働が確認でき、一覧APIで公開済み記事が取得できる。
- 新規記事の追加〜公開が Git コミットに依存せず完結し、1 記事あたりのリードタイムが 50% 以上短縮。
- 既存 MDX からの移行スクリプトを実行し、ランダムサンプリングで 100% の差分一致が確認できる。

#### リスク・留意点
- MDX 内の任意 JSX を DB 経由で配信するため、サニタイズ・権限管理を強化する必要がある。
- Git 上の履歴を止める場合は監査/差分閲覧手段を別途用意する。完全移行までの暫定期間は Dual write（Git + DB）を許容するが、更新者の混乱を避けるため運用ガイドを整備する。

---

## 優先度C（機会があれば対応）
- 静的データ (`travelMotivations` 等) を `config/` へ移行し、翻訳や A/B テストに備える。
- GA4 送信ロジックを `lib/analytics.ts` に抽象化し、SSR 安全なトラッキング API を提供。
- `SeoHead` コンポーネントを追加し、`Head` 要素を各ページから切り離して可読性を向上。

---

## 推奨ロードマップ
- **Sprint 1**: A-0 (体験保存) 着手。スキーマ追加 → API 更新 → データ移行 → フロント修正 → e2e。
- **Sprint 2**: A-1 (クイズ正規化) を中心に、`quiz_*` テーブル実装と同期ロジック改修。並行して B-1 の SEO 基盤整備。
- **Sprint 3**: A-2 (AI保存準備) と B-2/B-3 を導入。チャットUI Save ボタンの AB テストを実施。
- **Sprint 4**: B-4 に着手し、`articles` テーブル実装 → MDX移行スクリプト → β版CMS導入の順で検証。移行完了後にGitベース運用を段階的に廃止。
- **継続タスク**: C 項目を随時対応しながら、DB/アプリ整合性を `docs/database_design.md` と同期。

---

## 実行時の推奨プラクティス
- マイグレーション前後で `npm run lint`, `npm test`, `supabase db diff` を必ず実行し、CI で自動検証。
- `docs/database_design.md` と整合する ER 図を毎スプリント更新し、差分をレビュー。
- データ移行はリハーサル環境で dry-run → 本番適用本番の順に実施し、ログを `audit_events` に残す。
- フロントの保存系導線は Playwright で録画し、回帰テストを pipeline に組み込む。

---

## 影響範囲チェックリスト
- [ ] `activity_interactions` が Like/AI保存/QRスキャンなど全行動のソースとなっているか。
- [ ] `quiz_sessions`/`quiz_results` の整合性が Supabase RLS と e2e テストで確認できるか。
- [ ] `generated_activity_saves` に保存されたカードが `liked-activities` などの UI で閲覧可能か。
- [ ] JSON-LD 共通化で SSR/CSR の両方において構造化データが欠落していないか。
- [ ] IntersectionObserver の共通化後にパフォーマンスとアクセシビリティが維持されているか。
- [ ] `articles` テーブルを正史としたコンテンツ更新フローが確立され、MDX ファイルは参照専用になっているか。

---

## 次ステップ
1. A-0 の詳細設計レビューを実施し、`activity_interactions` スキーマ/マイグレーション方針を合意。
2. クイズ正規化 (A-1) に向け、現行 `account_metadata.quiz_state` のデータ量と形式を棚卸し。
3. AI保存導線 (A-2) の UI プロトタイプを用意し、UX/CS 観点での要件を確定。
4. 並行して B-1〜B-3 の設計ドキュメントを整備し、スプリント内の同時着手に備える。
5. B-4 の準備として `articles` テーブル設計レビューと MDX→DB 移行スクリプトのPoCを進め、CMS要件（権限/ステータス/プレビュー）を確定する。


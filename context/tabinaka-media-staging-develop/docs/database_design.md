# Database Design

## Overview / 進め方
- 本ドキュメントは「1. 概念設計 → 2. 論理設計 → 3. 物理設計 → 4. 運用設計 → 5. ドキュメント設計」という順番で進める。各フェーズで意思決定を凍結しながら、段階的に粒度を細かくしていく。
- まずは現状のコードベースとドキュメントを踏まえ、ユーザー体験と業務観点から必要なデータドメインを洗い出す（フェーズ1）。論理・物理設計はフェーズ1の合意後に着手する。
- 既存の `docs/db-schema-redesign.md` とはスコープを分担し、こちらは UX / プロダクト観点のトップダウン設計を提供する。両者を付き合わせて最終的なDDLを確定させる想定。
- 最新の実装計画は `docs/refactoring/20251111-refactoring-plan.md` (A-0/A-1/A-2) と連携し、本書の論理/物理設計を順次反映させる。

## 1. 概念設計 (Conceptual Design)

### 1.1 プロダクトUXと主要ユースケース
- **旅行者（一般ユーザー）体験**
  - トップページやカテゴリ検索でアクティビティ（`activities`）を探す。
  - 各アクティビティ詳細ページでは、MDXコンテンツ・Google Maps レビュー・写真・価格帯情報を閲覧し、気に入った体験に「いいね」（`/api/likes/[slug]` → `activity_likes`）を付ける。
  - 興味を持った体験では統一フォームから予約/問い合わせを送信し、クーポン・QRコードを受け取る（`/api/form-submissions` → `form_submissions` + SendGrid + `generateEmailQRCode`).
  - Travel Type Quiz（`components/TravelTypeQuiz.tsx`）に回答して自分の旅行タイプを判定し、周辺のおすすめを受け取る。結果は `account_metadata.quiz_state` に保存され、`/api/recommend` でGoogle Placesから推薦が生成される。
  - AIチャットボット（`/api/chat/send-message`, docs/features/AI_CHATBOT_AUTO_GENERATION_SYSTEM.md）と会話し、体験の検索や自動生成を依頼する。必要であれば新規アクティビティをAIが下書きし、MDX/DBに登録する。

- **運営・店舗（ベンダー）体験**
  - ベンダー用ログイン（`/api/vendor/login` など）で予約確認やQRスキャン結果を参照。
  - `form_submissions` や `qr/verify` により、来店時のチェックインやトラッキングを実施。
  - アクティビティの掲載ステータスはコード内 `config/experienceSettings.ts` および DB の `activities` で管理。

- **社内CS / マーケター**
  - `account_metadata` に集約されたクイズ結果、`activity_likes` や `form_submissions` のデータを分析し、人気動向やキャンペーン効果を把握。
  - AIレコメンドやチャット履歴（`chatbot_conversations` 等）をモニタリングして改善タスクを抽出。

### 1.2 ドメイン境界 (Bounded Contexts)
| コンテキスト | 目的 | 代表的な現行資産 |
| --- | --- | --- |
| **Identity & Session** | アカウント識別・Supabaseユーザー紐付け・匿名ゲスト移行 | `account_linkages`, `account_metadata`, `lib/server/accountResolver.ts`, `/api/account/state-sync` |
| **Experience Catalog** | 掲載体験のコンテンツ・分類・メディア管理 | `activities`, `experienceSettings.ts`, MDXコンテンツ、`activity_categories`, `activity_tags` |
| **Engagement & Social** | いいね・閲覧・レビュー・クーポン利用などのインタラクション追跡 | `activity_likes`, `review/*` API, `completed_activities`, Google Maps レビュー連携 |
| **Booking & Fulfillment** | 統一フォーム送信から予約・QRコード発行・メール通知まで | `form_submissions`, `qr/generate.ts`, `lib/qrCodeGenerator`, SendGrid設定 |
| **Personalization & AI** | Travel Type Quiz、レコメンド、チャットボット、AI生成体験 | `account_metadata.quiz_state`, `/api/recommend`, `/api/chat/*`, `docs/features/AI_CHATBOT_*`, `recommendation`関連コード |
| **Vendor & Operations** | 提携店舗/社内運用のためのダッシュボード・在庫管理・監査 | `/api/vendor/*`, `docs/features/README_QR_CODE_SYSTEM.md`, 将来的な `audit_event_log` |

### 1.3 概念エンティティと役割
| ドメイン | エンティティ (概念) | 説明 | 主な関連 |
| --- | --- | --- | --- |
| Identity | **Account** | 匿名/ログインを問わずユーザーを一意に識別（`account_id`）。クイズ結果や好みの集約単位。 | Account ⇄ AccountSession, Account ⇄ AccountLinkage, Account ⇄ AccountProfile |
| Identity | **AccountLinkage** | Supabase `auth.users` や外部IDとの紐付け履歴。複数ログイン手段を束ねる。 | AccountLinkage ⇄ Account, ⇄ SupabaseUser |
| Experience Catalog | **Activity** | 体験コンテンツのマスタ。価格、場所、タイプ（`company_affiliated`, etc）、MDX本文、Google Place ID を保持。 | Activity ⇄ Category, Activity ⇄ Tag, Activity ⇄ Vendor, Activity ⇄ ActivityAsset |
| Experience Catalog | **Category / Tag** | 旅行タイプやテーマ別の分類。UIでのフィルタリングやSEOに利用。 | Category ⇄ ActivityCategoryMap |
| Experience Catalog | **ActivityAsset** | 画像・動画・クーポンPDFなど。Cloudinary連携を含む。 | ActivityAsset ⇄ Activity |
| Content Publishing | **Article** | 旅行記事/ガイドの公開用コンテンツ。多言語・公開ステータス・MDX本文・メタデータを保持。 | Article ⇄ ArticleVersion, Article ⇄ Account(Author), Article ⇄ ArticleTranslation |
| Content Publishing | **ArticleVersion** | 記事の履歴・レビュー記録。ドラフト/承認プロセスを支援。 | ArticleVersion ⇄ Article, ArticleVersion ⇄ Account(Reviewer) |
| Content Publishing | **ArticleTranslation** | 言語別の本文・要約を保持し、ロケールごとの公開状況を管理。 | ArticleTranslation ⇄ Article, ArticleTranslation ⇄ Account(Translator) |
| Engagement | **Like Interaction** | `activity_likes` に相当する、ユーザーの好意的シグナル。トグル/集計を提供。 | Like ⇄ Account, Like ⇄ Activity |
| Engagement | **Review / Feedback** | 将来的なレビュー投稿、Google Maps レビュー参照、`review/*` API のQRアンケート結果。 | Review ⇄ Activity, Review ⇄ Account |
| Booking | **Form Submission / Booking** | 統一フォーム送信→予約確定→QRコード発行までの一連の記録。クーポンコード、ステータス、スキャン回数等を含む。 | Booking ⇄ Activity, Booking ⇄ Account (オプション), Booking ⇄ Voucher |
| Booking | **Voucher / QR Token** | クーポンコードやQRトークン、スキャン履歴。 | Voucher ⇄ Booking, Voucher ⇄ Vendor |
| Personalization | **Quiz Session** | Travel Type Quizの受検記録（回答、結果、ロケーション許諾）。 | QuizSession ⇄ Account, QuizSession ⇄ QuizResult |
| Personalization | **Quiz Result** | `account_metadata.quiz_state` に保存される最新の旅行タイプや推薦情報。 | QuizResult ⇄ Account, QuizResult ⇄ Recommendation |
| Personalization | **Recommendation Run** | Travel Type / AI / 手動の各レコメンド実行結果。Google Places から取得した `Place` 情報を含む。 | Recommendation ⇄ Account, ⇄ Activity (マッチ), ⇄ Place |
| Personalization | **Chat Session** | AIチャットボットとの会話履歴、提案アクティビティ、生成ファイル。 | ChatSession ⇄ Account, ChatSession ⇄ GeneratedActivity |
| Personalization | **Generated Activity** | AIが新規に生成した体験の草案。MDXやSQLへの書き出し対象。 | GeneratedActivity ⇄ Activity (採用時), ⇄ ActivityAsset |
| Operations | **Vendor** | 提携店舗・社内スタッフのアカウント。来店確認や在庫管理を行う。 | Vendor ⇄ Activity, Vendor ⇄ Voucher |
| Operations | **Audit Event** | 重要操作の追跡（アカウント紐付け、予約変更、AI生成の承認など）。 | AuditEvent ⇄ Account/Vendor/Activity |

### 1.4 コンセプト間の主要な関係
- `Account` は「いいね」「クイズ結果」「チャット」「予約」など複数コンテキストに跨る。Supabaseユーザーと匿名ゲストを橋渡しするため、`AccountLinkage` と `AccountMetadata` が中核となる。
- `Activity` は Experience Catalog の中心であり、`Activity` ⇄ `Booking` ⇄ `Voucher` の流れでオフライン来店まで連携する。また、Google Places の `Place` とも突合（place_id / embeddings）される。
- `QuizResult` は `Recommendation Run` と `Activity Interaction` を駆動する。`/api/recommend` では quiz_state を前提に外部APIへアクセスし、結果を `account_metadata` や一時キャッシュに格納する。
- `ChatSession` では会話中に `Generated Activity` を生成し、既存 `Activity` へのリンクや新規登録のためのドラフトデータを保持する。
- `Article` は編集者 (Account) と紐づき、`ArticleVersion` で履歴管理、`ArticleTranslation` で多言語データを保持する。公開中の内容は `articles.status='published'` を正史とし、MDXファイルは参照専用のバックアップに留める想定。
- `Vendor` は `Booking` や `Voucher` の検証者として関係し、QRスキャンの結果 (`qr/verify.ts`) を元に利用状況を記録する。

```text
Account ──< AccountLinkage
     │         
     ├─< QuizSession ──< QuizResult ──< RecommendationRun
     ├─< LikeInteraction >── Activity ──< Booking ──< Voucher
     ├─< ChatSession ──< GeneratedActivity ──> Activity
     └─< Article ──< ArticleVersion
                 └─< ArticleTranslation
     └─< AccountMetadata (latest quiz_state, preferences)
```

### 1.5 ユーザーアクション × データ影響マトリクス
| アクション | データ書き込み/更新 | 関連外部サービス |
| --- | --- | --- |
| 体験を閲覧 | `activities` のビューカウント集計（将来） / CDNキャッシュヒット | - |
| いいねを付与/解除 | `activity_likes` に追加/削除（`account_id` 解決） | - |
| 統一フォーム送信 | `form_submissions` 挿入 → `qr_code_data` 更新 → SendGridメール送信 | SendGrid, Cloudinary (画像), QR生成API |
| Travel Type Quiz 完了 | `account_metadata.quiz_state` 更新、`recommendation` トリガー | Google Places API (検索/詳細) |
| AIチャットでレコメンド | `chatbot_conversations` / `chatbot_messages` / `generated_activities` に記録 | OpenAI API, Google Places, Cloudinary |
| クーポン利用（現地） | `qr/verify` → `form_submissions.scans_used` インクリメント | - |
| ベンダーログイン | `vendor_sessions`（想定）作成、アクセスログ更新 | - |
| 記事を作成/公開 | `article_versions` 下書き保存 → レビュー後 `articles` & `article_translations` 更新 → ISR再生成 | Vercel ISR / CDN |

### 1.6 非機能要件・制約メモ
- **一貫したID管理**: `account_id` を起点に全テーブルを紐付ける方針を維持し、`user_id` は `AccountLinkage` に集約する（既存課題は `docs/refactoring/ID_DB_REFACTORING_PROPOSAL.md` 参照）。
- **多言語コンテンツ**: MDX + DB のハイブリッドで運用しているため、将来的な翻訳差分を吸収できるメタデータ（言語、公開ステータス）が必要。`articles` / `article_translations` 移行後は DB を正史とし、MDX はバックアップ/バルク編集用途に限定する。
- **編集権限・承認フロー**: 記事作成は社内ユーザーのみ実行できるよう RLS とアプリ層の権限を設計し、`article_versions` でレビュー結果を監査可能にする。
- **外部API の帯域とレイテンシ**: Google Places / OpenAI へのアクセスは課金制。レコメンド結果のキャッシュ戦略や滞在時間ログが重要。
- **セキュリティ/RLS**: Supabase RLS を活用し、`account_id` ベースのアクセス制御を徹底。サービスロールの取り扱いを最小化。
- **監査・トレーサビリティ**: クーポン利用やAI生成など重要イベントに対して `AuditEvent` ログを導入する余地。

### 1.7 オープン課題・確認事項
- `generated_activities` や `chatbot_*` 周辺の最新スキーマを確定する必要がある。AI下書きデータの保管先を決めないと物理設計に進めない。
- Travel Type Quiz の過去履歴（セッションごとの回答）はまだ持てていない。再現性確保のため `quiz_sessions` / `quiz_answers` の整備が必要。
- `form_submissions` は多目的フィールドが多く、正規化方針（`visit_purposes`, `travel_issues` など配列）の扱いを整理する必要がある。
- ベンダー向け機能のスキーマ（認証、権限、チェックインログ）が不明瞭。既存APIから逆算してモデルを明文化したい。
- 現状の `account_metadata` に集約されるJSON構造を、将来的に分割するか（例: `preference_snapshots`）判断が必要。
- 記事コンテンツをDBへ移行する際の Git との整合（Dual write 期間、ロールバック手段、バルク編集ツール）を定義する必要がある。

---

## 2. 論理設計 (Logical Design)

### 2.1 モデリング方針
- **`account_id` を第一キーとする**: クライアント識別はすべて `accounts.id` に集約し、SupabaseユーザーIDや外部IDは `account_linkages` で橋渡しする。
- **`activity_id` と `activity_slug` の両軸管理**: 内部処理・整合性は `activities.id (UUID)` を主に利用しつつ、公開URLや検索には `slug` を活用。`activity_interactions` 等では両方を保持して履歴照会を容易にする。
- **JSONBは補助用途に限定**: フィールド（特にフォーム送信）で変化しやすい項目は JSONB に保持しつつ、検索・集計が必要な軸は正規化または専用カラムを設ける。
- **各ドメインごとのRLS/責務境界**: Identity/Personalization/Bookingなどでテーブルを分割し、RLSをドメイン単位で設計できるようにする。
- **非機能要件を考慮したキー設計**: 高頻度の参照・更新が発生するテーブル（例: `activity_interactions`, `quiz_sessions`）は主キー・ユニーク制約・インデックスを明示しておく。

### 2.2 ドメイン別論理モデル
以下、各ドメインの中心テーブルについて論理モデルを定義する。型は PostgreSQL を前提に記述するが、物理設計フェーズで最終確定する。

#### Identity & Session
##### `accounts`
| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | すべての利用者を一意に識別するID |
| `status` | `account_status` enum (`active`,`suspended`,`deleted`) | NO | `'active'` | アカウントの有効状態 |
| `onboarding_state` | JSONB | YES | `{}` | クイズ導線や初期設定の進捗 |
| `created_at` | TIMESTAMP WITH TZ | NO | `now()` | 作成日時 |
| `updated_at` | TIMESTAMP WITH TZ | NO | `now()` | 最終更新日時（トリガーで更新） |

**Keys & Constraints**
- PK: `accounts_pkey(id)`
- UQ: なし（IDのみ）
- Trigger: `touch_accounts_updated_at`（更新時に `updated_at` を更新）
- RLS: `auth.uid()` と `account_linkages` をJOINし本人のみ参照可能、サービスロールは全権限

##### `account_linkages`
| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `account_id` | UUID | NO | - | `accounts.id` へのFK |
| `supabase_user_id` | UUID | YES | - | Supabase `auth.users` のID（ゲストはNULL） |
| `provider_type` | TEXT | YES | - | `supabase`, `guest_cookie`, `line`, etc |
| `linked_at` | TIMESTAMP WITH TZ | NO | `now()` | 紐付け日時 |
| `metadata` | JSONB | YES | `{}` | プロバイダー固有メタデータ |

**Keys & Constraints**
- PK: `(account_id, provider_type, supabase_user_id)` の複合（NULL許容列はUNIQUE部分で調整）
- UQ: `supabase_user_id` にユニーク制約（NULL許容）
- FK: `account_id` → `accounts.id`
- RLS: `auth.uid()` が一致するリンクのみ参照可能。ゲストCookie連携はアプリ層で検証

##### `account_profiles`
| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `account_id` | UUID | NO | 1:1で`accounts`に紐付く |
| `display_name` | TEXT | YES | 表示名 |
| `locale` | TEXT | YES | `en`, `ja` など |
| `timezone` | TEXT | YES | IANA timezone |
| `demographics` | JSONB | YES | 国籍、年代、旅行スタイルなど |
| `preferences` | JSONB | YES | 通知設定など |
| `updated_at` | TIMESTAMP WITH TZ | NO |

**Keys & Constraints**
- PK / FK: `account_id`（`account_profiles_account_id_fkey`）
- Index: `(locale)`, `(timezone)` 必要に応じ追加

##### `account_metadata`
| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `account_id` | UUID | NO | `accounts.id` |
| `quiz_state` | JSONB | YES | 最新のTravel Type結果・推薦など |
| `last_synced_at` | TIMESTAMP WITH TZ | YES | クライアント同期日時 |
| `flags` | JSONB | YES | フィーチャーフラグ、Beta opt-in など |

**Keys & Constraints**
- PK/FK: `account_id`
- RLS: `account_linkages` 経由で本人のみアクセス
- 備考: `docs/refactoring/ID_DB_REFACTORING_PROPOSAL.md` で追加予定の `preference_snapshots` と連携

#### Experience Catalog
##### `activities`
| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | 体験マスタID |
| `slug` | TEXT | NO | - | 公開用スラッグ（ユニーク）|
| `title` | TEXT | NO | - | 表示タイトル |
| `summary` | TEXT | YES | - | 概要 |
| `description` | TEXT | YES | - | 詳細（MDXとは別。短文）|
| `status` | `activity_status` enum (`draft`,`published`,`archived`) | NO | `'draft'` | 公開状態 |
| `activity_type` | `activity_type` enum (`company_affiliated`,`shibuya_pass`,`partner_store`) | NO | `'partner_store'` | 体験タイプ |
| `location_id` | UUID | YES | - | 位置情報テーブル（任意）|
| `google_place_id` | TEXT | YES | - | Google Places との突合 |
| `duration_minutes` | INTEGER | YES | - | 所要時間 |
| `price_tier` | TEXT | YES | - | 価格帯/割引情報 |
| `metadata` | JSONB | YES | `{}` | 補助データ（Instagramリンク等）|
| `is_active` | BOOLEAN | NO | `false` | 掲載可否（現行互換）|
| `created_at` / `updated_at` | TIMESTAMP WITH TZ | NO | `now()` | 監査用途 |

**Keys & Constraints**
- PK: `activities_pkey(id)`
- UQ: `slug`
- Index: `(status)`, `(activity_type)`, `(google_place_id)`

##### `activity_categories`
| Column | Type | Nullable |
| --- | --- | --- |
| `id` | UUID | NO |
| `slug` | TEXT | NO |
| `name` | TEXT | NO |
| `description` | TEXT | YES |
| `parent_id` | UUID | YES |
| `is_active` | BOOLEAN | NO |
| `created_at` | TIMESTAMP WITH TZ | NO |

- UQ: `slug`
- FK: `parent_id` → `activity_categories.id`

##### `activity_category_map`
| Column | Type | Nullable |
| --- | --- | --- |
| `activity_id` | UUID | NO |
| `category_id` | UUID | NO |

- PK: `(activity_id, category_id)`
- FK: `activity_id` → `activities.id`, `category_id` → `activity_categories.id`

##### `activity_tags` & `activity_tag_map`
- `activity_tags`（`id`, `slug`, `name`, `color`, `is_active`, `created_at`）
- `activity_tag_map`（`activity_id`, `tag_id`）: PKとして複合キー、FKで `activities`, `activity_tags`

##### `activity_assets`
| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | UUID | NO | |
| `activity_id` | UUID | NO | FK → activities |
| `asset_type` | `asset_type` enum (`image`,`video`,`document`,`qr_coupon`) | NO | |
| `url` | TEXT | NO | Cloudinary等のURL |
| `metadata` | JSONB | YES | 画像の代替テキスト、順序など |
| `is_primary` | BOOLEAN | NO | 主要ビジュアル指定 |
| `created_at` | TIMESTAMP WITH TZ | NO | |

##### `activity_locations` *(オプション)*
- `id`, `name`, `address`, `latitude`, `longitude`, `maps_url`, `timezone`
- 体験が同一施設に紐づく場合の再利用を意識

#### Content & Publishing
##### `articles`
| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | 記事ID |
| `slug` | TEXT | NO | - | 公開URL用スラッグ（ロケールに依存しない共通ID） |
| `language` | TEXT | NO | `'en'` | `en`, `ja`, `ko`, `zh` など ISO 639-1 |
| `title` | TEXT | NO | - | 公開タイトル |
| `summary` | TEXT | YES | - | 記事概要 |
| `cover_image_url` | TEXT | YES | - | OGP/カード表示用画像 |
| `body_mdx` | TEXT | NO | - | MDX本文（DB正史） |
| `status` | `article_status` enum (`draft`,`in_review`,`published`,`archived`) | NO | `'draft'` | 公開状態 |
| `author_account_id` | UUID | YES | - | 作成者 (`accounts.id`) |
| `published_at` | TIMESTAMP WITH TZ | YES | - | 公開日時 |
| `metadata` | JSONB | YES | `{}` | タグ、推奨表示位置など |
| `created_at` / `updated_at` | TIMESTAMP WITH TZ | NO | `now()` | 作成・更新日時 |

**Keys & Constraints**
- PK: `articles_pkey(id)`
- UQ: `(slug, language)`、`(slug, status)`（`published` は言語ごとに一意）
- FK: `author_account_id` → `accounts.id`
- Index: `(status, published_at DESC)`, `(language, published_at DESC)`
- RLS: 読み取りは `status='published'` を全公開、それ以外は権限ロール（編集者）で限定。書き込みは編集者ロールのみ。

##### `article_versions`
| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | UUID | NO | バージョンID |
| `article_id` | UUID | NO | FK → articles |
| `version_number` | INTEGER | NO | 1からの連番 |
| `language` | TEXT | NO | 編集対象ロケール |
| `title` | TEXT | NO | バージョン時点のタイトル |
| `summary` | TEXT | YES | バージョン時点のサマリ |
| `body_mdx` | TEXT | NO | バージョン時点の本文 |
| `editor_account_id` | UUID | YES | 編集を行ったアカウント |
| `change_note` | TEXT | YES | 差分メモ |
| `created_at` | TIMESTAMP WITH TZ | NO | バージョン作成日時 |

**Keys & Constraints**
- PK: `article_versions_pkey(id)`
- UQ: `(article_id, language, version_number)`
- FK: `article_id` → `articles.id`, `editor_account_id` → `accounts.id`
- Index: `(article_id, language, version_number DESC)`
- RLS: 編集者ロールのみ参照・挿入可能。監査用にサービスロール全件アクセス。

##### `article_translations`
| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | UUID | NO | |
| `article_id` | UUID | NO | FK → articles |
| `language` | TEXT | NO | 言語コード |
| `title` | TEXT | NO | 言語別タイトル |
| `summary` | TEXT | YES | 言語別サマリ |
| `body_mdx` | TEXT | NO | 言語別本文（デフォルトは `articles.body_mdx` を参照） |
| `status` | `article_status` | NO | `'draft'` | 言語別の公開状態 |
| `translator_account_id` | UUID | YES | 翻訳担当 |
| `published_at` | TIMESTAMP WITH TZ | YES | 言語別公開日時 |
| `metadata` | JSONB | YES | `{}` | 翻訳メモ、校正履歴など |
| `created_at` / `updated_at` | TIMESTAMP WITH TZ | NO | |

**Keys & Constraints**
- PK: `article_translations_pkey(id)`
- UQ: `(article_id, language)`
- FK: `article_id` → `articles.id`, `translator_account_id` → `accounts.id`
- Index: `(language, status)`, `(article_id, status)`
- RLS: 公開済み (`status='published'`) は全員閲覧可。それ以外は編集者ロールに限定。

#### Engagement & Social
##### `activity_interactions`
| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | UUID | NO | |
| `account_id` | UUID | NO | FK → accounts |
| `activity_id` | UUID | YES | FK → activities |
| `activity_slug` | TEXT | NO | 履歴検索のための冗長コピー |
| `interaction_type` | `interaction_type` enum (`like`,`bookmark`,`view`,`share`,`book`,`qr_scan`,`ai_save`) | NO | 行動種別（A-0/A-2計画対応） |
| `source_type` | `interaction_source_type` enum (`manual`,`quiz`,`recommendation`,`chat`,`migration`) | YES | |
| `source_id` | UUID | YES | 推薦ランID・チャットセッションIDなど |
| `score_delta` | INTEGER | YES | レコメンド評価値 |
| `metadata` | JSONB | YES | 追加情報（位置、デバイスなど）|
| `created_at` | TIMESTAMP WITH TZ | NO | |
| `updated_at` | TIMESTAMP WITH TZ | NO | |

- PK: `activity_interactions_pkey(id)`
- Unique partial index: `(account_id, activity_id, interaction_type)` WHERE `interaction_type IN ('like','bookmark','ai_save')`
- Index: `(activity_slug, interaction_type)`
- 備考: 2025-11 時点では `/api/likes` は `activity_likes` を参照。A-0 移行で `activity_interactions` を正史とし、`activity_likes` は互換ビュー（`legacy_activity_likes`) に置き換える。

##### `activity_likes`
- 既存API互換のため残置：`id`, `account_id`, `activity_slug`, `user_id`(deprecated), `created_at`
- 将来的に view として `activity_interactions` へ移行予定

##### `reviews` *(将来拡張)*
- `id`, `activity_id`, `account_id`, `rating`, `comment`, `source`(`google`,`manual`), `submitted_at`
- Googleレビュー同期は別テーブルまたは外部参照

#### Booking & Fulfillment
##### `form_submissions`
| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | UUID | NO | |
| `activity_id` | UUID | NO | `activities.id` |
| `experience_slug` | TEXT | NO | URL互換 |
| `experience_title` | TEXT | NO | 表示名（履歴用）|
| `account_id` | UUID | YES | ログイン済みの場合にセット |
| `email` | TEXT | NO | 予約者連絡先 |
| `phone_number` | TEXT | YES | |
| `first_name` / `last_name` | TEXT | YES | |
| `country` / `nationality` | TEXT | YES | |
| `visit_purposes` | TEXT[] | YES | アンケート回答 |
| `stay_duration` | TEXT | YES | |
| `travel_issues` | TEXT[] | YES | |
| `how_found` | TEXT | YES | |
| `how_found_other` | TEXT | YES | |
| `mode` | TEXT | YES | `unified` など |
| `agree_to_terms` | BOOLEAN | NO | |
| `booking_id` | TEXT | YES | `booking_${id}` パターン |
| `coupon_code` | TEXT | YES | `GAPPY2025XXXX` |
| `booking_date` | DATE | YES | 予約日 |
| `status` | `booking_status` enum (`pending`,`confirmed`,`redeemed`,`cancelled`) | NO | `'pending'` |
| `scans_used` | INTEGER | NO | `0` |
| `max_scans` | INTEGER | YES | デフォルト3 |
| `qr_code_data` | JSONB | YES | 生成したQRとペイロード |
| `user_agent` / `ip_address` / `referrer` | TEXT | YES | トラッキング |
| `created_at` / `updated_at` | TIMESTAMP WITH TZ | NO | |

- PK: `form_submissions_pkey(id)`
- Index: `(activity_id, created_at)`, `(status)`
- FK: `activity_id` → `activities.id`

##### `vouchers`
| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | UUID | NO | |
| `form_submission_id` | UUID | NO | FK |
| `voucher_code` | TEXT | NO | クーポンコード（ユニーク）|
| `qr_token` | TEXT | YES | QRに埋め込むトークン |
| `valid_from` / `valid_until` | TIMESTAMP WITH TZ | YES | 利用期間 |
| `max_redemptions` | INTEGER | NO | |
| `redemptions_used` | INTEGER | NO | |
| `metadata` | JSONB | YES | 追加条件 |
| `created_at` | TIMESTAMP WITH TZ | NO | |

- Unique: `voucher_code`
- FK: `form_submission_id` → `form_submissions.id`

##### `voucher_redemptions`
| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | UUID | NO | |
| `voucher_id` | UUID | NO | `vouchers.id` |
| `vendor_member_id` | UUID | YES | 誰がスキャンしたか |
| `scan_context` | JSONB | YES | 端末、場所など |
| `scanned_at` | TIMESTAMP WITH TZ | NO | |

- Index: `(voucher_id, scanned_at DESC)`

#### Personalization & AI
##### Travel Type Quiz
###### `quiz_forms`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | フォーム識別子 |
| `version` | INTEGER | バージョン管理 |
| `definition` | JSONB | 質問・選択肢の構造 |
| `published` | BOOLEAN | 公開有無 |
| `created_at` | TIMESTAMP WITH TZ | |

###### `quiz_sessions`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | セッションID |
| `account_id` | UUID | FK → accounts |
| `quiz_form_id` | UUID | FK → quiz_forms |
| `status` | `quiz_session_status` enum (`in_progress`,`completed`,`abandoned`) | |
| `started_at` | TIMESTAMP WITH TZ | |
| `completed_at` | TIMESTAMP WITH TZ | |
| `location_permission` | BOOLEAN | |
| `metadata` | JSONB | 端末情報など |

###### `quiz_answers`
- `id`, `session_id`, `question_ref`, `answer_value`, `answered_at`
- Index `(session_id)`

###### `quiz_results`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | |
| `session_id` | UUID | FK → quiz_sessions |
| `account_id` | UUID | FK → accounts |
| `result_type` | `quiz_result_type` enum (`travel_type`,`destination_cluster`) |
| `travel_type_code` | TEXT | `GRLP`など |
| `travel_type_payload` | JSONB | 名前/絵文字/説明 |
| `recommendation_snapshot` | JSONB | 生成時のおすすめ |
| `created_at` | TIMESTAMP WITH TZ | |

##### Recommendation
###### `recommendation_runs`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | |
| `account_id` | UUID | FK |
| `trigger` | `recommendation_trigger` enum (`quiz_result`,`chat_prompt`,`manual`,`cron`) |
| `input_payload` | JSONB | 旅行タイプ、ロケーション等 |
| `model_metadata` | JSONB | OpenAIモデル、温度など |
| `status` | `job_status` enum (`queued`,`processing`,`ready`,`failed`) |
| `created_at` | TIMESTAMP WITH TZ | |
| `completed_at` | TIMESTAMP WITH TZ | |

###### `recommendation_items`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | |
| `run_id` | UUID | FK → recommendation_runs |
| `activity_id` | UUID | NULL許容（Placeのみの場合） |
| `place_id` | TEXT | Google Places ID |
| `rank` | INTEGER | 1..N |
| `score` | NUMERIC | レコメンドスコア |
| `presentation_payload` | JSONB | 表示文言、画像URL |
| `presented_at` / `clicked_at` / `dismissed_at` | TIMESTAMP WITH TZ | 利用実績 |

##### AIチャット
###### `chat_sessions`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | |
| `account_id` | UUID | FK |
| `session_type` | `chat_session_type` enum (`assistant`,`vendor_support`,`system`) |
| `state` | JSONB | 現在のコンテキスト |
| `started_at` | TIMESTAMP WITH TZ | |
| `last_activity_at` | TIMESTAMP WITH TZ | |
| `closed_at` | TIMESTAMP WITH TZ | |
| `metadata` | JSONB | ブラウザ、言語など |

###### `chat_messages`
- `id`, `session_id`, `role` (`user`,`assistant`,`tool`), `content`, `tool_calls` JSONB, `latency_ms`, `created_at`
- Index `(session_id, created_at)`

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

###### `generated_activity_saves`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | |
| `generated_activity_id` | UUID | FK → generated_activities |
| `account_id` | UUID | FK → accounts |
| `source` | `generated_activity_save_source` enum (`chat`,`recommendation`,`manual`) | 保存元チャネル |
| `interaction_id` | UUID | 任意。`activity_interactions` の関連行を指す |
| `created_at` | TIMESTAMP WITH TZ | |
| `metadata` | JSONB | UIバージョン、A/Bテストグループなど |

- Unique: `(generated_activity_id, account_id)`
- RLS: `account_id = auth_account()` のみ閲覧可。A-2 の保存導線と同期し、`activity_interactions` と二重書き込みする。

#### Vendor & Operations
##### `vendors`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | 提携組織ID |
| `name` | TEXT | 店舗/企業名 |
| `contact_email` | TEXT | |
| `contact_phone` | TEXT | |
| `metadata` | JSONB | 契約情報 |
| `created_at` | TIMESTAMP WITH TZ | |

##### `vendor_members`
- `id`, `vendor_id` (FK → vendors), `account_id` または `supabase_user_id`, `role` (`admin`,`staff`), `invited_at`, `joined_at`, `status`
- Unique `(vendor_id, account_id)`

##### `activity_vendor_map`
- `activity_id`, `vendor_id`, `relationship_type` (`owner`,`partner`)

##### `audit_events`
| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | |
| `entity_type` | TEXT | `activity`,`form_submission`,`generated_activity` など |
| `entity_id` | UUID/TEXT | 対象ID |
| `event_type` | TEXT | `created`,`updated`,`published`,`qr_scanned` など |
| `performed_by` | UUID | `accounts.id` or `vendor_members.id` |
| `payload` | JSONB | 変更内容 |
| `created_at` | TIMESTAMP WITH TZ | |

### 2.3 主要リレーションまとめ
- `accounts (1) ── (N) account_linkages`
- `accounts (1) ── (1) account_profiles`
- `accounts (1) ── (1) account_metadata`
- `activities (1) ── (N) activity_category_map (N) ── (1) activity_categories`
- `activities (1) ── (N) activity_assets`
- `accounts (1) ── (N) activity_interactions`
- `activities (1) ── (N) form_submissions (1) ── (1) vouchers (1) ── (N) voucher_redemptions`
- `accounts (1) ── (N) quiz_sessions (1) ── (1) quiz_results`
- `quiz_results (1) ── (N) recommendation_runs (1) ── (N) recommendation_items`
- `accounts (1) ── (N) chat_sessions (1) ── (N) chat_messages`
- `chat_sessions (1) ── (N) generated_activities`
- `vendors (1) ── (N) vendor_members`
- `vendors (1) ── (N) activity_vendor_map`
- `audit_events` は任意のエンティティと紐付く多対多関係を `entity_type` + `entity_id` で表現

### 2.4 データフローと整合性
1. **クイズ完了フロー**: `quiz_sessions` → `quiz_answers` → `quiz_results` → `account_metadata.quiz_state` 更新 → `recommendation_runs` 生成。
2. **いいねフロー**: クライアントが `/api/likes` を叩き、`activity_interactions` に `like` をUpsert（部分ユニーク指数でトグル）。
3. **予約フロー**: `form_submissions` へ挿入 → 成功時に `vouchers`/`qr_code_data` を生成 → メール送信後に `audit_events` へ記録。
4. **QRスキャン**: `/api/qr/verify` が `vouchers`/`voucher_redemptions` を更新し、`activity_interactions` に `qr_scan` を追加。
5. **AIレコメンド**: `recommendation_runs` 作成時に `recommendation_items` を挿入し、選択された `activity_id` は `activity_interactions` (source=`recommendation`) 経由で追跡。
6. **AIカード保存**: チャットUIから保存したカードを `generated_activity_saves` に記録し、同時に `activity_interactions` (`interaction_type='ai_save'`) を作成して履歴を統合。

### 2.5 参照整合性・制約方針
- すべてのFKは `ON DELETE RESTRICT` を基本とし、論理削除（`status` 列）で整合性を保つ。履歴保持が不要な場合のみ `ON DELETE CASCADE`（例: `quiz_sessions` → `quiz_answers`）。
- JSONBカラムには必要に応じてチェック制約を設定（例: `metadata->>'language'` がISOコードか確認する関数を用意）。
- 部分インデックスやユニーク制約でビジネスロジックを担保（like/bookmarkの一意性、`voucher_code` のユニーク性）。

### 2.6 RLS設計の叩き台
- **accounts系**: `USING account_id IN (SELECT account_id FROM account_linkages WHERE supabase_user_id = auth.uid())`
- **activity_interactions**: 鑑賞ユーザーのみ参照可能（アカウントリンク）、サービスロールは全件。
- **form_submissions / vouchers**: ユーザー本人（メール一致 + account_id）と所属ベンダーのみ。メール一致は機微のためAPI層で制御、RLSでは `account_id`/`vendor_id` を条件。
- **quiz_sessions/quiz_results**: `account_id` ベースで本人のみ。
- **generated_activity_saves**: `account_id = auth_account()` のみ参照可。保存削除APIは `WITH CHECK` で操作者の一致を保証。
- **chat_sessions/messages**: `account_id` ベース。運営サポート閲覧用に `role` に `support` を追加し、サポート用ポリシーを別途設ける。
- **audit_events**: デフォルトは管理者のみ、ベンダーには `entity_type` が該当活動で、且つ自組織に紐づく場合のみ読取権限。

### 2.7 現行実装とのマッピング (2025-11)
| 現行テーブル / API | 本設計でのターゲット | 移行メモ |
| --- | --- | --- |
| `activity_likes`, `/api/likes/[slug]` | `activity_interactions` (`interaction_type='like'`) | A-0 でDual write→切替。slug → `activity_id` 解決を `normalizeActivitySlug` + 新 resolver で実装。移行後は `legacy_activity_likes` ビュー化。 |
| `offline_likes` | `activity_interactions` (`source_type='migration'`) | モバイル/オフライン保存の統合先。バッチで `activity_id` resolve → insert。 |
| `account_metadata.quiz_state`, `lib/quizClientState` | `quiz_sessions` / `quiz_results` / `quiz_answers` | A-1 でサーバー保存を正規化。`account_metadata` は最新結果キャッシュ (ビュー) として残す。既存 JSON は初回マイグレーションで `quiz_results` にコピー。 |
| `recommendation_cache`, `/api/recommend` | `recommendation_runs` + `recommendation_items` | 現行キャッシュはJSON+TTL。A-1後にレコメンド実行履歴へ段階移行。 `place_id` の正規化が必要。 |
| `chatbot_conversations`, `chatbot_messages`, `generated_activities` | `chat_sessions` / `chat_messages` / `generated_activity_saves` | A-2 で保存導線追加。既存 `generated_activities` レコードに `account_id` を付与し、保存履歴は `generated_activity_saves` + `activity_interactions(ai_save)` に記録。 |
| `account_linkages` (手動補完) | `account_linkages` + `accounts` | `scripts/backfill_account_linkages.sql` を本番/検証環境で実行し、孤立した `account_id` を補完。 |
| `quiz_results` (従来テーブル) | `quiz_results` (再定義) | 旧構造の存在を確認。必要に応じ列をリネームし、`quiz_sessions` FK を追加。 |
| `recommendation_items` (未導入) | `recommendation_items` | 新設テーブル。AI起点・手動レコメンド双方を格納。 |
| `user_attributes` | `account_profiles` / `account_metadata.flags` | 既存属性を正規化カラムへ移し、`account_linkages` と揃えて取得。`backfill_account_linkages.sql` で参照済み。 |

> 参考: 詳細な着手順序は `docs/refactoring/20251111-refactoring-plan.md` (A-0/A-1/A-2) に従う。ここではターゲットスキーマと現行コードベースを常に同期させることを目的とする。

---

## 3. 物理設計 (Physical Design)

### 3.1 ターゲット環境と拡張機能
- **プラットフォーム**: Supabase (PostgreSQL 15) を前提。開発用は Supabase Branching、ローカルは `supabase start` によるDocker環境を利用。
- **必須拡張機能**
  - `pgcrypto`: `gen_random_uuid()` を利用する全テーブルで必須。
  - `pgvector`: 推薦スコアや類似度計算で embedding を保持する際に有効化（`recommendation_runs` 付近）。
  - `uuid-ossp`: 旧マイグレーション互換性のため一部で必要。新規は `pgcrypto` を優先。
- **パラメータ**: `shared_preload_libraries` はSupabase管理、アプリ側では `statement_timeout` をAPIクライアントで制御。

### 3.2 命名規約とDDL方針
- テーブル名・カラム名はすべて `snake_case`。ENUMは `domain_action` 形式（例: `account_status`）。
- 主キーは原則 `id UUID PRIMARY KEY`。ブリッジテーブルは複合主キーとし、サロゲートキーは不要。
- 時刻列は `TIMESTAMP WITH TIME ZONE`。生成系は `DEFAULT now()`、更新系はトリガーで管理。
- JSONB列は `metadata` / `payload` など意味が明確な名称とし、キー構造は別途ドキュメント化。

### 3.3 DDLドラフト（主要テーブル）
```sql
CREATE TYPE account_status AS ENUM ('active','suspended','deleted');
CREATE TYPE activity_status AS ENUM ('draft','published','archived');
CREATE TYPE activity_type AS ENUM ('company_affiliated','shibuya_pass','partner_store');
CREATE TYPE interaction_type AS ENUM ('like','bookmark','view','share','book','qr_scan','ai_save');
CREATE TYPE interaction_source_type AS ENUM ('manual','quiz','recommendation','chat','migration');
CREATE TYPE quiz_session_status AS ENUM ('in_progress','completed','abandoned');
CREATE TYPE quiz_result_type AS ENUM ('travel_type','destination_cluster');
CREATE TYPE generated_activity_status AS ENUM ('draft','approved','rejected','published');
CREATE TYPE generated_activity_save_source AS ENUM ('chat','recommendation','manual');
CREATE TYPE article_status AS ENUM ('draft','in_review','published','archived');

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status account_status NOT NULL DEFAULT 'active',
  onboarding_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_linkages (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  supabase_user_id UUID,
  provider_type TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (account_id, provider_type, supabase_user_id),
  UNIQUE (supabase_user_id)
);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  status activity_status NOT NULL DEFAULT 'draft',
  activity_type activity_type NOT NULL DEFAULT 'partner_store',
  location_id UUID,
  google_place_id TEXT,
  duration_minutes INTEGER,
  price_tier TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE RESTRICT,
  activity_slug TEXT NOT NULL,
  interaction_type interaction_type NOT NULL,
  source_type interaction_source_type,
  source_id UUID,
  score_delta INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX unique_like_interactions
  ON activity_interactions (account_id, activity_id, interaction_type)
  WHERE interaction_type IN ('like','bookmark','ai_save');

CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  quiz_form_id UUID,
  status quiz_session_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  location_permission BOOLEAN,
  metadata JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX quiz_sessions_account_id_started_at_idx ON quiz_sessions (account_id, started_at DESC);

CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  result_type quiz_result_type NOT NULL,
  travel_type_code TEXT,
  travel_type_payload JSONB,
  recommendation_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX quiz_results_account_id_created_at_idx ON quiz_results (account_id, created_at DESC);

CREATE TABLE generated_activity_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_activity_id UUID NOT NULL REFERENCES generated_activities(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source generated_activity_save_source NOT NULL,
  interaction_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (generated_activity_id, account_id)
);

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  summary TEXT,
  cover_image_url TEXT,
  body_mdx TEXT NOT NULL,
  status article_status NOT NULL DEFAULT 'draft',
  author_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, language),
  UNIQUE (slug) WHERE status = 'published'
);
CREATE INDEX articles_status_published_at_idx ON articles (status, published_at DESC);
CREATE INDEX articles_language_published_at_idx ON articles (language, published_at DESC);

CREATE TABLE article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_mdx TEXT NOT NULL,
  editor_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, language, version_number)
);
CREATE INDEX article_versions_article_id_idx ON article_versions (article_id, language, version_number DESC);

CREATE TABLE article_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_mdx TEXT NOT NULL,
  status article_status NOT NULL DEFAULT 'draft',
  translator_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, language)
);
CREATE INDEX article_translations_language_status_idx ON article_translations (language, status);

-- 互換用ビュー (A-0)
CREATE VIEW legacy_activity_likes AS
  SELECT
    id,
    account_id,
    activity_slug,
    NULL::UUID AS user_id,
    created_at
  FROM activity_interactions
  WHERE interaction_type = 'like';
```
- Supabaseのマイグレーションは `supabase/migrations/00x_*.sql` に追加。ENUMは `CREATE TYPE` → マイグレーション後の `ALTER TYPE ... ADD VALUE` で拡張。

### 3.4 インデックス・ビュー・マテリアライゼーション
- **インデックス指針**
  - `activity_interactions(account_id, created_at DESC)`: タイムライン表示用。
  - `form_submissions(activity_id, created_at DESC)` と `form_submissions(status)`。
  - `recommendation_items(run_id, rank)`。
  - `chat_messages(session_id, created_at)` のBTREE。
- **部分インデックス**
  - `activity_interactions` で `interaction_type IN ('like','bookmark','ai_save')` のユニーク制約。
  - `vouchers` で `valid_until IS NULL OR valid_until >= now()` の参照最適化。
- **マテリアライズドビュー**
  - `materialized_view latest_activity_likes` を `REFRESH MATERIALIZED VIEW CONCURRENTLY` で更新。
  - Supabaseスケジューラ（cron）で10分ごとに更新し、APIレスポンス改善。
- **互換ビュー**
  - `legacy_activity_likes` を `activity_interactions` から生成し、旧コードが `activity_likes` を参照しても動作するようにする（A-0移行完了後に削除予定）。

### 3.5 トリガー・システム関数
- `set_updated_at()` トリガーを `accounts`, `activities`, `articles`, `article_translations` などに付与。
- `set_account_id_from_linkage()` を `activity_interactions`, `form_submissions` など `account_id` 自動補完対象テーブルに適用。
- `enforce_voucher_scan_limit()` を `voucher_redemptions` 挿入前に実行し、`max_redemptions` を超えた場合はエラー。
- 監査は `log_audit_event()` をトリガーで呼び出し、`audit_events` に追記。サービスロール使用時は `current_setting('request.jwt.claims', true)` から操作者を解決。

### 3.6 パーティショニングと拡張性
- 初期段階では単一テーブル。トラフィック増加時に以下を検討:
  - `activity_interactions` を `created_at` 月単位でハッシュ->レンジ複合パーティション。
  - `chat_messages` を `session_id` ハッシュパーティション。
  - `audit_events` を `created_at` 範囲でベースパーティション化。
- `articles` / `article_translations` は公開件数が増加した際、`status` × `published_at` で月次パーティショニングし、古いドラフトはアーカイブテーブルに退避する運用も想定。
- `recommendation_items` のembedding列（必要時）は `VECTOR(1536)` を追加し、`ivfflat` インデックスを `ANALYZE` 後に作成。

### 3.7 マイグレーションとデータ移行
- **段階的リリース**
  1. `Phase 0`: 新テーブル・ENUMを追加、既存APIは旧テーブル参照。
  2. `Phase 1`: Dual write（既存 + 新 `activity_interactions`）を導入。
  3. `Phase 2`: 読み取り先を切替、移行完了後に旧テーブルをViewへ変換。
- **データ移行戦略**
  - Supabase SQL エディタまたは `supabase db remote commit` でバッチ移行。
  - 大量データは `COPY` コマンド + 一時テーブルで検証後にマージ。
  - `scripts/backfill_account_linkages.sql` を適用し、`account_linkages` と `account_metadata` の欠損を埋めてから A-0/A-1 のデータ移行を実施。
  - 記事コンテンツは `scripts/migrate_articles_to_db.ts`（新規）で MDX → `articles` へ投入し、結果を `article_versions` にも保存。移行後は Git と DB の差分を nightly ジョブで検証し、完全移行後に Git 側を参照専用化する。

---

## 4. 運用設計 (Operational Design)

### 4.1 環境構成とリリースフロー
- **環境**: `dev` (branch) → `staging` → `production` の3段階。`dev` は開発者ごとの Supabase branch を想定。
- **マイグレーション管理**: Git管理のSQLファイルを `npm run db:migrate`（ラッパー）で適用。CIで `supabase db lint` を実行し、未適用マイグレーションを検知。
- **機能トグル**: `account_metadata.flags` や `system_settings` テーブルでローリングリリースを制御。
- **記事公開フロー**: CMS から `articles` を更新 → Supabase で `status='published'` へ遷移 → Vercel Webhook で ISR を再生成。緊急ロールバック時は直近の `article_versions` を復元し再度 publish する。

### 4.2 バックアップ & リストア
- **自動バックアップ**: Supabase の PITR を利用（保持期間7〜30日）。重要リリース前に手動スナップショットを取得。
- **論理バックアップ**: 週次で `pg_dump --schema=public --file=backups/<date>.sql` を CI から Cloud Storage へ保存。
- **リストア手順**
  1. 影響範囲を特定し、必要なら専用branchへリストアして検証。
  2. 本番復旧時は read-only モード（Cloudflare / Edge Middleware）でトラフィック制御。
  3. 復旧後に `audit_events` を確認し、二重処理を手動で補正。

### 4.3 権限・RLS運用
- RLSポリシーは `supabase/migrations` に含め、`npm run lint:rls` (スクリプト) でポリシーの有無を検証。
- 新規テーブル追加時は「サービスロール」「ユーザーロール」「ベンダーロール」3種類のポリシーを必須チェック項目に設定。
- パブリックAPIで参照可能なビューは `SECURITY INVOKER` を付与し、特権エスカレーションを防止。
- 記事系テーブルでは `articles.status='published'` のみ PUBLIC SELECT を許可し、それ以外は `role = 'editor'` のJWTクレームを持つアカウントに限定する。`article_versions` は監査用途でサービスロール読取のみ許容。

### 4.4 モニタリング & アラート
- Supabaseの `Logs Explorer` で `conn_timeout`, `database_error` を監視。臨界閾値は 5分間に5件以上。
- Cloud Logging（または Datadog）と連携し、以下をアラート条件に設定:
  - `form_submissions` でINSERT失敗が連続3回以上。
  - `recommendation_runs` の `status='failed'` が1時間で3件以上。
  - `voucher_redemptions` で `enforce_voucher_scan_limit` エラーが急増した場合。
- 定期ジョブ: `REFRESH MATERIALIZED VIEW latest_activity_likes`、`vacuum analyze` を週次で実行。

### 4.5 データ品質と運用タスク
- 月次で `activity_interactions` の孤児レコード（`activity_id` 不存在）を検出し、レポートを生成。
- `quiz_sessions` と `quiz_results` の不整合（完了していないセッション）をバッチで補正。
- 運用Runbookに「QRコード再発行」「ベンダー紐付け」の手順を明記し、CSチームが対応できるようにする。
- Dual write 期間中は `legacy_activity_likes` と `activity_interactions` の差分チェック（例: LEFT JOIN で不一致検出）を週次実施し、移行漏れを防ぐ。
- `articles` / `article_translations` の公開件数・ステータスをダッシュボード化し、未レビューのドラフトが一定期間放置されていないかを確認する。

---

## 5. ドキュメント設計 (Documentation Design)

### 5.1 維持すべき成果物
- **データディクショナリ**: 本ドキュメントの論理/物理セクションをベースに Notion または Supabase Docs へ要約版を展開。
- **マイグレーションログ**: `docs/CHANGELOG_DB.md` を新設し、各マイグレーションの目的・影響範囲・ロールバック方法を記録。
- **API 契約書**: `/api/*` の入出力と参照テーブルを `docs/features` に紐付け。特に `form-submissions`, `recommend`, `likes` は必須。
- **記事運用Runbook**: `docs/operations/ARTICLE_WORKFLOW.md` を作成し、記事作成→レビュー→公開→ロールバックの手順と権限を明文化。

### 5.2 運用Runbook
- バックアップ復旧、RLS更新、ENUM追加、Supabase branch 切替などの手順を `docs/operations/DB_RUNBOOK.md` に集約。
- 重大インシデント（データ欠損、RLS誤設定）時の連絡先と意思決定フローを明文化。

### 5.3 変更管理プロセス
1. 仕様変更チームが Issue でスキーマ修正案を提出（テンプレート化）。
2. 本ドキュメントの該当セクションを更新し、レビューで承認後にマイグレーションを実装。必要に応じて `docs/refactoring/20251111-refactoring-plan.md` のロードマップと整合させる。
3. PR には `Prompt:` とともに `DB Impact` チェックリスト（マイグレーション／RLS／バックアップ確認）を添付。
4. リリース後は `CHANGELOG_DB.md` に記録し、Slack #tabinaka-media-architecture で共有。

### 5.4 継続的な整備
- 四半期ごとに ER 図（dbdiagram など）を再生成し、最新状態を追跡。
- 自動生成ドキュメント（`supabase inspect` 出力）を GitHub Actions で nightly 更新し、差分通知を受け取る。
- ユーザー向け／ベンダー向けの統計ダッシュボードとDB構造の連携を整理し、Looker Studio など BI ツールのメタデータも同期させる。

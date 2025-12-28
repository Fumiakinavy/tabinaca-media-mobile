---
title: Data Dictionary
description: "tabinaka-media データベース主要テーブルのカラム意味一覧"
last_updated: 2025-11-12
owner: data-team
---

# Data Dictionary

`docs/database_design.md` の論理設計に基づき、主要テーブルおよび代表的なENUMのカラム仕様を整理しています。Supabase(PostgreSQL 15)を前提とした記述です。

## Identity & Session

### `accounts`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | アカウントの一意識別子 | PK, `gen_random_uuid()` |
| `status` | `account_status` | アカウント状態 (`active/suspended/deleted`) | RLS判定にも利用 |
| `onboarding_state` | JSONB | 初期設定やクイズ導線の進捗 | デフォルト `{}` |
| `created_at` | TIMESTAMPTZ | 作成日時 | `DEFAULT now()` |
| `updated_at` | TIMESTAMPTZ | 最終更新日時 | トリガーで自動更新 |

### `account_linkages`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `account_id` | UUID | `accounts.id` へのFK | PK一部, `ON DELETE CASCADE` |
| `supabase_user_id` | UUID | Supabase `auth.users.id` | NULL可, UNIQUE |
| `provider_type` | TEXT | 認証/識別ソース (`supabase`, `guest_cookie`, `line` 等) | PK一部 |
| `linked_at` | TIMESTAMPTZ | 紐付け日時 | `DEFAULT now()` |
| `metadata` | JSONB | プロバイダー固有情報 | デフォルト `{}` |

### `account_profiles`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `account_id` | UUID | アカウントFK (1:1) | PK兼FK |
| `display_name` | TEXT | 表示名 |  |
| `locale` | TEXT | UI言語 (`en`, `ja`) | インデックス候補 |
| `timezone` | TEXT | タイムゾーン (IANA) |  |
| `demographics` | JSONB | 年代/国籍など |  |
| `preferences` | JSONB | 通知設定等 |  |
| `updated_at` | TIMESTAMPTZ | 更新日時 | トリガー管理 |

### `account_metadata`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `account_id` | UUID | アカウントFK (1:1) | PK兼FK |
| `quiz_state` | JSONB | 最新Travel Typeクイズ結果+推薦 | キャッシュ用途 |
| `last_synced_at` | TIMESTAMPTZ | クライアント同期日時 | NULL可 |
| `flags` | JSONB | フィーチャーフラグ/ベータ登録等 |  |

## Experience Catalog

### `activities`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | 体験マスタID | PK |
| `slug` | TEXT | 公開用スラッグ | UNIQUE |
| `title` | TEXT | 表示タイトル | 必須 |
| `summary` | TEXT | 概要 |  |
| `description` | TEXT | 詳細文 (短文) |  |
| `status` | `activity_status` | 公開状態 (`draft/published/archived`) |  |
| `activity_type` | `activity_type` | 体験タイプ (`company_affiliated` 等) |  |
| `location_id` | UUID | 位置情報テーブルFK (任意) |  |
| `google_place_id` | TEXT | Google Places ID |  |
| `duration_minutes` | INTEGER | 所要時間 |  |
| `price_tier` | TEXT | 価格帯/割引表示 |  |
| `metadata` | JSONB | 補助データ (SNSリンク等) | `{}` |
| `is_active` | BOOLEAN | 現行互換の掲載フラグ | デフォルト `false` |
| `created_at` | TIMESTAMPTZ | 作成日時 | `DEFAULT now()` |
| `updated_at` | TIMESTAMPTZ | 更新日時 | トリガー |

### `activity_categories`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | カテゴリID | PK |
| `slug` | TEXT | 公開用スラッグ | UNIQUE |
| `name` | TEXT | カテゴリ名 |  |
| `description` | TEXT | 説明 | NULL可 |
| `parent_id` | UUID | 階層構造用FK | `ON DELETE SET NULL`想定 |
| `is_active` | BOOLEAN | 掲載可否 |  |
| `created_at` | TIMESTAMPTZ | 作成日時 |  |

### `activity_category_map`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `activity_id` | UUID | 体験ID | PKの一部 |
| `category_id` | UUID | カテゴリID | PKの一部 |

### `activity_tags`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | タグID | PK |
| `slug` | TEXT | タグスラッグ | UNIQUE |
| `name` | TEXT | 表示名 |  |
| `color` | TEXT | UI用カラーコード |  |
| `is_active` | BOOLEAN | 利用可否 |  |
| `created_at` | TIMESTAMPTZ | 作成日時 |  |

### `activity_tag_map`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `activity_id` | UUID | 体験ID | PKの一部 |
| `tag_id` | UUID | タグID | PKの一部 |

### `activity_assets`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | アセットID | PK |
| `activity_id` | UUID | 紐付く体験 | FK |
| `asset_type` | `asset_type` | `image/video/document/qr_coupon` | ENUM |
| `url` | TEXT | Cloudinary等のURL |  |
| `metadata` | JSONB | 代替テキスト/順序など | `{}` |
| `is_primary` | BOOLEAN | メインビジュアル指定 |  |
| `created_at` | TIMESTAMPTZ | 作成日時 |  |

### `activity_locations` *(オプション)*
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | ロケーションID | PK |
| `name` | TEXT | 施設名 |  |
| `address` | TEXT | 住所 |  |
| `latitude` | NUMERIC | 緯度 |  |
| `longitude` | NUMERIC | 経度 |  |
| `maps_url` | TEXT | Google Mapsリンク |  |
| `timezone` | TEXT | タイムゾーン |  |

## Engagement & Social

### `activity_interactions`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | インタラクションID | PK |
| `account_id` | UUID | 行動したアカウント | FK |
| `activity_id` | UUID | 対象体験 (NULL可) | FK |
| `activity_slug` | TEXT | 体験スラッグ (冗長保持) | 非NULL |
| `interaction_type` | `interaction_type` | 行動種別 (`like/bookmark/...`) |  |
| `source_type` | `interaction_source_type` | 行動発生元 (`quiz/recommendation/...`) | NULL可 |
| `source_id` | UUID | 発生元ID (クイズ結果等) | NULL可 |
| `score_delta` | INTEGER | レコメンド評価値 | NULL可 |
| `metadata` | JSONB | デバイス/位置等 | `{}` |
| `created_at` | TIMESTAMPTZ | 作成日時 |  |
| `updated_at` | TIMESTAMPTZ | 更新日時 |  |

### `activity_likes` *(互換ビュー想定)*
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | 旧`activity_likes.id` | `legacy_view` 予定 |
| `account_id` | UUID | アカウントID |  |
| `activity_slug` | TEXT | 体験スラッグ |  |
| `user_id` | UUID | 旧SupabaseユーザーID | 廃止予定 |
| `created_at` | TIMESTAMPTZ | 作成日時 |  |

### `reviews` *(将来)*
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | レビューID | PK |
| `activity_id` | UUID | 体験ID | FK |
| `account_id` | UUID | 投稿アカウント | FK |
| `rating` | INTEGER | 評価値 |  |
| `comment` | TEXT | コメント |  |
| `source` | TEXT | `google` or `manual` |  |
| `submitted_at` | TIMESTAMPTZ | 投稿日時 |  |

## Booking & Fulfillment

### `form_submissions`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | フォーム送信ID | PK |
| `activity_id` | UUID | 紐付く体験ID | FK |
| `experience_slug` | TEXT | 体験スラッグ |  |
| `experience_title` | TEXT | 体験タイトル (冗長) |  |
| `account_id` | UUID | 送信者アカウント (任意) | NULL可 |
| `email` | TEXT | 連絡用メール | 必須 |
| `phone_number` | TEXT | 電話番号 | NULL可 |
| `first_name` | TEXT | 名 | NULL可 |
| `last_name` | TEXT | 姓 | NULL可 |
| `country` | TEXT | 居住国 | NULL可 |
| `nationality` | TEXT | 国籍 | NULL可 |
| `visit_purposes` | TEXT[] | 訪問目的 (複数) | NULL可 |
| `stay_duration` | TEXT | 滞在期間 | NULL可 |
| `travel_issues` | TEXT[] | 旅行課題 | NULL可 |
| `how_found` | TEXT | 認知経路 | NULL可 |
| `how_found_other` | TEXT | 認知その他自由記述 | NULL可 |
| `mode` | TEXT | フォーム種別 (`unified` 等) | NULL可 |
| `agree_to_terms` | BOOLEAN | 規約同意 | 必須 |
| `booking_id` | TEXT | 表示用予約ID (`booking_${id}`) |  |
| `coupon_code` | TEXT | クーポンコード | NULL可 |
| `booking_date` | DATE | 来店予定日 | NULL可 |
| `status` | `booking_status` | 予約ステータス (`pending/confirmed/...`) | デフォルト`pending` |
| `scans_used` | INTEGER | QR利用回数 | デフォルト`0` |
| `max_scans` | INTEGER | 上限利用回数 | デフォルト`3`想定 |
| `qr_code_data` | JSONB | 生成済みQR情報 | NULL可 |
| `user_agent` | TEXT | UA文字列 | NULL可 |
| `ip_address` | TEXT | 送信IP | NULL可 |
| `referrer` | TEXT | 参照元URL | NULL可 |
| `created_at` | TIMESTAMPTZ | 作成日時 |  |
| `updated_at` | TIMESTAMPTZ | 更新日時 |  |

### `vouchers`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | バウチャーID | PK |
| `form_submission_id` | UUID | 対応フォーム送信 | FK |
| `voucher_code` | TEXT | クーポンコード | UNIQUE |
| `qr_token` | TEXT | QR用トークン | NULL可 |
| `valid_from` | TIMESTAMPTZ | 有効開始日時 | NULL可 |
| `valid_until` | TIMESTAMPTZ | 有効期限 | NULL可 |
| `max_redemptions` | INTEGER | 使用可能回数 | 必須 |
| `redemptions_used` | INTEGER | 使用済み回数 | 必須 |
| `metadata` | JSONB | 追加条件 | `{}` |
| `created_at` | TIMESTAMPTZ | 作成日時 |  |

### `voucher_redemptions`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | 取引ID | PK |
| `voucher_id` | UUID | バウチャーFK | FK |
| `vendor_member_id` | UUID | スキャン担当者 | NULL可 |
| `scan_context` | JSONB | 端末/位置等 | `{}` |
| `scanned_at` | TIMESTAMPTZ | スキャン日時 |  |

## Personalization & AI

### `quiz_forms`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | クイズフォームID | PK |
| `version` | INTEGER | バージョン番号 |  |
| `definition` | JSONB | 質問定義 |  |
| `published` | BOOLEAN | 公開フラグ |  |
| `created_at` | TIMESTAMPTZ | 作成日時 |  |

### `quiz_sessions`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | セッションID | PK |
| `account_id` | UUID | 受検アカウント | FK |
| `quiz_form_id` | UUID | フォームID | FK |
| `status` | `quiz_session_status` | 進行状態 | デフォルト`in_progress` |
| `started_at` | TIMESTAMPTZ | 開始日時 | `DEFAULT now()` |
| `completed_at` | TIMESTAMPTZ | 完了日時 | NULL可 |
| `location_permission` | BOOLEAN | 位置情報許諾 | NULL可 |
| `metadata` | JSONB | 端末情報など | `{}` |

### `quiz_answers`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | 回答ID | PK |
| `session_id` | UUID | セッションFK | FK |
| `question_ref` | TEXT | 質問リファレンス |  |
| `answer_value` | TEXT | 選択/自由回答値 |  |
| `answered_at` | TIMESTAMPTZ | 回答日時 |  |

### `quiz_results`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | 結果ID | PK |
| `session_id` | UUID | セッションFK | FK |
| `account_id` | UUID | アカウントFK | FK |
| `result_type` | `quiz_result_type` | 結果種別 (`travel_type` 等) |  |
| `travel_type_code` | TEXT | 旅行タイプコード (`GRLP` 等) | NULL可 |
| `travel_type_payload` | JSONB | 結果メタデータ | NULL可 |
| `recommendation_snapshot` | JSONB | 生成時の推薦結果 | NULL可 |
| `created_at` | TIMESTAMPTZ | 生成日時 |  |

### `recommendation_runs`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | レコメンド実行ID | PK |
| `account_id` | UUID | 対象アカウント | FK |
| `trigger` | `recommendation_trigger` | 実行トリガー (`quiz_result` 等) |  |
| `input_payload` | JSONB | 入力パラメータ | `{}` |
| `model_metadata` | JSONB | モデル設定 | NULL可 |
| `status` | `job_status` | 実行状態 |  |
| `created_at` | TIMESTAMPTZ | キュー時刻 |  |
| `completed_at` | TIMESTAMPTZ | 完了時刻 | NULL可 |

### `recommendation_items`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | 推薦アイテムID | PK |
| `run_id` | UUID | 実行ID | FK |
| `activity_id` | UUID | 紐付く体験 | NULL可 |
| `place_id` | TEXT | Google Places ID | NULL可 |
| `rank` | INTEGER | 表示順位 | 必須 |
| `score` | NUMERIC | スコア | NULL可 |
| `presentation_payload` | JSONB | UI表示用メタ | `{}` |
| `presented_at` | TIMESTAMPTZ | 表示日時 | NULL可 |
| `clicked_at` | TIMESTAMPTZ | クリック日時 | NULL可 |
| `dismissed_at` | TIMESTAMPTZ | 閉じた日時 | NULL可 |

### `chat_sessions`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | チャットセッションID | PK |
| `account_id` | UUID | 参加アカウント | FK |
| `session_type` | `chat_session_type` | `assistant/vendor_support/system` |  |
| `state` | JSONB | 会話コンテキスト | `{}` |
| `started_at` | TIMESTAMPTZ | 開始 |  |
| `last_activity_at` | TIMESTAMPTZ | 最終アクティビティ |  |
| `closed_at` | TIMESTAMPTZ | 終了 | NULL可 |
| `metadata` | JSONB | ブラウザ/言語等 | `{}` |

### `chat_messages`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | メッセージID | PK |
| `session_id` | UUID | セッションFK | FK |
| `role` | TEXT | 役割 (`user/assistant/tool`) |  |
| `content` | TEXT | 本文 |  |
| `tool_calls` | JSONB | ツール呼び出しログ | NULL可 |
| `latency_ms` | INTEGER | 応答レイテンシ | NULL可 |
| `created_at` | TIMESTAMPTZ | 送信日時 |  |

### `generated_activities`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | 生成アクティビティID | PK |
| `chat_session_id` | UUID | 元チャットセッション | FK |
| `draft_slug` | TEXT | 仮スラッグ | UNIQUE候補 |
| `title` | TEXT | タイトル案 |  |
| `summary` | TEXT | サマリー |  |
| `body_mdx` | TEXT | MDX草案 |  |
| `source_place_id` | TEXT | 参照Google Place ID | NULL可 |
| `status` | `generated_activity_status` | `draft/approved/...` |  |
| `created_at` | TIMESTAMPTZ | 作成日時 |  |
| `updated_at` | TIMESTAMPTZ | 更新日時 |  |
| `metadata` | JSONB | プロンプト等 | `{}` |

### `generated_activity_saves`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | 保存レコードID | PK |
| `generated_activity_id` | UUID | 対象生成アクティビティ | FK |
| `account_id` | UUID | 保存したアカウント | FK |
| `source` | `generated_activity_save_source` | 保存経路 (`chat/recommendation/manual`) |  |
| `interaction_id` | UUID | `activity_interactions` 参照 (任意) | NULL可 |
| `metadata` | JSONB | UIバージョン等 | `{}` |
| `created_at` | TIMESTAMPTZ | 保存日時 |  |

## Vendor & Operations

### `vendors`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | ベンダーID | PK |
| `name` | TEXT | 店舗/企業名 |  |
| `contact_email` | TEXT | 連絡先メール | NULL可 |
| `contact_phone` | TEXT | 連絡先電話 | NULL可 |
| `metadata` | JSONB | 契約情報等 | `{}` |
| `created_at` | TIMESTAMPTZ | 登録日時 |  |

### `vendor_members`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | メンバーID | PK |
| `vendor_id` | UUID | 所属ベンダー | FK |
| `account_id` | UUID | アカウントID | NULL可 |
| `supabase_user_id` | UUID | SupabaseユーザーID | NULL可 |
| `role` | TEXT | 権限 (`admin/staff`) |  |
| `invited_at` | TIMESTAMPTZ | 招待日時 | NULL可 |
| `joined_at` | TIMESTAMPTZ | 参加日時 | NULL可 |
| `status` | TEXT | ステータス |  |

### `activity_vendor_map`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `activity_id` | UUID | 体験ID | PKの一部 |
| `vendor_id` | UUID | ベンダーID | PKの一部 |
| `relationship_type` | TEXT | 関係区分 (`owner/partner`) |  |

### `audit_events`
| Column | Type | Description | Notes |
| --- | --- | --- | --- |
| `id` | UUID | 監査イベントID | PK |
| `entity_type` | TEXT | 対象エンティティ種別 | 例: `activity` |
| `entity_id` | TEXT | 対象ID (UUID/文字列) |  |
| `event_type` | TEXT | イベント種別 (`created/qr_scanned` 等) |  |
| `performed_by` | UUID | 操作者ID | `accounts` or `vendor_members` |
| `payload` | JSONB | 変更内容 | `{}` |
| `created_at` | TIMESTAMPTZ | 発生日時 |  |

## ENUM定義サマリ

| Enum | 値 | 説明 |
| --- | --- | --- |
| `account_status` | `active`, `suspended`, `deleted` | アカウント状態 |
| `activity_status` | `draft`, `published`, `archived` | 活動公開状態 |
| `activity_type` | `company_affiliated`, `shibuya_pass`, `partner_store` | 体験区分 |
| `interaction_type` | `like`, `bookmark`, `view`, `share`, `book`, `qr_scan`, `ai_save` | ユーザー行動種別 |
| `interaction_source_type` | `manual`, `quiz`, `recommendation`, `chat`, `migration` | 行動発生元 |
| `asset_type` | `image`, `video`, `document`, `qr_coupon` | アセット種別 |
| `booking_status` | `pending`, `confirmed`, `redeemed`, `cancelled` | 予約ステータス |
| `quiz_session_status` | `in_progress`, `completed`, `abandoned` | クイズ進捗 |
| `quiz_result_type` | `travel_type`, `destination_cluster` | クイズ結果種別 |
| `recommendation_trigger` | `quiz_result`, `chat_prompt`, `manual`, `cron` | レコメンド起動要因 |
| `job_status` | `queued`, `processing`, `ready`, `failed` | 処理状態 |
| `chat_session_type` | `assistant`, `vendor_support`, `system` | チャットセッション種別 |
| `generated_activity_status` | `draft`, `approved`, `rejected`, `published` | 生成体験ステータス |
| `generated_activity_save_source` | `chat`, `recommendation`, `manual` | 保存経路 |

## 備考
- RLSポリシーは `docs/database_design.md` 2.6節の叩き台を参照してください。
- JSONB列はキー構造をNotionドキュメントと連携して管理します。
- 今後の拡張（例: `recommendation_items` の embedding 列）はマイグレーション時に本辞書へ追記します。







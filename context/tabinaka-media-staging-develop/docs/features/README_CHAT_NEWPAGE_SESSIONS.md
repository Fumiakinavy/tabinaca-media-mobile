# Chat NewPage + 過去セッション閲覧 設計計画

## 1. 目的
- チャット体験に「New Page」ボタンを追加し、異なる旅行テーマをパラレルに進められるようにする。
- 過去チャットをデバイス横断で一覧・再開できるようにし、再現性の高いリコメンドナレッジを提供する。
- サーバー側でチャット履歴を正規化し、レコメンド／生成アクティビティとのトレースを確立する。

## 2. 現状整理 (As-Is)
1. `pages/chat/index.tsx` と `components/ChatInterface.tsx` は単一セッション前提で、クライアントメモリに履歴を保持しているためリロードや別端末で状態が失われる。
2. `pages/api/chat/send-message.ts` は `conversationHistory` をリクエストボディで受け取り OpenAI プロンプトを組み立てる。Supabase の `chat_sessions` / `chat_messages` には書き込んでいない。
3. Supabase には `supabase/migrations/20250113000001_create_new_schema.sql` で `chat_sessions` / `chat_messages` / `generated_activities` が定義済みだが、タイトルや要約を持つ列が存在せず UI に必要なメタ情報が足りない。
4. 過去セッションを閲覧する UI や API が存在しないため、「New Page」ボタンを追加してもサーバー側で文脈を切り替える手段がない。

## 3. ユースケース
- 旅行者が「京都食べ歩き」と「札幌雪祭り準備」を同時に検討し、`New Page` でスレッドを分ける。
- 過去に取得したレコメンドを再確認して保存／共有するため、1ヶ月前のセッションを呼び出す。
- スタッフが不具合調査のために該当ユーザーのセッションを参照する。（将来の `session_type='vendor_support'` にもつながる設計。）
- 複数デバイス（PC とモバイル）で同じ Supabase アカウントにログインし、一貫したチャットログを扱う。

## 4. 機能要件
### 4.1 「New Page」操作
- ヘッダーまたはチャット左ペインに常設ボタンを配置。押下時に空の `chat_sessions` レコードを作成し、レスポンスで返却された `session_id` をクエリパラメータ `?session=<uuid>` にセットして `/chat` を再描画する。
- 新規セッションは `title` を暫定的に「New chat」へ設定し、最初のユーザー発話を受信した段階でタイトルと概要を更新する。

### 4.2 セッション履歴一覧
- 直近 30 セッションを降順で取得し、左ペイン／モバイルのシートで表示。各カードには `title`, `last_activity_at`, `summary_preview`（後述の要約テーブルから 80 文字程度）を表示する。
- 無限スクロールまたは「もっと見る」ボタンでページネーション（`cursor=last_activity_at`）に対応する。
- 検索（タイトル全文検索）は将来対応。MVP では日付グルーピング（今日／今週／過去）まで。

### 4.3 セッション再開
- セッションを選択すると `/chat?session=<uuid>` を push。初期ロードで `GET /api/chat/sessions/:id/messages?limit=50` を呼び、最新 50 件を UI に描画する。
- `ChatInterface` は `sessionId` を props で受け取り、メッセージ送信時に `POST /api/chat/send-message` へ `sessionId` を必須で送信する。
- 追加読み込み（スクロールバック）では `before=<oldest_created_at>` で過去メッセージを取得する。

### 4.4 データ整合性
- すべての書き込みは Supabase Row Level Security（RLS）を通し、`account_id = auth.uid()` の一致を必須にする。
- 1 セッションあたりのメッセージは最大 500 通（暫定）。閾値を超えた場合は古いものから `chat_session_summaries` に圧縮し、`chat_messages` から削除するアーカイブバッチを別途検討する。

### 4.5 非機能要件
- `GET /api/chat/sessions` は 200 ms 以内、`POST /api/chat/send-message` は既存 SLA（P95 < 6 秒）を維持。Redis キャッシュ（`lib/cache.ts`）はセッション ID をキーに含める。
- i18n は `title`/`summary` を多言語化しない（ユーザー発話の言語のまま保存）。
- GA4 に `chat_session_created`, `chat_session_switch`, `chat_session_resume` をイベント追加。

## 5. UX/画面案
- **デスクトップ**: 左 320px サイドバー（セッションリスト + New Page ボタン）、右ペインで従来のチャット／地図レイアウトを維持。`New Page` 押下でリスト先頭に新規セッションが即座に挿入され、右ペインは空メッセージ状態に切り替える。
- **モバイル**: ヘッダー内に `New Page` ボタンを設置。過去セッションは FAB から呼び出すフルスクリーンシートに表示し、タップでチャット画面に戻す。
- **状態同期**: URL クエリに `session` が存在しない場合、最新セッションを自動選択する。存在するがアクセス不可（他人）なら 404 表示を返す。

## 6. API / サーバー構成
| Method | Path | 役割 |
|--------|------|------|
| `POST` | `/api/chat/sessions` | 空セッションを作成。`title`, `session_type`, `metadata.device` を設定し ID を返す。|
| `GET` | `/api/chat/sessions` | クエリ `limit`, `cursor` でログイン中アカウントのセッション一覧を取得。|
| `GET` | `/api/chat/sessions/:id/messages` | セッション内メッセージをページング取得。`before` / `after` をサポート。|
| `PATCH` | `/api/chat/sessions/:id` | タイトル変更、`closed_at` 更新、`state` 更新をまとめて行う。|
| `POST` | `/api/chat/send-message` | 既存ハンドラーに `sessionId` 必須化。履歴はサーバー側で `chat_messages` から取得する。|
| `POST` | `/api/chat/sessions/:id/summary` (内部/ジョブ) | 最新要約とプレビュー生成用のワーカー Webhook。|

### サーバー側フロー変更
1. `sessionId` を受け取り、`accounts` + `chat_sessions` の突合で権限を確認する。
2. ユーザー発話を `chat_messages` に即時挿入し、`sequence` を採番。
3. `chat_messages` から直近 40 件を取り出し、プロンプトを構築。必要に応じ `chat_session_summaries.summary` を加える。
4. OpenAI からのレスポンスを `chat_messages` に保存し、`chat_sessions.last_activity_at` を更新。
5. 非同期で `chat_session_summaries` 更新ジョブと `generated_activities` 連携をトリガーする。

## 7. データベース設計
### 7.1 ER 概要
```
accounts (1) ── (N) chat_sessions (1) ── (N) chat_messages
chat_sessions (1) ── (0..1) chat_session_summaries
chat_sessions (1) ── (N) generated_activities (既存)
```

### 7.2 `chat_sessions` テーブル拡張
| カラム | 型 | 必須 | 説明 |
|--------|----|------|------|
| `id` | UUID | ✅ | PK |
| `account_id` | UUID | ✅ | `accounts.id` FK |
| `session_type` | `chat_session_type` | ✅ | `assistant` デフォルト。将来サポート窓口にも再利用。|
| `title` | TEXT | ✅ | 新規追加。最大 80 文字。初期値 `New chat`。|
| `state` | JSONB | ✅ | UI 状態（選択中のカード等）を格納。|
| `started_at` | TIMESTAMPTZ | ✅ | 生成時刻 |
| `last_activity_at` | TIMESTAMPTZ | ✅ | 最終メッセージ時刻。インデックス対象。|
| `closed_at` | TIMESTAMPTZ |  | セッションをアーカイブする際に設定。|
| `metadata` | JSONB | ✅ | `{"device":"web","source":"new_page"}` 等を保存。|

**インデックス**: `(account_id, last_activity_at DESC)` で一覧取得を最適化。`title` に対して `GIN (to_tsvector('simple', title))` を追加し全文検索に備える。

### 7.3 `chat_messages`
| カラム | 型 | 必須 | 説明 |
|--------|----|------|------|
| `id` | UUID | ✅ | PK |
| `session_id` | UUID | ✅ | `chat_sessions.id` FK |
| `sequence` | INT | ✅ | 新規追加。`session_id` 内で連番 (`UNIQUE`).|
| `role` | TEXT | ✅ | `user/assistant/tool/system` を許容する CHECK を追加。|
| `content` | TEXT | ✅ | Markdown を含む本文。|
| `tool_calls` | JSONB |  | 関数実行結果 (既存) |
| `latency_ms` | INT |  | AI 応答時間。|
| `metadata` | JSONB |  | 新規追加。UI フラグ、place_id リンク等。|
| `created_at` | TIMESTAMPTZ | ✅ | 生成時刻。|

**インデックス**: `(session_id, sequence)`（主用途）と `(session_id, created_at)`。`sequence` により安定した順序を保証する。

### 7.4 `chat_session_summaries`（新設）
| カラム | 型 | 必須 | 説明 |
|--------|----|------|------|
| `session_id` | UUID | ✅ | PK, `chat_sessions.id` FK |
| `summary` | TEXT | ✅ | 512 文字以内の最新要約。UI プレビューに使用。|
| `title_suggestion` | TEXT |  | AI が生成した推奨タイトル。ユーザーが手動で上書きした場合は `NULL`。|
| `last_message_excerpt` | TEXT |  | 直近発話 1 件を 120 文字で保存。|
| `tags` | TEXT[] |  | 地域やテーマを付与（任意）。|
| `updated_at` | TIMESTAMPTZ | ✅ | 要約の更新時刻。|

### 7.5 参考 DDL
```sql
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'New chat';

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS sequence INT GENERATED BY DEFAULT AS IDENTITY,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS chat_session_summaries (
  session_id UUID PRIMARY KEY REFERENCES chat_sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  title_suggestion TEXT,
  last_message_excerpt TEXT,
  tags TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_session_sequence_idx
  ON chat_messages(session_id, sequence);
```

### 7.6 RLS ポリシー
- `chat_sessions`: `using (account_id = auth.uid())`, `with check (account_id = auth.uid())`。
- `chat_messages`: `session_id` 経由で `chat_sessions.account_id` を参照する SECURITY DEFINER ビューを作るか、サブクエリでチェック。
- `chat_session_summaries`: `session_id` を介した同様の RLS を適用。

## 8. 実装ステップ
1. **DB & Supabase 準備**: 追加列と `chat_session_summaries` 作成、RLS の調整、Edge Function/SQL テスト。
2. **API 層**: `/api/chat/sessions*` ルートを新設し、`pages/api/chat/send-message.ts` をセッション ID 前提に書き換える（既存 `conversationHistory` は後方互換のため当面オプション入力として残す）。
3. **フロント実装 (Web)**: `ChatInterface` を `sessionId` prop 化し、`ChatPage` にセッションリスト（React Query でフェッチ）と New Page ボタンを追加。状態管理には `zustand` か `useReducer` を用い、URL と同期させる。
4. **サマライザー & タイトル更新**: Assistant 応答保存後に `pages/api/chat/send-message.ts` から `POST /api/chat/sessions/:id/summary` を非同期で呼び、小さな Edge Function が `summary` / `title_suggestion` を生成する。失敗時は次メッセージでリトライ。
5. **QA / ログ**: `npm run lint`, `npm test`, Supabase ローカルで RLS テスト、E2E (Playwright) で「新規作成→送信→再開」フローを自動化。GA4 イベント送信も検証。

## 9. リスクと未解決事項
- **履歴サイズ**: 500 通超のセッションをどう圧縮するか。要約のみ残して詳細を別ストレージに移す案を検討。
- **同時編集**: 複数タブで同じセッションを操作した場合の競合。`last_activity_at` を `now()` で上書きするだけで十分か検証。
- **モバイル UI**: サイドバー UI が使えない画面幅でのセッション切り替え導線を詳細設計する必要がある。
- **旧 `chatbot_*` データ移行**: 新テーブルへ過去データをインポートする場合のスクリプトが未定義。必要なら `backup_chatbot_conversations` から移行タスクを追加。

## 10. テスト計画
- **API ユニット**: セッション作成・取得・権限違反を `pages/api/chat/sessions.test.ts`（新規）で網羅。
- **統合テスト**: Supabase テスト用キーで `POST /api/chat/send-message` を実行し、`chat_messages` に 2 レコード（user/assistant）が生成されることを確認。
- **UI E2E**: Playwright シナリオ「New Page クリック → テキスト送信 → ページ更新 → 同じ内容が表示される」を作成。
- **回帰**: 既存チャット機能（地図連携／function calling）がセッション分割で動作するかを確認し、GA4 イベント重複が無いかを見る。

## 11. 計測・運用
- Supabase の `realtime` チャネルを使った楽観的更新は現段階では不要。まずは API フェッチで十分かをモニタリング。
- Grafana/Logflare などで `chat_session_created` 数、平均セッション長、復帰率を可視化し、`New Page` 導入後のエンゲージメントを評価する。
- 失敗イベント（OpenAI エラー）時には `metadata.failure_reason` を `chat_sessions` に保持し、CS サポートが参照できるようにする。

## 12. 今後の拡張余地
- セッション名の手動変更、ピン留め、共有リンク生成。
- `session_type='vendor_support'` を用いた店舗サポートチャット統合。
- 過去セッション検索のための pgvector 埋め込み（`chat_session_summaries` に列を追加）と全文検索 UI。

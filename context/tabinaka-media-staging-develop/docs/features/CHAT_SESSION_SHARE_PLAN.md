# Chat Session Share Plan

## 背景
- チャットで得たリコメンドを他ユーザーや店舗と共有したい要望がある。
- New Page/過去セッション閲覧機能で会話がストックされるようになったため、共有導線を追加する余地が生まれた。
- プライバシー制御と有効期限を考慮しつつ、簡易なビューアーを提供する必要がある。

## 要件
1. ユーザーが任意のセッションで "Share" を実行すると、読み取り専用の共有リンクを発行できる。
2. 共有リンクは固有のトークンを持つ短縮URL（`/share/{token}`）で、公開範囲はリンクを知っている人のみ。
3. 共有ビューでは、アシスタント/ユーザーのメッセージとタイムスタンプ、推奨スポットを閲覧できる。
4. 共有を停止（無効化）/再発行できる UI を提供する。
5. 共有リンクを介したアクセス数や失効日時をログに保存する。

## アーキテクチャ
- 新テーブル `chat_session_shares` を追加。
  | カラム | 型 | 説明 |
  | --- | --- | --- |
  | `id` | UUID | PK |
  | `session_id` | UUID | `chat_sessions.id` FK |
  | `share_token` | TEXT | ランダム一意トークン（Base62 16桁） |
  | `share_url` | TEXT | 共有URL。Vercel URL で生成 |
  | `status` | enum(`active`,`revoked`) | 有効/無効 |
  | `expires_at` | TIMESTAMPTZ | 任意の有効期限（例: 30日）|
  | `created_at`/`revoked_at` | TIMESTAMPTZ | 作成/無効化日時 |

- API ルート
  1. `POST /api/chat/sessions/{id}/share` : 共有リンク発行。既存の active があれば再利用 or 再生成。
  2. `DELETE /api/chat/sessions/{id}/share` : 共有リンク失効。
  3. `GET /api/share/{token}` : 公開ビュー（SSR）でメッセージ履歴を表示。

- 公開ビュー
  - Next.js Route Handler で `share_token` を検索し、`chat_messages` と `chat_sessions` から必要な情報のみ（role, content, created_at, places）を返す。
  - 共有リンクにはアカウント情報を含めず、viewer 側で操作は不可。

## 実装ステップ
1. **DB**: 上記テーブルと status enum、RLS（session 所有者のみ管理可、公開ビューは token でアクセス）を追加。
2. **API**: share 作成/削除ハンドラーを `/api/chat/sessions/[sessionId]/share.ts` に実装し、`chatSessions` サービスに `createChatSessionShare` 等を追加。
3. **UI**: 3点メニューの Share を押すと、
   - active share が無ければ作成してクリップボードにURLをコピー。
   - 既に存在する場合はコピー or revoke を選択できるダイアログを表示。
4. **公開ページ**: `/share/[token].tsx` を作成し、サーバー側でトークンを検証後、読み取り専用のチャットログを SSR 表示。
5. **ロギング**: `share_access_logs` (token, ip, ua, accessed_at) を追加してアクセス数を把握。

## セキュリティ/制限
- トークンは推測困難なランダム文字列。
- 期限付き（デフォルト30日、延長可）。期限切れは `status=revoked`。
- セッション所有者が削除した場合は share も cascade delete。
- 共有ビューは閲覧専用で、追加 API 呼び出しを禁止。

## 未決事項
- 共有ビューで「保存」「地図表示」をどこまで許容するか。
- 共有リンクを QR 化する needs?（別チケット）。
- GA4 でのシェアアクセスイベント計測（tokenごと or aggregated）。

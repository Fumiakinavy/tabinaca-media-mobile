# Chat セッション共有リンクの対応タスク

## 現状
- 本番環境で「We could not create a share link.」が出るのは `POST /api/chat/sessions/{id}/share` に必要な `CHAT_SHARE_SECRET` または `ACCOUNT_TOKEN_SECRET` が設定されておらず、`lib/shareToken.ts` 内で例外が飛ぶため。
- 共有リンクの `shareUrl` は `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_BASE_URL` またはリクエストヘッダの `host` を使って構成されるので、正しいドメインが設定されていないと想定外の URL を返す可能性がある。

## 必須対応
1. 本番の環境変数に `CHAT_SHARE_SECRET`（または既存の `ACCOUNT_TOKEN_SECRET`）を追加し、30 日有効な共有トークン生成が通ること。
2. `NEXT_PUBLIC_SITE_URL` か `NEXT_PUBLIC_BASE_URL` のいずれかに本番ドメイン（例：`https://tabinaka-media.jp`）を設定して、`shareUrl` にドメイン付きの URL が返るようにする。
3. 設定を適用した後、`POST /api/chat/sessions/{id}/share` を本番で手動確認し、ステータス 200 / `shareUrl` の整合性 / エラーログをチェックする。

## 追加確認
- 共有トークン生成に失敗した場合のログを運用側で監視（`CHAT_SHARE_SECRET or ACCOUNT_TOKEN_SECRET must be set` など）。
- 今後の deploy 時に環境変数が上書きされたり漏れたりしないよう、デプロイ手順書に環境変数一覧を追記。


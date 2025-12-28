# 📁 Archived: いいね機能の旧実装メモ

この文書は 2023 年時点の likes API（`is_liked` / `like_count` RPC ベース）についてまとめた旧仕様メモです。  
現在の保存システムは `account_id` ベースに再構築されており、最新の設計・対処方針は以下を参照してください。

- `docs/features/save-system-recovery.md`
- `tests/likes.e2e.test.ts`（現行フロー向け E2E テスト）

## 旧仕様メモを参照する場合の注意点
- `activity_likes` は `account_linkages` との外部キー制約を持ち、token ベースの `account_id` 連携に移行しています。
- RPC 関連の手順（`like_count`, `is_liked`）は廃止済みです。旧内容は履歴確認用途に限定してください。
- 現在は `/api/likes/[slug]` と `/api/likes/user` の API が単一ソースとなっています。

### TODO
- `offline_likes` 関連の補助ユーティリティは未使用のため、後続タスクで削除もしくは完全アーカイブ対象。


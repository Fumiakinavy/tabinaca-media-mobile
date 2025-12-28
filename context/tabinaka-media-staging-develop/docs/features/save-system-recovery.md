# Save機能停止の原因と再設計方針（2025-11-11）

## 1. 事象と影響範囲
- 「保存」ボタン（`LikeButton`）経由で `/api/likes/[slug]` を叩くと 401 / 500 が返り、いいね情報を永続化できない。
- `LikedActivities` ページも同じ API を利用しているため、保存済み一覧が常に空、もしくは読み込みエラーになる。
- 失敗時 UI はロールバック＋アラート表示のため、ユーザーは保存操作そのものが出来なくなっている。

## 2. 現状フローの整理
1. クライアント側で `LikeButton` が Supabase セッションを取得し、Bearer トークン付きで API を呼ぶ。
2. `/api/likes/[slug]` は `resolveAccountId` で `account_id` を決定し、`activity_likes` テーブルへ INSERT/DELETE。
3. `resolveAccountId` は以下の依存により `account_id` 解決を行う。
   - `ACCOUNT_ID_COOKIE` / `ACCOUNT_TOKEN_COOKIE`（`/api/account/session` が発行）
   - `ACCOUNT_TOKEN_SECRET` によるトークン検証
   - Supabase service-role 経由で `account_linkages` テーブルを参照
4. Supabase 側では `activity_likes.account_id` が `account_linkages.account_id` に外部キー制約でぶら下がっている。

## 3. 調査で判明した問題点
### 3.1 account_linkages 未整備に起因する 401
- `account_linkages` に該当ユーザーのレコードが存在しない場合、`resolveAccountId` は `null` を返し API が常に `UNAUTHORIZED`。
- 既存ユーザーはバックフィルされておらず、`/api/account/link` もセッション失敗時には再実行されないため、恒久的に保存不可となる。

### 3.2 環境変数未設定でもダミー値で起動してしまう
- `SUPABASE_SERVICE_ROLE_KEY` / `ACCOUNT_TOKEN_SECRET` を欠いた状態でも `supabaseServer` がダミー値で初期化される。
- 結果として `supabase.auth.getUser()` や `.from('activity_likes')` が常にエラーとなり、API は 500 を返す。
- アプリは失敗を検知しても利用開始時に即座に落ちないため、障害が遅延発覚する。

### 3.3 account/session 失敗時の復旧ハンドリング不足
- `/api/account/session` が 500 を返すと `AccountProvider` の状態は `error` のまま固定化され、再試行が行われない。
- この状態では `/api/account/link` が実行されず、`account_linkages` は永遠に空のままになる。

### 3.4 ドキュメント・コードの齟齬
- `docs/implementation/README_LIKE_SYSTEM_FIX.md` など旧構成（RPCベース）を前提にした資料が残り、保守時の判断を阻害。
- `offline_likes` 関連のユーティリティが残っているが、現在のコードからは呼ばれていない。

## 4. 抜本的解決方針
1. **必須環境変数のフェイルファスト化**
   - `validateServerEnvironmentVariables` で欠損がある場合はサーバー起動を止める（`lib/supabaseServer.ts` で例外を投げる）。
   - `npm run check:env` により Staging / Production 両環境で必須変数を定期チェックする。
2. **accountセッションの自己修復**
   - `/api/account/session` 失敗時に UI へリトライ手段（バックオフ付き）を提供。（`AccountProvider` が指数バックオフで再試行するよう更新済み）
   - `resolveAccountId` 側でも Supabase ユーザーが特定できた場合は、その場で `account_linkages` を自動 upsert するフォールバックを導入。（実装済み）
3. **データ移行・ヘルスチェック整備**
   - バッチ / SQL スクリプトで既存ユーザーの `account_linkages` を再作成し、`activity_likes` の孤児レコードを検知・再紐付け。
   - CI で `/api/account/session`, `/api/account/link`, `/api/likes/[slug]` を順番に叩く統合テストを追加。
4. **監視とログの強化**
   - `resolveAccountId`・`/api/likes`・`/api/account/session` で失敗理由・発生ユーザーを構造化ログに出力。（要対応）
   - Datadog / Supabase ログで `UNAUTHORIZED`、`SELECT_DENIED` などのメトリクスを可視化。（要対応）
5. **ドキュメントと不要コードの整理**
   - 旧 RPC ベースのドキュメントを更新／アーカイブし、現行構成（account_id ベース）を一本化。
   - 未使用の `offline_likes` ユーティリティや、実装されていない保存系 API のダミーコードを棚卸し。

## 5. 直近の対応プラン（優先順）
1. Staging / Production の環境変数監視とバックフィル手順を実施。
   - `npm run check:env` で必須変数を監視し、欠損時はデプロイをブロックする。
   - Supabase コンソールで `scripts/backfill_account_linkages.sql` を実行し、既存テーブルから `account_linkages` を補完する。
2. `resolveAccountId` にフォールバック（linkage 自動生成）を実装し、`/api/account/session` のリトライを導入。（完了）
   - SendGrid が未セットの場合はフォーム送信が継続するよう必須環境変数から除外済み。
3. いいね保存の E2E テスト（ログイン → 保存 → 再取得）を作成。（`tests/likes.e2e.test.ts` で実装済み）
4. ドキュメント刷新と不要コードの削除／TODO 明示化。（旧ドキュメントをアーカイブ済み、残 TODO を注記）

## 6. 残リスク
- Supabase の schema がロールバックされると再発するため、マイグレーションの監視が必須。
- `account_id` ベースへ完全移行するまで、一部の古い端末ではローカルストレージのマイグレーションが未完了のまま残る可能性がある。
- `resolveAccountId` が自動 upsert することでレースコンディションが増えるため、データ整合性のテストが必要。



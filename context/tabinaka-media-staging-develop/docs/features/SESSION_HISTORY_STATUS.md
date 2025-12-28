# Session History Implementation Status (2025-11-19)

## 1. 実装済みの要素
1. **Supabaseスキーマ**
   - `chat_sessions` / `chat_messages` を活用し、`sessionId` ごとにコンテキストを永続化。
   - `DELETE /api/chat/sessions/:id` を追加し、セッション単位で削除可能。
2. **フェッチAPI**
   - `GET /api/chat/sessions` 一覧、`GET /api/chat/sessions/:id/messages` 履歴の2段階でサイドバーと会話を構築。
3. **左サイドバー UI**
   - “New Page” で新規セッションを発行、過去セッション一覧（最新順）、3点メニューで `Rename` / `Delete` / `Share`（Shareは計画のみ）を提供。
   - モバイルではオーバーレイ、デスクトップではチャットに影を落とすスライド表示。
4. **ChatInterface連携**
   - `sessionId` を必須化し、Supabaseにユーザー/AIメッセージを書き込み。
   - `initialMessages` で履歴をバインドし、サイドバー切替で即座に表示。
5. **セッション再利用ウィンドウ**
   - `SESSION_REUSE_WINDOW_MS = 1h` を導入し、`localStorage` に直近で閲覧した `sessionId` を保存。
   - `/chat` に戻った際は 1 時間以内であれば保存済みセッションを優先選択し、サーバーフェッチ完了 (`sessionsInitialized`) まで新規作成フローを抑制。

## 2. 既知の課題
1. **AIメッセージが2ラリー目で消える（レースコンディション）**
   - `loadSessionMessages` が複数同時に走ると、古いレスポンスが `sessionMessages` を上書きしてしまい、最新の AI 応答が初期化される。
   - `pages/chat/index.tsx` に `sessionMessagesRequestRef` / `sessionMessagesRequestSeqRef` を追加し、最新リクエスト以外の結果は破棄するよう修正済み（2025-11-19）。
   - 追加の検証としては、1) リロード直後に即質問→AI返信→もう1件質問 のケースで `sessionMessages` が欠落しないかを手動確認、2) Playwright で 2 ラリー連続の E2E を追加する。
2. **再訪時に不要な "New chat" が生成される**
   - ブラウザで別ページへ遷移し `/chat` に戻ると、セッション一覧が非同期フェッチされる前に新規作成が走り、連続で空のスレッドが増えることがあった。
   - `sessionsInitialized` フラグと 1 時間の再利用ウィンドウを導入し、フェッチ完了前は `handleCreateSession` を止め、直近セッションを優先的に選択するよう調整済み。
2. **アプリ間の状態同期**
   - `sessionMessages` を親で管理しているが、`ChatInterface` がローカル state を細かく反映するため、同期開始/終了タイミングが難しい。何らかの `hydratedSessionRef` を持たせるなどの追加制御が必要。
3. **Share実装未完了**
   - UIにボタンはあるが、実際のリンク生成・公開ビューは `docs/features/CHAT_SESSION_SHARE_PLAN.md` に記載した計画のまま。
4. **セッションメニューの操作フロー**
   - rename/deleteは実装済みだが、操作後の通知やエラー表示は `alert` に依存しているためUXが荒い。

## 3. 推奨タスク
1. `ChatInterface` の state 管理を整理し、`initialMessages` の変更でリセットしないようガードを追加する。→ `hydratedSessionRef` を導入済みだが、新規セッション直後の re-fetch で競合しないかを追跡する。
2. Supabase から履歴を再取得した後、`ChatInterface` の状態を完全に置き換える or 差分反映する仕組みを決める。現在は「サーバーがソース・オブ・トゥルース、ただしクライアントで最新表示をキープ」という方針なので、`sessionMessagesRequestRef` を活用して最新データのみ反映する。
3. Share 機能の実装（テーブル + API + 公開ビュー）を `CHAT_SESSION_SHARE_PLAN.md` に沿って行う。
4. セッション一覧の GA4 logging, 3点メニューの snackbar 表示、検索/ページングなどの UX 改善。

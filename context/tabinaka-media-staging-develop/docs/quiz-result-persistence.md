# Quiz Result Persistence — 現状整理と対応方針（2025-11-11）

## コード確認で判明したこと
- `context/AccountContext.tsx` は `getStoredQuizResult` / `transferPendingQuizResult` / `syncQuizResultToServer` を import しているが、`lib/quizClientState.ts` にはこれらのエクスポートが存在しない。現在の `quizClientState` が提供しているのは `persistQuizResultLocal`・`resolveQuizResultState`・`flushPendingQuizResults`・`queueQuizResultSync`・`savePendingQuizResult`・`getPendingQuizResult`・`clearPendingQuizResult` だけで、型チェック段階で破綻している。
- `pages/quiz/index.tsx` の `saveQuizResult` は毎回 `savePendingQuizResult` を呼び出して pending スロットに値を書き込むが、そのスロットを accountStorage に転送するコードはどこからも呼ばれていない（`transferPendingQuizResult` が未実装のため）。
- `context/QuizStatusContext.tsx` は `useAccount()` から `ensureQuizBootstrap` と `quizBootstrapReady` を受け取る前提になっているが、`AccountContext` にはこれらの値が定義されていない。結果として `refresh` 内の `await ensureQuizBootstrap()` で例外が発生し、クイズ結果の再読込が一切行われない。
- `AccountProvider` の ID 移行ロジックは `previousAccountIdRef` しか参照しておらず、リロードを跨いで旧 ID を知る手段がない。ソーシャルログイン後のリダイレクトで別 ID が割り当てられると、`moveAccountDataToAccountId` が呼ばれずローカル結果が迷子になる。
- `/api/account/link` 呼び出しは HTTP ステータスの判定をしておらず、401 や 409 を受け取っても `linkAttemptedRef` がロックされたままになる。するとその後の再試行が二度と走らず、Supabase ユーザーとの関連付けが未完了のまま止まる。

## 今のままでは達成できないこと
1. pending ストレージ → accountStorage への移行経路が存在しないため、`savePendingQuizResult` で退避した結果をどの `accountId` にもひも付けられない。
2. `QuizStatusContext` が `ensureQuizBootstrap` で例外を投げ続けるため、ローカル／リモートのいずれの結果も UI に反映されない。
3. サーバー同期（`/api/account/quiz-state`）は `syncQuizResultToServer` が未実装なせいで一度も発火せず、`flushPendingQuizResults` だけでは pending からの初回アップロードを代替できない。
4. `/api/account/link` の 401/409 を復旧する術がなく、`account_metadata` への集約と `account_linkages` への書き込みが途中で停止する。

## 実装方針（最小限で最大の効果を出す順番）

### 1. `lib/quizClientState.ts` の API を復元する
- `getStoredQuizResult(accountId)` を追加し、`resolveQuizResultState(accountId)` の結果から `StoredQuizResult | null` を返す薄いヘルパーにする（TTL や例外処理は既存ロジックを流用）。
- `transferPendingQuizResult(accountId)` を実装し、`getPendingQuizResult()` → `persistQuizResultLocal(accountId, result, { status: 'pending', emitEvent: false })` → 成功時 `clearPendingQuizResult()` → `emitQuizResultEvent()` の順で処理。失敗時は pending を残しつつ構造化ログを出して早期 return する。
- `syncQuizResultToServer(result, authToken)` を公開し、既存の `postQuizResult` を使って `/api/account/quiz-state` へ POST する。戻り値は `QuizSyncResult` をそのまま返して `AccountContext` や `QuizStatusContext` から再試行制御に利用できるようにする。
- これらをエクスポートしたうえで `context/AccountContext.tsx` / `context/QuizStatusContext.tsx` の import エラーをまず解消し、pending 取り込みやサーバー同期の土台を取り戻す。

### 2. AccountProvider のブートストラップ（ID 移行 + pending 消化）を完成させる
- `window.localStorage` に `quiz/last-account-id`（仮称）を持ち、前回使った `accountId` を永続化。`previousAccountIdRef` が初期化されても旧 ID を復元できるようにする。
- `session.status === 'ready'` になったタイミングで以下の処理を順番に行い、その完了 Promise を `ensureQuizBootstrap` として公開する:
  1. 旧 ID ≠ 新 ID の場合は `moveAccountDataToAccountId` を実行し、成功したら `getStoredQuizResult(currentAccountId)` で移行結果を取得。
  2. `transferPendingQuizResult(currentAccountId)` を呼び出し、pending が存在した場合は `persistQuizResultLocal` 経由で `accountStorage` に書き戻す。
  3. 直近で取得した `StoredQuizResult` があれば `flushPendingQuizResults({ accountId: currentAccountId, authToken: supabaseAccessToken, force: true })` を await（失敗時は `queueQuizResultSync` を enqueue）し、`emitQuizResultEvent()` で購読者へ通知する。
- ブートストラップが完了したら `quizBootstrapReady = true` をセットし、`useAccount()` の戻り値に `ensureQuizBootstrap` / `quizBootstrapReady` を含める。

### 3. QuizStatusContext の依存関係と再同期フローを修復する
- `useAccount()` から新設した `ensureQuizBootstrap` / `quizBootstrapReady` を受け取り、`quizBootstrapReady` が真になるまで `refresh`（および `requestOpenModal` 内の `refresh` 呼び出し）を実行しない。
- `refresh` の処理順序を「ローカル (`resolveQuizResultState`) で即時反映 → リモート (`fetchRemoteQuizResult`) で上書き → pending/failed 状態なら `flushPendingQuizResults` + `queueQuizResultSync`」に固定する。
- `subscribeQuizResult` や `storage` イベントで `refresh` を再実行するときも `quizBootstrapReady` を参照し、ブートストラップ完了前に多重起動しないようガードする。
- `requestOpenModal` は `refresh` 成功時にのみモーダルを開くようにし、`refresh` 自身の例外で pendingModal フラグが外れないよう try/catch を整備する。

### 4. `/api/account/link` 呼び出しのリトライ制御
- fetch の戻り値を必ず検証し、`!response.ok` の場合は `linkAttemptedRef.current = null` を実行してリトライがブロックされないようにする。
- `response.status === 401` の場合は `await loadSession()` でセッション情報を更新し、`setTimeout`（例: 2^n * 1s）でバックオフしつつ最大 3 回まで自動再試行。401 が連続する場合は警告ログを出し続ける。
- `409` や `5xx` ではユーザー ID / accountId / status を含んだ `console.warn` / `console.error` を出し、再試行は `useEffect` の依存（`supabaseUser`, `session.accountId` 等）が変わったタイミングに任せる。

### 5. 観測性と検証
- Pending 保存・転送・サーバー同期・link リトライなど主要な分岐で `console.debug` or `console.warn` を出し、`accountId` / `supabaseUserId` / `status` を必ず含めて調査しやすくする。
- 回帰テストの基本シナリオ:
  1. ゲストでクイズ完了 → Google ログイン → リダイレクト直後にクイズ結果モーダルが表示され、Supabase の `account_metadata.quiz_state` が更新される。
  2. ログイン済みでブラウザをハードリロード → 旧 ID のローカルデータが新 ID に移行され、`quiz/last-account-id` が最新値に書き変わる。
  3. `/api/account/link` をわざと 401 応答にし、`linkAttemptedRef` が解放されて再試行すること、ならびに 3 回失敗後に観測可能なログが残ることを確認する。

これらを順に進めれば、「pending へ書いた結果が拾われない」「ID が変わると結果が消える」「link の失敗で同期が止まる」といった現在のブロッカーを同時に解消できる。

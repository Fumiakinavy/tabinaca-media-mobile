# クイズ結果表示・保存ロジックの問題分析

## 問題の概要

1. **クイズ完了後のリダイレクトで結果が表示されない**
2. **アイコンクリックでクイズ結果が表示されない**
3. **チャットで「クイズがコンプリートされていない」エラーが発生**

## クイズ結果保存ロジック

### 保存フロー

#### 1. クイズ完了時 (`pages/quiz/index.tsx`)

```354:428:pages/quiz/index.tsx
  const persistCompletionPayload = async (
    travelTypeCode: TravelTypeCode | null,
    payload: QuizCompletionPayload,
  ): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return false;
    }

    let targetAccountId = accountId;
    if (!targetAccountId) {
      await refreshSession();
      try {
        const response = await fetch('/api/account/session', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          targetAccountId = data.accountId;
        }
      } catch (error) {
        console.error('[Quiz] Failed to fetch accountId after refresh:', error);
      }
      if (!targetAccountId) {
        targetAccountId = accountId;
      }
    }

    if (!travelTypeCode) {
      console.error('[Quiz] Missing travelTypeCode');
      return false;
    }

    const info = getTravelTypeInfo(travelTypeCode);
    const travelTypePayload = {
      travelTypeCode,
      travelTypeName: info.name,
      travelTypeEmoji: info.emoji,
      travelTypeDescription: info.description,
      travelTypeShortDescription: info.shortDescription,
    };

    // RECOMMENDATIONに統一して保存
    const recommendation: StoredQuizResult = {
      travelType: travelTypePayload,
      answers: payload,
      timestamp: payload.timestamp,
      places: [],
    };
    if (!targetAccountId) {
      savePendingQuizResult(recommendation);
      console.warn('[Quiz] Account session not ready. Stored quiz result as pending.');
      return true;
    }

    accountStorage.setJSON(targetAccountId, ACCOUNT_STORAGE_KEYS.RECOMMENDATION, recommendation);
    accountStorage.setJSON(targetAccountId, ACCOUNT_STORAGE_KEYS.QUIZ_PAYLOAD, {
      travelTypeCode: travelTypePayload.travelTypeCode,
      travelTypeName: travelTypePayload.travelTypeName,
      travelTypeEmoji: travelTypePayload.travelTypeEmoji,
      travelTypeDescription: travelTypePayload.travelTypeDescription,
      travelTypeShortDescription: travelTypePayload.travelTypeShortDescription,
      timestamp: recommendation.timestamp,
    });
    clearPendingQuizResult();

    // サーバーにクイズ結果を同期（authTokenを渡すことで、認証済みユーザーの場合はaccount_metadataに保存される）
    const syncSuccess = await syncQuizResultToServer(recommendation, supabaseAccessToken);
    if (!syncSuccess) {
      console.warn('[Quiz] Failed to sync quiz result to server, but stored locally. Will retry on next sync.');
    }

    emitQuizResultEvent();
    return true;
  };
```

**保存先:**
1. ローカルストレージ (`accountStorage`): `RECOMMENDATION` と `QUIZ_PAYLOAD`
2. Pendingストレージ (`localStorage`): `accountId`がない場合
3. サーバー (`/api/account/quiz-state`): `account_metadata.quiz_state`

#### 2. サーバー同期 (`lib/quizClientState.ts`)

```138:176:lib/quizClientState.ts
export const syncQuizResultToServer = async (
  result: StoredQuizResult,
  authToken?: string | null,
): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false;
  }
  const payload = {
    travelType: result.travelType,
    answers: result.answers ?? null,
    places: result.places ?? [],
    timestamp: result.timestamp ?? Date.now(),
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch('/api/account/quiz-state', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[QuizClientState] Failed to sync quiz state:', response.status, errorText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[QuizClientState] Failed to sync quiz state', error);
    return false;
  }
};
```

#### 3. サーバー保存 (`pages/api/account/quiz-state.ts`)

```54:111:pages/api/account/quiz-state.ts
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<QuizStateResponse | ErrorResponse>,
) {
  const resolved = await resolveAccountId(req, res, true);
  if (!resolved) {
    return res.status(401).json({ error: 'Missing account session' });
  }

  const payload = (req.body ?? {}) as QuizStateUpsertPayload;
  const normalized = normalizeTravelType(payload.travelType);
  if (!normalized) {
    return res.status(400).json({ error: 'Missing travelType' });
  }

  const timestamp = payload.timestamp || Date.now();
  const nextQuizState = {
    travelType: normalized,
    completed: true,
    timestamp,
    recommendation: payload.places
      ? {
          places: payload.places,
          timestamp,
        }
      : undefined,
    answers: payload.answers,
  };

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

  if (upsertError) {
    console.error('[account/quiz-state] failed to upsert quiz state', upsertError);
    
    // Check if the error is due to missing table
    if (upsertError.code === 'PGRST205' || upsertError.message?.includes('Could not find the table')) {
      return res.status(503).json({ 
        error: 'Database schema not ready',
        message: 'The account_metadata table does not exist. Please apply migration 003_account_identity.sql to your Supabase database.',
        migrationFile: 'supabase/migrations/003_account_identity.sql',
        hint: 'Run the migration via Supabase SQL Editor or use: supabase db push'
      });
    }
    
    return res.status(500).json({ error: 'Failed to store quiz state', details: upsertError.message });
  }

  return res.status(200).json({ quizState: nextQuizState });
}
```

**保存形式:**
```json
{
  "travelType": { ... },
  "completed": true,
  "timestamp": 1234567890,
  "recommendation": { "places": [], "timestamp": 1234567890 },
  "answers": { ... }
}
```

## クイズ結果表示ロジック

### 1. QuizStatusContext (`context/QuizStatusContext.tsx`)

**読み込み順序:**
1. ローカルストレージ (`getStoredQuizResult`)
2. Pendingストレージ (`transferPendingQuizResult`)
3. サーバー (`fetchRemoteQuizResult`)

```133:163:context/QuizStatusContext.tsx
  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }
    // accountIdを最新の値として取得（依存配列の問題を回避）
    const currentAccountId = accountId;
    if (!currentAccountId) {
      setStatus('pending');
      setQuizResult(null);
      return;
    }
    const stored = getStoredQuizResult(currentAccountId);
    if (applyStoredResult(stored)) {
      return;
    }

    const pendingTransferred = transferPendingQuizResult(currentAccountId);
    if (applyStoredResult(pendingTransferred)) {
      return;
    }

    const restored = await fetchRemoteQuizResult(currentAccountId);
    if (applyStoredResult(restored)) {
      return;
    }

    setQuizResult(null);
    setStatus('missing');
    setModalOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]); // applyStoredResultとfetchRemoteQuizResultは安定しているため除外
```

**問題点:**
- `refresh`が`accountId`の変更時にのみ実行される
- ログイン後のリダイレクト時に、`accountId`が変わらない場合、`refresh`が実行されない可能性がある

### 2. チャットページでのモーダル表示 (`pages/chat/index.tsx`)

```64:90:pages/chat/index.tsx
  // クエリパラメータでモーダルを表示
  useEffect(() => {
    // 既に処理済みの場合はスキップ
    if (hasProcessedQuizResult.current) {
      return;
    }

    // router.isReadyを待つ
    if (!router.isReady) {
      return;
    }

    // showQuizResultクエリパラメータをチェック
    const shouldShowModal = router.query.showQuizResult === 'true';
    
    if (shouldShowModal && quizStatus === 'completed' && quizResult) {
      hasProcessedQuizResult.current = true;
      openModal();
      // クエリパラメータを削除（ブラウザ履歴に残さない）
      // 非同期で実行して、useEffectの再実行を防ぐ
      setTimeout(() => {
        router.replace('/chat', undefined, { shallow: true }).catch(() => {
          // エラーは無視
        });
      }, 0);
    }
  }, [router.isReady, router.asPath, quizStatus, quizResult, openModal, router]);
```

**問題点:**
- `quizStatus === 'completed' && quizResult`の条件が満たされない場合、モーダルが開かない
- `QuizStatusContext`の`refresh`が非同期で実行されるため、リダイレクト直後は`quizResult`が`null`の可能性がある

### 3. アイコンクリック時の表示 (`components/Header.tsx`)

```247:252:components/Header.tsx
  const handleAvatarClick = useCallback(() => {
    // クイズ結果があればモーダルを開く
    if (quizResult) {
      openQuizModal();
    }
  }, [quizResult, openQuizModal]);
```

**問題点:**
- `quizResult`が`null`の場合、モーダルが開かない
- `QuizStatusContext`の`openModal`は`quizResult && status === 'completed'`をチェックしているが、`quizResult`が読み込まれていない可能性がある

```209:214:context/QuizStatusContext.tsx
  const openModal = useCallback(() => {
    // クイズ結果がある場合はモーダルを開く
    if (quizResult && status === 'completed') {
      setModalOpen(true);
    }
  }, [quizResult, status]);
```

## チャットアクセス制御

### サーバー側チェック (`pages/api/chat/send-message.ts`)

```151:157:pages/api/chat/send-message.ts
    const quizState = await ensureQuizCompleted(accountIdHeader as string);
    if (!quizState) {
      return res.status(403).json({
        response: '',
        error: 'Quiz is not completed',
      });
    }
```

**問題点:**
- `ensureQuizCompleted`は`account_metadata.quiz_state.completed`をチェックしている
- クイズ完了時にサーバーへの同期が失敗している場合、`completed`が`false`のままになる

## ロジックの重複とコンフリクト

### 1. クイズ結果の保存場所が複数

**保存先:**
1. `accountStorage` (ローカルストレージ): `RECOMMENDATION`, `QUIZ_PAYLOAD`
2. `localStorage`: Pending (`quiz/pending/result`)
3. サーバー: `account_metadata.quiz_state`

**問題:**
- 複数の保存先があるため、同期が取れない可能性がある
- ログイン後に`accountId`が変わった場合、古い`accountId`のデータが残る可能性がある

### 2. クイズ結果の読み込みロジックが複数

**読み込み場所:**
1. `QuizStatusContext.refresh`: ローカル → Pending → サーバー
2. `ChatPage`: `useQuizStatus`から取得
3. `Header`: `useQuizStatus`から取得

**問題:**
- `QuizStatusContext`の`refresh`が非同期で実行されるため、タイミングによっては`quizResult`が`null`になる
- リダイレクト後に`refresh`が実行されない場合がある

### 3. サーバー同期のタイミング

**同期タイミング:**
1. クイズ完了時 (`persistCompletionPayload`)
2. アカウントリンク時 (`AccountContext`)
3. アカウント同期時 (`accountSync`)

**問題:**
- 複数のタイミングで同期が実行されるため、競合する可能性がある
- ログイン直後に`supabaseAccessToken`が`null`の場合、同期が失敗する

### 4. クイズ完了状態のチェックが複数

**チェック場所:**
1. `ensureQuizCompleted` (サーバー): `account_metadata.quiz_state.completed`
2. `QuizStatusContext` (クライアント): `status === 'completed'`
3. `useAccessPolicy` (クライアント): `quizStatus !== 'completed'`

**問題:**
- サーバーとクライアントで状態が一致しない可能性がある
- クライアント側では`completed`が`true`でも、サーバー側では`false`の場合がある

## 問題の根本原因

### 1. タイミング問題

- クイズ完了 → ローカル保存 → リダイレクト → `QuizStatusContext.refresh`が実行される前にモーダル表示を試みる
- ログイン → `accountId`変更 → `refresh`が実行されるが、サーバー同期が完了していない

### 2. 状態の不整合

- ローカルストレージには保存されているが、サーバーには保存されていない
- サーバーには保存されているが、ローカルストレージには保存されていない

### 3. 非同期処理の競合

- `refresh`と`syncQuizResultToServer`が同時に実行される
- `transferPendingQuizResult`と`syncQuizResultToServer`が競合する

## 実施した修正

### 1. クイズ結果の読み込みタイミングを改善

**修正内容:**
- `ChatPage`の`useEffect`で、`showQuizResult`パラメータがある場合、`refresh`を明示的に呼び出すように修正
- `quizResult`が`null`の場合でも、`refresh`を実行してからモーダルを開くように改善

**変更ファイル:**
- `pages/chat/index.tsx`: `refreshQuizStatus`を呼び出して、クイズ結果が読み込まれるまで待機

### 2. アイコンクリック時のクイズ結果表示を改善

**修正内容:**
- `Header`の`handleAvatarClick`で、`quizResult`が`null`の場合でも`refresh`を実行
- `refresh`完了後、`useEffect`で`quizResult`の変更を監視してモーダルを開く

**変更ファイル:**
- `components/Header.tsx`: `refreshQuizStatus`を呼び出し、`shouldOpenQuizModalAfterRefresh`フラグでモーダル表示を制御

### 3. QuizStatusContextのrefreshタイミングを改善

**修正内容:**
- `QuizStatusContext`の`refresh`を、`accountId`だけでなく`supabaseAccessToken`と`authState`の変更時にも実行
- ログイン後に`supabaseAccessToken`が設定された時点で、サーバーからクイズ結果を読み込む

**変更ファイル:**
- `context/QuizStatusContext.tsx`: `useEffect`の依存配列に`supabaseAccessToken`と`authState`を追加

## 残存する可能性のある問題

### 1. サーバー同期のタイミング

- クイズ完了時に`supabaseAccessToken`が`null`の場合、サーバー同期が失敗する
- 後で`AccountContext`の`useEffect`で同期されるが、チャットAPIが先に実行される場合、`ensureQuizCompleted`が失敗する可能性がある

**対処方法:**
- チャットAPIでクイズ完了チェックを行う前に、クライアント側でローカルストレージをチェックして、サーバーに同期する
- または、チャットAPIのクイズ完了チェックを緩和する（ローカルストレージもチェックする）

### 2. 状態の不整合

- ローカルストレージには保存されているが、サーバーには保存されていない場合がある
- サーバーには保存されているが、ローカルストレージには保存されていない場合がある

**対処方法:**
- `QuizStatusContext`の`refresh`で、ローカルストレージとサーバーの両方をチェックする（既に実装済み）
- サーバー同期の確実性を向上する（リトライロジックの追加など）


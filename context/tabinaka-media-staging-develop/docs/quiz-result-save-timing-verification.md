# QuizResult保存タイミングの検証結果

## 検証目的
クイズを完了しなくても`quiz_result`が保存されるタイミングがないか検証する。

## 検証結果サマリー

### ✅ 正常な保存タイミング
1. **クイズ完了時** (`pages/quiz/index.tsx:621-725`)
   - `saveQuizResult`関数が呼ばれる
   - `answers`を含む完全な`StoredQuizResult`を保存
   - 適切なタイミング

2. **チャットページでのレコメンデーション更新時** (`pages/chat/index.tsx:1117-1185`)
   - `quizResult.answers`を含む状態で保存
   - 既存のクイズ結果を更新するため問題なし

### ⚠️ 問題のある保存タイミング

#### 1. レコメンデーション取得時（クイズ未完了でも保存される可能性）

**場所**: `lib/recommendationOrchestrator.ts:152-176`

**問題点**:
```typescript
const storedResult: StoredQuizResult = {
  travelType: {
    travelTypeCode: travelType.travelTypeCode,
    travelTypeName: travelType.travelTypeName,
    travelTypeEmoji: travelType.travelTypeEmoji,
    travelTypeDescription: travelType.travelTypeDescription,
  },
  places: items,
  timestamp: nextState.updatedAt,
  // ❌ answers フィールドが欠落している
};
const persisted = persistQuizResultLocal(accountId, storedResult, {
  status: "pending",
});
```

**発生条件**:
- `useRecommendation`フックが呼ばれる（`pages/chat/index.tsx:989`）
- `travelType`が存在するが、クイズが完了していない状態
- レコメンデーションAPIが成功して`items`が返る

**影響**:
- `answers`なしの`quiz_result`がローカルストレージに保存される
- `flushPendingQuizResults`が呼ばれ、`/api/account/quiz-state`に送信される
- API側では`hasAnswers`がfalseになるが、`account_metadata`には保存される（警告のみ）
- `isCompleted`がfalseのため`quiz_sessions/quiz_results`への保存はスキップされる

#### 2. API側での不完全なチェック

**場所**: `pages/api/account/quiz-state.ts:91-103, 160-166`

**問題点**:
```typescript
// answers が空ならサーバー保存をスキップしてクライアント側に委ねる
const hasAnswers = Array.isArray(payload.answers)
  ? payload.answers.length > 0
  : payload.answers && Object.keys(payload.answers).length > 0;
if (!hasAnswers) {
  console.warn(
    "[account/quiz-state] skip saving quiz session/result because answers are empty",
    // ⚠️ 警告のみで、account_metadataへの保存は続行される
  );
}
// ...
if (!isCompleted) {
  console.warn(
    "[account/quiz-state] skip saving quiz_sessions/quiz_results because quiz is not completed",
    // ⚠️ quiz_sessions/quiz_resultsへの保存はスキップされるが、
    // account_metadataへの保存は既に完了している（121-130行目）
  );
  return res.status(200).json({ quizState: nextQuizState });
}
```

**影響**:
- `answers`が空でも`account_metadata`には保存される
- `quiz_sessions/quiz_results`への保存はスキップされるが、データの不整合が発生する可能性

## 推奨される修正

### 修正1: `recommendationOrchestrator.ts`での保存を条件付きにする

`answers`が存在する場合のみ保存するように変更：

```typescript
// 既存のquiz_resultからanswersを取得
const existingState = resolveQuizResultState(accountId);
if (existingState.status !== "missing" && existingState.record.answers) {
  const storedResult: StoredQuizResult = {
    travelType: {
      travelTypeCode: travelType.travelTypeCode,
      travelTypeName: travelType.travelTypeName,
      travelTypeEmoji: travelType.travelTypeEmoji,
      travelTypeDescription: travelType.travelTypeDescription,
    },
    places: items,
    timestamp: nextState.updatedAt,
    answers: existingState.record.answers, // ✅ answersを含める
  };
  // ... 保存処理
}
```

### 修正2: API側で`account_metadata`への保存も条件付きにする

`isCompleted`チェックを`account_metadata`への保存前に移動：

```typescript
const isCompleted = isQuizCompleted(payload.answers);

// ✅ isCompletedチェックを先に実行
if (!isCompleted) {
  console.warn(
    "[account/quiz-state] skip saving because quiz is not completed",
    { accountId: resolved.accountId, timestamp },
  );
  return res.status(200).json({ quizState: null });
}

// account_metadataへの保存（isCompletedがtrueの場合のみ）
const { error: upsertError } = await supabaseServer
  .from("account_metadata" as any)
  .upsert(/* ... */);
```

## 対応状況

- `lib/recommendationOrchestrator.ts`
  - 既存の`quizResult`から`answers`を取得し、欠落時は保存をスキップ
  - `answers`なしのレコメンド結果を保存しないように変更
- `pages/api/account/quiz-state.ts`
  - `answers`が空、または`isCompleted`がfalseの場合は早期リターンし、どのテーブルにも保存しないように変更

## 検証方法

1. クイズを開始するが完了しない（途中で離脱）
2. チャットページに移動
3. `travelType`が設定されている状態でレコメンデーションを取得
4. データベースを確認：
   - `account_metadata.quiz_state`に`answers`なしのデータが保存されていないか
   - `quiz_results`テーブルに未完了のクイズ結果が保存されていないか

## 関連ファイル

- `lib/recommendationOrchestrator.ts` - レコメンデーション取得時の保存処理
- `pages/api/account/quiz-state.ts` - サーバー側の保存API
- `pages/quiz/index.tsx` - クイズ完了時の保存処理
- `pages/chat/index.tsx` - チャットページでの保存処理
- `lib/quizClientState.ts` - クライアント側の保存ロジック


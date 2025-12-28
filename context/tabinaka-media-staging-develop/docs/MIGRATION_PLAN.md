# Migration & Implementation Plan

This document outlines the necessary database migrations and code changes to transition to the unified Quiz & Account schema.

## 1. Database Migration Strategy

We will perform this migration in a way that minimizes downtime, though a maintenance window is recommended due to table restructuring.

### Phase 1: Create New Tables & Columns
First, we introduce the new structures alongside the old ones where possible, or replace them if they are fresh.

**Migration File**: `supabase/migrations/xxxx_unify_quiz_and_accounts.sql`

```sql
BEGIN;

-- 1. Enhance `accounts` table
-- Add profile column to merge account_profiles data
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS profile JSONB DEFAULT '{}'::jsonb;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS utm_source JSONB DEFAULT '{}'::jsonb;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

-- 2. Create unified `quiz_sessions` table
-- If a table with this name already exists from previous attempts, we might need to recreate or alter it.
-- Assuming we want a clean slate for the NEW schema:
DROP TABLE IF EXISTS quiz_results CASCADE;
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_forms CASCADE;

-- Re-define quiz_sessions with analytics columns
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status quiz_session_status NOT NULL DEFAULT 'in_progress', -- enum: started, in_progress, completed, abandoned
  
  -- Analytics & Tracking
  current_step INTEGER DEFAULT 0,
  last_question_id TEXT,
  
  -- Data Storage (JSONB is King)
  answers JSONB DEFAULT '{}'::jsonb,      -- Aggregated answers
  result JSONB DEFAULT NULL,              -- Calculated travel type & scores
  metadata JSONB DEFAULT '{}'::jsonb,     -- User agent, context, etc
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quiz_sessions_account_status ON quiz_sessions(account_id, status);
CREATE INDEX idx_quiz_sessions_analytics ON quiz_sessions(status, last_question_id); -- For drop-off analysis

-- 3. Data Migration (Optional / Best Effort)
-- Move data from account_profiles to accounts.profile
UPDATE accounts a
SET profile = (
  SELECT to_jsonb(ap.*) - 'account_id' 
  FROM account_profiles ap 
  WHERE ap.account_id = a.id
);

-- Drop old table after confirming data migration
DROP TABLE IF EXISTS account_profiles;

COMMIT;
```

---

## 2. Codebase Changes

We need to update the TypeScript application to read/write from these new locations.

### A. Type Definitions (`types/quiz.ts` or similar)

**Update** the `QuizSession` and `QuizResult` types to match the new DB schema.

```typescript
export interface QuizSessionDB {
  id: string;
  account_id: string;
  status: 'started' | 'in_progress' | 'completed' | 'abandoned';
  current_step: number;
  last_question_id?: string;
  answers: TravelQuizAnswers; // Existing type for answers
  result?: TravelTypeResult;  // Existing type for results
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

### B. Client State Manager (`lib/quizClientState.ts`)

This file currently handles local storage and syncing. We need to **simplify** it.

1.  **Remove** separate logic for `persistQuizResultLocal` (saving separate result files).
2.  **Update** `updateQuizSession` to accept `answers` and `step` info.
    *   **Old**: Just updated status/metadata.
    *   **New**: Must send `partialAnswers`, `currentStep`, `lastQuestionId` to the server on every step change.
3.  **Refactor** `flushPendingQuizResults` to just upsert the `quiz_sessions` row.

### C. API Endpoints (`pages/api/quiz/*`)

**`pages/api/quiz/session.ts`** (Refactor)
*   **POST (Create)**:
    *   Insert into `quiz_sessions` with initial metadata.
    *   Return `sessionId`.
*   **PATCH (Update)**:
    *   Accept: `sessionId`, `step`, `questionId`, `newAnswers`.
    *   Action: Update `quiz_sessions` row:
        *   `answers = answers || newAnswers` (Merge JSON)
        *   `current_step = step`
        *   `last_question_id = questionId`
        *   `updated_at = now()`

**`pages/api/account/quiz-state.ts`** (Deprecated/Refactor)
*   This endpoint likely synced the old "results" table.
*   **Action**: Redirect logic to use the unified `quiz_sessions` table or deprecated it entirely in favor of the session API.

### D. Frontend Components (`pages/quiz/index.tsx`)

1.  **Step Tracking**:
    *   Inside the `handleNext` or `onAnswer` functions, call the updated `updateQuizSession` API.
    *   Pass the *current step index* and the *ID of the question just answered*.
    *   This ensures that even if the user closes the tab immediately, we recorded "they answered Q2".

```typescript
// Pseudocode Example
const handleAnswer = async (questionId: string, value: any) => {
  setAnswers(prev => ({ ...prev, [questionId]: value }));
  
  // Fire & Forget analytics update
  await updateQuizSession(sessionId, {
    answers: { [questionId]: value },
    lastQuestionId: questionId,
    currentStep: currentStep
  });
};
```

### E. Account Context (`context/AccountContext.tsx`)

1.  **Refactor `bootstrapQuizState`**:
    *   Instead of looking for legacy local storage keys, it should simply fetch the latest *active* `quiz_session` from the API for the current `accountId`.
    *   If a session exists and is `in_progress`, restore the user to that `current_step`.

## 3. Recommended Workflow

1.  **Database**: Run the migration SQL locally/staging.
2.  **Types**: Update TypeScript interfaces.
3.  **API**: Rewrite `api/quiz/session.ts` to handle the new rich payload (answers + analytics).
4.  **Frontend**: Hook up the quiz UI to send incremental updates to this API.
5.  **Cleanup**: Remove unused code (`quiz_results` syncing logic, `account_profiles` read logic).

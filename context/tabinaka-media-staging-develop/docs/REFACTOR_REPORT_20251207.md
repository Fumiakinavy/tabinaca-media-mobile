# Refactoring Report: Quiz Architecture & Profile Sync (2025-12-07)

This document summarizes the significant refactoring and feature additions performed to modernize the Quiz architecture, unify data storage, and enable user profile synchronization.

## 1. Overview
The primary goal was to consolidate scattered quiz tables (`quiz_forms`, `quiz_answers`, `quiz_results`) into a single, unified `quiz_sessions` table. This simplifies data management and enables easier "Drop-off Analysis" by tracking progress step-by-step. Additionally, a new mechanism to sync quiz answers directly to a user's permanent profile (`accounts.profile`) was implemented.

## 2. Database Changes
We moved from a multi-table approach to a single-table session model.

### New Schema: `quiz_sessions`
Replaces the legacy tables.
*   **`id`** (UUID): Primary Key.
*   **`account_id`** (UUID): Links to the user.
*   **`status`** (Enum): `in_progress`, `completed`, `abandoned`.
*   **`current_step`** (Integer): Tracks the furthest step reached (for drop-off analysis).
*   **`last_question_id`** (Text): The ID of the last answered question.
*   **`answers`** (JSONB): All quiz answers stored in a single JSON column.
*   **`result`** (JSONB): Calculcated travel type and recommendations.
*   **`travel_type_code`** & **`travel_type_payload`**: Direct columns for easier querying of results.

### Schema Updates: `accounts`
*   **`profile`** (JSONB): Consolidates data from the deprecated `account_profiles` table. Now stores user attributes like `origin`, `ageRange`, `travelStyle`, etc.
*   **`utm_source`** (JSONB): Stores the first-touch marketing source.

### Migrations
*   **`20251207000001_create_new_quiz_schema.sql`**: Creates `quiz_sessions` and updates `accounts`.
*   **`20251207000002_migrate_quiz_data.sql`**: Migrates existing data from `quiz_results` to `quiz_sessions`.
*   **`20251207000003_drop_legacy_tables.sql`**: Drops `quiz_results`, `quiz_answers`, `quiz_forms`, and `account_profiles`.

## 3. API Changes

### New Endpoint: `PATCH /api/account/profile`
*   **Purpose**: Allows the frontend to update the user's permanent profile data.
*   **Behavior**: Merges the provided JSON payload with the existing `profile` data in the `accounts` table.

### Updated Endpoint: `PATCH /api/quiz/session`
*   **Changes**:
    *   Now accepts `currentStep`, `lastQuestionId`, and `answers`.
    *   Updates the `quiz_sessions` table with these fields to track real-time progress.
    *   Handles saving the final result (`travelTypeCode`, `result`) into the same session record upon completion.

### Updated Endpoint: `POST /api/account/utm`
*   **Changes**:
    *   In addition to logging to `account_utm_attributions`, it now syncs the **first-touch** UTM parameters to `accounts.utm_source`.
    *   Logic ensures `accounts.utm_source` is only written to if it's currently empty, preserving the original acquisition source.

### Updated Endpoint: `POST /api/account/quiz-state`
*   **Changes**:
    *   Writes completion data to `quiz_sessions` (upsert) instead of the old `quiz_results` table.
    *   Supports backward compatibility by also writing to `account_metadata` via the existing `quizState` logic (preserved for safety).

## 4. Frontend Changes (`pages/quiz/index.tsx`)

### Real-time Profile Syncing
*   **Mechanism**: A new `syncProfile` function was implemented.
*   **Trigger**: Called on `handleNext` (step progression) and `handleSignInForResults`.
*   **Data Scoped**: Syncs specific fields (`origin`, `ageRange`, `phoneNumber`, `travelParty`, etc.) from the temporary quiz answers to the permanent `accounts.profile`.

### Drop-off Analysis Tracking
*   **Mechanism**: Calls `updateQuizSession` on every step change.
*   **Payload**: Sends `currentStep` and the latest `answers`.
*   **Benefit**: Allows analysis of exactly where users abandon the quiz.

## 5. Cleanups
*   **Legacy Storage**: Removed obsolete logic in `lib/accountStorage.ts` that attempted to migrate data based on the old `gappy_user_id` local storage key. The system now relies entirely on the unified `account_id`.

## 6. Summary of Data Flow (New)
1.  User starts quiz -> **Session Created** (`quiz_sessions`).
2.  User answers Q1 -> **Session Updated** (`current_step`, `answers`).
3.  User clicks Next -> **Profile Synced** (Q1 answer saved to `accounts.profile`).
4.  User completes quiz -> **Session Completed** (`result` saved).
5.  User re-takes quiz -> **New Session Created** (History kept), **Profile Updated** (Latest attributes overwrite old ones).

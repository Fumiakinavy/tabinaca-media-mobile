# Database Schema Documentation

This document describes the database structure for the application, focusing on the unified schema for Accounts, Quiz tracking, AI Chat, and Experience content.

## 1. Concept & Overview

The database is designed around **Account-Centricity** and **JSONB Flexibility**.

- **Identity**: Every visitor gets an `account_id` (stored in `accounts` table). Login (Supabase Auth) is treated as a linked attribute via `account_linkages`.
- **Flexibility**: JSONB columns are used extensively for variable data (quiz answers, AI context, activity metadata) to allow schema-less evolution without frequent migrations.
- **Traceability**: All major actions (Quiz, Chat, Interactions) are linked to `accounts.id`, enabling seamless tracking of user journeys from anonymous to authenticated states.

## 2. Core Identity (Accounts)

Central management of all users (both anonymous and authenticated).

### `accounts`
The master table for all user identities.

| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `gen_random_uuid()` | **Primary Key**. The universal identifier used in cookies (`gappy-account-id`). |
| `status` | `account_status` | `'active'` | Enum: `active`, `suspended`, `deleted`. |
| `profile` | `JSONB` | `{}` | **Merged.** User profile data (name, language, preferences, travel style). |
| `utm_source` | `JSONB` | `{}` | **Merged.** First-touch attribution data (source, medium, campaign). |
| `onboarding_state` | `JSONB` | `{}` | UI state tracking for onboarding flow. |
| `last_seen_at` | `TIMESTAMPTZ` | `now()` | Updated on every significant API interaction. |
| `created_at` | `TIMESTAMPTZ` | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | `now()` | |

### `account_linkages`
Links the internal `account_id` with external authentication providers (Supabase Auth).

| Column | Type | Description |
| :--- | :--- | :--- |
| `account_id` | `UUID` | **FK** references `accounts(id)`. |
| `supabase_user_id` | `UUID` | **Unique**. References Supabase `auth.users(id)`. |
| `linked_at` | `TIMESTAMPTZ` | When the linkage occurred. |

> **Note**: `account_profiles` table is DEPRECATED and merged into `accounts.profile` JSONB column for simplicity.

---

## 3. Quiz & Profiling (Integrated)

Unified table for tracking quiz progress, drop-offs, answers, and results. Replaces disjointed `quiz_forms`, `quiz_answers`, and `quiz_results` tables.

### `quiz_sessions`

| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `gen_random_uuid()` | **Primary Key**. |
| `account_id` | `UUID` | | **FK** references `accounts(id)`. |
| `status` | `quiz_session_status` | `'in_progress'` | Enum: `in_progress`, `completed`, `abandoned`. |
| `current_step` | `INTEGER` | `0` | **Analytics.** The latest step index reached (e.g., 0, 1, 2). |
| `last_question_id` | `TEXT` | | **Analytics.** ID of the last question interacted with (e.g., 'q3', 'phone'). |
| `answers` | `JSONB` | `{}` | **Merged.** All user inputs. e.g. `{"q1": "A", "email": "..."}`. |
| `result` | `JSONB` | | **Merged.** The calculated result & recommended travel type. |
| `metadata` | `JSONB` | `{}` | Context (device info, etc). |
| `started_at` | `TIMESTAMPTZ` | `now()` | |
| `completed_at` | `TIMESTAMPTZ` | | Null if abandoned. |
| `updated_at` | `TIMESTAMPTZ` | `now()` | Used to identify time of abandonment. |

---

## 4. AI Chat

Manages conversational history and context.

### `chat_sessions`

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key**. |
| `account_id` | `UUID` | **FK** references `accounts(id)`. |
| `title` | `TEXT` | Auto-generated title of the conversation. |
| `session_type` | `chat_session_type` | Enum: `assistant`, `vendor_support`, `system`. |
| `state` | `JSONB` | Internal state of the agent (memory, context). |
| `metadata` | `JSONB` | Reference to `quiz_sessions(id)` if initiated from a quiz result. |
| `started_at` | `TIMESTAMPTZ` | |
| `last_activity_at` | `TIMESTAMPTZ` | |

### `chat_messages`

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key**. |
| `session_id` | `UUID` | **FK** references `chat_sessions(id)`. |
| `role` | `TEXT` | `user`, `assistant`, or `tool`. |
| `content` | `TEXT` | The message content. |
| `sequence` | `BIGINT` | Ordering of messages. |
| `tool_calls` | `JSONB` | Function calls made by the AI. |
| `metadata` | `JSONB` | Citations, debug info. |

### `chat_session_summaries`
(Optional) Stores cached summaries for lists.

---

## 5. Experience Catalog (Hybrid: DB + MDX)

Core content management.

### `activities` (Existing Table)
Main entity for activities, spots, restaurants, etc.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key**. |
| `slug` | `TEXT` | Unique URL slug. |
| `title` | `TEXT` | |
| `content_body` | `TEXT` | Full content (potentially MDX/Markdown). |
| `metadata` | `JSONB` | Flexible attributes (price, duration, location lat/lng). |
| `status` | `activity_status` | Enum: `draft`, `published`, `archived`. |

### Related Tables
- **`activity_categories`**: Hierarchical categories.
- **`activity_tags`**: Tagging system.
- **`activity_category_map` / `activity_tag_map`**: Junction tables.
- **`activity_assets`**: Images and media.

---

## 6. Generated Content

Content created dynamically by AI for specific users.

### `generated_activities`

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key**. |
| `chat_session_id` | `UUID` | **FK**. Origin of this generation. |
| `title` | `TEXT` | |
| `body_mdx` | `TEXT` | Generated Markdown content. |
| `status` | `generated_activity_status` | `draft`, `published`, etc. |
| `metadata` | `JSONB` | Structured data extracted from the generation. |

### `generated_activity_saves`
Links generated content to a user's account (bookmarks).

---

## 7. Engagement & Interaction

Unified tracking of user actions.

### `activity_interactions`
Replaces disparate `likes`, `bookmarks` tables.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key**. |
| `account_id` | `UUID` | **FK** references `accounts(id)`. |
| `activity_id` | `UUID` | **FK** references `activities(id)`. |
| `interaction_type` | `interaction_type` | `like`, `bookmark`, `view`, `share`, `book`. |
| `source_type` | `interaction_source_type` | `manual`, `quiz`, `chat`. |
| `metadata` | `JSONB` | Contextual data. |

---

## Migration Strategy Summary

1.  **Drop** `quiz_results`, `quiz_answers`, `quiz_forms`.
2.  **Alter/Recreate** `quiz_sessions` to include JSONB columns (`answers`, `result`) and analytics columns (`current_step`, `last_question_id`).
3.  **Merge** `account_profiles` data back into `accounts.profile`.
4.  **Keep** `chat_sessions`, `activities`, `generated_activities` as is.

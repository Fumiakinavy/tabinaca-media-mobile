# Database Schema Redesign Proposal

## Objectives
- Consolidate identity around `account_id` while supporting multiple `auth.users` links.
- Normalize activity content, interaction logging, and AI outputs for easier analytics.
- Reduce trigger duplication by centralizing shared functionality (e.g., auto-populating `account_id`).
- Prepare the data model for incremental feature growth (social features, offline sync, AI learning loops).
- Ensure every table is compatible with Supabase RLS patterns and can scale to ~10x current volume without migrations.

## High-Level Domains
```
Identity        ─ accounts, account_user_links, account_profiles, account_settings
Content         ─ activities, activity_categories, activity_assets
Interactions    ─ activity_interactions, interaction_sources, offline_interactions
Personalization ─ account_embeddings, preference_snapshots, recommendation_runs, recommendation_items
Quiz Flow       ─ quiz_forms, quiz_sessions, quiz_answers, quiz_results
Chat            ─ chat_sessions, chat_messages, chat_summaries
Operational     ─ account_metadata, audit_event_log
```

## Core Entities
### Identity
| Table | Purpose | Notes |
| --- | --- | --- |
| `accounts` | Canonical account record | `id` UUID PK (`gen_random_uuid()`), status enum (`active`, `suspended`, `deleted`), onboarding state JSONB, created/updated timestamps |
| `account_user_links` | Join table to Supabase auth users | `account_id` FK → `accounts(id)` not null, `supabase_user_id` UUID UNIQUE NOT NULL, `is_primary` boolean, `linked_at` timestamp. Composite unique `(account_id, supabase_user_id)` |
| `account_profiles` | Public profile / personalization fields | `display_name`, `locale`, `timezone`, demographic facts (country, age_range, travel_style). 1:1 with `accounts`. |
| `account_settings` | Feature flags, notification opt-ins | JSONB columns; isolated to avoid hot rows |

RLS pattern: grant account holders access via `auth.uid()` join on `account_user_links`. Service role full access.

### Content
| Table | Purpose | Key Columns |
| --- | --- | --- |
| `activities` | Master catalog | `id` UUID PK, `slug` TEXT UNIQUE, `title`, `description`, `location_id`, `duration_minutes`, `pricing_tier`, `status` enum (`draft`, `published`, `archived`), `metadata` JSONB |
| `activity_categories` | Controlled vocabulary | `id`, `slug`, `name`, optional hierarchy via `parent_id` |
| `activity_category_map` | Many-to-many between activities and categories | `activity_id` FK, `category_id` FK, composite PK |
| `activity_assets` | Media & documents | `id`, `activity_id`, `asset_type` enum, `url`, `metadata`, soft-delete flag |
| `activity_locations` *(optional if location modeling grows)* | City/country & geo bounding boxes |

Indexes: `activities(slug)`, `activities(status)`, `activity_category_map(category_id, activity_id)`.

### Interactions
| Table | Purpose | Key Columns |
| --- | --- | --- |
| `activity_interactions` | Unified log of likes/skips/views/bookings | `id`, `account_id`, `activity_id`, `activity_slug` (redundant copy for historical lookup), `interaction_type` enum (`like`, `skip`, `view`, `bookmark`, `book`, `share`), optional `source_session_id`, `score_delta`, `metadata` JSONB, `created_at`. Unique partial index on `(account_id, activity_id, interaction_type)` for types that should be limited (like/bookmark). |
| `interaction_sources` | Lookup of where the interaction came from | `id`, `source_type` enum (`quiz`, `recommendation`, `chat`, `manual`), `source_id` (UUID), `context` JSONB |
| `offline_interactions` | Staging table for offline likes before merge | `account_id`, `activity_slug`, payload JSONB, `updated_at`. Same idea as current `offline_likes` but generalized. |
| View `activity_likes_latest` | Latest like events per account/activity for quick filtering. |

Triggers: before insert set `account_id` via shared `set_account_id_from_linkage()`; optionally maintain aggregates via deferred jobs.

### Personalization & AI
| Table | Purpose | Key Columns |
| --- | --- | --- |
| `account_embeddings` | Vector store per account | `account_id` PK, `preference_vector` vector(1536), `updated_at`. Requires `pgvector`. |
| `preference_snapshots` | Historical preferences per account | `id`, `account_id`, `snapshot` JSONB, `taken_at`. |
| `recommendation_runs` | AI suggestion batches | `id`, `account_id`, `trigger` enum (`quiz_result`, `chat_prompt`, `manual`, `cron`), input parameters JSONB, model metadata, `created_at`, `status`. |
| `recommendation_items` | Items returned in a run | `id`, `run_id` FK, `activity_id`, `activity_slug`, ranking features JSONB, `position`, `presented_at`, `dismissed_at`, `clicked_at`, `liked` boolean. |
| `recommendation_feedback` | Explicit feedback on runs | `id`, `run_id`, `feedback_type`, `comment`, `created_at`. |

Indexes: `recommendation_runs(account_id, created_at DESC)`, `recommendation_items(run_id, position)`.

### Quiz Flow
| Table | Purpose | Key Columns |
| --- | --- | --- |
| `quiz_forms` | Versioned definition of quiz structure | `id` UUID, `version` INT, `definition` JSONB, `published` boolean |
| `quiz_sessions` | Each quiz attempt | `id`, `account_id`, `quiz_form_id`, `status` enum (`in_progress`, `completed`, `abandoned`), `started_at`, `completed_at`, `metadata` JSONB |
| `quiz_answers` | Individual answers per question | `id`, `session_id`, `question_ref`, `answer_payload` JSONB, `answered_at` |
| `quiz_results` | Computed scoring output | `id`, `session_id`, `account_id`, `result_type` enum (`travel_type`, `destination_cluster`, etc.), `score` JSONB, `summary` TEXT, `created_at` |

### Chat
| Table | Purpose | Key Columns |
| --- | --- | --- |
| `chat_sessions` | Former `chatbot_conversations` | rename columns to `account_id`, `session_type` enum, `state` JSONB, `started_at`, `last_activity_at`, `closed_at`, `created_by` (`auth.uid` or system), `metadata` |
| `chat_messages` | Similar to current but reference `chat_sessions(id)` | add `sequence` INT, `tool_calls` JSONB, `latency_ms`. |
| `chat_summaries` | Replaces `conversation_context` | `session_id`, `summary`, `last_updated_at`, embeddings for retrieval optional. |
| `chat_session_metrics` *(optional)* | Derived metrics for analytics. |

### Operational / Metadata
| Table | Purpose | Notes |
| --- | --- | --- |
| `account_metadata` | Keep as lightweight JSON store; drop redundant columns moved to `accounts` or `account_profiles`. |
| `audit_event_log` | Append-only log for critical changes | `id`, `entity_type`, `entity_id`, `event_type`, `performed_by`, `payload`, `created_at`. |
| `system_settings` | Key/value configs for feature toggles. |

## Shared Components
- **Extensions:** enable `pgcrypto`, `pgvector`, `uuid-ossp` (optional) in bootstrap migration.
- **Enums:** use named enums for statuses (`account_status`, `interaction_type`, `recommendation_trigger`).
- **Functions:**
  - `public.set_account_id_from_linkage()` (single source of truth).
  - `public.touch_account_profile()` to update `accounts.updated_at` on profile changes.
- **Policies:** general pattern of joining through `account_user_links` for `auth.uid()` and allowing service role full CRUD.

## Migration Strategy
1. **Bootstrap (Phase 0)**
   - Create extensions (`pgcrypto`, `pgvector`), enums, and new tables without dropping legacy data.
   - Backfill `accounts` from existing `account_linkages` (1:1). Populate new `account_profiles` using data from `user_attributes`.
2. **Parallel Fill (Phase 1)**
   - Migrate `activity_feedback` into `activity_interactions`. For each feedback row create one interaction and link to `recommendation_items` where possible.
   - Copy `offline_likes` into `offline_interactions` and mark legacy table read-only.
   - Bridge `chatbot_conversations` → `chat_sessions`, `conversation_context` → `chat_summaries`.
3. **Switch Over (Phase 2)**
   - Update application code to read/write new tables (feature flags to allow dual writes during transition).
   - Create views mirroring old table names if temporary backward compatibility is required.
4. **Cleanup (Phase 3)**
   - Drop deprecated tables (`activity_feedback`, `ai_suggestions`, etc.) once traffic is fully migrated.
   - Remove dual-write triggers.

## Open Questions
- Do we need multi-tenant separation beyond `account_id` (e.g., partner organizations)? If so, consider adding `tenant_id` to `accounts` and scoping policies.
- Will `activities` continue to be managed manually, or do we expect ingestion from third-party providers? That influences `activity_assets`/`metadata` structure.
- Confirm desired retention period for `activity_interactions` and `chat_messages` to plan partitioning strategy.

## Next Steps
1. Validate the entity list with product/ML stakeholders to ensure coverage.
2. Draft concrete SQL migrations for Phase 0 (extensions, enums, `accounts`, `account_profiles`, etc.).
3. Implement application-layer dual writes & readers for `activity_interactions` and `chat_sessions`.
4. Schedule data migration scripts and verification queries for Phase 1 and Phase 2.

# Account Identity Migration (Stage 2)

This document summarizes the schema changes introduced in `supabase/migrations/003_account_identity.sql` and how to apply them.

## Overview

- Introduces `account_linkages`, `account_metadata`, and `offline_likes` tables.
- Adds `account_id` columns + indexes to existing feature tables (`quiz_results`, `recommendation_cache`, `user_attributes`, `activity_likes`).
- Installs helper triggers/functions (`set_account_id_from_linkage`, `touch_account_metadata`) for automatic population.
- Adds RLS policies that allow only service-role operations by default.
- Provides a `merge_offline_likes(account_id)` helper to migrate guest likes into the canonical table.

## Applying the migration

1. Ensure `ACCOUNT_TOKEN_SECRET` and Supabase service-role keys are configured. (Done locally via `.env.local`).
2. Run the new migration:

   ```bash
   supabase db push
   # or
   supabase db reset --use-migrations --password <...>
   ```

3. Backfill `account_linkages`:

   ```sql
   insert into public.account_linkages(account_id, supabase_user_id, linked_at)
   select gen_random_uuid(), id, timezone('utc', now())
   from auth.users
   on conflict (supabase_user_id) do nothing;
   ```

4. For each existing activity like record, call `merge_offline_likes(account_id)` once the client uploads offline data via the new accountSync queue.

5. Confirm that new inserts to `activity_likes` automatically populate `account_id` when `auth.uid()` is present (`set_account_id_from_linkage` trigger).

With this in place, Stage 2 (“Supabase schema & linking”) is completed and the application code can rely on `account_id` in downstream APIs.

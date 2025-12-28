-- Backfill missing account_linkages rows for existing feature data.
-- Run this script on Supabase (staging / production) after deploying the environment checks.

begin;

-- Create missing account_linkages records based on existing account_id usage.
with source_accounts as (
  select distinct account_id
  from (
    select account_id from public.activity_likes
    union
    select account_id from public.account_metadata
    union
    select account_id from public.offline_likes
    union
    select account_id from public.quiz_results
    union
    select account_id from public.recommendation_cache
    union
    select account_id from public.user_attributes
  ) scoped
  where account_id is not null
),
inserted_accounts as (
  insert into public.account_linkages (account_id, linked_at)
  select sa.account_id, timezone('utc', now())
  from source_accounts sa
  left join public.account_linkages al on al.account_id = sa.account_id
  where al.account_id is null
  returning account_id
)
select count(*) as inserted_account_linkages
from inserted_accounts;

-- Ensure account_metadata exists for every linkage (optional, idempotent).
insert into public.account_metadata (account_id)
select al.account_id
from public.account_linkages al
left join public.account_metadata am on am.account_id = al.account_id
where am.account_id is null;

commit;







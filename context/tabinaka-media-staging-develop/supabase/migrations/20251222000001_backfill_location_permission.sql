-- ============================================
-- Backfill location permission into accounts.profile.preferences
-- ============================================

BEGIN;

WITH latest_permissions AS (
  SELECT DISTINCT ON (account_id)
    account_id,
    CASE
      WHEN metadata->>'locationPermission' IN ('true', 'false')
        THEN (metadata->>'locationPermission')::boolean
      ELSE NULL
    END AS location_permission
  FROM quiz_sessions
  WHERE metadata ? 'locationPermission'
  ORDER BY account_id, updated_at DESC NULLS LAST, started_at DESC
)
UPDATE accounts a
SET profile = jsonb_set(
      COALESCE(a.profile, '{}'::jsonb),
      '{preferences,locationPermissionGranted}',
      to_jsonb(lp.location_permission),
      true
    ),
    updated_at = now()
FROM latest_permissions lp
WHERE a.id = lp.account_id
  AND lp.location_permission IS NOT NULL
  AND (a.profile->'preferences'->'locationPermissionGranted') IS NULL;

COMMIT;

-- ============================================
-- accounts テーブルの不足行を補完するバックフィルSQL
-- ============================================
-- 実行手順:
--   1. SupabaseダッシュボードのSQL Editorでこのスクリプトを実行
--   2. 実行後に accounts / activity_interactions / account_linkages の件数を確認
--   3. 必要に応じて scripts/refresh_schema_cache.sql を続けて実行
-- ============================================

BEGIN;

WITH source_accounts AS (
  SELECT account_id FROM account_linkages
  UNION
  SELECT account_id FROM account_metadata
  UNION
  SELECT account_id FROM activity_interactions
)
INSERT INTO accounts (id)
SELECT DISTINCT account_id
FROM source_accounts
WHERE account_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- 統計確認
SELECT
  (SELECT COUNT(*) FROM accounts) AS accounts_total,
  (SELECT COUNT(*) FROM account_linkages) AS account_linkages_total,
  (SELECT COUNT(*) FROM activity_interactions) AS activity_interactions_total;

-- ============================================
-- 3. 旧テーブル削除 (Cleanup)
-- ============================================

BEGIN;

-- Drop legacy Quiz tables
-- These are now fully supplanted by `quiz_sessions`
DROP TABLE IF EXISTS quiz_results CASCADE;
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_forms CASCADE;
DROP TABLE IF EXISTS quiz_sessions_legacy CASCADE;

-- Drop legacy Account Profile table
-- Data has been merged into `accounts.profile`
DROP TABLE IF EXISTS account_profiles CASCADE;

COMMIT;

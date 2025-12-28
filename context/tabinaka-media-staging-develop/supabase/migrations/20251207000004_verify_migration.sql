-- ============================================
-- 4. 検証クエリ (Verification)
-- ============================================

-- 1. Check Accounts Extensions
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name IN ('profile', 'utm_source', 'last_seen_at');

-- 2. Check Quiz Sessions Table Structure
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'quiz_sessions';

-- 3. Check Data Integrity (Sample)
-- Should return rows if migration was successful and data existed
SELECT count(*) as total_migrated_sessions FROM quiz_sessions;

-- 4. Check Profile Migration
-- Should show non-empty profile JSONs
SELECT id, profile FROM accounts WHERE profile != '{}'::jsonb LIMIT 5;

-- 5. Check Cleanup
-- Should return 0 rows
SELECT count(*) as legacy_tables_remaining 
FROM information_schema.tables 
WHERE table_name IN ('quiz_results', 'quiz_answers', 'quiz_forms', 'account_profiles');

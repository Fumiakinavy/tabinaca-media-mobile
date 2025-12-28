-- ============================================
-- 2つのアカウント削除SQL
-- ============================================
-- 対象メールアドレス:
--   1. uehara.f.3a48@m.isct.ac.jp
--   2. ff.navy.skinny.dx@gmail.com
-- ============================================

BEGIN;

-- Step 1: 対象のaccount_idを特定
CREATE TEMP TABLE target_accounts AS
SELECT DISTINCT al.account_id
FROM auth.users au
JOIN account_linkages al ON au.id = al.supabase_user_id
WHERE au.email IN (
  'uehara.f.3a48@m.isct.ac.jp',
  'ff.navy.skinny.dx@gmail.com'
);

-- 確認
SELECT 'Accounts to delete:' as info, * FROM target_accounts;

-- Step 2: 関連データ削除（account_idを持つテーブル）

-- chat_messages（chat_sessions経由）
DELETE FROM chat_messages 
WHERE session_id IN (
  SELECT id FROM chat_sessions WHERE account_id IN (SELECT account_id FROM target_accounts)
);

-- chat_sessions
DELETE FROM chat_sessions WHERE account_id IN (SELECT account_id FROM target_accounts);

-- quiz_results
DELETE FROM quiz_results WHERE account_id IN (SELECT account_id FROM target_accounts);

-- quiz_sessions
DELETE FROM quiz_sessions WHERE account_id IN (SELECT account_id FROM target_accounts);

-- activity_interactions
DELETE FROM activity_interactions WHERE account_id IN (SELECT account_id FROM target_accounts);

-- search_queries
DELETE FROM search_queries WHERE account_id IN (SELECT account_id FROM target_accounts);

-- user_behavior_events
DELETE FROM user_behavior_events WHERE account_id IN (SELECT account_id FROM target_accounts);

-- business_metrics_events
DELETE FROM business_metrics_events WHERE account_id IN (SELECT account_id FROM target_accounts);

-- form_submissions（account_idとemail両方）
DELETE FROM form_submissions WHERE account_id IN (SELECT account_id FROM target_accounts);
DELETE FROM form_submissions WHERE email IN ('uehara.f.3a48@m.isct.ac.jp', 'ff.navy.skinny.dx@gmail.com');

-- account_metadata
DELETE FROM account_metadata WHERE account_id IN (SELECT account_id FROM target_accounts);

-- account_linkages
DELETE FROM account_linkages WHERE account_id IN (SELECT account_id FROM target_accounts);

-- accounts（存在する場合）
DELETE FROM accounts WHERE id IN (SELECT account_id FROM target_accounts);

-- Step 3: auth.users削除
DELETE FROM auth.users WHERE email IN (
  'uehara.f.3a48@m.isct.ac.jp',
  'ff.navy.skinny.dx@gmail.com'
);

-- 確認
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email IN ('uehara.f.3a48@m.isct.ac.jp', 'ff.navy.skinny.dx@gmail.com'))
    THEN 'まだ残っています'
    ELSE '削除完了'
  END as result;

-- テスト実行はROLLBACK、本番実行はCOMMIT
ROLLBACK;
-- COMMIT;










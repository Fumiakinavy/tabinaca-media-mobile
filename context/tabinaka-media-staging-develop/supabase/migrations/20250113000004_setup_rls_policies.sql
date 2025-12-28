-- ============================================
-- RLS (Row Level Security) ポリシー設定
-- ============================================
-- 目的: database_design.md の2.6節に基づいてRLSポリシーを設定
-- 注意: テーブルが存在する場合のみRLSを有効化
-- ============================================

BEGIN;

-- ============================================
-- 1. ヘルパー関数の作成
-- ============================================

-- account_id を取得する関数（auth.uid() から）
CREATE OR REPLACE FUNCTION auth_account_id()
RETURNS UUID AS $$
  SELECT account_id
  FROM account_linkages
  WHERE supabase_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- サービスロールかどうかを判定する関数
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
$$ LANGUAGE sql STABLE;

-- ============================================
-- 2. Identity & Session テーブルのRLS
-- ============================================

-- accounts テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
    ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Accounts can view own account" ON accounts;
    EXECUTE 'CREATE POLICY "Accounts can view own account"
      ON accounts FOR SELECT
      USING (
        id IN (
          SELECT account_id FROM account_linkages
          WHERE supabase_user_id = auth.uid()
        )
        OR is_service_role()
      )';

    DROP POLICY IF EXISTS "Service role can manage all accounts" ON accounts;
    EXECUTE 'CREATE POLICY "Service role can manage all accounts"
      ON accounts FOR ALL
      USING (is_service_role())
      WITH CHECK (is_service_role())';
  END IF;
END $$;

-- account_profiles テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account_profiles') THEN
    ALTER TABLE account_profiles ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own profile"
      ON account_profiles FOR SELECT
      USING (
        account_id = auth_account_id()
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Accounts can update own profile"
      ON account_profiles FOR UPDATE
      USING (account_id = auth_account_id())
      WITH CHECK (account_id = auth_account_id())';

    EXECUTE 'CREATE POLICY "Service role can manage all profiles"
      ON account_profiles FOR ALL
      USING (is_service_role())
      WITH CHECK (is_service_role())';
  END IF;
END $$;

-- account_metadata テーブル（既存テーブル）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account_metadata') THEN
    ALTER TABLE account_metadata ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Accounts can view own metadata" ON account_metadata;
    EXECUTE 'CREATE POLICY "Accounts can view own metadata"
      ON account_metadata FOR SELECT
      USING (
        account_id = auth_account_id()
        OR is_service_role()
      )';

    DROP POLICY IF EXISTS "Accounts can update own metadata" ON account_metadata;
    EXECUTE 'CREATE POLICY "Accounts can update own metadata"
      ON account_metadata FOR UPDATE
      USING (account_id = auth_account_id())
      WITH CHECK (account_id = auth_account_id())';
  END IF;
END $$;

-- ============================================
-- 3. Engagement & Social テーブルのRLS
-- ============================================

-- activity_interactions テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_interactions') THEN
    ALTER TABLE activity_interactions ENABLE ROW LEVEL SECURITY;

    -- 既存のポリシーを削除
    DROP POLICY IF EXISTS "Accounts can view own interactions" ON activity_interactions;
    DROP POLICY IF EXISTS "Accounts can insert own interactions" ON activity_interactions;
    DROP POLICY IF EXISTS "Accounts can update own interactions" ON activity_interactions;
    DROP POLICY IF EXISTS "Accounts can delete own interactions" ON activity_interactions;
    DROP POLICY IF EXISTS "Service role can manage all interactions" ON activity_interactions;

    -- サービスロール用のポリシー（最優先）
    EXECUTE 'CREATE POLICY "Service role can manage all interactions"
      ON activity_interactions FOR ALL
      USING (
        current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role''
        OR (current_setting(''request.jwt.claims'', true)::json->>''role'') IS NULL
      )
      WITH CHECK (
        current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role''
        OR (current_setting(''request.jwt.claims'', true)::json->>''role'') IS NULL
      )';

    -- ユーザー用のポリシー
    EXECUTE 'CREATE POLICY "Accounts can view own interactions"
      ON activity_interactions FOR SELECT
      USING (
        account_id = auth_account_id()
        OR current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role''
      )';

    EXECUTE 'CREATE POLICY "Accounts can insert own interactions"
      ON activity_interactions FOR INSERT
      WITH CHECK (
        account_id = auth_account_id()
        OR current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role''
      )';

    EXECUTE 'CREATE POLICY "Accounts can update own interactions"
      ON activity_interactions FOR UPDATE
      USING (
        account_id = auth_account_id()
        OR current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role''
      )
      WITH CHECK (
        account_id = auth_account_id()
        OR current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role''
      )';

    EXECUTE 'CREATE POLICY "Accounts can delete own interactions"
      ON activity_interactions FOR DELETE
      USING (
        account_id = auth_account_id()
        OR current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role''
      )';
  END IF;
END $$;

-- ============================================
-- 4. Booking & Fulfillment テーブルのRLS
-- ============================================

-- form_submissions テーブル（既存テーブル、存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_submissions') THEN
    ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'form_submissions'
        AND column_name = 'account_id'
    ) THEN
      DROP POLICY IF EXISTS "Users can view own submissions" ON form_submissions;
      EXECUTE 'CREATE POLICY "Users can view own submissions"
        ON form_submissions FOR SELECT
        USING (
          account_id = auth_account_id()
          OR is_service_role()
        )';

      DROP POLICY IF EXISTS "Users can insert own submissions" ON form_submissions;
      EXECUTE 'CREATE POLICY "Users can insert own submissions"
        ON form_submissions FOR INSERT
        WITH CHECK (
          account_id IS NULL OR account_id = auth_account_id()
        )';
    ELSE
      -- フォールバック: account_id列がない環境ではサービスロールのみ許可
      DROP POLICY IF EXISTS "Users can view own submissions" ON form_submissions;
      EXECUTE 'CREATE POLICY "Service role can view submissions"
        ON form_submissions FOR SELECT
        USING (is_service_role())';

      DROP POLICY IF EXISTS "Users can insert own submissions" ON form_submissions;
      EXECUTE 'CREATE POLICY "Service role can insert submissions"
        ON form_submissions FOR INSERT
        WITH CHECK (is_service_role())';
    END IF;
  END IF;
END $$;

-- vouchers テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vouchers') THEN
    ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Users can view own vouchers"
      ON vouchers FOR SELECT
      USING (
        form_submission_id IN (
          SELECT id FROM form_submissions
          WHERE account_id = auth_account_id()
        )
        OR is_service_role()
      )';
  END IF;
END $$;

-- voucher_redemptions テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voucher_redemptions') THEN
    ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Service role can view all redemptions"
      ON voucher_redemptions FOR SELECT
      USING (is_service_role())';
  END IF;
END $$;

-- ============================================
-- 5. Personalization & AI テーブルのRLS
-- ============================================

-- quiz_sessions テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quiz_sessions') THEN
    ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own quiz sessions"
      ON quiz_sessions FOR SELECT
      USING (
        account_id = auth_account_id()
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Accounts can insert own quiz sessions"
      ON quiz_sessions FOR INSERT
      WITH CHECK (account_id = auth_account_id())';

    EXECUTE 'CREATE POLICY "Accounts can update own quiz sessions"
      ON quiz_sessions FOR UPDATE
      USING (account_id = auth_account_id())
      WITH CHECK (account_id = auth_account_id())';
  END IF;
END $$;

-- quiz_answers テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quiz_answers') THEN
    ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own quiz answers"
      ON quiz_answers FOR SELECT
      USING (
        session_id IN (
          SELECT id FROM quiz_sessions
          WHERE account_id = auth_account_id()
        )
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Accounts can insert own quiz answers"
      ON quiz_answers FOR INSERT
      WITH CHECK (
        session_id IN (
          SELECT id FROM quiz_sessions
          WHERE account_id = auth_account_id()
        )
      )';
  END IF;
END $$;

-- quiz_results テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quiz_results') THEN
    ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own quiz results"
      ON quiz_results FOR SELECT
      USING (
        account_id = auth_account_id()
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Accounts can insert own quiz results"
      ON quiz_results FOR INSERT
      WITH CHECK (account_id = auth_account_id())';
  END IF;
END $$;

-- recommendation_runs テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recommendation_runs') THEN
    ALTER TABLE recommendation_runs ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own recommendations"
      ON recommendation_runs FOR SELECT
      USING (
        account_id = auth_account_id()
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Accounts can insert own recommendations"
      ON recommendation_runs FOR INSERT
      WITH CHECK (account_id = auth_account_id())';
  END IF;
END $$;

-- recommendation_items テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recommendation_items') THEN
    ALTER TABLE recommendation_items ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own recommendation items"
      ON recommendation_items FOR SELECT
      USING (
        run_id IN (
          SELECT id FROM recommendation_runs
          WHERE account_id = auth_account_id()
        )
        OR is_service_role()
      )';
  END IF;
END $$;

-- chat_sessions テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_sessions') THEN
    ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own chat sessions"
      ON chat_sessions FOR SELECT
      USING (
        account_id = auth_account_id()
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Accounts can insert own chat sessions"
      ON chat_sessions FOR INSERT
      WITH CHECK (account_id = auth_account_id())';

    EXECUTE 'CREATE POLICY "Accounts can update own chat sessions"
      ON chat_sessions FOR UPDATE
      USING (account_id = auth_account_id())
      WITH CHECK (account_id = auth_account_id())';
  END IF;
END $$;

-- chat_messages テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own chat messages"
      ON chat_messages FOR SELECT
      USING (
        session_id IN (
          SELECT id FROM chat_sessions
          WHERE account_id = auth_account_id()
        )
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Accounts can insert own chat messages"
      ON chat_messages FOR INSERT
      WITH CHECK (
        session_id IN (
          SELECT id FROM chat_sessions
          WHERE account_id = auth_account_id()
        )
      )';
  END IF;
END $$;

-- generated_activities テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generated_activities') THEN
    ALTER TABLE generated_activities ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own generated activities"
      ON generated_activities FOR SELECT
      USING (
        chat_session_id IN (
          SELECT id FROM chat_sessions
          WHERE account_id = auth_account_id()
        )
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Service role can manage generated activities"
      ON generated_activities FOR ALL
      USING (is_service_role())
      WITH CHECK (is_service_role())';
  END IF;
END $$;

-- generated_activity_saves テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generated_activity_saves') THEN
    ALTER TABLE generated_activity_saves ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Accounts can view own saved activities"
      ON generated_activity_saves FOR SELECT
      USING (
        account_id = auth_account_id()
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Accounts can insert own saved activities"
      ON generated_activity_saves FOR INSERT
      WITH CHECK (account_id = auth_account_id())';

    EXECUTE 'CREATE POLICY "Accounts can delete own saved activities"
      ON generated_activity_saves FOR DELETE
      USING (account_id = auth_account_id())';
  END IF;
END $$;

-- ============================================
-- 6. Content & Publishing テーブルのRLS
-- ============================================

-- articles テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'articles') THEN
    ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Public can view published articles"
      ON articles FOR SELECT
      USING (
        status = ''published''
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Service role can manage all articles"
      ON articles FOR ALL
      USING (is_service_role())
      WITH CHECK (is_service_role())';
  END IF;
END $$;

-- article_versions テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'article_versions') THEN
    ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Service role can view article versions"
      ON article_versions FOR SELECT
      USING (is_service_role())';

    EXECUTE 'CREATE POLICY "Service role can manage article versions"
      ON article_versions FOR ALL
      USING (is_service_role())
      WITH CHECK (is_service_role())';
  END IF;
END $$;

-- article_translations テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'article_translations') THEN
    ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Public can view published translations"
      ON article_translations FOR SELECT
      USING (
        status = ''published''
        OR is_service_role()
      )';

    EXECUTE 'CREATE POLICY "Service role can manage all translations"
      ON article_translations FOR ALL
      USING (is_service_role())
      WITH CHECK (is_service_role())';
  END IF;
END $$;

-- ============================================
-- 7. Experience Catalog テーブルのRLS
-- ============================================

-- activities テーブル（既存テーブル）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
    ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can view published activities" ON activities;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'activities'
        AND column_name = 'status'
    ) THEN
      EXECUTE 'CREATE POLICY "Public can view published activities"
        ON activities FOR SELECT
        USING (
          status = ''published'' OR is_active = true
          OR is_service_role()
        )';
    ELSE
      EXECUTE 'CREATE POLICY "Public can view active activities"
        ON activities FOR SELECT
        USING (
          is_active = true OR is_service_role()
        )';
    END IF;
  END IF;
END $$;

-- activity_categories テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_categories') THEN
    ALTER TABLE activity_categories ENABLE ROW LEVEL SECURITY;

    -- is_activeカラムが存在するか確認してからポリシーを作成
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_categories' AND column_name = 'is_active') THEN
      EXECUTE 'CREATE POLICY "Public can view active categories"
        ON activity_categories FOR SELECT
        USING (
          is_active = true
          OR is_service_role()
        )';
    ELSE
      -- is_activeカラムがない場合は全件閲覧可能
      EXECUTE 'CREATE POLICY "Public can view all categories"
        ON activity_categories FOR SELECT
        USING (is_service_role() OR true)';
    END IF;
  END IF;
END $$;

-- activity_tags テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_tags') THEN
    ALTER TABLE activity_tags ENABLE ROW LEVEL SECURITY;

    -- is_activeカラムが存在するか確認してからポリシーを作成
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_tags' AND column_name = 'is_active') THEN
      EXECUTE 'CREATE POLICY "Public can view active tags"
        ON activity_tags FOR SELECT
        USING (
          is_active = true
          OR is_service_role()
        )';
    ELSE
      -- is_activeカラムがない場合は全件閲覧可能
      EXECUTE 'CREATE POLICY "Public can view all tags"
        ON activity_tags FOR SELECT
        USING (is_service_role() OR true)';
    END IF;
  END IF;
END $$;

-- activity_assets テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_assets') THEN
    ALTER TABLE activity_assets ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Public can view activity assets"
      ON activity_assets FOR SELECT
      USING (
        activity_id IN (
          SELECT id FROM activities
          WHERE status = ''published'' OR is_active = true
        )
        OR is_service_role()
      )';
  END IF;
END $$;

-- ============================================
-- 8. Vendor & Operations テーブルのRLS
-- ============================================

-- vendors テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendors') THEN
    ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Service role can manage vendors"
      ON vendors FOR ALL
      USING (is_service_role())
      WITH CHECK (is_service_role())';
  END IF;
END $$;

-- vendor_members テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_members') THEN
    ALTER TABLE vendor_members ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Vendor members can view own vendor"
      ON vendor_members FOR SELECT
      USING (
        account_id = auth_account_id()
        OR is_service_role()
      )';
  END IF;
END $$;

-- audit_events テーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_events') THEN
    ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Service role can view audit events"
      ON audit_events FOR SELECT
      USING (is_service_role())';

    EXECUTE 'CREATE POLICY "Service role can insert audit events"
      ON audit_events FOR INSERT
      WITH CHECK (is_service_role())';
  END IF;
END $$;

COMMIT;

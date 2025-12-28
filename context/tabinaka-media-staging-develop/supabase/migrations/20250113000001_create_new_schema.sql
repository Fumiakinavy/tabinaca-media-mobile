-- ============================================
-- 新スキーマ作成マイグレーション
-- ============================================
-- 目的: database_design.md に基づいて新スキーマを作成
-- 注意: 既存テーブル（account_linkages, account_metadata, activities, form_submissions, reviews）は保持
-- ============================================

BEGIN;

-- ============================================
-- 1. 拡張機能の有効化
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. ENUM型の作成
-- ============================================

CREATE TYPE account_status AS ENUM ('active','suspended','deleted');
CREATE TYPE activity_status AS ENUM ('draft','published','archived');
CREATE TYPE activity_type AS ENUM ('company_affiliated','shibuya_pass','partner_store');
CREATE TYPE interaction_type AS ENUM ('like','bookmark','view','share','book','qr_scan','ai_save');
CREATE TYPE interaction_source_type AS ENUM ('manual','quiz','recommendation','chat','migration');
CREATE TYPE quiz_session_status AS ENUM ('in_progress','completed','abandoned');
CREATE TYPE quiz_result_type AS ENUM ('travel_type','destination_cluster');
CREATE TYPE generated_activity_status AS ENUM ('draft','approved','rejected','published');
CREATE TYPE generated_activity_save_source AS ENUM ('chat','recommendation','manual');
CREATE TYPE article_status AS ENUM ('draft','in_review','published','archived');
CREATE TYPE asset_type AS ENUM ('image','video','document','qr_coupon');
CREATE TYPE booking_status AS ENUM ('pending','confirmed','redeemed','cancelled');
CREATE TYPE recommendation_trigger AS ENUM ('quiz_result','chat_prompt','manual','cron');
CREATE TYPE job_status AS ENUM ('queued','processing','ready','failed');
CREATE TYPE chat_session_type AS ENUM ('assistant','vendor_support','system');

-- ============================================
-- 3. Identity & Session テーブル
-- ============================================

-- accounts テーブル（既存のaccount_linkagesが参照する前提）
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status account_status NOT NULL DEFAULT 'active',
  onboarding_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- account_linkages は既存テーブルを保持（FKを追加する場合は後でALTER）
-- account_metadata は既存テーブルを保持

-- account_profiles テーブル（新規）
CREATE TABLE IF NOT EXISTS account_profiles (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  display_name TEXT,
  locale TEXT,
  timezone TEXT,
  demographics JSONB NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_profiles_locale_idx ON account_profiles (locale);
CREATE INDEX IF NOT EXISTS account_profiles_timezone_idx ON account_profiles (timezone);

-- ============================================
-- 4. Experience Catalog テーブル
-- ============================================

-- activities は既存テーブルを保持

-- activity_categories テーブル（新規）
CREATE TABLE IF NOT EXISTS activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES activity_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- activity_category_map テーブル（新規）
CREATE TABLE IF NOT EXISTS activity_category_map (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES activity_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, category_id)
);

-- activity_tags テーブル（新規）
CREATE TABLE IF NOT EXISTS activity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- activity_tag_map テーブル（新規）
CREATE TABLE IF NOT EXISTS activity_tag_map (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES activity_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, tag_id)
);

-- activity_assets テーブル（新規）
CREATE TABLE IF NOT EXISTS activity_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  url TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_assets_activity_id_idx ON activity_assets (activity_id);
CREATE INDEX IF NOT EXISTS activity_assets_is_primary_idx ON activity_assets (activity_id, is_primary) WHERE is_primary = true;

-- ============================================
-- 5. Engagement & Social テーブル
-- ============================================

-- activity_interactions テーブル（新規、activity_likesの置き換え）
CREATE TABLE IF NOT EXISTS activity_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE RESTRICT,
  activity_slug TEXT NOT NULL,
  interaction_type interaction_type NOT NULL,
  source_type interaction_source_type,
  source_id UUID,
  score_delta INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 部分ユニークインデックス（like, bookmark, ai_save は1アカウント1アクティビティ1種別のみ）
CREATE UNIQUE INDEX IF NOT EXISTS unique_like_interactions
  ON activity_interactions (account_id, activity_id, interaction_type)
  WHERE interaction_type IN ('like','bookmark','ai_save');

CREATE INDEX IF NOT EXISTS activity_interactions_account_id_created_at_idx 
  ON activity_interactions (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_interactions_activity_slug_interaction_type_idx 
  ON activity_interactions (activity_slug, interaction_type);

-- 互換用ビュー（A-0移行期間用）
CREATE OR REPLACE VIEW legacy_activity_likes AS
  SELECT
    id,
    account_id,
    activity_slug,
    NULL::UUID AS user_id,
    created_at
  FROM activity_interactions
  WHERE interaction_type = 'like';

-- reviews は既存テーブルを保持

-- ============================================
-- 6. Booking & Fulfillment テーブル
-- ============================================

-- form_submissions は既存テーブルを保持

-- vouchers テーブル（新規）
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  voucher_code TEXT NOT NULL UNIQUE,
  qr_token TEXT,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_redemptions INTEGER NOT NULL DEFAULT 1,
  redemptions_used INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vouchers_form_submission_id_idx ON vouchers (form_submission_id);
CREATE INDEX IF NOT EXISTS vouchers_voucher_code_idx ON vouchers (voucher_code);

-- voucher_redemptions テーブル（新規）
CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  vendor_member_id UUID,
  scan_context JSONB NOT NULL DEFAULT '{}',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voucher_redemptions_voucher_id_scanned_at_idx 
  ON voucher_redemptions (voucher_id, scanned_at DESC);

-- ============================================
-- 7. Personalization & AI テーブル
-- ============================================

-- quiz_forms テーブル（新規）
CREATE TABLE IF NOT EXISTS quiz_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  definition JSONB NOT NULL DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- quiz_sessions テーブル（新規）
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  quiz_form_id UUID REFERENCES quiz_forms(id) ON DELETE SET NULL,
  status quiz_session_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  location_permission BOOLEAN,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS quiz_sessions_account_id_started_at_idx 
  ON quiz_sessions (account_id, started_at DESC);

-- quiz_answers テーブル（新規）
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_ref TEXT NOT NULL,
  answer_value JSONB NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_answers_session_id_idx ON quiz_answers (session_id);

-- quiz_results テーブル（新規、account_quiz_resultsの置き換え）
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  result_type quiz_result_type NOT NULL,
  travel_type_code TEXT,
  travel_type_payload JSONB,
  recommendation_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_results_account_id_created_at_idx 
  ON quiz_results (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quiz_results_session_id_idx ON quiz_results (session_id);

-- recommendation_runs テーブル（新規）
CREATE TABLE IF NOT EXISTS recommendation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  trigger recommendation_trigger NOT NULL,
  input_payload JSONB NOT NULL DEFAULT '{}',
  model_metadata JSONB NOT NULL DEFAULT '{}',
  status job_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS recommendation_runs_account_id_created_at_idx 
  ON recommendation_runs (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_runs_status_idx ON recommendation_runs (status);

-- recommendation_items テーブル（新規）
CREATE TABLE IF NOT EXISTS recommendation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES recommendation_runs(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  place_id TEXT,
  rank INTEGER NOT NULL,
  score NUMERIC,
  presentation_payload JSONB NOT NULL DEFAULT '{}',
  presented_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS recommendation_items_run_id_rank_idx 
  ON recommendation_items (run_id, rank);
CREATE INDEX IF NOT EXISTS recommendation_items_activity_id_idx ON recommendation_items (activity_id);

-- chat_sessions テーブル（新規、chatbot_conversationsの置き換え）
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  session_type chat_session_type NOT NULL DEFAULT 'assistant',
  state JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS chat_sessions_account_id_started_at_idx 
  ON chat_sessions (account_id, started_at DESC);

-- chat_messages テーブル（新規、chatbot_messagesの置き換え）
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_created_at_idx 
  ON chat_messages (session_id, created_at);

-- generated_activities テーブル（新規）
CREATE TABLE IF NOT EXISTS generated_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  draft_slug TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  body_mdx TEXT NOT NULL,
  source_place_id TEXT,
  status generated_activity_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS generated_activities_chat_session_id_idx 
  ON generated_activities (chat_session_id);
CREATE INDEX IF NOT EXISTS generated_activities_status_idx ON generated_activities (status);

-- generated_activity_saves テーブル（新規）
CREATE TABLE IF NOT EXISTS generated_activity_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_activity_id UUID NOT NULL REFERENCES generated_activities(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source generated_activity_save_source NOT NULL,
  interaction_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (generated_activity_id, account_id)
);

CREATE INDEX IF NOT EXISTS generated_activity_saves_account_id_idx 
  ON generated_activity_saves (account_id);

-- ============================================
-- 8. Content & Publishing テーブル
-- ============================================

-- articles テーブル（新規）
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  summary TEXT,
  cover_image_url TEXT,
  body_mdx TEXT NOT NULL,
  status article_status NOT NULL DEFAULT 'draft',
  author_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, language)
);

CREATE UNIQUE INDEX IF NOT EXISTS articles_slug_published_unique 
  ON articles (slug) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS articles_status_published_at_idx 
  ON articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_language_published_at_idx 
  ON articles (language, published_at DESC);

-- article_versions テーブル（新規）
CREATE TABLE IF NOT EXISTS article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_mdx TEXT NOT NULL,
  editor_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, language, version_number)
);

CREATE INDEX IF NOT EXISTS article_versions_article_id_idx 
  ON article_versions (article_id, language, version_number DESC);

-- article_translations テーブル（新規）
CREATE TABLE IF NOT EXISTS article_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_mdx TEXT NOT NULL,
  status article_status NOT NULL DEFAULT 'draft',
  translator_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, language)
);

CREATE INDEX IF NOT EXISTS article_translations_language_status_idx 
  ON article_translations (language, status);
CREATE INDEX IF NOT EXISTS article_translations_article_id_status_idx 
  ON article_translations (article_id, status);

-- ============================================
-- 9. Vendor & Operations テーブル
-- ============================================

-- vendors テーブル（新規）
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- vendor_members テーブル（新規）
CREATE TABLE IF NOT EXISTS vendor_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  supabase_user_id UUID,
  role TEXT NOT NULL CHECK (role IN ('admin','staff')),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE (vendor_id, account_id)
);

CREATE INDEX IF NOT EXISTS vendor_members_vendor_id_idx ON vendor_members (vendor_id);
CREATE INDEX IF NOT EXISTS vendor_members_account_id_idx ON vendor_members (account_id);

-- activity_vendor_map テーブル（新規）
CREATE TABLE IF NOT EXISTS activity_vendor_map (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('owner','partner')),
  PRIMARY KEY (activity_id, vendor_id)
);

-- audit_events テーブル（新規）
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  performed_by UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_entity_type_entity_id_idx 
  ON audit_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx 
  ON audit_events (created_at DESC);

-- ============================================
-- 10. トリガー関数の作成
-- ============================================

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- accounts テーブルの updated_at トリガー
DROP TRIGGER IF EXISTS touch_accounts_updated_at ON accounts;
CREATE TRIGGER touch_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- account_profiles テーブルの updated_at トリガー
DROP TRIGGER IF EXISTS touch_account_profiles_updated_at ON account_profiles;
CREATE TRIGGER touch_account_profiles_updated_at
  BEFORE UPDATE ON account_profiles
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- activities テーブルの updated_at トリガー（既存テーブルに追加）
DROP TRIGGER IF EXISTS touch_activities_updated_at ON activities;
CREATE TRIGGER touch_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- activity_interactions テーブルの updated_at トリガー
DROP TRIGGER IF EXISTS touch_activity_interactions_updated_at ON activity_interactions;
CREATE TRIGGER touch_activity_interactions_updated_at
  BEFORE UPDATE ON activity_interactions
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- generated_activities テーブルの updated_at トリガー
DROP TRIGGER IF EXISTS touch_generated_activities_updated_at ON generated_activities;
CREATE TRIGGER touch_generated_activities_updated_at
  BEFORE UPDATE ON generated_activities
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- articles テーブルの updated_at トリガー
DROP TRIGGER IF EXISTS touch_articles_updated_at ON articles;
CREATE TRIGGER touch_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- article_translations テーブルの updated_at トリガー
DROP TRIGGER IF EXISTS touch_article_translations_updated_at ON article_translations;
CREATE TRIGGER touch_article_translations_updated_at
  BEFORE UPDATE ON article_translations
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

COMMIT;

-- ============================================
-- 注意事項
-- ============================================
-- 1. 既存テーブル（account_linkages, account_metadata, activities, form_submissions, reviews）は保持
-- 2. account_linkages が accounts テーブルを参照する場合は、後で ALTER TABLE で FK を追加
-- 3. RLS ポリシーは別途マイグレーションで設定
-- 4. データ移行は別途スクリプトで実行



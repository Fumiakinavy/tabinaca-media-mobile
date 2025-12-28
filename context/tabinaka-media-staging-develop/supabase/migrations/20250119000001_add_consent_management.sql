-- ============================================
-- Cookie同意管理マイグレーション
-- ============================================
-- 目的: セクション1「Consent & Governance」のための同意管理機能を追加
-- ============================================

BEGIN;

-- ============================================
-- 1. account_profiles.preferences に同意情報を保存するための構造を定義
-- ============================================

COMMENT ON COLUMN account_profiles.preferences IS 
'ユーザーの設定とCookie同意情報を保存するJSONBカラム。
構造例:
{
  "consent": {
    "version": "1.0",
    "timestamp": "2025-01-19T00:00:00Z",
    "preferences": {
      "necessary": true,
      "analytics": false,
      "marketing": false,
      "personalization": false
    }
  },
  "notifications": { ... },
  "display": { ... }
}';

-- ============================================
-- 2. 同意履歴テーブルの作成（監査用）
-- ============================================

CREATE TABLE IF NOT EXISTS consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,
  preferences JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consent_history_account_id_idx 
  ON consent_history (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS consent_history_created_at_idx 
  ON consent_history (created_at DESC);

COMMENT ON TABLE consent_history IS 
'ユーザーのCookie同意履歴を記録するテーブル。
GDPR/個人情報保護法のコンプライアンス対応とデータガバナンスのために使用。';

-- ============================================
-- 3. データ削除リクエストテーブルの作成
-- ============================================

CREATE TYPE deletion_request_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  request_reason TEXT,
  status deletion_request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processed_by TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS data_deletion_requests_account_id_idx 
  ON data_deletion_requests (account_id);

CREATE INDEX IF NOT EXISTS data_deletion_requests_status_idx 
  ON data_deletion_requests (status, requested_at);

COMMENT ON TABLE data_deletion_requests IS 
'ユーザーからのデータ削除リクエストを管理するテーブル。
同意撤回時やアカウント削除時のデータ削除処理を追跡。';

-- ============================================
-- 4. 同意撤回時のトリガー関数（将来の拡張用）
-- ============================================

CREATE OR REPLACE FUNCTION handle_consent_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  -- 同意が撤回された場合（全てfalseになった場合）
  IF NEW.preferences->'consent'->'preferences'->>'analytics' = 'false' 
     AND NEW.preferences->'consent'->'preferences'->>'marketing' = 'false' 
     AND NEW.preferences->'consent'->'preferences'->>'personalization' = 'false' THEN
    
    -- データ削除リクエストの自動作成は行わない
    -- （明示的なアカウント削除リクエストのみ対応）
    RAISE NOTICE 'Consent withdrawn for account %', NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーは作成するがデフォルトでは無効化
-- CREATE TRIGGER consent_withdrawal_trigger
-- AFTER UPDATE OF preferences ON account_profiles
-- FOR EACH ROW
-- EXECUTE FUNCTION handle_consent_withdrawal();

COMMIT;


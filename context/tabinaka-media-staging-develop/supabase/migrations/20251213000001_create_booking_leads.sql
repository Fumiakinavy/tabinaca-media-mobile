-- ============================================
-- booking_leads テーブル作成マイグレーション
-- ============================================
-- 目的: availability導線のフォーム送信をDBに保存し、
--       「どのユーザー(account_id)がどのお店(place_id)に
--       登録しようとしたか」を追跡できるようにする。
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS booking_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID,
  place_id TEXT NOT NULL,
  place_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  booking_url TEXT,
  page_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- accounts との参照（accountが存在しないケースもあるため、追加は後段）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'accounts'
  ) THEN
    ALTER TABLE booking_leads
      ADD CONSTRAINT booking_leads_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- no-op
END $$;

CREATE INDEX IF NOT EXISTS booking_leads_created_at_idx
  ON booking_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS booking_leads_account_id_idx
  ON booking_leads (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS booking_leads_place_id_idx
  ON booking_leads (place_id, created_at DESC);

CREATE INDEX IF NOT EXISTS booking_leads_email_idx
  ON booking_leads (email, created_at DESC);

ALTER TABLE booking_leads ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE booking_leads IS
'availability導線のリード（氏名/メール）を記録するテーブル。
account_id（Cookie）とplace_id（Google Place ID）で紐付け可能。';

COMMIT;


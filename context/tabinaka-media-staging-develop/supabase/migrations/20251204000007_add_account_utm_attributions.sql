BEGIN;

-- Account UTM attribution table
CREATE TABLE IF NOT EXISTS account_utm_attributions (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  first_touch JSONB,
  last_touch JSONB,
  first_touch_at TIMESTAMPTZ,
  last_touch_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_utm_attributions_last_touch_at_idx
  ON account_utm_attributions (last_touch_at DESC NULLS LAST);

ALTER TABLE account_utm_attributions ENABLE ROW LEVEL SECURITY;

-- Service role can manage everything (create only if absent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_utm_attributions'
      AND policyname = 'Service role can manage UTM attributions'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage UTM attributions"
      ON account_utm_attributions FOR ALL
      USING (is_service_role())
      WITH CHECK (is_service_role())';
  END IF;
END $$;

-- Accounts can read their own attribution (create only if absent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_utm_attributions'
      AND policyname = 'Accounts can view own UTM attribution'
  ) THEN
    EXECUTE 'CREATE POLICY "Accounts can view own UTM attribution"
      ON account_utm_attributions FOR SELECT
      USING (account_id = auth_account_id())';
  END IF;
END $$;

COMMIT;

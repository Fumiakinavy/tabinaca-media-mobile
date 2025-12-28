-- ============================================
-- バックアップデータから新スキーマへの移行
-- ============================================
-- 目的: バックアップテーブルから新スキーマのテーブルへデータを移行
-- 注意: 既存データがある場合はスキップ（重複防止）
-- ============================================

BEGIN;

-- ============================================
-- 1. activity_likes → activity_interactions への移行
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'backup_activity_likes') THEN
    INSERT INTO activity_interactions (
  account_id,
  activity_slug,
  activity_id,
  interaction_type,
  metadata,
  created_at
)
SELECT DISTINCT ON (backup.account_id, backup.activity_slug)
  backup.account_id,
  backup.activity_slug,
  a.id AS activity_id,
  'like'::interaction_type,
  jsonb_build_object(
    'migrated_from', 'activity_likes',
    'source_type', 'migration'
  ) AS metadata,
  COALESCE(backup.created_at, now()) AS created_at
FROM backup_activity_likes backup
LEFT JOIN activities a ON a.slug = backup.activity_slug
WHERE backup.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM activity_interactions ai
    WHERE ai.account_id = backup.account_id
      AND ai.activity_slug = backup.activity_slug
      AND ai.interaction_type = 'like'
  )
ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 2. offline_likes → activity_interactions への移行
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'backup_offline_likes') THEN
    INSERT INTO activity_interactions (
  account_id,
  activity_slug,
  activity_id,
  interaction_type,
  metadata,
  created_at
)
SELECT DISTINCT ON (backup.account_id, backup.activity_slug)
  backup.account_id,
  backup.activity_slug,
  a.id AS activity_id,
  'like'::interaction_type,
  jsonb_build_object(
    'migrated_from', 'offline_likes',
    'source_type', 'migration'
  ) AS metadata,
  now() AS created_at
FROM backup_offline_likes backup
LEFT JOIN activities a ON a.slug = backup.activity_slug
WHERE backup.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM activity_interactions ai
    WHERE ai.account_id = backup.account_id
      AND ai.activity_slug = backup.activity_slug
      AND ai.interaction_type = 'like'
  )
ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 3. account_quiz_results → quiz_results への移行
-- ============================================
-- 注意: quiz_sessions を先に作成する必要がある

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'backup_account_quiz_results') THEN
    -- 既存のaccount_quiz_resultsからquiz_sessionsを作成
    INSERT INTO quiz_sessions (
  account_id,
  status,
  started_at,
  completed_at,
  metadata
)
SELECT DISTINCT ON (backup.account_id)
  backup.account_id,
  'completed'::quiz_session_status,
  COALESCE(backup.created_at, now()) AS started_at,
  COALESCE(backup.created_at, now()) AS completed_at,
  jsonb_build_object(
    'migrated_from', 'account_quiz_results',
    'original_id', backup.id
  ) AS metadata
FROM backup_account_quiz_results backup
WHERE backup.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM quiz_sessions qs
    WHERE qs.account_id = backup.account_id
      AND qs.metadata->>'migrated_from' = 'account_quiz_results'
  )
ON CONFLICT DO NOTHING;

    -- quiz_results への移行
    INSERT INTO quiz_results (
  session_id,
  account_id,
  result_type,
  travel_type_code,
  travel_type_payload,
  recommendation_snapshot,
  created_at
)
SELECT
  qs.id AS session_id,
  backup.account_id,
  'travel_type'::quiz_result_type,
  backup.travel_type_code,
  backup.travel_type_payload,
  backup.recommendation_snapshot,
  COALESCE(backup.created_at, now())
FROM backup_account_quiz_results backup
INNER JOIN quiz_sessions qs ON qs.account_id = backup.account_id
  AND qs.metadata->>'migrated_from' = 'account_quiz_results'
WHERE backup.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM quiz_results qr
    WHERE qr.account_id = backup.account_id
      AND qr.travel_type_code = backup.travel_type_code
  )
ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 4. user_attributes → account_profiles への移行
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'backup_user_attributes') THEN
    INSERT INTO account_profiles (
  account_id,
  demographics,
  updated_at
)
SELECT DISTINCT ON (backup.account_id)
  backup.account_id,
  jsonb_build_object(
    'country_code', backup.country_code,
    'age_range', backup.age_range,
    'travel_style', backup.travel_style,
    'migrated_from', 'user_attributes'
  ) AS demographics,
  now() AS updated_at
FROM backup_user_attributes backup
WHERE backup.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM account_profiles ap
    WHERE ap.account_id = backup.account_id
  )
ON CONFLICT (account_id) DO UPDATE
SET demographics = EXCLUDED.demographics,
    updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- ============================================
-- 5. user_preferences → account_profiles.preferences への移行
-- ============================================

DO $$
BEGIN
  -- backup_user_preferencesテーブルが存在し、account_idカラムがある場合のみ移行
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'backup_user_preferences'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'backup_user_preferences' AND column_name = 'account_id'
  ) THEN
    -- account_profilesが存在する場合は更新
    UPDATE account_profiles ap
    SET preferences = COALESCE(ap.preferences, '{}'::jsonb) || COALESCE(backup.preferences, '{}'::jsonb) || jsonb_build_object('migrated_from', 'user_preferences'),
        updated_at = GREATEST(ap.updated_at, now())
    FROM backup_user_preferences backup
    WHERE ap.account_id = backup.account_id
      AND backup.account_id IS NOT NULL;

    -- account_profilesが存在しない場合は作成
    INSERT INTO account_profiles (
      account_id,
      preferences,
      updated_at
    )
    SELECT DISTINCT ON (backup.account_id)
      backup.account_id,
      COALESCE(backup.preferences, '{}'::jsonb) || jsonb_build_object('migrated_from', 'user_preferences') AS preferences,
      now() AS updated_at
    FROM backup_user_preferences backup
    WHERE backup.account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_profiles ap
        WHERE ap.account_id = backup.account_id
      )
    ON CONFLICT (account_id) DO UPDATE
    SET preferences = EXCLUDED.preferences,
        updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- ============================================
-- 6. chatbot_conversations → chat_sessions への移行
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'backup_chatbot_conversations') THEN
    -- account_idカラムの存在確認
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'backup_chatbot_conversations' 
        AND column_name = 'account_id'
    ) THEN
      INSERT INTO chat_sessions (
        account_id,
        session_type,
        state,
        started_at,
        last_activity_at,
        closed_at,
        metadata
      )
      SELECT DISTINCT ON (backup.id)
        backup.account_id,
        'assistant'::text::chat_session_type,
        jsonb_build_object(
          'migrated_from', 'chatbot_conversations',
          'original_id', backup.id
        ) AS state,
        COALESCE(backup.started_at, now()) AS started_at,
        COALESCE(backup.started_at, now()) AS last_activity_at,
        NULL::TIMESTAMPTZ AS closed_at,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'backup_chatbot_conversations' 
              AND column_name = 'status'
          ) THEN jsonb_build_object(
            'migrated_from', 'chatbot_conversations',
            'original_status', backup.status
          )
          ELSE jsonb_build_object(
            'migrated_from', 'chatbot_conversations'
          )
        END AS metadata
      FROM backup_chatbot_conversations backup
      WHERE backup.account_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM chat_sessions cs
          WHERE cs.metadata->>'migrated_from' = 'chatbot_conversations'
            AND (cs.metadata->>'original_id')::text = backup.id::text
        )
      ON CONFLICT DO NOTHING;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'backup_chatbot_conversations' 
        AND column_name = 'user_id'
    ) THEN
      -- user_idからaccount_idを解決して移行
      INSERT INTO chat_sessions (
        account_id,
        session_type,
        state,
        started_at,
        last_activity_at,
        closed_at,
        metadata
      )
      SELECT DISTINCT ON (backup.id)
        al.account_id,
        'assistant'::text::chat_session_type,
        jsonb_build_object(
          'migrated_from', 'chatbot_conversations',
          'original_id', backup.id
        ) AS state,
        COALESCE(backup.started_at, now()) AS started_at,
        COALESCE(backup.started_at, now()) AS last_activity_at,
        NULL::TIMESTAMPTZ AS closed_at,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'backup_chatbot_conversations' 
              AND column_name = 'status'
          ) THEN jsonb_build_object(
            'migrated_from', 'chatbot_conversations',
            'original_status', backup.status
          )
          ELSE jsonb_build_object(
            'migrated_from', 'chatbot_conversations'
          )
        END AS metadata
      FROM backup_chatbot_conversations backup
      LEFT JOIN account_linkages al ON al.supabase_user_id = backup.user_id
      WHERE al.account_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM chat_sessions cs
          WHERE cs.metadata->>'migrated_from' = 'chatbot_conversations'
            AND (cs.metadata->>'original_id')::text = backup.id::text
        )
      ON CONFLICT DO NOTHING;
    END IF;

    -- chatbot_messages → chat_messages への移行
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'backup_chatbot_messages') THEN
      INSERT INTO chat_messages (
        session_id,
        role,
        content,
        created_at
      )
      SELECT
        cs.id AS session_id,
        CASE 
          WHEN backup.role = 'user' THEN 'user'
          WHEN backup.role = 'assistant' THEN 'assistant'
          ELSE 'assistant'
        END AS role,
        backup.content,
        COALESCE(backup.created_at, now())
      FROM backup_chatbot_messages backup
      INNER JOIN chat_sessions cs ON cs.metadata->>'migrated_from' = 'chatbot_conversations'
        AND (cs.metadata->>'original_id')::text = backup.conversation_id::text
      WHERE NOT EXISTS (
        SELECT 1 FROM chat_messages cm
        WHERE cm.session_id = cs.id
          AND cm.content = backup.content
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- ============================================
-- 8. 移行結果の確認クエリ（実行後に確認用）
-- ============================================
-- 以下のクエリで移行結果を確認できます:
--
-- SELECT 
--   'activity_interactions' AS target_table,
--   COUNT(*) AS migrated_count
-- FROM activity_interactions
-- WHERE source_type = 'migration'
-- UNION ALL
-- SELECT 
--   'quiz_results' AS target_table,
--   COUNT(*) AS migrated_count
-- FROM quiz_results qr
-- INNER JOIN quiz_sessions qs ON qr.session_id = qs.id
-- WHERE qs.metadata->>'migrated_from' = 'account_quiz_results'
-- UNION ALL
-- SELECT 
--   'account_profiles' AS target_table,
--   COUNT(*) AS migrated_count
-- FROM account_profiles
-- WHERE demographics->>'migrated_from' IN ('user_attributes', 'user_preferences')
--    OR preferences->>'migrated_from' = 'user_preferences'
-- UNION ALL
-- SELECT 
--   'chat_sessions' AS target_table,
--   COUNT(*) AS migrated_count
-- FROM chat_sessions
-- WHERE metadata->>'migrated_from' = 'chatbot_conversations';

COMMIT;


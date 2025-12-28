-- ============================================
-- 2. データ移行 (Quiz Results -> Quiz Sessions)
-- ============================================

BEGIN;

-- 2-1. Migrate Account Profiles -> accounts.profile
-- (Only if account_profiles exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_profiles') THEN
    WITH profile_data AS (
        SELECT 
            account_id,
            to_jsonb(ap.*) - 'account_id' as profile_json
        FROM account_profiles ap
    )
    UPDATE accounts a
    SET profile = pd.profile_json
    FROM profile_data pd
    WHERE a.id = pd.account_id;
  END IF;
END $$;


-- 2-2. Migrate Quiz Data from `quiz_results` ONLY
-- Scenario: `quiz_sessions` table did not exist before, only `quiz_results` held the completed state.
-- We create new COMPLETED sessions derived purely from these results.

DO $$
BEGIN
  -- Check if quiz_results exists to migrate from
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_results') THEN
    
    INSERT INTO quiz_sessions (
        id,
        account_id,
        status,
        travel_type_code,
        travel_type_payload,
        result,
        answers,
        started_at,
        completed_at,
        updated_at,
        metadata
    )
    SELECT
        -- Use result ID as session ID (or gen_random_uuid() if preferred, but keeping ID is safer for lineage)
        -- Since quiz_results.id is UUID, we can reuse it.
        qr.id,
        
        qr.account_id,
        
        -- Since it's a result, the session is historically 'completed'
        'completed'::quiz_session_status,
        
        -- Direct columns
        qr.travel_type_code,
        qr.travel_type_payload,

        -- Construct Result JSONB from columns
        jsonb_strip_nulls(jsonb_build_object(
            'type', qr.result_type,
            'travelTypeCode', qr.travel_type_code,
            'payload', qr.travel_type_payload,
            'snapshot', qr.recommendation_snapshot
        )),
        
        -- Answers: We assume data is lost or potentially in `quiz_answers`. 
        -- If `quiz_answers` exists, we try to grab it. If not, empty object.
        COALESCE(
            (
                SELECT jsonb_object_agg(qa.question_ref, qa.answer_value)
                FROM quiz_answers qa
                WHERE qa.session_id = qr.session_id -- assuming qr.session_id linked to old session id
            ),
            '{}'::jsonb
        ) AS answers,
        
        -- Timestamps: We only know created_at from result
        qr.created_at as started_at,
        qr.created_at as completed_at,
        qr.created_at as updated_at,
        
        -- Metadata
        jsonb_build_object(
            'migrated_from', 'quiz_results',
            'legacy_session_id', qr.session_id
        )
        
    FROM quiz_results qr
    -- Ensure we don't insert duplicates if run multiple times (check by id)
    WHERE NOT EXISTS (SELECT 1 FROM quiz_sessions qs WHERE qs.id = qr.id);
    
  END IF;
END $$;

COMMIT;

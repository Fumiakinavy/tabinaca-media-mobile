---
title: Domain UML Diagram
description: "tabinaka-media データドメインのUMLクラス図"
last_updated: 2025-11-12
---

# Domain UML Diagram

主要ドメインエンティティの属性と関連をクラス図として表現します。ER図と比較して、ドメインモデルの責務やカードinalityだけでなく、列属性の概要も把握できる構成です。

```mermaid
classDiagram
    class Account {
        +UUID id
        +account_status status
        +JSONB onboarding_state
        +timestamptz created_at
        +timestamptz updated_at
    }

    class AccountLinkage {
        +UUID account_id
        +UUID supabase_user_id
        +text provider_type
        +timestamptz linked_at
        +JSONB metadata
    }

    class AccountProfile {
        +UUID account_id
        +text display_name
        +text locale
        +text timezone
        +JSONB demographics
        +JSONB preferences
        +timestamptz updated_at
    }

    class AccountMetadata {
        +UUID account_id
        +JSONB quiz_state
        +timestamptz last_synced_at
        +JSONB flags
    }

    class Activity {
        +UUID id
        +text slug
        +text title
        +text summary
        +text description
        +activity_status status
        +activity_type activity_type
        +UUID location_id
        +text google_place_id
        +integer duration_minutes
        +text price_tier
        +JSONB metadata
        +boolean is_active
        +timestamptz created_at
        +timestamptz updated_at
    }

    class ActivityInteraction {
        +UUID id
        +UUID account_id
        +UUID activity_id
        +text activity_slug
        +interaction_type interaction_type
        +interaction_source_type source_type
        +UUID source_id
        +integer score_delta
        +JSONB metadata
        +timestamptz created_at
        +timestamptz updated_at
    }

    class ActivityAsset {
        +UUID id
        +UUID activity_id
        +asset_type asset_type
        +text url
        +JSONB metadata
        +boolean is_primary
        +timestamptz created_at
    }

    class FormSubmission {
        +UUID id
        +UUID activity_id
        +text experience_slug
        +text experience_title
        +UUID account_id
        +text email
        +text phone_number
        +text first_name
        +text last_name
        +text country
        +text nationality
        +text[] visit_purposes
        +text stay_duration
        +text[] travel_issues
        +text how_found
        +text how_found_other
        +text mode
        +boolean agree_to_terms
        +text booking_id
        +text coupon_code
        +date booking_date
        +booking_status status
        +integer scans_used
        +integer max_scans
        +JSONB qr_code_data
        +text user_agent
        +text ip_address
        +text referrer
        +timestamptz created_at
        +timestamptz updated_at
    }

    class Voucher {
        +UUID id
        +UUID form_submission_id
        +text voucher_code
        +text qr_token
        +timestamptz valid_from
        +timestamptz valid_until
        +integer max_redemptions
        +integer redemptions_used
        +JSONB metadata
        +timestamptz created_at
    }

    class VoucherRedemption {
        +UUID id
        +UUID voucher_id
        +UUID vendor_member_id
        +JSONB scan_context
        +timestamptz scanned_at
    }

    class QuizSession {
        +UUID id
        +UUID account_id
        +UUID quiz_form_id
        +quiz_session_status status
        +timestamptz started_at
        +timestamptz completed_at
        +boolean location_permission
        +JSONB metadata
    }

    class QuizAnswer {
        +UUID id
        +UUID session_id
        +text question_ref
        +text answer_value
        +timestamptz answered_at
    }

    class QuizResult {
        +UUID id
        +UUID session_id
        +UUID account_id
        +quiz_result_type result_type
        +text travel_type_code
        +JSONB travel_type_payload
        +JSONB recommendation_snapshot
        +timestamptz created_at
    }

    class RecommendationRun {
        +UUID id
        +UUID account_id
        +recommendation_trigger trigger
        +JSONB input_payload
        +JSONB model_metadata
        +job_status status
        +timestamptz created_at
        +timestamptz completed_at
    }

    class RecommendationItem {
        +UUID id
        +UUID run_id
        +UUID activity_id
        +text place_id
        +integer rank
        +numeric score
        +JSONB presentation_payload
        +timestamptz presented_at
        +timestamptz clicked_at
        +timestamptz dismissed_at
    }

    class ChatSession {
        +UUID id
        +UUID account_id
        +chat_session_type session_type
        +JSONB state
        +timestamptz started_at
        +timestamptz last_activity_at
        +timestamptz closed_at
        +JSONB metadata
    }

    class ChatMessage {
        +UUID id
        +UUID session_id
        +text role
        +text content
        +JSONB tool_calls
        +integer latency_ms
        +timestamptz created_at
    }

    class GeneratedActivity {
        +UUID id
        +UUID chat_session_id
        +text draft_slug
        +text title
        +text summary
        +text body_mdx
        +text source_place_id
        +generated_activity_status status
        +timestamptz created_at
        +timestamptz updated_at
        +JSONB metadata
    }

    class GeneratedActivitySave {
        +UUID id
        +UUID generated_activity_id
        +UUID account_id
        +generated_activity_save_source source
        +UUID interaction_id
        +JSONB metadata
        +timestamptz created_at
    }

    class Vendor {
        +UUID id
        +text name
        +text contact_email
        +text contact_phone
        +JSONB metadata
        +timestamptz created_at
    }

    class VendorMember {
        +UUID id
        +UUID vendor_id
        +UUID account_id
        +UUID supabase_user_id
        +text role
        +timestamptz invited_at
        +timestamptz joined_at
        +text status
    }

    class ActivityVendorMap {
        +UUID activity_id
        +UUID vendor_id
        +text relationship_type
    }

    class AuditEvent {
        +UUID id
        +text entity_type
        +text entity_id
        +text event_type
        +UUID performed_by
        +JSONB payload
        +timestamptz created_at
    }

    Account "1" o-- "many" AccountLinkage : owns
    Account "1" -- "1" AccountProfile : has
    Account "1" -- "1" AccountMetadata : has
    Account "1" o-- "many" ActivityInteraction : engages
    Account "1" o-- "many" QuizSession : starts
    QuizSession "1" o-- "many" QuizAnswer : records
    QuizSession "1" -- "1" QuizResult : produces
    QuizResult "1" o-- "many" RecommendationRun : triggers
    RecommendationRun "1" o-- "many" RecommendationItem : aggregates
    Account "1" o-- "many" ChatSession : initiates
    ChatSession "1" o-- "many" ChatMessage : includes
    ChatSession "1" o-- "many" GeneratedActivity : drafts
    GeneratedActivity "1" o-- "many" GeneratedActivitySave : savedBy
    Activity "1" o-- "many" ActivityInteraction : referencedBy
    Activity "1" o-- "many" ActivityAsset : has
    Activity "1" o-- "many" FormSubmission : bookedBy
    FormSubmission "1" -- "1" Voucher : issues
    Voucher "1" o-- "many" VoucherRedemption : redeemed
    Activity "1" o-- "many" ActivityVendorMap : managedBy
    Vendor "1" o-- "many" VendorMember : includes
    Vendor "1" o-- "many" ActivityVendorMap : owns
    Account "1" o-- "many" AuditEvent : performs
    VendorMember "1" o-- "many" AuditEvent : performs
```

## モデリング方針との対応
- クラス図のプロパティは論理設計で定義されたカラムをそのまま掲載しています。
- ER図に含めなかった補助テーブル（例: `activity_locations`）は、将来拡張としてコメント節で扱う方針です。
- 多態関連（`AuditEvent.performed_by`）は、実際には `entity_type` / `entity_id` の組で対象レコードへ解決する想定です。







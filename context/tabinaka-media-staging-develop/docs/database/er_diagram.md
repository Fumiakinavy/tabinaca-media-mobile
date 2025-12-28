---
title: ER Diagram
description: "tabinaka-media データベースのER図"
last_updated: 2025-11-12
---

# ER Diagram

以下は `docs/database_design.md` で定義された論理モデルを基にした主要テーブル間のER図です。Mermaid記法で記述しているため、対応エディタやGitHub上で視覚化できます。

```mermaid
erDiagram
    ACCOUNTS ||--o{ ACCOUNT_LINKAGES : "has"
    ACCOUNTS ||--|| ACCOUNT_PROFILES : "has"
    ACCOUNTS ||--|| ACCOUNT_METADATA : "has"
    ACCOUNTS ||--o{ ACTIVITY_INTERACTIONS : "creates"
    ACCOUNTS ||--o{ QUIZ_SESSIONS : "starts"
    QUIZ_SESSIONS ||--o{ QUIZ_ANSWERS : "records"
    QUIZ_SESSIONS ||--|| QUIZ_RESULTS : "produces"
    QUIZ_RESULTS ||--o{ RECOMMENDATION_RUNS : "triggers"
    RECOMMENDATION_RUNS ||--o{ RECOMMENDATION_ITEMS : "contains"
    ACCOUNTS ||--o{ CHAT_SESSIONS : "initiates"
    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : "includes"
    CHAT_SESSIONS ||--o{ GENERATED_ACTIVITIES : "drafts"
    GENERATED_ACTIVITIES ||--o{ GENERATED_ACTIVITY_SAVES : "saved as"
    ACTIVITIES ||--o{ ACTIVITY_CATEGORY_MAP : "categorises"
    ACTIVITY_CATEGORIES ||--o{ ACTIVITY_CATEGORY_MAP : ""
    ACTIVITIES ||--o{ ACTIVITY_TAG_MAP : "labels"
    ACTIVITY_TAGS ||--o{ ACTIVITY_TAG_MAP : ""
    ACTIVITIES ||--o{ ACTIVITY_ASSETS : "owns"
    ACTIVITIES ||--o{ FORM_SUBMISSIONS : "books"
    FORM_SUBMISSIONS ||--|| VOUCHERS : "issues"
    VOUCHERS ||--o{ VOUCHER_REDEMPTIONS : "redeems"
    ACTIVITIES ||--o{ ACTIVITY_INTERACTIONS : "engages"
    VENDORS ||--o{ VENDOR_MEMBERS : "includes"
    VENDORS ||--o{ ACTIVITY_VENDOR_MAP : "manages"
    AUDIT_EVENTS }o--|| ACCOUNTS : "performed_by"
    AUDIT_EVENTS }o--|| VENDOR_MEMBERS : "performed_by"
```

## ノート
- 実線は必須関係 (`NOT NULL` FK)、丸付き線は任意関係を示しています。
- `AUDIT_EVENTS` は対象エンティティを `entity_type` / `entity_id` の組み合わせで参照するポリモーフィック関連を想定しています。
- 補助テーブル（例: `activity_locations`）はオプショナル要素としてER図には含めていません。







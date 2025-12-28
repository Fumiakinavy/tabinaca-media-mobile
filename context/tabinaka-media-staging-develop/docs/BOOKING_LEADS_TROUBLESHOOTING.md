# booking_leads permission denied トラブルシューティング

## 症状
- availability クリック時に「Failed to save lead」
- Supabase Logs に `permission denied for table booking_leads`
- `user_name: "authenticator"` が出る

## 原因（今回の確定ポイント）
- PostgREST（`authenticator` ロール）での実行時に権限が不足していた。
- RLS ポリシーだけでは解決せず、GRANT が必要だった。

## まず見るログ
Supabase Logs で以下を確認。
- `event_message`: `permission denied for table booking_leads`
- `user_name`: `authenticator`

この2つが出ていれば **RLSだけでなくGRANT不足** の可能性が高い。

## 確認手順
### 1) RLSポリシー確認
```sql
select * from pg_policies where tablename = 'booking_leads';
```

例（insert許可）:
```sql
create policy "Allow insert booking leads"
on public.booking_leads
for insert
to anon, authenticated
with check (true);
```

### 2) GRANT確認
```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'booking_leads';
```

### 3) ロール別の有効権限チェック
```sql
select
  'anon' as role,
  has_schema_privilege('anon', 'public', 'usage') as schema_usage,
  has_table_privilege('anon', 'public.booking_leads', 'insert') as can_insert
union all
select
  'authenticated' as role,
  has_schema_privilege('authenticated', 'public', 'usage') as schema_usage,
  has_table_privilege('authenticated', 'public.booking_leads', 'insert') as can_insert
union all
select
  'authenticator' as role,
  has_schema_privilege('authenticator', 'public', 'usage') as schema_usage,
  has_table_privilege('authenticator', 'public.booking_leads', 'insert') as can_insert
union all
select
  'service_role' as role,
  has_schema_privilege('service_role', 'public', 'usage') as schema_usage,
  has_table_privilege('service_role', 'public.booking_leads', 'insert') as can_insert;
```

## 解決手順（推奨）
### A. GRANT（authenticator を含めて一括付与）
```sql
grant usage on schema public to anon, authenticated, authenticator, service_role;
grant select, insert, update, delete on table public.booking_leads
to anon, authenticated, authenticator, service_role;
```

### B. 既存テーブル全体に一括GRANT（再発防止）
```sql
grant usage on schema public to anon, authenticated, authenticator, service_role;

grant select, insert, update, delete on all tables in schema public
to anon, authenticated, authenticator, service_role;

grant usage on all sequences in schema public
to anon, authenticated, authenticator, service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to anon, authenticated, authenticator, service_role;

alter default privileges in schema public
grant usage on sequences to anon, authenticated, authenticator, service_role;
```

## 追加の切り分けポイント
- `user_name` が `authenticator` の場合は **service_role が使われていない**。
- session が動いていても、`SUPABASE_SERVICE_ROLE_KEY` の整合性は別問題。
- 本番で別イメージが動いている可能性もあるため、デプロイ中のイメージタグ/Digestの確認が有効。

## 参考
- Supabase Logs の `user_name` は実行ロールの最重要手がかり。
- `permission denied` は **RLSではなく GRANT 不足** が基本。

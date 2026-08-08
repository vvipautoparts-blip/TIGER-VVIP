\set ON_ERROR_STOP on

do $assert_isolation$
declare
  target text;
  policy_count integer;
begin
  foreach target in array array['otp_codes','email_verifications'] loop
    if to_regclass('public.' || target) is null then
      raise exception 'LC05_DRIFT_TABLE_MISSING: %', target;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target
        and c.relrowsecurity = true
        and c.relforcerowsecurity = true
    ) then
      raise exception 'LC05_RLS_NOT_FORCED: %', target;
    end if;

    select count(*) into policy_count
    from pg_policies
    where schemaname = 'public' and tablename = target;
    if policy_count <> 0 then
      raise exception 'LC05_POLICY_SURVIVED: % count=%', target, policy_count;
    end if;

    if has_table_privilege('anon', 'public.' || target, 'SELECT')
       or has_table_privilege('anon', 'public.' || target, 'INSERT')
       or has_table_privilege('anon', 'public.' || target, 'UPDATE')
       or has_table_privilege('anon', 'public.' || target, 'DELETE')
       or has_table_privilege('authenticated', 'public.' || target, 'SELECT')
       or has_table_privilege('authenticated', 'public.' || target, 'INSERT')
       or has_table_privilege('authenticated', 'public.' || target, 'UPDATE')
       or has_table_privilege('authenticated', 'public.' || target, 'DELETE') then
      raise exception 'LC05_BROWSER_PRIVILEGE_SURVIVED: %', target;
    end if;
  end loop;
end
$assert_isolation$;

-- The modern server-only challenge store remains present and untouched by LC05.
do $assert_modern_store$
begin
  if to_regclass('public.phone_otp_challenges') is null then
    raise exception 'LC05_MODERN_PHONE_OTP_STORE_MISSING_AFTER_CONVERGENCE';
  end if;
end
$assert_modern_store$;

drop table public.otp_codes;
drop table public.email_verifications;

select 'LC05_PRODUCTION_DRIFT_CONVERGENCE=PASS' as result;

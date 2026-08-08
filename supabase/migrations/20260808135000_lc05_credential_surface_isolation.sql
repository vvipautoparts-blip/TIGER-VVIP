-- TIGER VVIP LC-05 Credential surface isolation.
-- Converges legacy Production credential tables to server-only access without
-- creating them in clean environments or changing the sovereign phone OTP store.

begin;

do $credential_isolation$
declare
  policy_row record;
begin
  if to_regclass('public.otp_codes') is not null then
    execute 'alter table public.otp_codes enable row level security';
    execute 'alter table public.otp_codes force row level security';

    for policy_row in
      select schemaname, tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and tablename in ('otp_codes', 'email_verifications')
        and tablename = 'otp_codes'
    loop
      execute format('drop policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
    end loop;

    execute 'revoke all privileges on table public.otp_codes from public, anon, authenticated';
  end if;

  if to_regclass('public.email_verifications') is not null then
    execute 'alter table public.email_verifications enable row level security';
    execute 'alter table public.email_verifications force row level security';

    for policy_row in
      select schemaname, tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and tablename in ('otp_codes', 'email_verifications')
        and tablename = 'email_verifications'
    loop
      execute format('drop policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
    end loop;

    execute 'revoke all privileges on table public.email_verifications from public, anon, authenticated';
  end if;
end
$credential_isolation$;

commit;

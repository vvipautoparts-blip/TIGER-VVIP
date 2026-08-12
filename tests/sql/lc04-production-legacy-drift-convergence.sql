\set ON_ERROR_STOP on

-- Every observed legacy policy helper must have moved out of public after the
-- convergence migration is re-applied to the simulated drift state.
do $assert_public_helpers_gone$
declare
  signature text;
begin
  foreach signature in array array[
    'public.user_role_for(uuid)',
    'public.current_user_role()',
    'public.is_field_representative()',
    'public.is_reviewer()',
    'public.is_super_admin()',
    'public.is_team_member(uuid)',
    'public.can_publish_owner(uuid)',
    'public.can_self_update_profile(uuid, text, boolean, uuid, text, text)'
  ] loop
    if to_regprocedure(signature) is not null then
      raise exception 'LC04_DRIFT_PUBLIC_HELPER_STILL_EXPOSED: %', signature;
    end if;
  end loop;
end
$assert_public_helpers_gone$;

-- Because the legacy fixture created all helpers, all private moved objects must now
-- exist with explicit role execution and no PUBLIC inheritance.
do $assert_private_helpers$
declare
  signature text;
  fn oid;
begin
  foreach signature in array array[
    'vvip_private.user_role_for(uuid)',
    'vvip_private.current_user_role()',
    'vvip_private.is_field_representative()',
    'vvip_private.is_reviewer()',
    'vvip_private.is_super_admin()',
    'vvip_private.is_team_member(uuid)',
    'vvip_private.can_publish_owner(uuid)',
    'vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text)'
  ] loop
    fn := to_regprocedure(signature);
    if fn is null then
      raise exception 'LC04_DRIFT_PRIVATE_HELPER_MISSING: %', signature;
    end if;
    if has_function_privilege('public', fn, 'EXECUTE') then
      raise exception 'LC04_DRIFT_PUBLIC_EXECUTE_STILL_GRANTED: %', signature;
    end if;
    if not has_function_privilege('anon', fn, 'EXECUTE') then
      raise exception 'LC04_DRIFT_ANON_POLICY_EXECUTE_MISSING: %', signature;
    end if;
    if not has_function_privilege('authenticated', fn, 'EXECUTE') then
      raise exception 'LC04_DRIFT_AUTH_POLICY_EXECUTE_MISSING: %', signature;
    end if;
  end loop;
end
$assert_private_helpers$;

-- Enumeration RPCs survive only as non-browser executable legacy objects.
do $assert_enumeration_locked$
declare
  signature text;
  fn oid;
begin
  foreach signature in array array[
    'public.lookup_profile_by_email(text)',
    'public.lookup_profile_by_phone(text)'
  ] loop
    fn := to_regprocedure(signature);
    if fn is null then
      raise exception 'LC04_DRIFT_ENUMERATION_FIXTURE_MISSING: %', signature;
    end if;
    if has_function_privilege('public', fn, 'EXECUTE')
       or has_function_privilege('anon', fn, 'EXECUTE')
       or has_function_privilege('authenticated', fn, 'EXECUTE') then
      raise exception 'LC04_DRIFT_ENUMERATION_EXECUTABLE: %', signature;
    end if;
  end loop;
end
$assert_enumeration_locked$;

-- The RLS policy was created against public.is_super_admin() before the move. A
-- successful query after convergence proves the policy dependency remained valid.
begin;
set local role anon;
select count(*) from public.lc04_policy_probe;
rollback;

begin;
set local role authenticated;
select count(*) from public.lc04_policy_probe;
rollback;

-- PostgreSQL should render the preserved policy dependency against the function's new
-- schema identity after ALTER FUNCTION ... SET SCHEMA.
do $assert_policy_dependency_preserved$
declare
  policy_qual text;
begin
  select qual into policy_qual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'lc04_policy_probe'
    and policyname = 'lc04_policy_probe_read';

  if policy_qual is null then
    raise exception 'LC04_DRIFT_POLICY_PROBE_MISSING';
  end if;
  if policy_qual not ilike '%is_super_admin%' then
    raise exception 'LC04_DRIFT_POLICY_DEPENDENCY_LOST: %', policy_qual;
  end if;
end
$assert_policy_dependency_preserved$;

drop table public.lc04_policy_probe;

select 'LC04_LEGACY_DRIFT_CONVERGENCE=PASS' as result;

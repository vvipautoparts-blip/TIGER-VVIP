\set ON_ERROR_STOP on

-- Final LC04 convergence means retirement, not quarantine. No known legacy helper or
-- enumeration RPC may remain in either the public or private namespace.
do $assert_legacy_functions_retired$
declare
  signature text;
begin
  foreach signature in array array[
    'public.lookup_profile_by_email(text)',
    'public.lookup_profile_by_phone(text)',
    'public.user_role_for(uuid)',
    'public.current_user_role()',
    'public.is_field_representative()',
    'public.is_reviewer()',
    'public.is_super_admin()',
    'public.is_team_member(uuid)',
    'public.can_publish_owner(uuid)',
    'public.can_self_update_profile(uuid, text, boolean, uuid, text, text)',
    'vvip_private.user_role_for(uuid)',
    'vvip_private.current_user_role()',
    'vvip_private.is_field_representative()',
    'vvip_private.is_reviewer()',
    'vvip_private.is_super_admin()',
    'vvip_private.is_team_member(uuid)',
    'vvip_private.can_publish_owner(uuid)',
    'vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text)'
  ] loop
    if to_regprocedure(signature) is not null then
      raise exception 'LC04_FINAL_DRIFT_RESIDUE_REMAINS:%', signature;
    end if;
  end loop;
end
$assert_legacy_functions_retired$;

-- The transitional Supabase profile authority must remain gone and the final Clerk
-- table must remain a server-only boundary after cleanup.
do $assert_final_profile_boundary$
declare
  browser_grant_count integer;
  policy_count integer;
  rls_enabled boolean;
  force_rls boolean;
begin
  if to_regclass('public.profiles') is not null then
    raise exception 'LC04_FINAL_DRIFT_PUBLIC_PROFILES_RETURNED';
  end if;

  if to_regprocedure('public.vvip_resolve_own_profile(text)') is not null then
    raise exception 'LC04_FINAL_DRIFT_PROFILE_RESOLVER_RETURNED';
  end if;

  if to_regclass('public.vvip_clerk_profiles') is null then
    raise exception 'LC04_FINAL_DRIFT_CLERK_PROFILE_AUTHORITY_MISSING';
  end if;

  select count(*) into browser_grant_count
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name = 'vvip_clerk_profiles'
    and grantee in ('PUBLIC', 'anon', 'authenticated');

  if browser_grant_count <> 0 then
    raise exception 'LC04_FINAL_DRIFT_CLERK_BROWSER_GRANTS:%', browser_grant_count;
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'vvip_clerk_profiles';

  if policy_count <> 0 then
    raise exception 'LC04_FINAL_DRIFT_CLERK_BROWSER_POLICIES:%', policy_count;
  end if;

  select c.relrowsecurity, c.relforcerowsecurity
  into rls_enabled, force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'vvip_clerk_profiles'
    and c.relkind in ('r', 'p');

  if rls_enabled is distinct from true then
    raise exception 'LC04_FINAL_DRIFT_CLERK_RLS_REQUIRED';
  end if;
  if force_rls is distinct from true then
    raise exception 'LC04_FINAL_DRIFT_CLERK_FORCE_RLS_REQUIRED';
  end if;
end
$assert_final_profile_boundary$;

select 'LC04_TERMINAL_LEGACY_RESIDUE_CONVERGENCE=PASS' as result;

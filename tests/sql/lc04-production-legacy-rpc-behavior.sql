\set ON_ERROR_STOP on

-- Canonical repository rebuilds do not contain the Production-only legacy role helper
-- graph. LC04 must therefore leave both public and private copies absent rather than
-- synthesizing legacy functions into a clean environment.
do $assert_no_synthesized_helpers$
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
      raise exception 'LC04_CANONICAL_HELPER_SYNTHESIZED: %', signature;
    end if;
  end loop;
end
$assert_no_synthesized_helpers$;

-- Legacy browser enumeration and execution machinery, when present in older schemas,
-- must not be directly executable after canonical rebuild/hardening.
do $assert_legacy_rpc_locked$
declare
  signature text;
  fn oid;
begin
  foreach signature in array array[
    'public.lookup_profile_by_email(text)',
    'public.lookup_profile_by_phone(text)',
    'public.handle_new_user()',
    'public.set_profiles_updated_at()',
    'public.rls_auto_enable()',
    'public.parts_sync_vehicle_reference_ids()',
    'public.set_updated_at()'
  ] loop
    fn := to_regprocedure(signature);
    if fn is not null and (
      has_function_privilege('public', fn, 'EXECUTE')
      or has_function_privilege('anon', fn, 'EXECUTE')
      or has_function_privilege('authenticated', fn, 'EXECUTE')
    ) then
      raise exception 'LC04_LEGACY_RPC_EXECUTABLE: %', signature;
    end if;
  end loop;
end
$assert_legacy_rpc_locked$;

-- The historical browser profile resolver was an intermediate recovery boundary.
-- Sovereign profile convergence later retired that RPC and then removed public.profiles
-- without CASCADE. A canonical rebuild must preserve the final fail-closed state rather
-- than recreating the transitional resolver merely to satisfy an older rehearsal.
do $assert_final_profile_boundary$
begin
  if to_regprocedure('public.vvip_resolve_own_profile(text)') is not null then
    raise exception 'LC04_RETIRED_PROFILE_RESOLVER_RETURNED';
  end if;

  if to_regclass('public.profiles') is not null then
    raise exception 'LC04_RETIRED_PUBLIC_PROFILES_RETURNED';
  end if;

  if to_regclass('public.vvip_clerk_profiles') is null then
    raise exception 'LC04_CANONICAL_CLERK_PROFILE_AUTHORITY_MISSING';
  end if;
end
$assert_final_profile_boundary$;

-- Canonical Clerk profile storage is server-managed. Browser roles must have neither
-- table privileges nor RLS policies that could turn it into a second identity authority.
do $assert_canonical_profile_server_only$
declare
  browser_grant_count integer;
  policy_count integer;
  force_rls boolean;
begin
  select count(*) into browser_grant_count
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name = 'vvip_clerk_profiles'
    and grantee in ('PUBLIC', 'anon', 'authenticated');

  if browser_grant_count <> 0 then
    raise exception 'LC04_CANONICAL_PROFILE_BROWSER_GRANTS_REMAIN:%', browser_grant_count;
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'vvip_clerk_profiles';

  if policy_count <> 0 then
    raise exception 'LC04_CANONICAL_PROFILE_BROWSER_POLICIES_REMAIN:%', policy_count;
  end if;

  select c.relforcerowsecurity into force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'vvip_clerk_profiles'
    and c.relkind in ('r', 'p');

  if force_rls is distinct from true then
    raise exception 'LC04_CANONICAL_PROFILE_FORCE_RLS_REQUIRED';
  end if;
end
$assert_canonical_profile_server_only$;

select 'LC04_CANONICAL_SECURITY_BEHAVIOR=PASS' as result;
\set ON_ERROR_STOP on

-- LC04 must remove the observed legacy policy helpers from the exposed public schema.
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
      raise exception 'LC04_PUBLIC_HELPER_STILL_EXPOSED: %', signature;
    end if;
  end loop;
end
$assert_public_helpers_gone$;

-- The moved objects must exist and PUBLIC must not inherit execution.
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
      raise exception 'LC04_PRIVATE_HELPER_MISSING: %', signature;
    end if;
    if has_function_privilege('public', fn, 'EXECUTE') then
      raise exception 'LC04_PUBLIC_EXECUTE_STILL_GRANTED: %', signature;
    end if;
    if not has_function_privilege('anon', fn, 'EXECUTE') then
      raise exception 'LC04_ANON_POLICY_EXECUTE_MISSING: %', signature;
    end if;
    if not has_function_privilege('authenticated', fn, 'EXECUTE') then
      raise exception 'LC04_AUTH_POLICY_EXECUTE_MISSING: %', signature;
    end if;
  end loop;
end
$assert_private_helpers$;

-- Legacy browser enumeration and execution machinery must not be directly executable.
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

-- Profile resolver is the only browser write boundary for profile creation/recovery.
do $assert_profile_boundary$
declare
  fn oid := to_regprocedure('public.vvip_resolve_own_profile(text)');
  definition text;
begin
  if fn is null then
    raise exception 'LC04_PROFILE_RESOLVER_MISSING';
  end if;
  if has_function_privilege('public', fn, 'EXECUTE') or has_function_privilege('anon', fn, 'EXECUTE') then
    raise exception 'LC04_PROFILE_RESOLVER_ANON_EXECUTE';
  end if;
  if not has_function_privilege('authenticated', fn, 'EXECUTE') then
    raise exception 'LC04_PROFILE_RESOLVER_AUTH_EXECUTE_MISSING';
  end if;

  select pg_get_functiondef(fn) into definition;
  if definition ilike '%.clerk.accounts.dev%' then
    raise exception 'LC04_PROFILE_RESOLVER_DEV_ISSUER_HARDCODE';
  end if;
  if definition not ilike '%where lower(email) = v_jwt_email%' then
    raise exception 'LC04_PROFILE_RESOLVER_JWT_EMAIL_BINDING_MISSING';
  end if;
  if definition ilike '%where lower(email) = v_client_email_hint%' then
    raise exception 'LC04_PROFILE_RESOLVER_CLIENT_EMAIL_AUTHORITY';
  end if;
end
$assert_profile_boundary$;

-- Browser table privileges cannot bypass the resolver even if an older permissive RLS
-- policy survives elsewhere in the legacy schema.
do $assert_profile_privileges$
begin
  if has_table_privilege('authenticated', 'public.profiles', 'INSERT') then
    raise exception 'LC04_PROFILE_DIRECT_INSERT_GRANTED';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'LC04_PROFILE_DIRECT_UPDATE_GRANTED';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'DELETE') then
    raise exception 'LC04_PROFILE_DIRECT_DELETE_GRANTED';
  end if;
  if not has_table_privilege('authenticated', 'public.profiles', 'SELECT') then
    raise exception 'LC04_PROFILE_SELF_READ_MISSING';
  end if;
end
$assert_profile_privileges$;

-- Only the authenticated Clerk self-read policy may survive from the Clerk profile trio.
do $assert_clerk_profile_policies$
declare
  read_count integer;
  write_count integer;
begin
  select count(*) into read_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'profiles'
    and policyname = 'Clerk users can read own profile'
    and roles = array['authenticated']::name[];

  select count(*) into write_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'profiles'
    and policyname in ('Clerk users can insert own profile', 'Clerk users can update own profile');

  if read_count <> 1 then
    raise exception 'LC04_CLERK_SELF_READ_POLICY_INVALID';
  end if;
  if write_count <> 0 then
    raise exception 'LC04_CLERK_DIRECT_WRITE_POLICY_SURVIVED';
  end if;
end
$assert_clerk_profile_policies$;

-- Exercise the moved policy helpers under browser roles. These calls must resolve safely
-- and return false/guest-like values when no request JWT is present, not permission errors.
begin;
set local role anon;
select vvip_private.user_role_for(null::uuid);
select vvip_private.current_user_role();
select vvip_private.is_reviewer();
select vvip_private.is_super_admin();
select vvip_private.is_team_member(null::uuid);
select vvip_private.can_publish_owner(null::uuid);
rollback;

begin;
set local role authenticated;
select vvip_private.user_role_for(null::uuid);
select vvip_private.current_user_role();
select vvip_private.is_reviewer();
select vvip_private.is_super_admin();
select vvip_private.is_team_member(null::uuid);
select vvip_private.can_publish_owner(null::uuid);
rollback;

select 'LC04_LOCAL_SECURITY_BEHAVIOR=PASS' as result;

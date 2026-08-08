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

-- Profile resolver is the only browser write boundary for profile creation/recovery.
-- LC04 originally named the signed-JWT email variable v_jwt_email. IDENTITY-01 later
-- strengthened the same boundary and renamed that claim to v_verified_email while
-- removing email-based ownership transfer. Accept either signed-JWT binding shape;
-- never accept the browser-supplied client hint as ownership authority.
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
  if definition not ilike '%where lower(email) = v_jwt_email%'
     and definition not ilike '%where lower(email) = v_verified_email%' then
    raise exception 'LC04_PROFILE_RESOLVER_JWT_EMAIL_BINDING_MISSING';
  end if;
  if definition ilike '%where lower(email) = v_client_email_hint%' then
    raise exception 'LC04_PROFILE_RESOLVER_CLIENT_EMAIL_AUTHORITY';
  end if;
end
$assert_profile_boundary$;

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

select 'LC04_CANONICAL_SECURITY_BEHAVIOR=PASS' as result;

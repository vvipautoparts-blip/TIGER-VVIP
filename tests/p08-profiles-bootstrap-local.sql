\set ON_ERROR_STOP on

begin;

do $$
declare
  v_id_default text;
  v_clerk_nullable boolean;
  v_rls_enabled boolean;
  v_policy_count integer;
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles is missing after the migration chain';
  end if;

  select pg_get_expr(d.adbin, d.adrelid)
  into v_id_default
  from pg_attribute a
  join pg_attrdef d
    on d.adrelid = a.attrelid
   and d.adnum = a.attnum
  where a.attrelid = 'public.profiles'::regclass
    and a.attname = 'id'
    and a.atttypid = 'uuid'::regtype
    and a.attnotnull;

  if v_id_default is null or v_id_default !~* 'gen_random_uuid' then
    raise exception 'profiles.id must be a non-null UUID with gen_random_uuid() default';
  end if;

  if exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
  ) then
    raise exception 'profiles must not depend on auth.users';
  end if;

  select not a.attnotnull
  into v_clerk_nullable
  from pg_attribute a
  where a.attrelid = 'public.profiles'::regclass
    and a.attname = 'clerk_user_id'
    and a.atttypid = 'text'::regtype
    and not a.attisdropped;

  if v_clerk_nullable is distinct from true then
    raise exception 'clerk_user_id must remain nullable during legacy transition';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'profiles'
      and indexname = 'profiles_clerk_user_id_unique_idx'
      and indexdef ~* 'unique'
      and indexdef ~* 'where.*clerk_user_id is not null'
  ) then
    raise exception 'partial unique clerk_user_id index is missing';
  end if;

  select c.relrowsecurity
  into v_rls_enabled
  from pg_class c
  where c.oid = 'public.profiles'::regclass;

  if v_rls_enabled is distinct from true then
    raise exception 'RLS must be enabled on public.profiles';
  end if;

  select count(*)
  into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'profiles';

  if v_policy_count <> 3 then
    raise exception 'expected three Clerk-scoped profiles policies, found %', v_policy_count;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and (
        coalesce(qual, '') ~* '(^|[^a-z])true([^a-z]|$)'
        or coalesce(with_check, '') ~* '(^|[^a-z])true([^a-z]|$)'
      )
  ) then
    raise exception 'open profiles policy detected';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee in ('PUBLIC', 'anon')
  ) then
    raise exception 'PUBLIC or anon must not have direct profiles privileges';
  end if;

  if not has_table_privilege('authenticated', 'public.profiles', 'select')
     or not has_table_privilege('authenticated', 'public.profiles', 'insert')
     or not has_table_privilege('authenticated', 'public.profiles', 'update')
     or has_table_privilege('authenticated', 'public.profiles', 'delete') then
    raise exception 'authenticated profiles privileges differ from the resolver contract';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type not in ('SELECT', 'INSERT', 'UPDATE')
  ) then
    raise exception 'authenticated has privileges beyond select, insert, and update';
  end if;
end
$$;

insert into public.profiles (email, clerk_user_id)
values
  ('profile-isolation-a@example.invalid', 'clerk_profile_isolation_a'),
  ('profile-isolation-b@example.invalid', 'clerk_profile_isolation_b');

set local role authenticated;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"clerk_profile_isolation_a"}';

do $$
declare
  v_visible integer;
  v_updated integer;
begin
  select count(*)
  into v_visible
  from public.profiles
  where clerk_user_id in (
    'clerk_profile_isolation_a',
    'clerk_profile_isolation_b'
  );

  if v_visible <> 1 then
    raise exception 'Clerk user A can see % isolated profiles instead of one', v_visible;
  end if;

  update public.profiles
  set display_name = 'forbidden cross-user update'
  where clerk_user_id = 'clerk_profile_isolation_b';
  get diagnostics v_updated = row_count;

  if v_updated <> 0 then
    raise exception 'Clerk user A updated user B profile';
  end if;

  begin
    insert into public.profiles (email, clerk_user_id)
    values ('profile-isolation-forbidden@example.invalid', 'clerk_profile_isolation_forbidden');
    raise exception 'cross-user profile insert unexpectedly succeeded';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

reset role;
rollback;

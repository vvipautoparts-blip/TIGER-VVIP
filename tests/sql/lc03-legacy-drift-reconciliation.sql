\set ON_ERROR_STOP on

-- Local-only regression probe. It intentionally recreates the known legacy RPC/trigger
-- exposure seen in Production, re-applies the immutable additive LC-03 migration, then
-- re-applies the current resolver-retirement migration. This proves the historical drift
-- can converge into the current sovereign schema without touching any remote database or
-- resurrecting retired runtime authority in the release state.

-- The historical LC-03 migration predates retirement of this resolver and therefore expects
-- the signature to exist. Recreate only a bounded local test double so that the rehearsal
-- faithfully models the old state; the current retirement migration below must remove it.
create or replace function public.vvip_resolve_own_profile(input_identity text)
returns text
language sql
security definer
set search_path = public
as $$
  select input_identity where false;
$$;

grant execute on function public.vvip_resolve_own_profile(text) to anon, authenticated;

create or replace function public.lookup_profile_by_email(input_email text)
returns table(id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select null::uuid, input_email where false;
$$;

create or replace function public.lookup_profile_by_phone(input_phone text)
returns table(id uuid, phone text, email text)
language sql
security definer
set search_path = public
as $$
  select null::uuid, input_phone, null::text where false;
$$;

grant execute on function public.lookup_profile_by_email(text) to anon, authenticated;
grant execute on function public.lookup_profile_by_phone(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$ begin return new; end $$;

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
security definer
as $$ begin return new; end $$;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
as $$ begin return; end $$;

grant execute on function public.handle_new_user() to anon, authenticated;
grant execute on function public.set_profiles_updated_at() to anon, authenticated;
grant execute on function public.rls_auto_enable() to anon, authenticated;

-- Restore deliberately unsafe grants/configuration on canonical trigger helpers when they exist,
-- so the second application of LC-03 must harden them again.
do $probe$
begin
  if to_regprocedure('public.set_vvip_tiger_updated_at()') is not null then
    execute 'alter function public.set_vvip_tiger_updated_at() reset all';
    execute 'grant execute on function public.set_vvip_tiger_updated_at() to anon, authenticated';
  end if;
  if to_regprocedure('public.parts_sync_vehicle_reference_ids()') is not null then
    execute 'alter function public.parts_sync_vehicle_reference_ids() reset all';
    execute 'grant execute on function public.parts_sync_vehicle_reference_ids() to anon, authenticated';
  end if;
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() reset all';
    execute 'grant execute on function public.set_updated_at() to anon, authenticated';
  end if;
end
$probe$;

-- Historical hardening remains immutable. Current sovereign retirement is replayed after it,
-- exactly as the forward migration chain requires.
\i supabase/migrations/20260808003000_lc03_supabase_security_hardening.sql
\i supabase/migrations/20260816104500_retire_legacy_profile_rpc.sql

do $verify$
declare
  fn regprocedure;
  cfg text;
begin
  if to_regprocedure('public.vvip_resolve_own_profile(text)') is not null then
    raise exception 'LC03_RETIRED_PROFILE_RPC_STILL_PRESENT';
  end if;

  foreach fn in array array[
    'public.lookup_profile_by_email(text)'::regprocedure,
    'public.lookup_profile_by_phone(text)'::regprocedure,
    'public.handle_new_user()'::regprocedure,
    'public.set_profiles_updated_at()'::regprocedure,
    'public.rls_auto_enable()'::regprocedure
  ] loop
    if has_function_privilege('anon', fn, 'EXECUTE')
       or has_function_privilege('authenticated', fn, 'EXECUTE') then
      raise exception 'LC03_LEGACY_EXECUTE_STILL_EXPOSED:%', fn;
    end if;
  end loop;

  foreach fn in array array[
    'public.handle_new_user()'::regprocedure,
    'public.set_profiles_updated_at()'::regprocedure,
    'public.rls_auto_enable()'::regprocedure
  ] loop
    select coalesce(array_to_string(p.proconfig, ','), '') into cfg
    from pg_proc p where p.oid = fn::oid;
    if cfg not like '%search_path=pg_catalog%' then
      raise exception 'LC03_LEGACY_SEARCH_PATH_NOT_FIXED:%:%', fn, cfg;
    end if;
  end loop;

  foreach fn in array array[
    to_regprocedure('public.set_vvip_tiger_updated_at()'),
    to_regprocedure('public.parts_sync_vehicle_reference_ids()'),
    to_regprocedure('public.set_updated_at()')
  ] loop
    if fn is not null then
      if has_function_privilege('anon', fn, 'EXECUTE')
         or has_function_privilege('authenticated', fn, 'EXECUTE') then
        raise exception 'LC03_TRIGGER_EXECUTE_STILL_EXPOSED:%', fn;
      end if;
      select coalesce(array_to_string(p.proconfig, ','), '') into cfg
      from pg_proc p where p.oid = fn::oid;
      if cfg not like '%search_path=pg_catalog%' then
        raise exception 'LC03_TRIGGER_SEARCH_PATH_NOT_FIXED:%:%', fn, cfg;
      end if;
    end if;
  end loop;
end
$verify$;

select 'LC03_LEGACY_DRIFT_RECONCILIATION=PASS' as result;

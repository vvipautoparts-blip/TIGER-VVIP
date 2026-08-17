\set ON_ERROR_STOP on

-- Simulate the terminal residue that a real Production database can retain after the
-- historical LC04 migration moved helpers to vvip_private and later migrations retired
-- public.profiles. PostgreSQL intentionally does not track table dependencies inside
-- string-literal SQL function bodies, so these functions can survive as dangling objects.
-- This fixture is local-only and never runs against a linked/remote database.
do $assert_terminal_precondition$
begin
  if to_regclass('public.profiles') is not null then
    raise exception 'LC04_DRIFT_FIXTURE_EXPECTED_PUBLIC_PROFILES_ABSENT';
  end if;
  if to_regclass('public.vvip_clerk_profiles') is null then
    raise exception 'LC04_DRIFT_FIXTURE_CLERK_PROFILE_AUTHORITY_MISSING';
  end if;
end
$assert_terminal_precondition$;

create schema if not exists vvip_private;

create or replace function vvip_private.user_role_for(target_user uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select coalesce(
    (select p.role from public.profiles p where p.id = target_user limit 1),
    'guest'
  );
$function$;

create or replace function vvip_private.current_user_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select vvip_private.user_role_for(auth.uid());
$function$;

create or replace function vvip_private.is_field_representative()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select vvip_private.current_user_role() = 'representative';
$function$;

create or replace function vvip_private.is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select vvip_private.current_user_role() in ('super_admin', 'representative');
$function$;

create or replace function vvip_private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select vvip_private.current_user_role() = 'super_admin';
$function$;

create or replace function vvip_private.is_team_member(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = target_user and p.superior_id = auth.uid()
  );
$function$;

create or replace function vvip_private.can_publish_owner(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = target_user and p.role = 'dealer' and p.is_approved = true
  );
$function$;

create or replace function vvip_private.can_self_update_profile(
  target_id uuid,
  new_role text,
  new_is_approved boolean,
  new_superior_id uuid,
  new_subscription text,
  new_business_status text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = target_id
      and p.role = new_role
      and p.is_approved = new_is_approved
      and p.superior_id is not distinct from new_superior_id
      and p.subscription = new_subscription
      and coalesce(p.business_status, 'active') = coalesce(new_business_status, 'active')
  );
$function$;

grant execute on function vvip_private.user_role_for(uuid) to anon, authenticated;
grant execute on function vvip_private.current_user_role() to anon, authenticated;
grant execute on function vvip_private.is_field_representative() to anon, authenticated;
grant execute on function vvip_private.is_reviewer() to anon, authenticated;
grant execute on function vvip_private.is_super_admin() to anon, authenticated;
grant execute on function vvip_private.is_team_member(uuid) to anon, authenticated;
grant execute on function vvip_private.can_publish_owner(uuid) to anon, authenticated;
grant execute on function vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text) to anon, authenticated;

-- Historical enumeration RPCs were locked but not necessarily removed by LC04. Seed
-- them as public residue so the final forward migration proves total retirement.
create or replace function public.lookup_profile_by_email(p_email text)
returns uuid language sql stable security definer
set search_path = pg_catalog
as $function$ select null::uuid $function$;

create or replace function public.lookup_profile_by_phone(p_phone text)
returns uuid language sql stable security definer
set search_path = pg_catalog
as $function$ select null::uuid $function$;

grant execute on function public.lookup_profile_by_email(text) to public, anon, authenticated;
grant execute on function public.lookup_profile_by_phone(text) to public, anon, authenticated;

select 'LC04_TERMINAL_LEGACY_RESIDUE_FIXTURE=READY' as result;

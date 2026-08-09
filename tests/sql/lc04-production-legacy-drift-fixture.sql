\set ON_ERROR_STOP on

-- Recreate only the security-relevant legacy shapes observed in Production. This is
-- an isolated local rehearsal fixture; it never runs against a linked/remote database.
create or replace function public.user_role_for(target_user uuid)
returns text language sql stable security definer
as $$ select 'guest'::text $$;

create or replace function public.current_user_role()
returns text language sql stable security definer
as $$ select public.user_role_for(auth.uid()) $$;

create or replace function public.is_field_representative()
returns boolean language sql stable security definer
as $$ select public.current_user_role() = 'representative' $$;

create or replace function public.is_reviewer()
returns boolean language sql stable security definer
as $$ select public.current_user_role() in ('super_admin', 'representative') $$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer
as $$ select public.current_user_role() = 'super_admin' $$;

create or replace function public.is_team_member(target_user uuid)
returns boolean language sql stable security definer
as $$ select false $$;

create or replace function public.can_publish_owner(target_user uuid)
returns boolean language sql stable security definer
as $$ select false $$;

create or replace function public.can_self_update_profile(
  target_id uuid,
  new_role text,
  new_is_approved boolean,
  new_superior_id uuid,
  new_subscription text,
  new_business_status text
)
returns boolean language sql stable security definer
as $$ select false $$;

grant execute on function public.user_role_for(uuid) to public, anon, authenticated;
grant execute on function public.current_user_role() to public, anon, authenticated;
grant execute on function public.is_field_representative() to public, anon, authenticated;
grant execute on function public.is_reviewer() to public, anon, authenticated;
grant execute on function public.is_super_admin() to public, anon, authenticated;
grant execute on function public.is_team_member(uuid) to public, anon, authenticated;
grant execute on function public.can_publish_owner(uuid) to public, anon, authenticated;
grant execute on function public.can_self_update_profile(uuid, text, boolean, uuid, text, text) to public, anon, authenticated;

create or replace function public.lookup_profile_by_email(p_email text)
returns uuid language sql stable security definer
as $$ select null::uuid $$;

create or replace function public.lookup_profile_by_phone(p_phone text)
returns uuid language sql stable security definer
as $$ select null::uuid $$;

grant execute on function public.lookup_profile_by_email(text) to public, anon, authenticated;
grant execute on function public.lookup_profile_by_phone(text) to public, anon, authenticated;

-- A policy bound to the legacy function OID proves ALTER FUNCTION ... SET SCHEMA keeps
-- dependent RLS expressions valid after convergence.
drop table if exists public.lc04_policy_probe;
create table public.lc04_policy_probe(id integer primary key);
alter table public.lc04_policy_probe enable row level security;
grant select on public.lc04_policy_probe to anon, authenticated;
create policy lc04_policy_probe_read
on public.lc04_policy_probe
for select
to anon, authenticated
using (public.is_super_admin());

select 'LC04_LEGACY_DRIFT_FIXTURE=READY' as result;

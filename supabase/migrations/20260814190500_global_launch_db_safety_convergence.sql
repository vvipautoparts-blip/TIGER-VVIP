-- TIGER VVIP global-launch DB safety convergence.
-- Forward-only, idempotent hardening. No authority, country, user, listing or financial data is seeded.
-- Production promotion remains a separate exact migration gate after staging evidence.

begin;

-- Supabase anonymous sessions use the authenticated Postgres role.
-- Browser-owned marketplace mutations must therefore require a permanent/custom
-- platform identity, not merely membership in the authenticated DB role.
create or replace function public.vvip_marketplace_actor_id()
returns text
language sql
stable
set search_path = pg_catalog, public
as $function$
    with claims as (
        select coalesce(
            nullif(current_setting('request.jwt.claims', true), '')::jsonb,
            '{}'::jsonb
        ) as value
    )
    select case
        when coalesce((claims.value ->> 'is_anonymous')::boolean, false) is false
             and nullif(claims.value ->> 'sub', '') like 'user\_%' escape '\'
            then nullif(claims.value ->> 'sub', '')
        else null
    end
    from claims;
$function$;

revoke all on function public.vvip_marketplace_actor_id()
from public, anon, authenticated;
grant execute on function public.vvip_marketplace_actor_id()
to anon, authenticated, service_role;

-- Pin search_path on legacy trigger helpers still reported by the Production
-- security advisor. Direct browser execution stays revoked.
do $migration$
begin
    if to_regprocedure('public.parts_sync_vehicle_reference_ids()') is distinct from null then
        execute 'alter function public.parts_sync_vehicle_reference_ids() set search_path = pg_catalog';
        execute 'revoke all on function public.parts_sync_vehicle_reference_ids() from public, anon, authenticated';
    end if;

    if to_regprocedure('public.set_updated_at()') is distinct from null then
        execute 'alter function public.set_updated_at() set search_path = pg_catalog';
        execute 'revoke all on function public.set_updated_at() from public, anon, authenticated';
    end if;
end
$migration$;

commit;

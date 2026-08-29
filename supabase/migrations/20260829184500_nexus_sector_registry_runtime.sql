-- TIGER NEXUS 2026 — authenticated enabled-sector registry for the social composer.
-- Forward-only. The browser receives display metadata only; sector authority remains PostgreSQL-owned.

begin;

create or replace function public.vvip_nexus_sector_registry()
returns table (
    key text,
    label text,
    enabled boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
begin
    if actor is null then
        raise exception 'NEXUS_AUTH_REQUIRED';
    end if;

    return query
    select
        sector.sector_key as key,
        sector.label_ar as label,
        true as enabled
    from public.vvip_marketplace_sectors as sector
    where sector.is_enabled
    order by sector.display_order, sector.sector_key
    limit 100;
end;
$function$;

revoke all on function public.vvip_nexus_sector_registry()
from public, anon, authenticated;
grant execute on function public.vvip_nexus_sector_registry()
to authenticated;

comment on function public.vvip_nexus_sector_registry() is
    'TIGER NEXUS authenticated read-only enabled-sector registry. Returns display metadata only; publication is independently revalidated on write.';

commit;

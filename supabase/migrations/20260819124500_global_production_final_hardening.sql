-- VVIP TIGER final forward-only database hardening before Production promotion.
-- Adds covering indexes identified by the Staging database advisor and removes
-- unnecessary direct browser EXECUTE from the legacy parts synchronization trigger.

begin;

create index if not exists vvip_ad_campaigns_country_code_idx
  on public.vvip_ad_campaigns(country_code);

create index if not exists vvip_ad_payments_country_code_idx
  on public.vvip_ad_payments(country_code);

create index if not exists vvip_marketplace_country_sector_activation_sector_idx
  on public.vvip_marketplace_country_sector_activation(sector_code);

create index if not exists vvip_marketplace_listings_sector_idx
  on public.vvip_marketplace_listings(sector);

create index if not exists vvip_marketplace_reports_listing_idx
  on public.vvip_marketplace_reports(listing_id);

alter function public.parts_sync_vehicle_reference_ids()
  set search_path = pg_catalog, public;
revoke all on function public.parts_sync_vehicle_reference_ids() from public, anon, authenticated;

commit;

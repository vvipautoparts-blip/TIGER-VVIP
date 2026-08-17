-- VVIP TIGER — public API least-privilege hardening.
-- Public projections execute with caller privileges. Base relations expose only
-- the exact canonical/catalog columns needed by those projections.

begin;

-- Canonical media rows are publicly discoverable only for ACTIVE listings in
-- an active country. Raw object identity and trust evidence stay ungranted.
drop policy if exists vvip_marketplace_media_public_canonical_read
on public.vvip_marketplace_listing_media;

create policy vvip_marketplace_media_public_canonical_read
on public.vvip_marketplace_listing_media
for select
to anon, authenticated
using (
    finalization_state = 'CANONICAL'
    and canonical_storage_path is not null
    and exists (
        select 1
        from public.vvip_marketplace_listings listing
        where listing.listing_id = vvip_marketplace_listing_media.listing_id
          and listing.status = 'ACTIVE'
          and vvip_private.vvip_marketplace_country_is_active(listing.active_market_country)
    )
);

revoke select on public.vvip_marketplace_listing_media from anon, authenticated;
grant select (
    media_id,
    listing_id,
    canonical_storage_path,
    finalization_state,
    position,
    is_cover,
    alt_text
) on public.vvip_marketplace_listing_media to anon, authenticated;

alter view public.vvip_marketplace_public_feed set (security_invoker = true);

-- Visibility catalog has no private payment receipt/provider data. Caller-side
-- RLS permits only currently active, country-approved plan rows.
drop policy if exists vvip_visibility_plans_public_active_read
on public.vvip_visibility_plans;

create policy vvip_visibility_plans_public_active_read
on public.vvip_visibility_plans
for select
to anon, authenticated
using (
    plan_state = 'ACTIVE'
    and statement_timestamp() >= valid_from
    and (valid_until is null or statement_timestamp() < valid_until)
    and vvip_private.vvip_marketplace_country_is_active(country_code)
    and (
        sector is null
        or exists (
            select 1
            from public.vvip_marketplace_sectors enabled_sector
            where enabled_sector.sector_key = vvip_visibility_plans.sector
              and enabled_sector.is_enabled
        )
    )
);

revoke select on public.vvip_visibility_plans from anon, authenticated;
grant select (
    plan_id,
    country_code,
    sector,
    display_name,
    price_minor,
    currency_code,
    pulse_impressions,
    activation_duration_minutes,
    policy_version,
    plan_state,
    valid_from,
    valid_until
) on public.vvip_visibility_plans to anon, authenticated;

alter view public.vvip_visibility_plan_catalog set (security_invoker = true);

commit;

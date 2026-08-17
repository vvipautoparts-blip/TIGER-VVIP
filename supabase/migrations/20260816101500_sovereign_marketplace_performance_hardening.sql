-- VVIP TIGER — marketplace performance hardening after live staging advisors.
-- Keeps the public/owner media semantics while avoiding duplicate permissive
-- SELECT policies for authenticated callers and covering new foreign keys.

begin;

create index if not exists vvip_listing_activation_entitlements_plan_idx
    on public.vvip_listing_activation_entitlements (plan_id, entitlement_state, listing_id);

create index if not exists vvip_marketplace_listings_sector_idx
    on public.vvip_marketplace_listings (sector, status, active_market_country);

create index if not exists vvip_visibility_plans_sector_idx
    on public.vvip_visibility_plans (sector, plan_state, country_code);

-- One permissive SELECT policy per caller role. Authenticated Clerk actors may
-- read their own safe media projection, and—as any public visitor may—canonical
-- media attached to ACTIVE listings in an active market.
drop policy if exists vvip_marketplace_media_owner_read
on public.vvip_marketplace_listing_media;

drop policy if exists vvip_marketplace_media_public_canonical_read
on public.vvip_marketplace_listing_media;

drop policy if exists vvip_marketplace_media_authenticated_read
on public.vvip_marketplace_listing_media;

drop policy if exists vvip_marketplace_media_anon_canonical_read
on public.vvip_marketplace_listing_media;

create policy vvip_marketplace_media_authenticated_read
on public.vvip_marketplace_listing_media
for select
to authenticated
using (
    owner_subject = public.vvip_marketplace_actor_id()
    or (
        finalization_state = 'CANONICAL'
        and canonical_storage_path is not null
        and exists (
            select 1
            from public.vvip_marketplace_listings listing
            where listing.listing_id = vvip_marketplace_listing_media.listing_id
              and listing.status = 'ACTIVE'
              and vvip_private.vvip_marketplace_country_is_active(listing.active_market_country)
        )
    )
);

create policy vvip_marketplace_media_anon_canonical_read
on public.vvip_marketplace_listing_media
for select
to anon
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

commit;

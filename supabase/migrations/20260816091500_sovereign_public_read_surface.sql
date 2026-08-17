-- VVIP TIGER — sovereign public marketplace read surface.
-- Public discovery is projected from canonical media only. Raw media metadata
-- and raw storage paths remain visible only to the owning authenticated user.

begin;

-- ---------------------------------------------------------------------------
-- Remove the historical public media-table policy. Authenticated owners retain
-- direct access to their own rows for draft/media management; anonymous users
-- receive no direct SELECT privilege on the raw media relation.
-- ---------------------------------------------------------------------------

drop policy if exists vvip_marketplace_media_read
on public.vvip_marketplace_listing_media;

drop policy if exists vvip_marketplace_media_owner_read
on public.vvip_marketplace_listing_media;

create policy vvip_marketplace_media_owner_read
on public.vvip_marketplace_listing_media
for select
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id());

revoke select on public.vvip_marketplace_listing_media from anon, authenticated;
grant select on public.vvip_marketplace_listing_media to authenticated;

-- ---------------------------------------------------------------------------
-- One tightly bounded SECURITY DEFINER predicate owns canonical-object read
-- authorization. It exposes no row data and is used only by Storage RLS.
-- ---------------------------------------------------------------------------

create or replace function vvip_private.vvip_marketplace_canonical_media_is_readable(target_path text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
    select exists (
        select 1
        from public.vvip_marketplace_listing_media media
        join public.vvip_marketplace_listings listing
          on listing.listing_id = media.listing_id
        where media.canonical_storage_path = target_path
          and media.finalization_state = 'CANONICAL'
          and (
              media.owner_subject = public.vvip_marketplace_actor_id()
              or (
                  listing.status = 'ACTIVE'
                  and vvip_private.vvip_marketplace_country_is_active(listing.active_market_country)
              )
          )
    );
$function$;

revoke all on function vvip_private.vvip_marketplace_canonical_media_is_readable(text)
from public, anon, authenticated;
grant execute on function vvip_private.vvip_marketplace_canonical_media_is_readable(text)
to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Safe discovery projection. It contains no owner_subject, raw storage_path,
-- source hashes, verifier internals, finalization tokens/jobs, or audit data.
-- ---------------------------------------------------------------------------

drop view if exists public.vvip_marketplace_public_feed;
create view public.vvip_marketplace_public_feed
with (security_barrier = true)
as
select
    listing.listing_id,
    listing.active_market_country,
    listing.sector,
    listing.title,
    listing.summary,
    listing.price_minor,
    listing.currency_code,
    listing.location_label,
    listing.contact_phone,
    listing.whatsapp_enabled,
    listing.published_at,
    coalesce(
        jsonb_agg(
            jsonb_build_object(
                'canonical_storage_path', media.canonical_storage_path,
                'finalization_state', 'CANONICAL',
                'position', media.position,
                'is_cover', media.is_cover,
                'alt_text', media.alt_text
            )
            order by media.position, media.media_id
        ) filter (where media.media_id is not null),
        '[]'::jsonb
    ) as media
from public.vvip_marketplace_listings listing
join public.vvip_marketplace_listing_media media
  on media.listing_id = listing.listing_id
 and media.finalization_state = 'CANONICAL'
 and media.canonical_storage_path is not null
where listing.status = 'ACTIVE'
  and vvip_private.vvip_marketplace_country_is_active(listing.active_market_country)
group by
    listing.listing_id,
    listing.active_market_country,
    listing.sector,
    listing.title,
    listing.summary,
    listing.price_minor,
    listing.currency_code,
    listing.location_label,
    listing.contact_phone,
    listing.whatsapp_enabled,
    listing.published_at;

revoke all privileges on table public.vvip_marketplace_public_feed
from public, anon, authenticated;
grant select on public.vvip_marketplace_public_feed to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Canonical object access is now delegated to the bounded predicate instead of
-- allowing Storage policy SQL to depend on the raw-media public RLS policy.
-- ---------------------------------------------------------------------------

drop policy if exists vvip_listing_media_canonical_read on storage.objects;
create policy vvip_listing_media_canonical_read
on storage.objects
for select
to anon, authenticated
using (
    bucket_id = 'listing-media-canonical'
    and vvip_private.vvip_marketplace_canonical_media_is_readable(storage.objects.name)
);

commit;

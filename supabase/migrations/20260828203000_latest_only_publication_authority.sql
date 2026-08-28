-- VVIP TIGER — Latest-Only ordinary publication authority.
-- Forward-only convergence: ordinary publication is never gated by a paid
-- visibility plan, publishing card, subscription, entitlement receipt, or timer.

begin;

create or replace function public.vvip_marketplace_submit_for_review(
    target_listing uuid
)
returns table (
    listing_id uuid,
    status text
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
    current_listing public.vvip_marketplace_listings%rowtype;
    media_count integer;
    invalid_media_count integer;
begin
    if actor is null then
        raise exception 'MARKETPLACE_AUTH_REQUIRED';
    end if;

    select listing.* into current_listing
    from public.vvip_marketplace_listings listing
    where listing.listing_id = target_listing
    for update;

    if not found then
        raise exception 'MARKETPLACE_LISTING_NOT_FOUND';
    end if;
    if current_listing.owner_subject <> actor then
        raise exception 'MARKETPLACE_OWNER_REQUIRED';
    end if;
    if current_listing.status not in ('DRAFT', 'REJECTED', 'PAUSED') then
        raise exception 'MARKETPLACE_SUBMIT_STATE_INVALID';
    end if;
    if not vvip_private.vvip_marketplace_country_is_active(current_listing.active_market_country) then
        raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE';
    end if;
    if not exists (
        select 1
        from public.vvip_marketplace_sectors sector
        where sector.sector_key = current_listing.sector
          and sector.is_enabled
    ) then
        raise exception 'MARKETPLACE_SECTOR_NOT_ACTIVE';
    end if;

    select count(*) into media_count
    from public.vvip_marketplace_listing_media media
    where media.listing_id = target_listing;

    if media_count < 1 or media_count > 7 then
        raise exception 'MARKETPLACE_MEDIA_COUNT_INVALID';
    end if;

    select count(*) into invalid_media_count
    from public.vvip_marketplace_listing_media media
    where media.listing_id = target_listing
      and (
          media.owner_subject <> actor
          or media.position not between 0 and 6
          or media.finalization_state <> 'CANONICAL'
          or media.canonical_storage_path is null
          or media.canonical_sha256 !~ '^[0-9a-f]{64}$'
          or media.source_sha256 !~ '^[0-9a-f]{64}$'
          or media.canonical_mime_type not in ('image/jpeg', 'image/webp')
          or media.canonical_byte_size not between 1 and 10485760
          or media.canonical_width not between 320 and 4096
          or media.canonical_height not between 240 and 4096
          or media.canonical_verified_at is null
          or nullif(btrim(media.canonical_verifier), '') is null
      );

    if invalid_media_count <> 0 then
        raise exception 'MEDIA_SERVER_FINALIZATION_REQUIRED';
    end if;

    update public.vvip_marketplace_listings as listing
    set status = 'PENDING_REVIEW',
        rejection_reason = null,
        updated_at = statement_timestamp()
    where listing.listing_id = target_listing;

    return query
    select target_listing, 'PENDING_REVIEW'::text;
end;
$function$;

revoke all on function public.vvip_marketplace_submit_for_review(uuid)
from public, anon, authenticated;
grant execute on function public.vvip_marketplace_submit_for_review(uuid)
to authenticated;

-- The historical paid-publication RPC must not remain callable after this
-- convergence migration. Pulse paid visibility remains a separate product.
revoke all on function public.vvip_marketplace_request_publication(uuid, text, text)
from public, anon, authenticated;
drop function if exists public.vvip_marketplace_request_publication(uuid, text, text);

commit;

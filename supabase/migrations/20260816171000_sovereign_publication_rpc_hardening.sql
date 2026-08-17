-- VVIP TIGER — post-stack sovereign publication RPC hardening.
-- Forward-only and data-preserving. This migration intentionally owns only the
-- browser-to-review RPC body so parallel migration histories can converge on one
-- fail-closed runtime authority without recreating legacy publication commands.

begin;

create or replace function public.vvip_marketplace_request_publication(
    target_listing uuid,
    target_plan_id text,
    entitlement_receipt text
)
returns table (
    listing_id uuid,
    status text,
    plan_id text,
    entitlement_state text,
    pulse_impressions integer,
    activation_starts_at timestamptz,
    activation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
    current_listing public.vvip_marketplace_listings%rowtype;
    current_plan public.vvip_visibility_plans%rowtype;
    current_entitlement public.vvip_listing_activation_entitlements%rowtype;
    receipt_hash text;
    media_count integer;
    invalid_media_count integer;
begin
    if actor is null then
        raise exception 'MARKETPLACE_AUTH_REQUIRED';
    end if;
    if target_plan_id is null or length(btrim(target_plan_id)) < 1 or length(target_plan_id) > 80 then
        raise exception 'VISIBILITY_PLAN_INVALID';
    end if;

    receipt_hash := public.vvip_hash_entitlement_receipt(entitlement_receipt);

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

    select entitlement.* into current_entitlement
    from public.vvip_listing_activation_entitlements entitlement
    where entitlement.owner_subject = actor
      and entitlement.listing_id = target_listing
      and entitlement.plan_id = target_plan_id
      and entitlement.entitlement_receipt_hash = receipt_hash
    for update;

    if not found then
        raise exception 'ENTITLEMENT_REQUIRED';
    end if;

    if current_entitlement.entitlement_state = 'RESERVED'
       and current_listing.status = 'PENDING_REVIEW' then
        return query
        select
            target_listing,
            'PENDING_REVIEW'::text,
            current_entitlement.plan_id,
            'RESERVED'::text,
            current_entitlement.pulse_impressions,
            null::timestamptz,
            null::timestamptz;
        return;
    elsif current_entitlement.entitlement_state = 'RESERVED' then
        raise exception 'PUBLICATION_IDEMPOTENCY_STATE_INVALID';
    end if;

    if current_entitlement.entitlement_state <> 'ISSUED' then
        raise exception 'ENTITLEMENT_NOT_ISSUED';
    end if;
    if statement_timestamp() >= current_entitlement.redeem_expires_at then
        raise exception 'ENTITLEMENT_EXPIRED';
    end if;
    if current_listing.status not in ('DRAFT', 'REJECTED', 'PAUSED') then
        raise exception 'MARKETPLACE_PUBLICATION_STATE_INVALID';
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

    select plan.* into current_plan
    from public.vvip_visibility_plans plan
    where plan.plan_id = target_plan_id
      and plan.country_code = current_listing.active_market_country
      and (plan.sector is null or plan.sector = current_listing.sector)
      and plan.plan_state = 'ACTIVE'
      and statement_timestamp() >= plan.valid_from
      and (plan.valid_until is null or statement_timestamp() < plan.valid_until)
    for share;

    if not found then
        raise exception 'VISIBILITY_PLAN_NOT_ACTIVE';
    end if;
    if current_entitlement.pulse_impressions <> current_plan.pulse_impressions
       or current_entitlement.activation_duration_minutes <> current_plan.activation_duration_minutes then
        raise exception 'ENTITLEMENT_PLAN_SNAPSHOT_MISMATCH';
    end if;

    update public.vvip_listing_activation_entitlements as entitlement
    set entitlement_state = 'RESERVED',
        reserved_at = statement_timestamp(),
        updated_at = statement_timestamp()
    where entitlement.entitlement_id = current_entitlement.entitlement_id
      and entitlement.entitlement_state = 'ISSUED';

    if not found then
        raise exception 'ENTITLEMENT_REPLAY_BLOCKED';
    end if;

    update public.vvip_marketplace_listings as listing
    set status = 'PENDING_REVIEW',
        rejection_reason = null,
        updated_at = statement_timestamp()
    where listing.listing_id = target_listing;

    insert into public.vvip_publication_intent_audit (
        listing_id,
        entitlement_id,
        actor_subject,
        plan_id,
        event_type,
        pulse_impressions,
        activation_starts_at,
        activation_expires_at
    ) values (
        target_listing,
        current_entitlement.entitlement_id,
        actor,
        current_plan.plan_id,
        'PUBLICATION_RESERVED',
        current_entitlement.pulse_impressions,
        null,
        null
    );

    return query
    select
        target_listing,
        'PENDING_REVIEW'::text,
        current_plan.plan_id,
        'RESERVED'::text,
        current_entitlement.pulse_impressions,
        null::timestamptz,
        null::timestamptz;
end;
$function$;

revoke all on function public.vvip_marketplace_request_publication(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.vvip_marketplace_request_publication(uuid, text, text)
to authenticated;

commit;

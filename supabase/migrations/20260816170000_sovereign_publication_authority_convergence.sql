-- VVIP TIGER — sovereign single publication authority convergence.
-- Forward-only. This migration creates no country, sector, plan, entitlement, payment,
-- media, listing, or authority seed data. It retires superseded publication RPCs,
-- closes the browser status bypass, and makes the entitlement receipt hash the
-- idempotency key for one immutable publication result.

begin;

-- The immutable publication audit doubles as the idempotency/result journal.
-- A separate outbox is intentionally unnecessary here because this transaction
-- has no required external side effect: moderation reads PENDING_REVIEW directly.
alter table public.vvip_publication_intent_audit
    add column if not exists correlation_id uuid not null default gen_random_uuid(),
    add column if not exists result_status text not null default 'PENDING_REVIEW';

alter table public.vvip_publication_intent_audit
    add constraint vvip_publication_intent_audit_result_status_check
    check (result_status = 'PENDING_REVIEW');

create unique index if not exists vvip_publication_intent_audit_entitlement_unique
    on public.vvip_publication_intent_audit (entitlement_id);

create unique index if not exists vvip_publication_intent_audit_correlation_unique
    on public.vvip_publication_intent_audit (correlation_id);

-- Browser callers may edit DRAFT content, but PENDING_REVIEW remains reachable
-- only from the SECURITY DEFINER publication command below. Use the live private
-- country-seal authority directly; no duplicate public country authority exists.
create or replace function public.vvip_marketplace_guard_listing_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
begin
    if actor is null and current_user in ('anon', 'authenticated') then
        raise exception 'MARKETPLACE_AUTH_REQUIRED';
    end if;

    if TG_OP = 'INSERT' then
        if current_user in ('anon', 'authenticated') then
            if NEW.owner_subject <> actor or NEW.status <> 'DRAFT' then
                raise exception 'MARKETPLACE_CLIENT_INSERT_DENIED';
            end if;
        end if;
    elsif TG_OP = 'UPDATE' then
        if NEW.owner_subject is distinct from OLD.owner_subject
           or NEW.active_market_country is distinct from OLD.active_market_country then
            raise exception 'MARKETPLACE_IMMUTABLE_SCOPE';
        end if;

        if current_user in ('anon', 'authenticated') then
            if OLD.owner_subject <> actor then
                raise exception 'MARKETPLACE_OWNER_REQUIRED';
            end if;
            if NEW.status = 'PENDING_REVIEW' and NEW.status is distinct from OLD.status then
                raise exception 'MARKETPLACE_PUBLICATION_RPC_REQUIRED';
            end if;
            if NEW.status in ('ACTIVE', 'EXPIRED', 'REJECTED', 'BLOCKED') then
                raise exception 'MARKETPLACE_TRUSTED_REVIEW_REQUIRED';
            end if;
            if not (
                (OLD.status = 'DRAFT' and NEW.status in ('DRAFT', 'ARCHIVED'))
                or (OLD.status = 'REJECTED' and NEW.status in ('DRAFT', 'ARCHIVED'))
                or (OLD.status = 'ACTIVE' and NEW.status in ('ACTIVE', 'PAUSED', 'ARCHIVED'))
                or (OLD.status = 'PAUSED' and NEW.status in ('PAUSED', 'ARCHIVED'))
                or (OLD.status = 'ARCHIVED' and NEW.status = 'ARCHIVED')
            ) then
                raise exception 'MARKETPLACE_STATE_TRANSITION_DENIED';
            end if;
        end if;
    end if;

    if not vvip_private.vvip_marketplace_country_is_active(NEW.active_market_country) then
        raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE';
    end if;

    if not exists (
        select 1
        from public.vvip_marketplace_sectors sector
        where sector.sector_key = NEW.sector
          and sector.is_enabled
    ) then
        raise exception 'MARKETPLACE_SECTOR_NOT_ACTIVE';
    end if;

    NEW.updated_at := statement_timestamp();
    return NEW;
end;
$function$;

create function public.vvip_marketplace_request_publication(
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
    existing_audit public.vvip_publication_intent_audit%rowtype;
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

    -- Lock the receipt-bound entitlement before any decision. A successful prior
    -- call returns its immutable first result instead of consuming anything again.
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

    if current_entitlement.entitlement_state = 'CONSUMED' then
        if current_entitlement.consumed_by_subject <> actor then
            raise exception 'ENTITLEMENT_REPLAY_BLOCKED';
        end if;

        select audit.* into existing_audit
        from public.vvip_publication_intent_audit audit
        where audit.entitlement_id = current_entitlement.entitlement_id;

        if not found
           or existing_audit.listing_id <> target_listing
           or existing_audit.actor_subject <> actor
           or existing_audit.plan_id <> target_plan_id then
            raise exception 'PUBLICATION_IDEMPOTENCY_EVIDENCE_MISSING';
        end if;

        return query
        select
            target_listing,
            existing_audit.result_status,
            existing_audit.plan_id,
            'CONSUMED'::text,
            existing_audit.pulse_impressions,
            existing_audit.activation_starts_at,
            existing_audit.activation_expires_at;
        return;
    end if;

    if current_entitlement.entitlement_state <> 'ISSUED' then
        raise exception 'ENTITLEMENT_NOT_ISSUED';
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
          or media.finalization_state <> 'CANONICAL'
          or media.canonical_storage_path is null
          or media.canonical_sha256 !~ '^[0-9a-f]{64}$'
          or media.source_sha256 !~ '^[0-9a-f]{64}$'
          or media.canonical_mime_type not in ('image/jpeg', 'image/webp')
          or media.canonical_byte_size not between 1 and 10485760
          or media.canonical_width not between 320 and 4096
          or media.canonical_height not between 240 and 4096
          or media.canonical_verified_at is null
          or media.canonical_verifier is null
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

    if statement_timestamp() < current_entitlement.activation_starts_at then
        raise exception 'ENTITLEMENT_NOT_STARTED';
    end if;
    if statement_timestamp() >= current_entitlement.activation_expires_at then
        raise exception 'ENTITLEMENT_EXPIRED';
    end if;
    if current_entitlement.pulse_impressions <> current_plan.pulse_impressions then
        raise exception 'ENTITLEMENT_PLAN_SNAPSHOT_MISMATCH';
    end if;

    update public.vvip_listing_activation_entitlements
    set entitlement_state = 'CONSUMED',
        consumed_at = statement_timestamp(),
        consumed_by_subject = actor,
        updated_at = statement_timestamp()
    where entitlement_id = current_entitlement.entitlement_id
      and entitlement_state = 'ISSUED';

    if not found then
        raise exception 'ENTITLEMENT_REPLAY_BLOCKED';
    end if;

    update public.vvip_marketplace_listings
    set status = 'PENDING_REVIEW',
        rejection_reason = null,
        updated_at = statement_timestamp()
    where vvip_marketplace_listings.listing_id = target_listing;

    insert into public.vvip_publication_intent_audit (
        listing_id,
        entitlement_id,
        actor_subject,
        plan_id,
        event_type,
        pulse_impressions,
        activation_starts_at,
        activation_expires_at,
        result_status
    ) values (
        target_listing,
        current_entitlement.entitlement_id,
        actor,
        current_plan.plan_id,
        'PUBLICATION_PREPARED',
        current_entitlement.pulse_impressions,
        current_entitlement.activation_starts_at,
        current_entitlement.activation_expires_at,
        'PENDING_REVIEW'
    );

    return query
    select
        target_listing,
        'PENDING_REVIEW'::text,
        current_plan.plan_id,
        'CONSUMED'::text,
        current_entitlement.pulse_impressions,
        current_entitlement.activation_starts_at,
        current_entitlement.activation_expires_at;
end;
$function$;

-- Canonical authority: browser can call exactly one publication transition.
revoke all on function public.vvip_marketplace_request_publication(uuid, text, text) from public, anon;
grant execute on function public.vvip_marketplace_request_publication(uuid, text, text) to authenticated;

-- FUSION predecessor is guaranteed by the immediately preceding migration chain.
-- Drop without CASCADE: an unexpected dependency fails closed rather than silently
-- preserving a second authority or deleting dependent objects.
revoke all on function public.vvip_marketplace_prepare_publication(uuid, text, text) from public, anon, authenticated;
drop function public.vvip_marketplace_prepare_publication(uuid, text, text);

-- Historical F06 deployments may contain this older two-UUID publisher even though
-- it is absent from the connected live project and current branch migration chain.
-- Retire only the known signature when it actually exists.
do $retire_legacy_submit$
begin
    if to_regprocedure('public.vvip_marketplace_submit_listing(uuid,uuid)') is not null then
        execute 'revoke all on function public.vvip_marketplace_submit_listing(uuid, uuid) from public, anon, authenticated';
        execute 'drop function public.vvip_marketplace_submit_listing(uuid, uuid)';
    end if;
end;
$retire_legacy_submit$;

commit;

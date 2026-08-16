-- VVIP TIGER — sovereign publication and visibility lifecycle convergence.
-- Forward-only. No country, sector, plan, entitlement, payment, media, listing,
-- reviewer, or authority rows are seeded here. Publication reserves an already
-- issued entitlement; trusted approval is the only point that consumes it and
-- starts paid visibility.

begin;

-- Fail closed rather than silently translating financial state from the short-lived
-- pre-convergence FUSION model. The connected production project has not applied
-- that model; a divergent environment with live rows requires explicit reconciliation.
do $financial_preflight$
begin
    if exists (select 1 from public.vvip_listing_activation_entitlements limit 1)
       or exists (select 1 from public.vvip_publication_intent_audit limit 1) then
        raise exception 'LEGACY_ENTITLEMENT_STATE_REQUIRES_MANUAL_CONVERGENCE';
    end if;
end;
$financial_preflight$;

-- Financial lifecycle: ISSUED -> RESERVED -> CONSUMED on approval.
-- Rejection releases the reservation when still redeemable; blocking revokes it.
alter table public.vvip_listing_activation_entitlements
    add column reserved_at timestamptz,
    add column activation_duration_minutes integer,
    add column redeem_expires_at timestamptz;

alter table public.vvip_listing_activation_entitlements
    alter column activation_starts_at drop not null,
    alter column activation_expires_at drop not null,
    alter column activation_duration_minutes set not null,
    alter column redeem_expires_at set not null;

alter table public.vvip_listing_activation_entitlements
    drop constraint if exists vvip_listing_activation_entitlements_entitlement_state_check,
    drop constraint if exists vvip_listing_activation_entitlements_listing_id_fkey;

alter table public.vvip_listing_activation_entitlements
    add constraint vvip_listing_activation_entitlements_entitlement_state_check
        check (entitlement_state in ('ISSUED', 'RESERVED', 'CONSUMED', 'REVOKED', 'EXPIRED')),
    add constraint vvip_listing_activation_entit_activation_duration_minutes_check
        check (activation_duration_minutes between 1 and 525600),
    add constraint vvip_listing_activation_entitlements_redeem_window_check
        check (issued_at < redeem_expires_at),
    add constraint vvip_listing_activation_entitlements_lifecycle_check
        check (
            (entitlement_state = 'ISSUED'
                and reserved_at is null
                and consumed_at is null
                and consumed_by_subject is null
                and activation_starts_at is null
                and activation_expires_at is null)
            or (entitlement_state = 'RESERVED'
                and reserved_at is not null
                and consumed_at is null
                and consumed_by_subject is null
                and activation_starts_at is null
                and activation_expires_at is null)
            or (entitlement_state = 'CONSUMED'
                and reserved_at is not null
                and consumed_at is not null
                and consumed_by_subject is not null
                and activation_starts_at is not null
                and activation_expires_at is not null
                and activation_starts_at < activation_expires_at)
            or (entitlement_state in ('REVOKED', 'EXPIRED')
                and reserved_at is null
                and consumed_at is null
                and consumed_by_subject is null
                and activation_starts_at is null
                and activation_expires_at is null)
        ),
    add constraint vvip_listing_activation_entitlements_listing_id_fkey
        foreign key (listing_id)
        references public.vvip_marketplace_listings(listing_id)
        on delete restrict;

-- Audit remains append-only and records each reservation/review event separately.
-- Multiple reserve/reject/resubmit cycles are therefore valid history, not duplicates.
alter table public.vvip_publication_intent_audit
    alter column activation_starts_at drop not null,
    alter column activation_expires_at drop not null,
    drop constraint if exists vvip_publication_intent_audit_event_type_check;

alter table public.vvip_publication_intent_audit
    add constraint vvip_publication_intent_audit_event_type_check
        check (event_type in (
            'PUBLICATION_RESERVED',
            'PUBLICATION_APPROVED',
            'PUBLICATION_REJECTED',
            'PUBLICATION_BLOCKED'
        )),
    add constraint vvip_publication_intent_audit_lifecycle_check
        check (
            (event_type = 'PUBLICATION_APPROVED'
                and activation_starts_at is not null
                and activation_expires_at is not null
                and activation_starts_at < activation_expires_at)
            or (event_type <> 'PUBLICATION_APPROVED'
                and activation_starts_at is null
                and activation_expires_at is null)
        );

create index if not exists vvip_publication_intent_audit_listing_time_idx
    on public.vvip_publication_intent_audit (listing_id, created_at desc);

create index if not exists vvip_publication_intent_audit_entitlement_time_idx
    on public.vvip_publication_intent_audit (entitlement_id, created_at desc);

do $audit_guard$
begin
    if not exists (
        select 1
        from pg_trigger trigger_row
        join pg_class table_row on table_row.oid = trigger_row.tgrelid
        join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
        where schema_row.nspname = 'public'
          and table_row.relname = 'vvip_publication_intent_audit'
          and trigger_row.tgname = 'vvip_publication_intent_audit_append_only'
          and not trigger_row.tgisinternal
    ) then
        raise exception 'PUBLICATION_AUDIT_APPEND_ONLY_REQUIRED';
    end if;
end;
$audit_guard$;

-- Browser callers may edit their content, but trusted publication/review states remain
-- inaccessible to direct client DML. Country and sector authority are fail closed.
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

    update public.vvip_listing_activation_entitlements
    set entitlement_state = 'RESERVED',
        reserved_at = statement_timestamp(),
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

create or replace function public.vvip_marketplace_review_listing(
    target_listing uuid,
    decision text,
    decision_reason text default null
)
returns public.vvip_marketplace_listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    reviewer text := public.vvip_marketplace_actor_id();
    current_listing public.vvip_marketplace_listings%rowtype;
    current_entitlement public.vvip_listing_activation_entitlements%rowtype;
    result public.vvip_marketplace_listings%rowtype;
    activation_start timestamptz;
    activation_end timestamptz;
begin
    if reviewer is null then
        raise exception 'MARKETPLACE_AUTH_REQUIRED';
    end if;

    select listing.* into current_listing
    from public.vvip_marketplace_listings listing
    where listing.listing_id = target_listing
    for update;

    if not found then
        raise exception 'MARKETPLACE_LISTING_NOT_FOUND';
    end if;
    if not vvip_private.vvip_marketplace_actor_can_review(current_listing.active_market_country) then
        raise exception 'MARKETPLACE_REVIEW_AUTHORITY_REQUIRED';
    end if;
    if current_listing.status <> 'PENDING_REVIEW' then
        raise exception 'MARKETPLACE_REVIEW_STATE_INVALID';
    end if;
    if decision not in ('APPROVE', 'REJECT', 'BLOCK') then
        raise exception 'MARKETPLACE_REVIEW_DECISION_INVALID';
    end if;
    if decision in ('REJECT', 'BLOCK') and nullif(btrim(decision_reason), '') is null then
        raise exception 'MARKETPLACE_REVIEW_REASON_REQUIRED';
    end if;

    select entitlement.* into current_entitlement
    from public.vvip_listing_activation_entitlements entitlement
    where entitlement.listing_id = target_listing
      and entitlement.owner_subject = current_listing.owner_subject
      and entitlement.entitlement_state = 'RESERVED'
    for update;

    if not found then
        raise exception 'MARKETPLACE_RESERVED_ENTITLEMENT_REQUIRED';
    end if;

    if decision = 'APPROVE' then
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

        activation_start := statement_timestamp();
        activation_end := activation_start + make_interval(mins => current_entitlement.activation_duration_minutes);

        update public.vvip_listing_activation_entitlements
        set entitlement_state = 'CONSUMED',
            consumed_at = activation_start,
            consumed_by_subject = current_listing.owner_subject,
            activation_starts_at = activation_start,
            activation_expires_at = activation_end,
            updated_at = statement_timestamp()
        where entitlement_id = current_entitlement.entitlement_id
          and entitlement_state = 'RESERVED';

        if not found then
            raise exception 'ENTITLEMENT_REPLAY_BLOCKED';
        end if;
    elsif decision = 'REJECT' then
        update public.vvip_listing_activation_entitlements
        set entitlement_state = case
                when statement_timestamp() >= redeem_expires_at then 'EXPIRED'
                else 'ISSUED'
            end,
            reserved_at = null,
            updated_at = statement_timestamp()
        where entitlement_id = current_entitlement.entitlement_id
          and entitlement_state = 'RESERVED';

        if not found then
            raise exception 'ENTITLEMENT_REPLAY_BLOCKED';
        end if;
    elsif decision = 'BLOCK' then
        update public.vvip_listing_activation_entitlements
        set entitlement_state = 'REVOKED',
            reserved_at = null,
            updated_at = statement_timestamp()
        where entitlement_id = current_entitlement.entitlement_id
          and entitlement_state = 'RESERVED';

        if not found then
            raise exception 'ENTITLEMENT_REPLAY_BLOCKED';
        end if;
    end if;

    update public.vvip_marketplace_listings
    set status = case decision
            when 'APPROVE' then 'ACTIVE'
            when 'REJECT' then 'REJECTED'
            else 'BLOCKED'
        end,
        rejection_reason = case
            when decision = 'APPROVE' then null
            else left(decision_reason, 500)
        end,
        published_at = case
            when decision = 'APPROVE' then coalesce(published_at, activation_start)
            else published_at
        end,
        updated_at = statement_timestamp()
    where listing_id = target_listing
    returning * into result;

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
        reviewer,
        current_entitlement.plan_id,
        case decision
            when 'APPROVE' then 'PUBLICATION_APPROVED'
            when 'REJECT' then 'PUBLICATION_REJECTED'
            else 'PUBLICATION_BLOCKED'
        end,
        current_entitlement.pulse_impressions,
        case when decision = 'APPROVE' then activation_start else null end,
        case when decision = 'APPROVE' then activation_end else null end
    );

    return result;
end;
$function$;

-- Browser callable authority is deliberately narrow: authenticated callers may
-- request publication, while review still self-authorizes via capability checks.
revoke all on function public.vvip_marketplace_request_publication(uuid, text, text) from public, anon;
grant execute on function public.vvip_marketplace_request_publication(uuid, text, text) to authenticated;

revoke all on function public.vvip_marketplace_review_listing(uuid, text, text) from public, anon;
grant execute on function public.vvip_marketplace_review_listing(uuid, text, text) to authenticated;

-- Retire the FUSION predecessor. No CASCADE: unexpected dependencies fail closed.
revoke all on function public.vvip_marketplace_prepare_publication(uuid, text, text) from public, anon, authenticated;
drop function public.vvip_marketplace_prepare_publication(uuid, text, text);

-- Historical F06 deployments may contain this known two-UUID publisher. Retire
-- only that signature when present; do not broaden dynamic authority changes.
do $retire_legacy_submit$
begin
    if to_regprocedure('public.vvip_marketplace_submit_listing(uuid,uuid)') is not null then
        execute 'revoke all on function public.vvip_marketplace_submit_listing(uuid, uuid) from public, anon, authenticated';
        execute 'drop function public.vvip_marketplace_submit_listing(uuid, uuid)';
    end if;
end;
$retire_legacy_submit$;

commit;

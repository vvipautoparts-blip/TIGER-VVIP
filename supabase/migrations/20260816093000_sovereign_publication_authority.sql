-- VVIP TIGER — sovereign marketplace publication authority.
-- Unapplied convergence migration: one sector authority, one visibility plan model,
-- one entitlement model, one browser-to-review RPC, and one trusted review RPC.
-- Paid visibility is RESERVED at publication request and starts only on APPROVE.

begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.vvip_marketplace_sectors (
    sector_key text primary key,
    label_ar text not null,
    label_en text not null,
    is_enabled boolean not null default true,
    display_order integer not null default 0,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (sector_key ~ '^[a-z0-9][a-z0-9._-]{0,127}$'),
    check (length(label_ar) between 1 and 120),
    check (length(label_en) between 1 and 120)
);

insert into public.vvip_marketplace_sectors (
    sector_key, label_ar, label_en, is_enabled, display_order
) values
    ('automotive', 'السيارات والمركبات', 'Automotive', true, 10),
    ('real-estate', 'العقارات', 'Real Estate', true, 20),
    ('construction', 'الإنشاءات والمقاولات', 'Construction', true, 30),
    ('professional-services', 'الخدمات المهنية', 'Professional Services', true, 40),
    ('equipment', 'المعدات', 'Equipment', true, 50),
    ('trade-supply', 'التجارة والتوريد', 'Trade & Supply', true, 60),
    ('engineering-consulting', 'الاستشارات الهندسية', 'Engineering Consulting', true, 70)
on conflict (sector_key) do update
set label_ar = excluded.label_ar,
    label_en = excluded.label_en,
    is_enabled = true,
    display_order = excluded.display_order,
    updated_at = statement_timestamp();

insert into public.vvip_marketplace_sectors (
    sector_key, label_ar, label_en, is_enabled, display_order
)
select distinct
    listing.sector,
    initcap(replace(listing.sector, '-', ' ')),
    initcap(replace(listing.sector, '-', ' ')),
    false,
    10000
from public.vvip_marketplace_listings listing
where nullif(btrim(listing.sector), '') is not null
on conflict (sector_key) do nothing;

update public.vvip_marketplace_sectors
set is_enabled = false,
    updated_at = statement_timestamp()
where sector_key not in (
    'automotive',
    'real-estate',
    'construction',
    'professional-services',
    'equipment',
    'trade-supply',
    'engineering-consulting'
);

alter table public.vvip_marketplace_listings
    drop constraint if exists vvip_marketplace_listings_sector_check;

alter table public.vvip_marketplace_listings
    drop constraint if exists vvip_marketplace_listings_sector_fkey;

alter table public.vvip_marketplace_listings
    add constraint vvip_marketplace_listings_sector_fkey
    foreign key (sector)
    references public.vvip_marketplace_sectors(sector_key);

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
        if NEW.owner_subject <> OLD.owner_subject
           or NEW.active_market_country <> OLD.active_market_country then
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

create table public.vvip_visibility_plans (
    plan_id text primary key,
    country_code text not null references public.vvip_country_authority_seals(country_code),
    sector text references public.vvip_marketplace_sectors(sector_key),
    display_name text not null,
    price_minor bigint not null check (price_minor > 0 and price_minor <= 99999999999999),
    currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
    pulse_impressions integer not null check (pulse_impressions > 0 and pulse_impressions <= 1000000000),
    activation_duration_minutes integer not null check (activation_duration_minutes between 1 and 525600),
    plan_state text not null default 'DISABLED' check (plan_state in ('DISABLED', 'ACTIVE', 'RETIRED')),
    valid_from timestamptz not null default statement_timestamp(),
    valid_until timestamptz,
    policy_version text not null,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (length(plan_id) between 1 and 80),
    check (sector is null or length(sector) between 1 and 128),
    check (length(display_name) between 1 and 120),
    check (length(policy_version) between 1 and 128),
    check (valid_until is null or valid_from < valid_until)
);

create index vvip_visibility_plans_active_market_idx
    on public.vvip_visibility_plans (country_code, sector, plan_state, valid_from, valid_until);

create table public.vvip_listing_activation_entitlements (
    entitlement_id uuid primary key default gen_random_uuid(),
    owner_subject text not null,
    listing_id uuid not null
        references public.vvip_marketplace_listings(listing_id) on delete restrict,
    plan_id text not null references public.vvip_visibility_plans(plan_id),
    entitlement_receipt_hash text not null unique,
    provider_reference_hash text,
    pulse_impressions integer not null check (pulse_impressions > 0 and pulse_impressions <= 1000000000),
    activation_duration_minutes integer not null check (activation_duration_minutes between 1 and 525600),
    entitlement_state text not null default 'ISSUED'
        check (entitlement_state in ('ISSUED', 'RESERVED', 'CONSUMED', 'REVOKED', 'EXPIRED')),
    issued_at timestamptz not null default statement_timestamp(),
    redeem_expires_at timestamptz not null,
    reserved_at timestamptz,
    consumed_at timestamptz,
    consumed_by_subject text,
    activation_starts_at timestamptz,
    activation_expires_at timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (length(owner_subject) between 1 and 128),
    check (entitlement_receipt_hash ~ '^[0-9a-f]{64}$'),
    check (provider_reference_hash is null or provider_reference_hash ~ '^[0-9a-f]{64}$'),
    check (issued_at < redeem_expires_at),
    check (consumed_by_subject is null or length(consumed_by_subject) between 1 and 128),
    check (
        (entitlement_state = 'ISSUED'
            and reserved_at is null and consumed_at is null and consumed_by_subject is null
            and activation_starts_at is null and activation_expires_at is null)
        or (entitlement_state = 'RESERVED'
            and reserved_at is not null and consumed_at is null and consumed_by_subject is null
            and activation_starts_at is null and activation_expires_at is null)
        or (entitlement_state = 'CONSUMED'
            and reserved_at is not null and consumed_at is not null and consumed_by_subject is not null
            and activation_starts_at is not null and activation_expires_at is not null
            and activation_starts_at < activation_expires_at)
        or (entitlement_state in ('REVOKED', 'EXPIRED')
            and consumed_at is null and consumed_by_subject is null
            and activation_starts_at is null and activation_expires_at is null)
    )
);

create index vvip_listing_activation_entitlements_owner_idx
    on public.vvip_listing_activation_entitlements
        (owner_subject, listing_id, entitlement_state, redeem_expires_at);

create unique index vvip_listing_activation_one_reserved_per_listing
    on public.vvip_listing_activation_entitlements (listing_id)
    where entitlement_state = 'RESERVED';

create table public.vvip_publication_intent_audit (
    audit_id uuid primary key default gen_random_uuid(),
    listing_id uuid not null,
    entitlement_id uuid not null,
    actor_subject text not null,
    plan_id text not null,
    event_type text not null check (event_type in ('PUBLICATION_RESERVED','PUBLICATION_APPROVED','PUBLICATION_REJECTED','PUBLICATION_BLOCKED')),
    pulse_impressions integer not null check (pulse_impressions > 0),
    activation_starts_at timestamptz,
    activation_expires_at timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    check (length(actor_subject) between 1 and 128),
    check (length(plan_id) between 1 and 80),
    check (
        (event_type = 'PUBLICATION_APPROVED'
            and activation_starts_at is not null and activation_expires_at is not null
            and activation_starts_at < activation_expires_at)
        or (event_type <> 'PUBLICATION_APPROVED'
            and activation_starts_at is null and activation_expires_at is null)
    )
);

create function public.vvip_hash_entitlement_receipt(receipt text)
returns text
language plpgsql
immutable
strict
set search_path = pg_catalog, public, extensions
as $function$
begin
    if length(receipt) < 8 or length(receipt) > 512 then
        raise exception 'ENTITLEMENT_RECEIPT_INVALID';
    end if;
    return encode(extensions.digest(convert_to(receipt, 'UTF8'), 'sha256'), 'hex');
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
    if actor is null then raise exception 'MARKETPLACE_AUTH_REQUIRED'; end if;
    if target_plan_id is null or length(btrim(target_plan_id)) < 1 or length(target_plan_id) > 80 then
        raise exception 'VISIBILITY_PLAN_INVALID';
    end if;

    receipt_hash := public.vvip_hash_entitlement_receipt(entitlement_receipt);

    select * into current_listing
    from public.vvip_marketplace_listings listing
    where listing.listing_id = target_listing
    for update;

    if not found then raise exception 'MARKETPLACE_LISTING_NOT_FOUND'; end if;
    if current_listing.owner_subject <> actor then raise exception 'MARKETPLACE_OWNER_REQUIRED'; end if;

    select * into current_entitlement
    from public.vvip_listing_activation_entitlements entitlement
    where entitlement.owner_subject = actor
      and entitlement.listing_id = target_listing
      and entitlement.plan_id = target_plan_id
      and entitlement.entitlement_receipt_hash = receipt_hash
    for update;

    if not found then raise exception 'ENTITLEMENT_REQUIRED'; end if;

    if current_entitlement.entitlement_state = 'RESERVED'
       and current_listing.status = 'PENDING_REVIEW' then
        return query
        select target_listing, 'PENDING_REVIEW'::text, current_entitlement.plan_id,
               'RESERVED'::text, current_entitlement.pulse_impressions,
               null::timestamptz, null::timestamptz;
        return;
    end if;

    if current_listing.status not in ('DRAFT', 'REJECTED', 'PAUSED') then
        raise exception 'MARKETPLACE_PUBLICATION_STATE_INVALID';
    end if;
    if not vvip_private.vvip_marketplace_country_is_active(current_listing.active_market_country) then
        raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE';
    end if;
    if not exists (
        select 1 from public.vvip_marketplace_sectors sector
        where sector.sector_key = current_listing.sector and sector.is_enabled
    ) then
        raise exception 'MARKETPLACE_SECTOR_NOT_ACTIVE';
    end if;

    select count(*) into media_count
    from public.vvip_marketplace_listing_media media
    where media.listing_id = target_listing;
    if media_count < 1 or media_count > 7 then raise exception 'MARKETPLACE_MEDIA_COUNT_INVALID'; end if;

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
    if invalid_media_count <> 0 then raise exception 'MARKETPLACE_MEDIA_NOT_CANONICAL'; end if;

    select * into current_plan
    from public.vvip_visibility_plans plan
    where plan.plan_id = target_plan_id
      and plan.country_code = current_listing.active_market_country
      and (plan.sector is null or plan.sector = current_listing.sector)
      and plan.plan_state = 'ACTIVE'
      and statement_timestamp() >= plan.valid_from
      and (plan.valid_until is null or statement_timestamp() < plan.valid_until)
    for share;
    if not found then raise exception 'VISIBILITY_PLAN_NOT_ACTIVE'; end if;

    if current_entitlement.entitlement_state <> 'ISSUED' then raise exception 'ENTITLEMENT_NOT_ISSUED'; end if;
    if statement_timestamp() >= current_entitlement.redeem_expires_at then raise exception 'ENTITLEMENT_EXPIRED'; end if;
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
    if not found then raise exception 'ENTITLEMENT_REPLAY_BLOCKED'; end if;

    update public.vvip_marketplace_listings
    set status = 'PENDING_REVIEW',
        rejection_reason = null,
        updated_at = statement_timestamp()
    where vvip_marketplace_listings.listing_id = target_listing;

    insert into public.vvip_publication_intent_audit (
        listing_id, entitlement_id, actor_subject, plan_id, event_type, pulse_impressions
    ) values (
        target_listing, current_entitlement.entitlement_id, actor,
        current_plan.plan_id, 'PUBLICATION_RESERVED', current_entitlement.pulse_impressions
    );

    return query
    select target_listing, 'PENDING_REVIEW'::text, current_plan.plan_id,
           'RESERVED'::text, current_entitlement.pulse_impressions,
           null::timestamptz, null::timestamptz;
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
    select * into current_listing
    from public.vvip_marketplace_listings listing
    where listing.listing_id = target_listing
    for update;

    if not found then raise exception 'MARKETPLACE_LISTING_NOT_FOUND'; end if;
    if not vvip_private.vvip_marketplace_actor_can_review(current_listing.active_market_country) then
        raise exception 'MARKETPLACE_REVIEW_AUTHORITY_REQUIRED';
    end if;
    if current_listing.status <> 'PENDING_REVIEW' then raise exception 'MARKETPLACE_REVIEW_STATE_INVALID'; end if;
    if decision not in ('APPROVE', 'REJECT', 'BLOCK') then raise exception 'MARKETPLACE_REVIEW_DECISION_INVALID'; end if;
    if decision in ('REJECT', 'BLOCK') and nullif(btrim(decision_reason), '') is null then
        raise exception 'MARKETPLACE_REVIEW_REASON_REQUIRED';
    end if;

    select * into current_entitlement
    from public.vvip_listing_activation_entitlements entitlement
    where entitlement.listing_id = target_listing
      and entitlement.owner_subject = current_listing.owner_subject
      and entitlement.entitlement_state = 'RESERVED'
    for update;
    if not found then raise exception 'MARKETPLACE_RESERVED_ENTITLEMENT_REQUIRED'; end if;

    if decision = 'APPROVE' then
        if not vvip_private.vvip_marketplace_country_is_active(current_listing.active_market_country) then
            raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE';
        end if;
        if not exists (
            select 1 from public.vvip_marketplace_sectors sector
            where sector.sector_key = current_listing.sector and sector.is_enabled
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
        if not found then raise exception 'ENTITLEMENT_REPLAY_BLOCKED'; end if;
    elsif decision = 'REJECT' then
        update public.vvip_listing_activation_entitlements
        set entitlement_state = 'ISSUED', reserved_at = null, updated_at = statement_timestamp()
        where entitlement_id = current_entitlement.entitlement_id and entitlement_state = 'RESERVED';
    else
        update public.vvip_listing_activation_entitlements
        set entitlement_state = 'REVOKED', updated_at = statement_timestamp()
        where entitlement_id = current_entitlement.entitlement_id and entitlement_state = 'RESERVED';
    end if;

    update public.vvip_marketplace_listings
    set status = case decision
            when 'APPROVE' then 'ACTIVE'
            when 'REJECT' then 'REJECTED'
            else 'BLOCKED'
        end,
        rejection_reason = case when decision = 'APPROVE' then null else left(decision_reason, 500) end,
        published_at = case when decision = 'APPROVE' then statement_timestamp() else published_at end,
        updated_at = statement_timestamp()
    where listing_id = target_listing
    returning * into result;

    insert into public.vvip_publication_intent_audit (
        listing_id, entitlement_id, actor_subject, plan_id, event_type,
        pulse_impressions, activation_starts_at, activation_expires_at
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

create function public.vvip_reject_publication_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    raise exception 'PUBLICATION_AUDIT_APPEND_ONLY';
end;
$function$;

create trigger vvip_publication_intent_audit_append_only
before update or delete on public.vvip_publication_intent_audit
for each row execute function public.vvip_reject_publication_audit_mutation();

alter table public.vvip_marketplace_sectors enable row level security;
alter table public.vvip_marketplace_sectors force row level security;
alter table public.vvip_visibility_plans enable row level security;
alter table public.vvip_visibility_plans force row level security;
alter table public.vvip_listing_activation_entitlements enable row level security;
alter table public.vvip_listing_activation_entitlements force row level security;
alter table public.vvip_publication_intent_audit enable row level security;
alter table public.vvip_publication_intent_audit force row level security;

create policy vvip_marketplace_sectors_public_read
on public.vvip_marketplace_sectors
for select to anon, authenticated
using (is_enabled);

revoke all privileges on table public.vvip_marketplace_sectors from public, anon, authenticated;
grant select on table public.vvip_marketplace_sectors to anon, authenticated;
grant all privileges on table public.vvip_marketplace_sectors to service_role;

revoke all privileges on table
    public.vvip_visibility_plans,
    public.vvip_listing_activation_entitlements,
    public.vvip_publication_intent_audit
from public, anon, authenticated;

grant all privileges on table
    public.vvip_visibility_plans,
    public.vvip_listing_activation_entitlements,
    public.vvip_publication_intent_audit
to service_role;

create view public.vvip_visibility_plan_catalog
with (security_barrier = true)
as
select
    plan_id, country_code, sector, display_name, price_minor, currency_code,
    pulse_impressions, activation_duration_minutes, policy_version
from public.vvip_visibility_plans
where plan_state = 'ACTIVE'
  and statement_timestamp() >= valid_from
  and (valid_until is null or statement_timestamp() < valid_until);

grant select on public.vvip_visibility_plan_catalog to anon, authenticated;

revoke all on function public.vvip_hash_entitlement_receipt(text) from public, anon, authenticated;
grant execute on function public.vvip_hash_entitlement_receipt(text) to service_role;
revoke all on function public.vvip_marketplace_request_publication(uuid, text, text) from public, anon;
grant execute on function public.vvip_marketplace_request_publication(uuid, text, text) to authenticated;
revoke all on function public.vvip_marketplace_review_listing(uuid, text, text) from public, anon, authenticated;
grant execute on function public.vvip_marketplace_review_listing(uuid, text, text) to authenticated, service_role;
revoke all on function public.vvip_reject_publication_audit_mutation() from public, anon, authenticated;
grant execute on function public.vvip_reject_publication_audit_mutation() to service_role;

commit;

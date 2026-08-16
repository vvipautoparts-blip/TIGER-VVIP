-- VVIP TIGER FUSION — server-authoritative publication entitlement gate.
-- Forward-only. No country, price plan, payment receipt, entitlement, listing, or authority row is seeded.
-- Browser clients can consume an already-issued entitlement through one bounded RPC;
-- they cannot mint entitlements, change price/Pulse budgets, or force listings ACTIVE.

begin;

create extension if not exists pgcrypto with schema extensions;

create table public.vvip_visibility_plans (
    plan_id text primary key,
    country_code text not null
        references public.vvip_country_authority_seals(country_code),
    sector text,
    display_name text not null,
    price_minor bigint not null check (price_minor > 0 and price_minor <= 99999999999999),
    currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
    pulse_impressions integer not null check (pulse_impressions > 0 and pulse_impressions <= 1000000000),
    activation_duration_minutes integer not null
        check (activation_duration_minutes between 1 and 525600),
    plan_state text not null default 'DISABLED'
        check (plan_state in ('DISABLED', 'ACTIVE', 'RETIRED')),
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
        references public.vvip_marketplace_listings(listing_id) on delete cascade,
    plan_id text not null
        references public.vvip_visibility_plans(plan_id),
    entitlement_receipt_hash text not null unique,
    provider_reference_hash text,
    pulse_impressions integer not null check (pulse_impressions > 0 and pulse_impressions <= 1000000000),
    activation_starts_at timestamptz not null,
    activation_expires_at timestamptz not null,
    entitlement_state text not null default 'ISSUED'
        check (entitlement_state in ('ISSUED', 'CONSUMED', 'REVOKED', 'EXPIRED')),
    issued_at timestamptz not null default statement_timestamp(),
    consumed_at timestamptz,
    consumed_by_subject text,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (length(owner_subject) between 1 and 128),
    check (entitlement_receipt_hash ~ '^[0-9a-f]{64}$'),
    check (provider_reference_hash is null or provider_reference_hash ~ '^[0-9a-f]{64}$'),
    check (activation_starts_at < activation_expires_at),
    check (consumed_by_subject is null or length(consumed_by_subject) between 1 and 128),
    check (
        (entitlement_state = 'CONSUMED' and consumed_at is not null and consumed_by_subject is not null)
        or (entitlement_state <> 'CONSUMED' and consumed_at is null and consumed_by_subject is null)
    )
);

create index vvip_listing_activation_entitlements_owner_idx
    on public.vvip_listing_activation_entitlements
        (owner_subject, listing_id, entitlement_state, activation_expires_at);

create table public.vvip_publication_intent_audit (
    audit_id uuid primary key default gen_random_uuid(),
    listing_id uuid not null,
    entitlement_id uuid not null,
    actor_subject text not null,
    plan_id text not null,
    event_type text not null check (event_type = 'PUBLICATION_PREPARED'),
    pulse_impressions integer not null check (pulse_impressions > 0),
    activation_starts_at timestamptz not null,
    activation_expires_at timestamptz not null,
    created_at timestamptz not null default statement_timestamp(),
    check (length(actor_subject) between 1 and 128),
    check (length(plan_id) between 1 and 80),
    check (activation_starts_at < activation_expires_at)
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

create function public.vvip_marketplace_prepare_publication(
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
begin
    if actor is null then
        raise exception 'MARKETPLACE_AUTH_REQUIRED';
    end if;

    if target_plan_id is null or length(btrim(target_plan_id)) < 1 or length(target_plan_id) > 80 then
        raise exception 'VISIBILITY_PLAN_INVALID';
    end if;

    receipt_hash := public.vvip_hash_entitlement_receipt(entitlement_receipt);

    select * into current_listing
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
        raise exception 'MARKETPLACE_PUBLICATION_STATE_INVALID';
    end if;
    if not public.vvip_marketplace_country_is_active(current_listing.active_market_country) then
        raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE';
    end if;

    select * into current_plan
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

    select * into current_entitlement
    from public.vvip_listing_activation_entitlements entitlement
    where entitlement.owner_subject = actor
      and entitlement.listing_id = target_listing
      and entitlement.plan_id = target_plan_id
      and entitlement.entitlement_receipt_hash = receipt_hash
    for update;

    if not found then
        raise exception 'ENTITLEMENT_REQUIRED';
    end if;
    if current_entitlement.entitlement_state <> 'ISSUED' then
        raise exception 'ENTITLEMENT_NOT_ISSUED';
    end if;
    if statement_timestamp() < current_entitlement.activation_starts_at then
        raise exception 'ENTITLEMENT_NOT_STARTED';
    end if;
    if statement_timestamp() >= current_entitlement.activation_expires_at then
        update public.vvip_listing_activation_entitlements
        set entitlement_state = 'EXPIRED', updated_at = statement_timestamp()
        where entitlement_id = current_entitlement.entitlement_id;
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
        activation_expires_at
    ) values (
        target_listing,
        current_entitlement.entitlement_id,
        actor,
        current_plan.plan_id,
        'PUBLICATION_PREPARED',
        current_entitlement.pulse_impressions,
        current_entitlement.activation_starts_at,
        current_entitlement.activation_expires_at
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

alter table public.vvip_visibility_plans enable row level security;
alter table public.vvip_visibility_plans force row level security;
alter table public.vvip_listing_activation_entitlements enable row level security;
alter table public.vvip_listing_activation_entitlements force row level security;
alter table public.vvip_publication_intent_audit enable row level security;
alter table public.vvip_publication_intent_audit force row level security;

-- Browser callers never receive direct write access to plans, entitlements or publication audit.
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

-- Safe public plan projection. No receipt/provider/internal entitlement data is exposed.
create view public.vvip_visibility_plan_catalog
with (security_barrier = true)
as
select
    plan_id,
    country_code,
    sector,
    display_name,
    price_minor,
    currency_code,
    pulse_impressions,
    activation_duration_minutes,
    policy_version
from public.vvip_visibility_plans
where plan_state = 'ACTIVE'
  and statement_timestamp() >= valid_from
  and (valid_until is null or statement_timestamp() < valid_until);

grant select on public.vvip_visibility_plan_catalog to anon, authenticated;

revoke all on function public.vvip_hash_entitlement_receipt(text) from public, anon, authenticated;
grant execute on function public.vvip_hash_entitlement_receipt(text) to service_role;

revoke all on function public.vvip_marketplace_prepare_publication(uuid, text, text) from public, anon;
grant execute on function public.vvip_marketplace_prepare_publication(uuid, text, text) to authenticated;

revoke all on function public.vvip_reject_publication_audit_mutation() from public, anon, authenticated;
grant execute on function public.vvip_reject_publication_audit_mutation() to service_role;

commit;

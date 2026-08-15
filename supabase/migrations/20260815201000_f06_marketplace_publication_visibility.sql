-- VVIP TIGER F06 — MARKETPLACE PUBLICATION + VISIBILITY ENTITLEMENT CONVERGENCE
-- Owner-canonical: 2026-08-15 latest-decision-wins.
-- One listing publication path. One dynamic sector registry. Paid visibility is
-- an entitlement and NEVER a universal organic listing-lifetime timer.

begin;

-- ---------------------------------------------------------------------------
-- Dynamic sector registry: supersedes the historical fixed three-sector check.
-- Existing sector values are preserved as registry rows before the FK is added.
-- ---------------------------------------------------------------------------

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
    sector_key,
    label_ar,
    label_en,
    is_enabled,
    display_order
)
select distinct
    listing.sector,
    initcap(replace(listing.sector, '-', ' ')),
    initcap(replace(listing.sector, '-', ' ')),
    true,
    0
from public.vvip_marketplace_listings listing
where nullif(btrim(listing.sector), '') is not null
on conflict (sector_key) do nothing;

alter table public.vvip_marketplace_listings
    drop constraint if exists vvip_marketplace_listings_sector_check;

alter table public.vvip_marketplace_listings
    drop constraint if exists vvip_marketplace_listings_sector_fkey;

alter table public.vvip_marketplace_listings
    add constraint vvip_marketplace_listings_sector_fkey
    foreign key (sector)
    references public.vvip_marketplace_sectors(sector_key);

-- ---------------------------------------------------------------------------
-- F05 media convergence: the trusted listing-media plane accepts only the
-- sanitized derivative formats. The original HEIC/HEIF never belongs here.
-- ---------------------------------------------------------------------------

alter table public.vvip_marketplace_listing_media
    drop constraint if exists vvip_marketplace_listing_media_mime_type_check;

alter table public.vvip_marketplace_listing_media
    add constraint vvip_marketplace_listing_media_mime_type_check
    check (mime_type in ('image/jpeg', 'image/webp'));

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/webp']
where id = 'listing-media';

-- ---------------------------------------------------------------------------
-- Visibility package catalog. Pricing is market-scoped, never sector-scoped.
-- No package is seeded here: commercial activation must be intentional and
-- country/legal/tax governed, not invented by a migration.
-- ---------------------------------------------------------------------------

create table if not exists public.vvip_visibility_packages (
    package_id uuid primary key default gen_random_uuid(),
    package_code text not null,
    package_version bigint not null default 1 check (package_version > 0),
    active_market_country text not null
        references public.vvip_country_authority_seals(country_code),
    currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
    price_minor bigint not null check (price_minor > 0),
    impression_budget bigint not null check (impression_budget > 0),
    activation_duration_seconds bigint not null check (activation_duration_seconds > 0),
    package_state text not null default 'INACTIVE'
        check (package_state in ('INACTIVE', 'ACTIVE', 'RETIRED')),
    effective_from timestamptz not null default statement_timestamp(),
    effective_until timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (package_code ~ '^[A-Z0-9][A-Z0-9._-]{0,63}$'),
    check (effective_until is null or effective_from < effective_until),
    unique (active_market_country, package_code, package_version)
);

create index if not exists vvip_visibility_packages_market_state_idx
    on public.vvip_visibility_packages (
        active_market_country,
        package_state,
        effective_from,
        effective_until
    );

-- ---------------------------------------------------------------------------
-- Listing visibility entitlement. Creation/payment confirmation is deliberately
-- service-only. Browser clients may read only their own entitlement records.
-- ---------------------------------------------------------------------------

create table if not exists public.vvip_listing_visibility_entitlements (
    entitlement_id uuid primary key default gen_random_uuid(),
    owner_subject text not null,
    package_id uuid not null
        references public.vvip_visibility_packages(package_id),
    listing_id uuid
        references public.vvip_marketplace_listings(listing_id) on delete set null,
    entitlement_state text not null default 'AVAILABLE'
        check (entitlement_state in (
            'AVAILABLE', 'RESERVED', 'ACTIVE', 'EXHAUSTED',
            'EXPIRED', 'CANCELLED'
        )),
    payment_state text not null
        check (payment_state in ('PENDING', 'CONFIRMED', 'PROMO', 'FAILED', 'REFUNDED')),
    price_minor_snapshot bigint not null check (price_minor_snapshot > 0),
    currency_code_snapshot text not null check (currency_code_snapshot ~ '^[A-Z]{3}$'),
    impression_budget bigint not null check (impression_budget > 0),
    delivered_impressions bigint not null default 0
        check (delivered_impressions >= 0 and delivered_impressions <= impression_budget),
    activation_duration_seconds bigint not null check (activation_duration_seconds > 0),
    reserved_at timestamptz,
    activation_started_at timestamptz,
    activation_expires_at timestamptz,
    idempotency_key text not null unique,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (length(owner_subject) between 1 and 128),
    check (length(idempotency_key) between 8 and 128),
    check (
        (activation_started_at is null and activation_expires_at is null)
        or (
            activation_started_at is not null
            and activation_expires_at is not null
            and activation_started_at < activation_expires_at
        )
    )
);

create index if not exists vvip_visibility_entitlements_owner_state_idx
    on public.vvip_listing_visibility_entitlements (
        owner_subject,
        entitlement_state,
        created_at desc
    );

create unique index if not exists vvip_one_live_visibility_entitlement_per_listing
    on public.vvip_listing_visibility_entitlements (listing_id)
    where listing_id is not null
      and entitlement_state in ('RESERVED', 'ACTIVE');

-- ---------------------------------------------------------------------------
-- Trusted submission gate. Transaction atomicity is supplied by the RPC call:
-- lock listing + lock entitlement + reserve entitlement + enter review state.
-- The listing's expires_at column is intentionally untouched.
-- ---------------------------------------------------------------------------

create or replace function public.vvip_marketplace_submit_listing(
    p_listing_id uuid,
    p_entitlement_id uuid
)
returns public.vvip_marketplace_listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
    current_listing public.vvip_marketplace_listings%rowtype;
    current_entitlement public.vvip_listing_visibility_entitlements%rowtype;
    current_package public.vvip_visibility_packages%rowtype;
    media_count integer;
    bad_media_count integer;
    result public.vvip_marketplace_listings%rowtype;
begin
    if actor is null then
        raise exception 'MARKETPLACE_AUTH_REQUIRED';
    end if;

    select * into current_listing
    from public.vvip_marketplace_listings
    where listing_id = p_listing_id
    for update;

    if not found then
        raise exception 'MARKETPLACE_LISTING_NOT_FOUND';
    end if;
    if current_listing.owner_subject <> actor then
        raise exception 'MARKETPLACE_OWNER_REQUIRED';
    end if;
    if current_listing.status not in ('DRAFT', 'REJECTED') then
        raise exception 'MARKETPLACE_SUBMISSION_STATE_INVALID';
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
    where media.listing_id = p_listing_id;

    if media_count < 1 or media_count > 7 then
        raise exception 'MARKETPLACE_MEDIA_COUNT_INVALID';
    end if;

    select count(*) into bad_media_count
    from public.vvip_marketplace_listing_media media
    where media.listing_id = p_listing_id
      and (
          media.owner_subject <> actor
          or media.mime_type not in ('image/jpeg', 'image/webp')
          or media.position not between 0 and 6
      );

    if bad_media_count <> 0 then
        raise exception 'MARKETPLACE_MEDIA_NOT_SANITIZED';
    end if;

    select * into current_entitlement
    from public.vvip_listing_visibility_entitlements
    where entitlement_id = p_entitlement_id
    for update;

    if not found then
        raise exception 'MARKETPLACE_VISIBILITY_ENTITLEMENT_NOT_FOUND';
    end if;
    if current_entitlement.owner_subject <> actor then
        raise exception 'MARKETPLACE_VISIBILITY_ENTITLEMENT_OWNER_REQUIRED';
    end if;
    if current_entitlement.payment_state not in ('CONFIRMED', 'PROMO') then
        raise exception 'MARKETPLACE_VISIBILITY_PAYMENT_NOT_CONFIRMED';
    end if;
    if current_entitlement.entitlement_state not in ('AVAILABLE', 'RESERVED') then
        raise exception 'MARKETPLACE_VISIBILITY_ENTITLEMENT_NOT_AVAILABLE';
    end if;
    if current_entitlement.entitlement_state = 'RESERVED'
       and current_entitlement.listing_id is distinct from p_listing_id then
        raise exception 'MARKETPLACE_VISIBILITY_ENTITLEMENT_ALREADY_RESERVED';
    end if;

    select * into current_package
    from public.vvip_visibility_packages
    where package_id = current_entitlement.package_id;

    if not found then
        raise exception 'MARKETPLACE_VISIBILITY_PACKAGE_NOT_FOUND';
    end if;
    if current_package.active_market_country <> current_listing.active_market_country then
        raise exception 'MARKETPLACE_VISIBILITY_MARKET_MISMATCH';
    end if;
    if current_package.package_state <> 'ACTIVE'
       or statement_timestamp() < current_package.effective_from
       or (
           current_package.effective_until is not null
           and statement_timestamp() >= current_package.effective_until
       ) then
        raise exception 'MARKETPLACE_VISIBILITY_PACKAGE_NOT_ACTIVE';
    end if;

    update public.vvip_listing_visibility_entitlements
    set listing_id = p_listing_id,
        entitlement_state = 'RESERVED',
        reserved_at = coalesce(reserved_at, statement_timestamp()),
        updated_at = statement_timestamp()
    where entitlement_id = p_entitlement_id;

    update public.vvip_marketplace_listings
    set status = 'PENDING_REVIEW',
        rejection_reason = null,
        updated_at = statement_timestamp()
    where listing_id = p_listing_id
    returning * into result;

    return result;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Preserve the authoritative review RPC name and authority checks. Approval
-- activates the RESERVED Pulse entitlement. Duration affects only visibility.
-- Organic listing expiry remains independent and is never written here.
-- ---------------------------------------------------------------------------

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
    current_listing public.vvip_marketplace_listings%rowtype;
    current_entitlement public.vvip_listing_visibility_entitlements%rowtype;
    result public.vvip_marketplace_listings%rowtype;
    activation_start timestamptz;
begin
    select * into current_listing
    from public.vvip_marketplace_listings
    where listing_id = target_listing
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
    if decision = 'APPROVE'
       and not vvip_private.vvip_marketplace_country_is_active(current_listing.active_market_country) then
        raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE';
    end if;

    select * into current_entitlement
    from public.vvip_listing_visibility_entitlements
    where listing_id = target_listing
      and entitlement_state = 'RESERVED'
    for update;

    if decision = 'APPROVE' and not found then
        raise exception 'MARKETPLACE_VISIBILITY_ENTITLEMENT_REQUIRED';
    end if;

    if decision = 'APPROVE' then
        activation_start := statement_timestamp();

        update public.vvip_listing_visibility_entitlements
        set entitlement_state = 'ACTIVE',
            activation_started_at = activation_start,
            activation_expires_at = activation_start
                + make_interval(secs => activation_duration_seconds::double precision),
            updated_at = activation_start
        where entitlement_id = current_entitlement.entitlement_id;
    elsif decision = 'BLOCK' and found then
        update public.vvip_listing_visibility_entitlements
        set listing_id = null,
            entitlement_state = 'AVAILABLE',
            reserved_at = null,
            updated_at = statement_timestamp()
        where entitlement_id = current_entitlement.entitlement_id;
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
            when decision = 'APPROVE' then coalesce(published_at, statement_timestamp())
            else published_at
        end,
        updated_at = statement_timestamp()
    where listing_id = target_listing
    returning * into result;

    return result;
end;
$function$;

-- ---------------------------------------------------------------------------
-- RLS / ACL: catalogs are readable, entitlements are owner-readable only, and
-- all commercial mutations remain trusted-server/service-role operations.
-- ---------------------------------------------------------------------------

alter table public.vvip_marketplace_sectors enable row level security;
alter table public.vvip_marketplace_sectors force row level security;
alter table public.vvip_visibility_packages enable row level security;
alter table public.vvip_visibility_packages force row level security;
alter table public.vvip_listing_visibility_entitlements enable row level security;
alter table public.vvip_listing_visibility_entitlements force row level security;

drop policy if exists vvip_marketplace_sectors_public_read
on public.vvip_marketplace_sectors;
create policy vvip_marketplace_sectors_public_read
on public.vvip_marketplace_sectors
for select
to anon, authenticated
using (is_enabled);

drop policy if exists vvip_visibility_packages_public_read
on public.vvip_visibility_packages;
create policy vvip_visibility_packages_public_read
on public.vvip_visibility_packages
for select
to anon, authenticated
using (
    package_state = 'ACTIVE'
    and statement_timestamp() >= effective_from
    and (effective_until is null or statement_timestamp() < effective_until)
    and vvip_private.vvip_marketplace_country_is_active(active_market_country)
);

drop policy if exists vvip_visibility_entitlements_owner_read
on public.vvip_listing_visibility_entitlements;
create policy vvip_visibility_entitlements_owner_read
on public.vvip_listing_visibility_entitlements
for select
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id());

revoke all privileges on table
    public.vvip_marketplace_sectors,
    public.vvip_visibility_packages,
    public.vvip_listing_visibility_entitlements
from public, anon, authenticated;

grant select on public.vvip_marketplace_sectors to anon, authenticated;
grant select on public.vvip_visibility_packages to anon, authenticated;
grant select on public.vvip_listing_visibility_entitlements to authenticated;

grant all privileges on table
    public.vvip_marketplace_sectors,
    public.vvip_visibility_packages,
    public.vvip_listing_visibility_entitlements
to service_role;

revoke all on function public.vvip_marketplace_submit_listing(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.vvip_marketplace_submit_listing(uuid, uuid)
to authenticated, service_role;

revoke all on function public.vvip_marketplace_review_listing(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.vvip_marketplace_review_listing(uuid, text, text)
to authenticated, service_role;

commit;

-- VVIP TIGER GLOBAL LAUNCH PHASE B
-- Forward-only dark-launch convergence of authorization + marketplace substrate.
-- No authority principal, assignment, country activation, listing, payment, price catalog,
-- legal seal, or user-owned business row is seeded by this migration.

begin;

create schema if not exists vvip_private;
revoke all on schema vvip_private from public, anon, authenticated;
grant usage on schema vvip_private to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Authorization substrate required by trusted marketplace review.
-- ---------------------------------------------------------------------------

create table if not exists public.vvip_authority_roles (
    role_id text primary key,
    role_rank integer not null check (role_rank between 0 and 11),
    authority_class text not null
        check (authority_class in ('OWNER_ROOT', 'PARTNER_GLOBAL_ADMIN', 'DELEGATED')),
    created_at timestamptz not null default statement_timestamp(),
    check (length(role_id) between 1 and 128)
);

create table if not exists public.vvip_authority_permissions (
    permission_id text primary key,
    description text not null,
    created_at timestamptz not null default statement_timestamp(),
    check (length(permission_id) between 1 and 128),
    check (length(description) between 1 and 500)
);

create table if not exists public.vvip_authority_principals (
    principal_id text primary key,
    authority_class text not null
        check (authority_class in ('OWNER_ROOT', 'PARTNER_GLOBAL_ADMIN', 'DELEGATED')),
    principal_state text not null
        check (principal_state in ('active', 'suspended', 'revoked')),
    assignment_revision bigint not null default 1 check (assignment_revision > 0),
    legal_decision_reference text,
    created_by text,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (length(principal_id) between 1 and 128),
    check (created_by is null or length(created_by) between 1 and 128),
    check (
        authority_class <> 'PARTNER_GLOBAL_ADMIN'
        or nullif(btrim(legal_decision_reference), '') is not null
    ),
    check (legal_decision_reference is null or length(legal_decision_reference) <= 128)
);

create unique index if not exists vvip_one_active_owner_root
    on public.vvip_authority_principals (authority_class)
    where authority_class = 'OWNER_ROOT' and principal_state = 'active';

create table if not exists public.vvip_authority_assignments (
    assignment_id uuid primary key,
    principal_id text not null
        references public.vvip_authority_principals(principal_id),
    role_id text not null
        references public.vvip_authority_roles(role_id),
    permission_ids text[] not null default '{}',
    scope_level text not null
        check (scope_level in ('platform', 'country', 'sector', 'region', 'area', 'team')),
    country_code text,
    sector_id text,
    region_id text,
    area_id text,
    team_id text,
    assignment_state text not null
        check (assignment_state in ('pending', 'active', 'suspended', 'revoked', 'expired')),
    starts_at timestamptz not null,
    expires_at timestamptz,
    granted_by text not null,
    created_at timestamptz not null default statement_timestamp(),
    check (length(granted_by) between 1 and 128),
    check (cardinality(permission_ids) <= 50),
    check (expires_at is null or starts_at < expires_at),
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
    check (
        (scope_level = 'platform'
            and country_code is null and sector_id is null and region_id is null
            and area_id is null and team_id is null)
        or (scope_level = 'country'
            and country_code is not null and sector_id is null and region_id is null
            and area_id is null and team_id is null)
        or (scope_level = 'sector'
            and country_code is not null and sector_id is not null and region_id is null
            and area_id is null and team_id is null)
        or (scope_level = 'region'
            and country_code is not null and sector_id is not null and region_id is not null
            and area_id is null and team_id is null)
        or (scope_level = 'area'
            and country_code is not null and sector_id is not null and region_id is not null
            and area_id is not null and team_id is null)
        or (scope_level = 'team'
            and country_code is not null and sector_id is not null and region_id is not null
            and area_id is not null and team_id is not null)
    ),
    check (sector_id is null or length(sector_id) between 1 and 128),
    check (region_id is null or length(region_id) between 1 and 128),
    check (area_id is null or length(area_id) between 1 and 128),
    check (team_id is null or length(team_id) between 1 and 128)
);

create index if not exists vvip_authority_assignments_principal_state_idx
    on public.vvip_authority_assignments (principal_id, assignment_state);
create index if not exists vvip_authority_assignments_role_id_idx
    on public.vvip_authority_assignments (role_id);

create table if not exists public.vvip_authority_assignment_revisions (
    principal_id text primary key
        references public.vvip_authority_principals(principal_id),
    assignment_revision bigint not null check (assignment_revision > 0),
    changed_at timestamptz not null default statement_timestamp(),
    changed_by text not null,
    check (length(changed_by) between 1 and 128)
);

create table if not exists public.vvip_country_authority_seals (
    country_code text primary key,
    activation_state text not null
        check (activation_state in ('DRAFT', 'LEGAL_APPROVED', 'TAX_CONFIGURED', 'ACTIVE', 'SUSPENDED')),
    seal_status text not null
        check (seal_status in ('MISSING', 'VALID', 'INVALID', 'SUSPENDED')),
    seal_version text,
    legal_entity_country text,
    data_residency_region text,
    updated_at timestamptz not null default statement_timestamp(),
    check (country_code ~ '^[A-Z]{2}$'),
    check (seal_version is null or length(seal_version) between 1 and 128),
    check (legal_entity_country is null or legal_entity_country ~ '^[A-Z]{2}$'),
    check (data_residency_region is null or length(data_residency_region) between 1 and 128)
);

create table if not exists public.vvip_authorization_envelope_audit (
    envelope_id text primary key,
    actor_id text not null,
    authority_class text not null
        check (authority_class in ('OWNER_ROOT', 'PARTNER_GLOBAL_ADMIN', 'DELEGATED')),
    permission_ids text[] not null,
    role_ids text[] not null,
    scope_level text not null
        check (scope_level in ('platform', 'country', 'sector', 'region', 'area', 'team')),
    country_code text,
    assignment_revision bigint not null check (assignment_revision > 0),
    policy_version text not null check (policy_version = 'V13.1'),
    country_seal_version text,
    session_issued_at timestamptz not null,
    issued_at timestamptz not null,
    expires_at timestamptz not null,
    correlation_id text not null,
    created_at timestamptz not null default statement_timestamp(),
    check (length(envelope_id) between 1 and 128),
    check (length(actor_id) between 1 and 128),
    check (length(correlation_id) between 1 and 128),
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
    check (country_seal_version is null or length(country_seal_version) between 1 and 128),
    check (cardinality(permission_ids) <= 50),
    check (cardinality(role_ids) <= 50),
    check (session_issued_at <= issued_at),
    check (issued_at < expires_at),
    check (expires_at <= issued_at + interval '300 seconds')
);

create table if not exists public.vvip_authorization_audit_events (
    audit_id uuid primary key,
    sequence_no bigint not null unique check (sequence_no > 0),
    previous_hash text,
    event_hash text not null unique,
    actor_id text not null,
    action text not null,
    target_type text not null,
    target_id text not null,
    reason text not null,
    correlation_key text not null,
    idempotency_key text not null,
    event_payload jsonb not null,
    created_at timestamptz not null default statement_timestamp(),
    check (length(actor_id) between 1 and 128),
    check (length(action) between 1 and 128),
    check (length(target_type) between 1 and 128),
    check (length(target_id) between 1 and 128),
    check (length(reason) between 1 and 500),
    check (length(correlation_key) between 1 and 128),
    check (length(idempotency_key) between 1 and 128),
    check (previous_hash is null or length(previous_hash) between 32 and 128),
    check (length(event_hash) between 32 and 128)
);

create or replace function public.vvip_current_actor_id()
returns text
language sql
stable
set search_path = pg_catalog, public
as $function$
    select nullif(current_setting('request.jwt.claim.sub', true), '');
$function$;

create or replace function public.vvip_guard_authority_principal_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    if TG_OP = 'UPDATE'
       and (OLD.authority_class = 'OWNER_ROOT' or NEW.authority_class = 'OWNER_ROOT') then
        raise exception 'OWNER_ROOT_IMMUTABLE';
    end if;
    if TG_OP = 'DELETE' and OLD.authority_class = 'OWNER_ROOT' then
        raise exception 'OWNER_ROOT_IMMUTABLE';
    end if;
    if current_user in ('anon', 'authenticated') then
        raise exception 'CLIENT_AUTHORITY_FIELDS_DENIED';
    end if;
    return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$function$;

create or replace function public.vvip_reject_authorization_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    if TG_OP in ('UPDATE', 'DELETE') then
        raise exception 'AUTHORIZATION_AUDIT_APPEND_ONLY';
    end if;
    return NEW;
end;
$function$;

drop trigger if exists vvip_authority_principal_mutation_guard
on public.vvip_authority_principals;
create trigger vvip_authority_principal_mutation_guard
before insert or update or delete on public.vvip_authority_principals
for each row execute function public.vvip_guard_authority_principal_mutation();

drop trigger if exists vvip_authorization_audit_append_only_guard
on public.vvip_authorization_audit_events;
create trigger vvip_authorization_audit_append_only_guard
before update or delete on public.vvip_authorization_audit_events
for each row execute function public.vvip_reject_authorization_audit_mutation();

-- Browser callers never receive direct authority/country/audit table privileges.
alter table public.vvip_authority_roles enable row level security;
alter table public.vvip_authority_roles force row level security;
alter table public.vvip_authority_permissions enable row level security;
alter table public.vvip_authority_permissions force row level security;
alter table public.vvip_authority_principals enable row level security;
alter table public.vvip_authority_principals force row level security;
alter table public.vvip_authority_assignments enable row level security;
alter table public.vvip_authority_assignments force row level security;
alter table public.vvip_authority_assignment_revisions enable row level security;
alter table public.vvip_authority_assignment_revisions force row level security;
alter table public.vvip_country_authority_seals enable row level security;
alter table public.vvip_country_authority_seals force row level security;
alter table public.vvip_authorization_envelope_audit enable row level security;
alter table public.vvip_authorization_envelope_audit force row level security;
alter table public.vvip_authorization_audit_events enable row level security;
alter table public.vvip_authorization_audit_events force row level security;

revoke all privileges on table
    public.vvip_authority_roles,
    public.vvip_authority_permissions,
    public.vvip_authority_principals,
    public.vvip_authority_assignments,
    public.vvip_authority_assignment_revisions,
    public.vvip_country_authority_seals,
    public.vvip_authorization_envelope_audit,
    public.vvip_authorization_audit_events
from public, anon, authenticated;

grant all privileges on table
    public.vvip_authority_roles,
    public.vvip_authority_permissions,
    public.vvip_authority_principals,
    public.vvip_authority_assignments,
    public.vvip_authority_assignment_revisions,
    public.vvip_country_authority_seals,
    public.vvip_authorization_envelope_audit,
    public.vvip_authorization_audit_events
to service_role;

revoke all on function public.vvip_current_actor_id() from public, anon, authenticated;
revoke all on function public.vvip_guard_authority_principal_mutation() from public, anon, authenticated;
revoke all on function public.vvip_reject_authorization_audit_mutation() from public, anon, authenticated;
grant execute on function public.vvip_current_actor_id() to service_role;
grant execute on function public.vvip_guard_authority_principal_mutation() to service_role;
grant execute on function public.vvip_reject_authorization_audit_mutation() to service_role;

-- ---------------------------------------------------------------------------
-- Marketplace identity, data model, guard rails, audit and trusted review.
-- ---------------------------------------------------------------------------

create or replace function public.vvip_marketplace_actor_id()
returns text
language sql
stable
set search_path = pg_catalog, public
as $function$
    select case
        when nullif(auth.jwt() ->> 'sub', '') like 'user\_%' escape '\'
            then nullif(auth.jwt() ->> 'sub', '')
        else null
    end;
$function$;

create table if not exists public.vvip_marketplace_listings (
    listing_id uuid primary key default gen_random_uuid(),
    owner_subject text not null default public.vvip_marketplace_actor_id(),
    active_market_country text not null
        references public.vvip_country_authority_seals(country_code),
    sector text not null
        check (sector in ('automotive', 'materials', 'real-estate')),
    title text not null,
    summary text not null default '',
    specifications jsonb not null default '{}'::jsonb,
    price_minor bigint not null check (price_minor > 0 and price_minor <= 99999999999999),
    currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
    location_label text not null,
    contact_phone text,
    whatsapp_enabled boolean not null default false,
    status text not null default 'DRAFT'
        check (status in (
            'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED',
            'EXPIRED', 'REJECTED', 'BLOCKED', 'ARCHIVED'
        )),
    rejection_reason text,
    published_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (length(owner_subject) between 1 and 128),
    check (length(title) between 2 and 80),
    check (length(summary) <= 2000),
    check (jsonb_typeof(specifications) = 'object'),
    check (octet_length(specifications::text) <= 8192),
    check (length(location_label) between 1 and 120),
    check (contact_phone is null or length(contact_phone) between 7 and 32),
    check (rejection_reason is null or length(rejection_reason) <= 500),
    check (expires_at is null or published_at is null or published_at < expires_at),
    check (not whatsapp_enabled or contact_phone is not null)
);

create index if not exists vvip_marketplace_listings_public_idx
    on public.vvip_marketplace_listings
        (active_market_country, sector, status, published_at desc, created_at desc);
create index if not exists vvip_marketplace_listings_owner_idx
    on public.vvip_marketplace_listings (owner_subject, updated_at desc);

create table if not exists public.vvip_marketplace_listing_media (
    media_id uuid primary key default gen_random_uuid(),
    listing_id uuid not null
        references public.vvip_marketplace_listings(listing_id) on delete cascade,
    owner_subject text not null default public.vvip_marketplace_actor_id(),
    storage_path text not null unique,
    mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
    byte_size integer not null check (byte_size between 1 and 10485760),
    width integer not null check (width between 320 and 4096),
    height integer not null check (height between 240 and 4096),
    position smallint not null check (position between 0 and 6),
    is_cover boolean not null default false,
    alt_text text not null default 'صورة الإعلان',
    created_at timestamptz not null default statement_timestamp(),
    check (length(owner_subject) between 1 and 128),
    check (length(storage_path) between 1 and 500),
    check (length(alt_text) between 1 and 160),
    unique (listing_id, position)
);

create unique index if not exists vvip_marketplace_one_cover_per_listing
    on public.vvip_marketplace_listing_media (listing_id)
    where is_cover;

create table if not exists public.vvip_marketplace_favorites (
    owner_subject text not null default public.vvip_marketplace_actor_id(),
    listing_id uuid not null
        references public.vvip_marketplace_listings(listing_id) on delete cascade,
    created_at timestamptz not null default statement_timestamp(),
    primary key (owner_subject, listing_id),
    check (length(owner_subject) between 1 and 128)
);

create index if not exists vvip_marketplace_favorites_listing_id_idx
    on public.vvip_marketplace_favorites (listing_id);

create table if not exists public.vvip_marketplace_listing_audit (
    audit_id uuid primary key default gen_random_uuid(),
    listing_id uuid not null,
    actor_subject text,
    previous_status text,
    next_status text not null,
    reason text,
    created_at timestamptz not null default statement_timestamp(),
    check (actor_subject is null or length(actor_subject) between 1 and 128),
    check (reason is null or length(reason) <= 500)
);

create or replace function vvip_private.vvip_marketplace_country_is_active(target_country text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
    select exists (
        select 1
        from public.vvip_country_authority_seals seal
        where seal.country_code = target_country
          and seal.activation_state = 'ACTIVE'
          and seal.seal_status = 'VALID'
    );
$function$;

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
            if NEW.status in ('ACTIVE', 'EXPIRED', 'REJECTED', 'BLOCKED') then
                raise exception 'MARKETPLACE_TRUSTED_REVIEW_REQUIRED';
            end if;
            if not (
                (OLD.status = 'DRAFT' and NEW.status in ('DRAFT', 'PENDING_REVIEW', 'ARCHIVED'))
                or (OLD.status = 'REJECTED' and NEW.status in ('DRAFT', 'PENDING_REVIEW', 'ARCHIVED'))
                or (OLD.status = 'ACTIVE' and NEW.status in ('ACTIVE', 'PAUSED', 'ARCHIVED'))
                or (OLD.status = 'PAUSED' and NEW.status in ('PAUSED', 'PENDING_REVIEW', 'ARCHIVED'))
                or (OLD.status = 'ARCHIVED' and NEW.status = 'ARCHIVED')
            ) then
                raise exception 'MARKETPLACE_STATE_TRANSITION_DENIED';
            end if;
        end if;
    end if;

    if not vvip_private.vvip_marketplace_country_is_active(NEW.active_market_country) then
        raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE';
    end if;

    NEW.updated_at := statement_timestamp();
    return NEW;
end;
$function$;

create or replace function public.vvip_marketplace_record_listing_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    if TG_OP = 'INSERT' or NEW.status is distinct from OLD.status then
        insert into public.vvip_marketplace_listing_audit (
            listing_id, actor_subject, previous_status, next_status, reason
        ) values (
            NEW.listing_id,
            public.vvip_marketplace_actor_id(),
            case when TG_OP = 'INSERT' then null else OLD.status end,
            NEW.status,
            NEW.rejection_reason
        );
    end if;
    return NEW;
end;
$function$;

create or replace function vvip_private.vvip_marketplace_actor_can_review(target_country text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
    with actor as (
        select public.vvip_marketplace_actor_id() as actor_id
    )
    select exists (
        select 1
        from public.vvip_authority_principals principal
        cross join actor
        where principal.principal_id = actor.actor_id
          and principal.principal_state = 'active'
          and principal.authority_class = 'OWNER_ROOT'
    ) or exists (
        select 1
        from public.vvip_authority_principals principal
        join public.vvip_authority_assignments assignment
          on assignment.principal_id = principal.principal_id
        cross join actor
        where principal.principal_id = actor.actor_id
          and principal.principal_state = 'active'
          and assignment.assignment_state = 'active'
          and statement_timestamp() >= assignment.starts_at
          and (assignment.expires_at is null or statement_timestamp() < assignment.expires_at)
          and (
              'listing.review' = any(assignment.permission_ids)
              or 'listing.manage' = any(assignment.permission_ids)
          )
          and (
              assignment.scope_level = 'platform'
              or assignment.country_code = target_country
          )
    );
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
    current_listing public.vvip_marketplace_listings%rowtype;
    result public.vvip_marketplace_listings%rowtype;
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

create or replace function public.vvip_marketplace_reject_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    raise exception 'MARKETPLACE_AUDIT_APPEND_ONLY';
end;
$function$;

drop trigger if exists vvip_marketplace_listing_write_guard
on public.vvip_marketplace_listings;
create trigger vvip_marketplace_listing_write_guard
before insert or update on public.vvip_marketplace_listings
for each row execute function public.vvip_marketplace_guard_listing_write();

drop trigger if exists vvip_marketplace_listing_audit_trigger
on public.vvip_marketplace_listings;
create trigger vvip_marketplace_listing_audit_trigger
after insert or update on public.vvip_marketplace_listings
for each row execute function public.vvip_marketplace_record_listing_audit();

drop trigger if exists vvip_marketplace_audit_append_only
on public.vvip_marketplace_listing_audit;
create trigger vvip_marketplace_audit_append_only
before update or delete on public.vvip_marketplace_listing_audit
for each row execute function public.vvip_marketplace_reject_audit_mutation();

-- Final hardened RLS plane.
alter table public.vvip_marketplace_listings enable row level security;
alter table public.vvip_marketplace_listings force row level security;
alter table public.vvip_marketplace_listing_media enable row level security;
alter table public.vvip_marketplace_listing_media force row level security;
alter table public.vvip_marketplace_favorites enable row level security;
alter table public.vvip_marketplace_favorites force row level security;
alter table public.vvip_marketplace_listing_audit enable row level security;
alter table public.vvip_marketplace_listing_audit force row level security;

drop policy if exists vvip_marketplace_public_read_active
on public.vvip_marketplace_listings;
drop policy if exists vvip_marketplace_owner_read
on public.vvip_marketplace_listings;
drop policy if exists vvip_marketplace_authenticated_read
on public.vvip_marketplace_listings;
drop policy if exists vvip_marketplace_owner_insert_draft
on public.vvip_marketplace_listings;
drop policy if exists vvip_marketplace_owner_update
on public.vvip_marketplace_listings;
drop policy if exists vvip_marketplace_owner_delete
on public.vvip_marketplace_listings;

create policy vvip_marketplace_public_read_active
on public.vvip_marketplace_listings
for select
to anon
using (
    status = 'ACTIVE'
    and vvip_private.vvip_marketplace_country_is_active(active_market_country)
);

create policy vvip_marketplace_authenticated_read
on public.vvip_marketplace_listings
for select
to authenticated
using (
    owner_subject = public.vvip_marketplace_actor_id()
    or (
        status = 'ACTIVE'
        and vvip_private.vvip_marketplace_country_is_active(active_market_country)
    )
);

create policy vvip_marketplace_owner_insert_draft
on public.vvip_marketplace_listings
for insert
to authenticated
with check (
    owner_subject = public.vvip_marketplace_actor_id()
    and status = 'DRAFT'
    and vvip_private.vvip_marketplace_country_is_active(active_market_country)
);

create policy vvip_marketplace_owner_update
on public.vvip_marketplace_listings
for update
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id())
with check (
    owner_subject = public.vvip_marketplace_actor_id()
    and vvip_private.vvip_marketplace_country_is_active(active_market_country)
);

create policy vvip_marketplace_owner_delete
on public.vvip_marketplace_listings
for delete
to authenticated
using (
    owner_subject = public.vvip_marketplace_actor_id()
    and status in ('DRAFT', 'ARCHIVED')
);

drop policy if exists vvip_marketplace_media_read
on public.vvip_marketplace_listing_media;
drop policy if exists vvip_marketplace_media_owner_write
on public.vvip_marketplace_listing_media;
drop policy if exists vvip_marketplace_media_owner_insert
on public.vvip_marketplace_listing_media;
drop policy if exists vvip_marketplace_media_owner_update
on public.vvip_marketplace_listing_media;
drop policy if exists vvip_marketplace_media_owner_delete
on public.vvip_marketplace_listing_media;

create policy vvip_marketplace_media_read
on public.vvip_marketplace_listing_media
for select
to anon, authenticated
using (
    owner_subject = public.vvip_marketplace_actor_id()
    or exists (
        select 1
        from public.vvip_marketplace_listings listing
        where listing.listing_id = vvip_marketplace_listing_media.listing_id
          and listing.status = 'ACTIVE'
          and vvip_private.vvip_marketplace_country_is_active(listing.active_market_country)
    )
);

create policy vvip_marketplace_media_owner_insert
on public.vvip_marketplace_listing_media
for insert
to authenticated
with check (
    owner_subject = public.vvip_marketplace_actor_id()
    and position between 0 and 6
    and exists (
        select 1
        from public.vvip_marketplace_listings listing
        where listing.listing_id = vvip_marketplace_listing_media.listing_id
          and listing.owner_subject = public.vvip_marketplace_actor_id()
          and listing.status in ('DRAFT', 'REJECTED')
    )
);

create policy vvip_marketplace_media_owner_update
on public.vvip_marketplace_listing_media
for update
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id())
with check (
    owner_subject = public.vvip_marketplace_actor_id()
    and position between 0 and 6
    and exists (
        select 1
        from public.vvip_marketplace_listings listing
        where listing.listing_id = vvip_marketplace_listing_media.listing_id
          and listing.owner_subject = public.vvip_marketplace_actor_id()
          and listing.status in ('DRAFT', 'REJECTED')
    )
);

create policy vvip_marketplace_media_owner_delete
on public.vvip_marketplace_listing_media
for delete
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id());

drop policy if exists vvip_marketplace_favorites_owner
on public.vvip_marketplace_favorites;
create policy vvip_marketplace_favorites_owner
on public.vvip_marketplace_favorites
for all
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id())
with check (owner_subject = public.vvip_marketplace_actor_id());

-- Browser ACLs: business reads/writes are possible only where RLS allows them.
revoke all privileges on table
    public.vvip_marketplace_listings,
    public.vvip_marketplace_listing_media,
    public.vvip_marketplace_favorites,
    public.vvip_marketplace_listing_audit
from public, anon, authenticated;

grant select on public.vvip_marketplace_listings to anon, authenticated;
grant insert, update, delete on public.vvip_marketplace_listings to authenticated;
grant select on public.vvip_marketplace_listing_media to anon, authenticated;
grant insert, update, delete on public.vvip_marketplace_listing_media to authenticated;
grant select, insert, delete on public.vvip_marketplace_favorites to authenticated;

revoke all privileges on table public.vvip_marketplace_listing_audit
from anon, authenticated;

grant all privileges on table
    public.vvip_marketplace_listings,
    public.vvip_marketplace_listing_media,
    public.vvip_marketplace_favorites,
    public.vvip_marketplace_listing_audit
to service_role;

-- Public actor helper is harmless but still narrowed to the identities that need it.
revoke all on function public.vvip_marketplace_actor_id() from public, anon, authenticated;
grant execute on function public.vvip_marketplace_actor_id() to anon, authenticated, service_role;

revoke all on function vvip_private.vvip_marketplace_country_is_active(text)
from public, anon, authenticated;
grant execute on function vvip_private.vvip_marketplace_country_is_active(text)
to anon, authenticated, service_role;

revoke all on function vvip_private.vvip_marketplace_actor_can_review(text)
from public, anon, authenticated;
grant execute on function vvip_private.vvip_marketplace_actor_can_review(text)
to service_role;

revoke all on function public.vvip_marketplace_guard_listing_write()
from public, anon, authenticated;
revoke all on function public.vvip_marketplace_record_listing_audit()
from public, anon, authenticated;
revoke all on function public.vvip_marketplace_reject_audit_mutation()
from public, anon, authenticated;
grant execute on function public.vvip_marketplace_guard_listing_write() to service_role;
grant execute on function public.vvip_marketplace_record_listing_audit() to service_role;
grant execute on function public.vvip_marketplace_reject_audit_mutation() to service_role;

revoke all on function public.vvip_marketplace_review_listing(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.vvip_marketplace_review_listing(uuid, text, text)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Private listing media storage.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'listing-media',
    'listing-media',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vvip_listing_media_storage_owner_insert
on storage.objects;
drop policy if exists vvip_listing_media_storage_owner_update
on storage.objects;
drop policy if exists vvip_listing_media_storage_owner_delete
on storage.objects;
drop policy if exists vvip_listing_media_storage_read
on storage.objects;

create policy vvip_listing_media_storage_owner_insert
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = public.vvip_marketplace_actor_id()
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy vvip_listing_media_storage_owner_update
on storage.objects
for update
to authenticated
using (
    bucket_id = 'listing-media'
    and owner_id = public.vvip_marketplace_actor_id()
)
with check (
    bucket_id = 'listing-media'
    and owner_id = public.vvip_marketplace_actor_id()
);

create policy vvip_listing_media_storage_owner_delete
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'listing-media'
    and owner_id = public.vvip_marketplace_actor_id()
);

create policy vvip_listing_media_storage_read
on storage.objects
for select
to anon, authenticated
using (
    bucket_id = 'listing-media'
    and (
        owner_id = public.vvip_marketplace_actor_id()
        or exists (
            select 1
            from public.vvip_marketplace_listing_media media
            join public.vvip_marketplace_listings listing
              on listing.listing_id = media.listing_id
            where media.storage_path = storage.objects.name
              and listing.status = 'ACTIVE'
              and vvip_private.vvip_marketplace_country_is_active(listing.active_market_country)
        )
    )
);

commit;

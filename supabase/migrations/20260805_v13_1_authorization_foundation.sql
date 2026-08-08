-- V13.1 authorization foundation.
-- Dark-launch schema only: no authority principal, assignment, country, seal, or catalog data.
-- Clerk subjects are opaque bounded text. UUID values identify internal records only.

create table public.vvip_authority_roles (
    role_id text primary key,
    role_rank integer not null check (role_rank between 0 and 11),
    authority_class text not null
        check (authority_class in ('OWNER_ROOT', 'PARTNER_GLOBAL_ADMIN', 'DELEGATED')),
    created_at timestamptz not null default statement_timestamp(),
    check (length(role_id) between 1 and 128)
);

create table public.vvip_authority_permissions (
    permission_id text primary key,
    description text not null,
    created_at timestamptz not null default statement_timestamp(),
    check (length(permission_id) between 1 and 128),
    check (length(description) between 1 and 500)
);

create table public.vvip_authority_principals (
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

create unique index vvip_one_active_owner_root
    on public.vvip_authority_principals (authority_class)
    where authority_class = 'OWNER_ROOT' and principal_state = 'active';

create table public.vvip_authority_assignments (
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

create index vvip_authority_assignments_principal_state_idx
    on public.vvip_authority_assignments (principal_id, assignment_state);

create table public.vvip_authority_assignment_revisions (
    principal_id text primary key
        references public.vvip_authority_principals(principal_id),
    assignment_revision bigint not null check (assignment_revision > 0),
    changed_at timestamptz not null default statement_timestamp(),
    changed_by text not null,
    check (length(changed_by) between 1 and 128)
);

create table public.vvip_country_authority_seals (
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

create table public.vvip_authorization_envelope_audit (
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

create table public.vvip_authorization_audit_events (
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

create function public.vvip_current_actor_id()
returns text
language sql
stable
set search_path = pg_catalog, public
as $function$
    select nullif(current_setting('request.jwt.claim.sub', true), '');
$function$;

create function public.vvip_guard_authority_principal_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    if TG_OP = 'UPDATE'
       and (
           OLD.authority_class = 'OWNER_ROOT'
           or NEW.authority_class = 'OWNER_ROOT'
       ) then
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

create function public.vvip_reject_authorization_audit_mutation()
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

create trigger vvip_authority_principal_mutation_guard
before insert or update or delete on public.vvip_authority_principals
for each row execute function public.vvip_guard_authority_principal_mutation();

create trigger vvip_authorization_audit_append_only_guard
before update or delete on public.vvip_authorization_audit_events
for each row execute function public.vvip_reject_authorization_audit_mutation();

revoke all privileges on table
    public.vvip_authority_roles,
    public.vvip_authority_permissions,
    public.vvip_authority_principals,
    public.vvip_authority_assignments,
    public.vvip_authority_assignment_revisions,
    public.vvip_country_authority_seals,
    public.vvip_authorization_envelope_audit,
    public.vvip_authorization_audit_events
from public;

revoke all privileges on table
    public.vvip_authority_roles,
    public.vvip_authority_permissions,
    public.vvip_authority_principals,
    public.vvip_authority_assignments,
    public.vvip_authority_assignment_revisions,
    public.vvip_country_authority_seals,
    public.vvip_authorization_envelope_audit,
    public.vvip_authorization_audit_events
from anon;

revoke all privileges on table
    public.vvip_authority_roles,
    public.vvip_authority_permissions,
    public.vvip_authority_principals,
    public.vvip_authority_assignments,
    public.vvip_authority_assignment_revisions,
    public.vvip_country_authority_seals,
    public.vvip_authorization_envelope_audit,
    public.vvip_authorization_audit_events
from authenticated;

revoke all on function public.vvip_current_actor_id() from public;
revoke all on function public.vvip_current_actor_id() from anon;
revoke all on function public.vvip_current_actor_id() from authenticated;
revoke all on function public.vvip_guard_authority_principal_mutation() from public;
revoke all on function public.vvip_guard_authority_principal_mutation() from anon;
revoke all on function public.vvip_guard_authority_principal_mutation() from authenticated;
revoke all on function public.vvip_reject_authorization_audit_mutation() from public;
revoke all on function public.vvip_reject_authorization_audit_mutation() from anon;
revoke all on function public.vvip_reject_authorization_audit_mutation() from authenticated;

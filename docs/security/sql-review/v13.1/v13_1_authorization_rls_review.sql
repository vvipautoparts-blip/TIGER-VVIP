-- REVIEW ONLY — DO NOT APPLY
-- V13.1 authorization envelopes and row-level-security contract.
-- This auditable design artifact is intentionally outside supabase/migrations.
-- It contains no remote execution instruction, project identifier, endpoint, or secret.

create table if not exists public.vvip_authority_roles (
    role_id text primary key,
    role_rank integer not null check (role_rank between 0 and 11),
    authority_class text not null
        check (authority_class in ('OWNER_ROOT', 'PARTNER_GLOBAL_ADMIN', 'DELEGATED')),
    created_at timestamptz not null default now()
);

create table if not exists public.vvip_authority_permissions (
    permission_id text primary key,
    description text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.vvip_authority_principals (
    principal_id uuid primary key,
    authority_class text not null
        check (authority_class in ('OWNER_ROOT', 'PARTNER_GLOBAL_ADMIN', 'DELEGATED')),
    principal_state text not null
        check (principal_state in ('active', 'suspended', 'revoked')),
    assignment_revision bigint not null default 1 check (assignment_revision > 0),
    legal_decision_reference text,
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (
        authority_class <> 'PARTNER_GLOBAL_ADMIN'
        or nullif(btrim(legal_decision_reference), '') is not null
    )
);

create unique index if not exists vvip_one_active_owner_root
    on public.vvip_authority_principals (authority_class)
    where authority_class = 'OWNER_ROOT' and principal_state = 'active';

create table if not exists public.vvip_authority_assignments (
    assignment_id uuid primary key,
    principal_id uuid not null references public.vvip_authority_principals(principal_id),
    role_id text not null references public.vvip_authority_roles(role_id),
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
    granted_by uuid not null,
    created_at timestamptz not null default now(),
    check (expires_at is null or starts_at < expires_at),
    check (
        (scope_level = 'platform' and country_code is null and sector_id is null and region_id is null and area_id is null and team_id is null)
        or (scope_level = 'country' and country_code is not null and sector_id is null and region_id is null and area_id is null and team_id is null)
        or (scope_level = 'sector' and country_code is not null and sector_id is not null and region_id is null and area_id is null and team_id is null)
        or (scope_level = 'region' and country_code is not null and sector_id is not null and region_id is not null and area_id is null and team_id is null)
        or (scope_level = 'area' and country_code is not null and sector_id is not null and region_id is not null and area_id is not null and team_id is null)
        or (scope_level = 'team' and country_code is not null and sector_id is not null and region_id is not null and area_id is not null and team_id is not null)
    )
);

create table if not exists public.vvip_authority_assignment_revisions (
    principal_id uuid primary key references public.vvip_authority_principals(principal_id),
    assignment_revision bigint not null check (assignment_revision > 0),
    changed_at timestamptz not null default now(),
    changed_by uuid not null
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
    updated_at timestamptz not null default now()
);

create table if not exists public.vvip_authorization_envelope_audit (
    envelope_id text primary key,
    actor_id uuid not null,
    authority_class text not null
        check (authority_class in ('OWNER_ROOT', 'PARTNER_GLOBAL_ADMIN', 'DELEGATED')),
    permission_ids text[] not null,
    role_ids text[] not null,
    scope_level text not null
        check (scope_level in ('platform', 'country', 'sector', 'region', 'area', 'team')),
    country_code text,
    assignment_revision bigint not null,
    policy_version text not null check (policy_version = 'V13.1'),
    country_seal_version text,
    session_issued_at timestamptz not null,
    issued_at timestamptz not null,
    expires_at timestamptz not null,
    correlation_id text not null,
    check (issued_at < expires_at and expires_at <= issued_at + interval '300 seconds')
);

create table if not exists public.vvip_authorization_audit_events (
    audit_id uuid primary key,
    sequence_no bigint generated always as identity,
    previous_hash text,
    event_hash text not null unique,
    actor_id uuid not null,
    action text not null,
    target_type text not null,
    target_id text not null,
    reason text not null,
    correlation_key text not null,
    idempotency_key text not null,
    event_payload jsonb not null,
    created_at timestamptz not null default now()
);

alter table public.vvip_authority_principals enable row level security;
alter table public.vvip_authority_principals force row level security;
alter table public.vvip_authority_assignments enable row level security;
alter table public.vvip_authority_assignments force row level security;
alter table public.vvip_authority_assignment_revisions enable row level security;
alter table public.vvip_authority_assignment_revisions force row level security;
alter table public.vvip_authorization_envelope_audit enable row level security;
alter table public.vvip_authorization_envelope_audit force row level security;
alter table public.vvip_country_authority_seals enable row level security;
alter table public.vvip_country_authority_seals force row level security;
alter table public.vvip_authorization_audit_events enable row level security;
alter table public.vvip_authorization_audit_events force row level security;

create or replace function public.vvip_current_actor_id()
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
    claim_value text;
begin
    claim_value := current_setting('request.jwt.claim.sub', true);
    if claim_value is null or claim_value = '' then
        return null;
    end if;
    return claim_value::uuid;
exception when others then
    return null;
end;
$function$;

create or replace function public.vvip_is_owner_root(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    select exists (
        select 1
        from public.vvip_authority_principals p
        where p.principal_id = p_actor_id
          and p.authority_class = 'OWNER_ROOT'
          and p.principal_state = 'active'
    );
$function$;

create or replace function public.vvip_has_authorization_permission(
    p_actor_id uuid,
    p_permission_id text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    select exists (
        select 1
        from public.vvip_authority_assignments a
        join public.vvip_authority_principals p
          on p.principal_id = a.principal_id
        where a.principal_id = p_actor_id
          and p.principal_state = 'active'
          and a.assignment_state = 'active'
          and a.starts_at <= statement_timestamp()
          and (a.expires_at is null or a.expires_at > statement_timestamp())
          and p_permission_id = any(a.permission_ids)
    ) or public.vvip_is_owner_root(p_actor_id);
$function$;

create or replace function public.vvip_country_operation_allowed(
    p_country_code text,
    p_seal_version text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    select exists (
        select 1
        from public.vvip_country_authority_seals s
        where s.country_code = upper(p_country_code)
          and s.activation_state = 'ACTIVE'
          and s.seal_status = 'VALID'
          and s.seal_version = p_seal_version
    );
$function$;

create or replace function public.vvip_assert_country_operation_allowed(
    p_country_code text,
    p_seal_version text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    if not public.vvip_country_operation_allowed(p_country_code, p_seal_version) then
        raise exception 'COUNTRY_SEAL_REQUIRED';
    end if;
end;
$function$;

create or replace function public.vvip_manage_partner_membership(
    p_actor_id uuid,
    p_subject_id uuid,
    p_action text,
    p_reason text,
    p_legal_decision_reference text,
    p_correlation_key text,
    p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    membership_id uuid;
begin
    if not public.vvip_is_owner_root(p_actor_id) then
        raise exception 'PEER_PARTNER_MUTATION_DENIED';
    end if;
    if p_subject_id = p_actor_id then
        raise exception 'OWNER_ROOT_IMMUTABLE';
    end if;
    if nullif(btrim(p_reason), '') is null or length(p_reason) > 500 then
        raise exception 'REASON_REQUIRED';
    end if;
    if nullif(btrim(p_legal_decision_reference), '') is null
       or length(p_legal_decision_reference) > 128 then
        raise exception 'LEGAL_DECISION_REFERENCE_REQUIRED';
    end if;
    if p_action not in ('create', 'suspend', 'revoke') then
        raise exception 'INVALID_ASSIGNMENT';
    end if;

    if p_action = 'create' then
        insert into public.vvip_authority_principals (
            principal_id,
            authority_class,
            principal_state,
            assignment_revision,
            legal_decision_reference,
            created_by
        ) values (
            p_subject_id,
            'PARTNER_GLOBAL_ADMIN',
            'active',
            1,
            btrim(p_legal_decision_reference),
            p_actor_id
        )
        returning principal_id into membership_id;
    else
        update public.vvip_authority_principals
        set principal_state = case
                when p_action = 'suspend' then 'suspended'
                else 'revoked'
            end,
            assignment_revision = assignment_revision + 1,
            legal_decision_reference = btrim(p_legal_decision_reference),
            updated_at = statement_timestamp()
        where principal_id = p_subject_id
          and authority_class = 'PARTNER_GLOBAL_ADMIN'
        returning principal_id into membership_id;
    end if;

    if membership_id is null then
        raise exception 'PEER_PARTNER_MUTATION_DENIED';
    end if;

    insert into public.vvip_authorization_audit_events (
        audit_id,
        previous_hash,
        event_hash,
        actor_id,
        action,
        target_type,
        target_id,
        reason,
        correlation_key,
        idempotency_key,
        event_payload
    ) values (
        gen_random_uuid(),
        null,
        encode(
            digest(
                p_actor_id::text || p_subject_id::text || p_action || p_idempotency_key,
                'sha256'
            ),
            'hex'
        ),
        p_actor_id,
        'partner_membership.' || p_action,
        'authority_principal',
        p_subject_id::text,
        btrim(p_reason),
        p_correlation_key,
        p_idempotency_key,
        jsonb_build_object(
            'legal_decision_reference',
            btrim(p_legal_decision_reference)
        )
    );

    return membership_id;
end;
$function$;

create or replace function public.vvip_guard_authority_principal_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    actor_class text;
begin
    if TG_OP in ('UPDATE', 'DELETE') and OLD.authority_class = 'OWNER_ROOT' then
        raise exception 'OWNER_ROOT_IMMUTABLE';
    end if;

    select p.authority_class
      into actor_class
      from public.vvip_authority_principals p
     where p.principal_id = public.vvip_current_actor_id()
       and p.principal_state = 'active';

    if TG_OP in ('UPDATE', 'DELETE')
       and OLD.authority_class = 'PARTNER_GLOBAL_ADMIN'
       and actor_class = 'PARTNER_GLOBAL_ADMIN' then
        raise exception 'PEER_PARTNER_MUTATION_DENIED';
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
security definer
set search_path = pg_catalog, public
as $function$
begin
    if TG_OP IN ('UPDATE', 'DELETE') then
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

create policy vvip_authority_principals_select
on public.vvip_authority_principals
for select
using (
    public.vvip_has_authorization_permission(
        public.vvip_current_actor_id(),
        'authorization.assignment.read'
    )
);

create policy vvip_authority_assignments_select
on public.vvip_authority_assignments
for select
using (
    public.vvip_has_authorization_permission(
        public.vvip_current_actor_id(),
        'authorization.assignment.read'
    )
);

create policy vvip_authority_assignment_revisions_select
on public.vvip_authority_assignment_revisions
for select
using (
    principal_id = public.vvip_current_actor_id()
    or public.vvip_is_owner_root(public.vvip_current_actor_id())
);

create policy vvip_authorization_envelope_audit_select
on public.vvip_authorization_envelope_audit
for select
using (
    actor_id = public.vvip_current_actor_id()
    or public.vvip_is_owner_root(public.vvip_current_actor_id())
);

create policy vvip_country_authority_seals_select
on public.vvip_country_authority_seals
for select
using (
    public.vvip_has_authorization_permission(
        public.vvip_current_actor_id(),
        'country.governance.read'
    )
);

create policy vvip_authorization_audit_events_select
on public.vvip_authorization_audit_events
for select
using (
    public.vvip_has_authorization_permission(
        public.vvip_current_actor_id(),
        'authorization.audit.read'
    )
);

revoke all on function public.vvip_current_actor_id() from public;
revoke all on function public.vvip_is_owner_root(uuid) from public;
revoke all on function public.vvip_has_authorization_permission(uuid, text) from public;
revoke all on function public.vvip_country_operation_allowed(text, text) from public;
revoke all on function public.vvip_assert_country_operation_allowed(text, text) from public;
revoke all on function public.vvip_manage_partner_membership(uuid, uuid, text, text, text, text, text) from public;
revoke all on function public.vvip_guard_authority_principal_mutation() from public;
revoke all on function public.vvip_reject_authorization_audit_mutation() from public;

-- Review-only least-privilege boundary. No browser role receives principal mutation rights.
grant execute on function public.vvip_manage_partner_membership(uuid, uuid, text, text, text, text, text) to service_role;
grant execute on function public.vvip_country_operation_allowed(text, text) to service_role;
grant execute on function public.vvip_assert_country_operation_allowed(text, text) to service_role;

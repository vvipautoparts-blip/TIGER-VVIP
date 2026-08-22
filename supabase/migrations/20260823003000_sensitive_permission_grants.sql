-- Sensitive permission persistence contract.
-- Definition only: append-only grants/events plus exact-bound short-lived leases.

begin;

create or replace function public.sensitive_text_array_is_subset(
  p_requested text[],
  p_ceiling text[]
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    p_requested is not null
    and p_ceiling is not null
    and not exists (
      select 1
      from unnest(p_requested) as requested(value)
      where not (requested.value = any (p_ceiling))
    );
$$;

create or replace function public.sensitive_resource_scope_is_bounded(
  p_scope jsonb,
  p_allow_empty_ids boolean default false
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    jsonb_typeof(p_scope) = 'object'
    and nullif(btrim(p_scope ->> 'kind'), '') is not null
    and (p_scope ->> 'kind') not in ('*', 'platform')
    and jsonb_typeof(p_scope -> 'ids') = 'array'
    and (p_allow_empty_ids or jsonb_array_length(p_scope -> 'ids') > 0)
    and not exists (
      select 1
      from jsonb_array_elements_text(p_scope -> 'ids') as item(value)
      where nullif(btrim(item.value), '') is null or item.value = '*'
    );
$$;

create or replace function public.sensitive_resource_scope_is_subset(
  p_requested jsonb,
  p_ceiling jsonb
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    public.sensitive_resource_scope_is_bounded(p_requested, true)
    and public.sensitive_resource_scope_is_bounded(p_ceiling, true)
    and (p_requested ->> 'kind') = (p_ceiling ->> 'kind')
    and not exists (
      select 1
      from jsonb_array_elements_text(p_requested -> 'ids') as requested(value)
      where not exists (
        select 1
        from jsonb_array_elements_text(p_ceiling -> 'ids') as allowed(value)
        where allowed.value = requested.value
      )
    );
$$;

create or replace function public.sensitive_jsonb_text_array(p_value jsonb)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when jsonb_typeof(p_value) <> 'array' then null::text[]
    else coalesce(
      array(select jsonb_array_elements_text(p_value)),
      array[]::text[]
    )
  end;
$$;

create table if not exists public.sensitive_permission_grants (
  id uuid primary key default gen_random_uuid(),
  principal text not null,
  action text not null,
  resource_scope jsonb not null,
  sector_scope text[] not null,
  entity_scope text[] not null,
  geo_policy_scope text[] not null,
  purpose text not null,
  reason text not null,
  grantor text not null,
  parent_delegation_grant_id uuid references public.sensitive_permission_grants(id),
  policy_version text not null,
  issued_at timestamptz not null,
  not_before timestamptz not null,
  expires_at timestamptz not null,
  delegability_ceiling jsonb not null,
  audit_evidence_ref text not null,
  created_at timestamptz not null default now(),
  constraint sensitive_permission_grant_principal_check check (btrim(principal) <> ''),
  constraint sensitive_permission_grant_action_check check (btrim(action) <> ''),
  constraint sensitive_permission_grant_scope_check check (
    public.sensitive_resource_scope_is_bounded(resource_scope, false)
    and cardinality(sector_scope) > 0
    and cardinality(entity_scope) > 0
    and cardinality(geo_policy_scope) > 0
    and not ('*' = any (sector_scope))
    and not ('*' = any (entity_scope))
    and not ('*' = any (geo_policy_scope))
  ),
  constraint sensitive_permission_grant_time_check check (
    not_before >= issued_at and expires_at > not_before
  ),
  constraint sensitive_permission_grant_ceiling_shape_check check (
    jsonb_typeof(delegability_ceiling) = 'object'
    and jsonb_typeof(delegability_ceiling -> 'actions') = 'array'
    and jsonb_typeof(delegability_ceiling -> 'sector_scope') = 'array'
    and jsonb_typeof(delegability_ceiling -> 'entity_scope') = 'array'
    and jsonb_typeof(delegability_ceiling -> 'geo_policy_scope') = 'array'
    and public.sensitive_resource_scope_is_bounded(
      delegability_ceiling -> 'resource_scope',
      true
    )
    and nullif(btrim(delegability_ceiling ->> 'expires_at'), '') is not null
  )
);

create table if not exists public.sensitive_permission_grant_events (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.sensitive_permission_grants(id),
  event_type text not null,
  actor text not null,
  reason text not null,
  audit_evidence_ref text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint sensitive_permission_event_type_check check (
    event_type in ('GRANTED', 'REVOKED', 'EXPIRED')
  ),
  constraint sensitive_permission_event_actor_check check (btrim(actor) <> ''),
  constraint sensitive_permission_event_reason_check check (btrim(reason) <> '')
);

create table if not exists public.sensitive_permission_leases (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.sensitive_permission_grants(id),
  principal text not null,
  action text not null,
  scope_digest text not null,
  nonce_hash text not null,
  audit_evidence_ref text not null,
  status text not null default 'ISSUED',
  issued_at timestamptz not null default now(),
  not_before timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint sensitive_permission_lease_nonce_unique unique (nonce_hash),
  constraint sensitive_permission_lease_status_check check (
    status in ('ISSUED', 'CONSUMED', 'REVOKED', 'EXPIRED')
  ),
  constraint sensitive_permission_lease_time_check check (
    not_before >= issued_at and expires_at > not_before
  ),
  constraint sensitive_permission_lease_consumed_check check (
    status <> 'CONSUMED' or consumed_at is not null
  ),
  constraint sensitive_permission_lease_revoked_check check (
    status <> 'REVOKED' or revoked_at is not null
  )
);

create index if not exists sensitive_permission_grants_expiry_idx
  on public.sensitive_permission_grants (expires_at);
create index if not exists sensitive_permission_grants_principal_action_idx
  on public.sensitive_permission_grants (principal, action, expires_at);
create index if not exists sensitive_permission_grant_events_grant_time_idx
  on public.sensitive_permission_grant_events (grant_id, occurred_at desc);
create unique index if not exists sensitive_permission_grant_initial_event_uidx
  on public.sensitive_permission_grant_events (grant_id)
  where event_type = 'GRANTED';
create unique index if not exists sensitive_permission_grant_terminal_event_uidx
  on public.sensitive_permission_grant_events (grant_id)
  where event_type in ('REVOKED', 'EXPIRED');
create index if not exists sensitive_permission_leases_status_expiry_idx
  on public.sensitive_permission_leases (status, expires_at);
create index if not exists sensitive_permission_leases_grant_idx
  on public.sensitive_permission_leases (grant_id, status);

alter table public.sensitive_permission_grants enable row level security;
alter table public.sensitive_permission_grants force row level security;
alter table public.sensitive_permission_grant_events enable row level security;
alter table public.sensitive_permission_grant_events force row level security;
alter table public.sensitive_permission_leases enable row level security;
alter table public.sensitive_permission_leases force row level security;

revoke all on table public.sensitive_permission_grants from anon, authenticated;
revoke all on table public.sensitive_permission_grant_events from anon, authenticated;
revoke all on table public.sensitive_permission_leases from anon, authenticated;
grant select on table public.sensitive_permission_grants to service_role;
grant select on table public.sensitive_permission_grant_events to service_role;
grant select on table public.sensitive_permission_leases to service_role;

create or replace function public.guard_sensitive_permission_grant_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'SENSITIVE_PERMISSION_GRANT_IMMUTABLE';
end;
$$;

create or replace function public.guard_sensitive_permission_event_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'SENSITIVE_PERMISSION_EVENT_IMMUTABLE';
end;
$$;

create or replace function public.guard_sensitive_permission_lease_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'SENSITIVE_PERMISSION_LEASE_DELETE_FORBIDDEN';
  end if;

  if new.grant_id is distinct from old.grant_id
    or new.principal is distinct from old.principal
    or new.action is distinct from old.action
    or new.scope_digest is distinct from old.scope_digest
    or new.nonce_hash is distinct from old.nonce_hash
    or new.audit_evidence_ref is distinct from old.audit_evidence_ref
    or new.issued_at is distinct from old.issued_at
    or new.not_before is distinct from old.not_before
    or new.expires_at is distinct from old.expires_at then
    raise exception 'SENSITIVE_PERMISSION_LEASE_BINDING_IMMUTABLE';
  end if;

  if old.status <> 'ISSUED'
    or new.status not in ('CONSUMED', 'REVOKED', 'EXPIRED') then
    raise exception 'SENSITIVE_PERMISSION_LEASE_INVALID_TRANSITION';
  end if;

  if new.status = 'CONSUMED' and new.consumed_at is null then
    new.consumed_at := now();
  elsif new.status = 'REVOKED' and new.revoked_at is null then
    new.revoked_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sensitive_permission_grant_immutable_guard
  on public.sensitive_permission_grants;
create trigger sensitive_permission_grant_immutable_guard
before update or delete on public.sensitive_permission_grants
for each row execute function public.guard_sensitive_permission_grant_immutable();

drop trigger if exists sensitive_permission_event_immutable_guard
  on public.sensitive_permission_grant_events;
create trigger sensitive_permission_event_immutable_guard
before update or delete on public.sensitive_permission_grant_events
for each row execute function public.guard_sensitive_permission_event_immutable();

drop trigger if exists sensitive_permission_lease_mutation_guard
  on public.sensitive_permission_leases;
create trigger sensitive_permission_lease_mutation_guard
before update or delete on public.sensitive_permission_leases
for each row execute function public.guard_sensitive_permission_lease_mutation();

create or replace function public.sensitive_permission_grant_is_active(
  p_grant_id uuid,
  p_now timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.sensitive_permission_grants as grant_row
    where grant_row.id = p_grant_id
      and grant_row.not_before <= p_now
      and grant_row.expires_at > p_now
      and exists (
        select 1
        from public.sensitive_permission_grant_events as granted_event
        where granted_event.grant_id = grant_row.id
          and granted_event.event_type = 'GRANTED'
      )
      and not exists (
        select 1
        from public.sensitive_permission_grant_events as terminal_event
        where terminal_event.grant_id = grant_row.id
          and terminal_event.event_type in ('REVOKED', 'EXPIRED')
          and terminal_event.occurred_at <= p_now
      )
  );
$$;

create or replace function public.create_sensitive_permission_grant(
  p_principal text,
  p_action text,
  p_resource_scope jsonb,
  p_sector_scope text[],
  p_entity_scope text[],
  p_geo_policy_scope text[],
  p_purpose text,
  p_reason text,
  p_grantor text,
  p_parent_delegation_grant_id uuid,
  p_policy_version text,
  p_issued_at timestamptz,
  p_not_before timestamptz,
  p_expires_at timestamptz,
  p_delegability_ceiling jsonb,
  p_audit_evidence_ref text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_parent public.sensitive_permission_grants%rowtype;
  v_parent_ceiling_expires_at timestamptz;
  v_new_ceiling_expires_at timestamptz;
  v_grant_id uuid;
begin
  if nullif(btrim(p_principal), '') is null
    or nullif(btrim(p_action), '') is null
    or nullif(btrim(p_purpose), '') is null
    or nullif(btrim(p_reason), '') is null
    or nullif(btrim(p_grantor), '') is null
    or nullif(btrim(p_policy_version), '') is null
    or nullif(btrim(p_audit_evidence_ref), '') is null then
    raise exception 'SENSITIVE_PERMISSION_GRANT_REQUIRED_FIELD_MISSING';
  end if;

  if p_principal = 'owner:root' then
    raise exception 'SENSITIVE_PERMISSION_OWNER_ROOT_NOT_DELEGABLE';
  end if;

  if not public.sensitive_resource_scope_is_bounded(p_resource_scope, false)
    or cardinality(p_sector_scope) = 0
    or cardinality(p_entity_scope) = 0
    or cardinality(p_geo_policy_scope) = 0
    or '*' = any (p_sector_scope)
    or '*' = any (p_entity_scope)
    or '*' = any (p_geo_policy_scope) then
    raise exception 'SENSITIVE_PERMISSION_SCOPE_INVALID';
  end if;

  if p_not_before < p_issued_at or p_expires_at <= p_not_before then
    raise exception 'SENSITIVE_PERMISSION_TIME_INVALID';
  end if;

  if jsonb_typeof(p_delegability_ceiling) <> 'object'
    or jsonb_typeof(p_delegability_ceiling -> 'actions') <> 'array'
    or jsonb_typeof(p_delegability_ceiling -> 'sector_scope') <> 'array'
    or jsonb_typeof(p_delegability_ceiling -> 'entity_scope') <> 'array'
    or jsonb_typeof(p_delegability_ceiling -> 'geo_policy_scope') <> 'array'
    or not public.sensitive_resource_scope_is_bounded(
      p_delegability_ceiling -> 'resource_scope',
      true
    ) then
    raise exception 'SENSITIVE_PERMISSION_DELEGABILITY_CEILING_INVALID';
  end if;

  begin
    v_new_ceiling_expires_at := (p_delegability_ceiling ->> 'expires_at')::timestamptz;
  exception when others then
    raise exception 'SENSITIVE_PERMISSION_DELEGABILITY_CEILING_INVALID';
  end;

  if v_new_ceiling_expires_at > p_expires_at then
    raise exception 'SENSITIVE_PERMISSION_DELEGABILITY_CEILING_INVALID';
  end if;

  if p_grantor <> 'owner:root' then
    if p_parent_delegation_grant_id is null then
      raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
    end if;

    select * into v_parent
    from public.sensitive_permission_grants
    where id = p_parent_delegation_grant_id;

    if not found
      or v_parent.principal <> p_grantor
      or v_parent.action <> 'DELEGATE_PERMISSION'
      or not public.sensitive_permission_grant_is_active(v_parent.id, p_issued_at) then
      raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
    end if;

    begin
      v_parent_ceiling_expires_at :=
        (v_parent.delegability_ceiling ->> 'expires_at')::timestamptz;
    exception when others then
      raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
    end;

    if not public.sensitive_text_array_is_subset(
        array[p_action],
        public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'actions')
      )
      or not public.sensitive_text_array_is_subset(
        p_sector_scope,
        public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'sector_scope')
      )
      or not public.sensitive_text_array_is_subset(
        p_entity_scope,
        public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'entity_scope')
      )
      or not public.sensitive_text_array_is_subset(
        p_geo_policy_scope,
        public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'geo_policy_scope')
      )
      or not public.sensitive_resource_scope_is_subset(
        p_resource_scope,
        v_parent.delegability_ceiling -> 'resource_scope'
      )
      or p_not_before < v_parent.not_before
      or p_expires_at > v_parent.expires_at
      or p_expires_at > v_parent_ceiling_expires_at then
      raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
    end if;

    if not public.sensitive_text_array_is_subset(
        public.sensitive_jsonb_text_array(p_delegability_ceiling -> 'actions'),
        public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'actions')
      )
      or not public.sensitive_text_array_is_subset(
        public.sensitive_jsonb_text_array(p_delegability_ceiling -> 'sector_scope'),
        public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'sector_scope')
      )
      or not public.sensitive_text_array_is_subset(
        public.sensitive_jsonb_text_array(p_delegability_ceiling -> 'entity_scope'),
        public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'entity_scope')
      )
      or not public.sensitive_text_array_is_subset(
        public.sensitive_jsonb_text_array(p_delegability_ceiling -> 'geo_policy_scope'),
        public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'geo_policy_scope')
      )
      or not public.sensitive_resource_scope_is_subset(
        p_delegability_ceiling -> 'resource_scope',
        v_parent.delegability_ceiling -> 'resource_scope'
      )
      or v_new_ceiling_expires_at > v_parent_ceiling_expires_at then
      raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
    end if;
  elsif p_parent_delegation_grant_id is not null then
    raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
  end if;

  insert into public.sensitive_permission_grants (
    principal,
    action,
    resource_scope,
    sector_scope,
    entity_scope,
    geo_policy_scope,
    purpose,
    reason,
    grantor,
    parent_delegation_grant_id,
    policy_version,
    issued_at,
    not_before,
    expires_at,
    delegability_ceiling,
    audit_evidence_ref
  ) values (
    p_principal,
    p_action,
    p_resource_scope,
    p_sector_scope,
    p_entity_scope,
    p_geo_policy_scope,
    p_purpose,
    p_reason,
    p_grantor,
    p_parent_delegation_grant_id,
    p_policy_version,
    p_issued_at,
    p_not_before,
    p_expires_at,
    p_delegability_ceiling,
    p_audit_evidence_ref
  )
  returning id into v_grant_id;

  insert into public.sensitive_permission_grant_events (
    grant_id,
    event_type,
    actor,
    reason,
    audit_evidence_ref,
    occurred_at
  ) values (
    v_grant_id,
    'GRANTED',
    p_grantor,
    p_reason,
    p_audit_evidence_ref,
    p_issued_at
  );

  return v_grant_id;
end;
$$;

create or replace function public.revoke_sensitive_permission_grant(
  p_grant_id uuid,
  p_actor text,
  p_reason text,
  p_audit_evidence_ref text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.sensitive_permission_grant_is_active(p_grant_id, p_now) then
    return false;
  end if;

  insert into public.sensitive_permission_grant_events (
    grant_id,
    event_type,
    actor,
    reason,
    audit_evidence_ref,
    occurred_at
  ) values (
    p_grant_id,
    'REVOKED',
    p_actor,
    p_reason,
    p_audit_evidence_ref,
    p_now
  );

  update public.sensitive_permission_leases
  set status = 'REVOKED', revoked_at = p_now, updated_at = p_now
  where grant_id = p_grant_id and status = 'ISSUED';

  return true;
end;
$$;

create or replace function public.expire_sensitive_permission_grant(
  p_grant_id uuid,
  p_actor text,
  p_reason text,
  p_audit_evidence_ref text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expires_at timestamptz;
begin
  select expires_at into v_expires_at
  from public.sensitive_permission_grants
  where id = p_grant_id;

  if not found or p_now < v_expires_at then
    return false;
  end if;

  if exists (
    select 1
    from public.sensitive_permission_grant_events
    where grant_id = p_grant_id
      and event_type in ('REVOKED', 'EXPIRED')
  ) then
    return false;
  end if;

  insert into public.sensitive_permission_grant_events (
    grant_id,
    event_type,
    actor,
    reason,
    audit_evidence_ref,
    occurred_at
  ) values (
    p_grant_id,
    'EXPIRED',
    p_actor,
    p_reason,
    p_audit_evidence_ref,
    p_now
  );

  update public.sensitive_permission_leases
  set status = 'EXPIRED', updated_at = p_now
  where grant_id = p_grant_id and status = 'ISSUED';

  return true;
end;
$$;

create or replace function public.create_sensitive_permission_lease(
  p_grant_id uuid,
  p_principal text,
  p_action text,
  p_scope_digest text,
  p_nonce_hash text,
  p_not_before timestamptz,
  p_expires_at timestamptz,
  p_audit_evidence_ref text,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant public.sensitive_permission_grants%rowtype;
  v_lease_id uuid;
begin
  select * into v_grant
  from public.sensitive_permission_grants
  where id = p_grant_id;

  if not found
    or not public.sensitive_permission_grant_is_active(p_grant_id, p_now)
    or v_grant.principal <> p_principal
    or v_grant.action <> p_action
    or p_not_before < v_grant.not_before
    or p_not_before < p_now
    or p_expires_at <= p_not_before
    or p_expires_at > v_grant.expires_at
    or nullif(btrim(p_scope_digest), '') is null
    or nullif(btrim(p_nonce_hash), '') is null
    or nullif(btrim(p_audit_evidence_ref), '') is null then
    raise exception 'SENSITIVE_PERMISSION_LEASE_DENIED';
  end if;

  insert into public.sensitive_permission_leases (
    grant_id,
    principal,
    action,
    scope_digest,
    nonce_hash,
    audit_evidence_ref,
    status,
    issued_at,
    not_before,
    expires_at
  ) values (
    p_grant_id,
    p_principal,
    p_action,
    p_scope_digest,
    p_nonce_hash,
    p_audit_evidence_ref,
    'ISSUED',
    p_now,
    p_not_before,
    p_expires_at
  )
  returning id into v_lease_id;

  return v_lease_id;
end;
$$;

create or replace function public.consume_sensitive_permission_lease(
  p_lease_id uuid,
  p_principal text,
  p_action text,
  p_scope_digest text,
  p_nonce_hash text,
  p_now timestamptz default now()
)
returns table (
  ok boolean,
  reason_code text,
  lease_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lease public.sensitive_permission_leases%rowtype;
  v_rows integer := 0;
begin
  select * into v_lease
  from public.sensitive_permission_leases
  where id = p_lease_id
  for update;

  if not found then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_NOT_FOUND'::text, null::uuid;
    return;
  end if;

  if v_lease.status <> 'ISSUED' then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_REPLAY_OR_CONFLICT'::text, v_lease.id;
    return;
  end if;
  if v_lease.principal <> p_principal
    or v_lease.action <> p_action
    or v_lease.scope_digest <> p_scope_digest
    or v_lease.nonce_hash <> p_nonce_hash then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_BINDING_MISMATCH'::text, v_lease.id;
    return;
  end if;
  if p_now < v_lease.not_before then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_NOT_YET_VALID'::text, v_lease.id;
    return;
  end if;
  if p_now >= v_lease.expires_at then
    update public.sensitive_permission_leases
    set status = 'EXPIRED', updated_at = p_now
    where id = v_lease.id and status = 'ISSUED';
    return query select false, 'SENSITIVE_PERMISSION_LEASE_EXPIRED'::text, v_lease.id;
    return;
  end if;
  if not public.sensitive_permission_grant_is_active(v_lease.grant_id, p_now) then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE'::text, v_lease.id;
    return;
  end if;

  update public.sensitive_permission_leases
  set status = 'CONSUMED', consumed_at = p_now, updated_at = p_now
  where id = v_lease.id
    and status = 'ISSUED'
    and principal = p_principal
    and action = p_action
    and scope_digest = p_scope_digest
    and nonce_hash = p_nonce_hash
    and not_before <= p_now
    and expires_at > p_now;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_REPLAY_OR_CONFLICT'::text, v_lease.id;
    return;
  end if;

  return query select true, 'SENSITIVE_PERMISSION_LEASE_CONSUMED'::text, v_lease.id;
end;
$$;

revoke all on function public.sensitive_text_array_is_subset(text[], text[]) from public, anon, authenticated;
revoke all on function public.sensitive_resource_scope_is_bounded(jsonb, boolean) from public, anon, authenticated;
revoke all on function public.sensitive_resource_scope_is_subset(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.sensitive_jsonb_text_array(jsonb) from public, anon, authenticated;
revoke all on function public.guard_sensitive_permission_grant_immutable() from public, anon, authenticated;
revoke all on function public.guard_sensitive_permission_event_immutable() from public, anon, authenticated;
revoke all on function public.guard_sensitive_permission_lease_mutation() from public, anon, authenticated;
revoke all on function public.sensitive_permission_grant_is_active(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.create_sensitive_permission_grant(text, text, jsonb, text[], text[], text[], text, text, text, uuid, text, timestamptz, timestamptz, timestamptz, jsonb, text) from public, anon, authenticated;
revoke all on function public.revoke_sensitive_permission_grant(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.expire_sensitive_permission_grant(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.create_sensitive_permission_lease(uuid, text, text, text, text, timestamptz, timestamptz, text, timestamptz) from public, anon, authenticated;
revoke all on function public.consume_sensitive_permission_lease(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.create_sensitive_permission_grant(text, text, jsonb, text[], text[], text[], text, text, text, uuid, text, timestamptz, timestamptz, timestamptz, jsonb, text) to service_role;
grant execute on function public.revoke_sensitive_permission_grant(uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.expire_sensitive_permission_grant(uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.create_sensitive_permission_lease(uuid, text, text, text, text, timestamptz, timestamptz, text, timestamptz) to service_role;
grant execute on function public.consume_sensitive_permission_lease(uuid, text, text, text, text, timestamptz) to service_role;

commit;

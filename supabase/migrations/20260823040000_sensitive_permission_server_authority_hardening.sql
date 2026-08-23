-- Sensitive permission lease hardening.
-- Source only: removes caller-controlled authority time and binds lease scope
-- to a database-verified subset of the immutable grant scope.

begin;

alter table public.sensitive_permission_leases add column if not exists resource_scope jsonb;
alter table public.sensitive_permission_leases add column if not exists sector_scope text[];
alter table public.sensitive_permission_leases add column if not exists entity_scope text[];
alter table public.sensitive_permission_leases add column if not exists geo_policy_scope text[];

alter table public.sensitive_permission_leases
  add constraint sensitive_permission_lease_scope_binding_check
  check (
    resource_scope is distinct from null
    and sector_scope is distinct from null
    and entity_scope is distinct from null
    and geo_policy_scope is distinct from null
    and public.sensitive_resource_scope_is_bounded(resource_scope, false)
    and cardinality(sector_scope) > 0
    and cardinality(entity_scope) > 0
    and cardinality(geo_policy_scope) > 0
    and not ('*' = any (sector_scope))
    and not ('*' = any (entity_scope))
    and not ('*' = any (geo_policy_scope))
  ) not valid;

alter table public.sensitive_permission_leases
  add constraint sensitive_permission_lease_scope_digest_check
  check (scope_digest ~ '^[0-9a-f]{64}$') not valid;

create or replace function public.sensitive_sorted_text_array_jsonb(p_values text[])
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select jsonb_agg(item.value order by item.value)
      from (
        select distinct value
        from unnest(p_values) as source(value)
        where value is distinct from null
      ) as item
    ),
    '[]'::jsonb
  );
$$;

create or replace function public.sensitive_resource_scope_canonical(p_scope jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'kind', p_scope ->> 'kind',
    'ids', coalesce(
      (
        select jsonb_agg(item.value order by item.value)
        from (
          select distinct value
          from jsonb_array_elements_text(p_scope -> 'ids') as source(value)
        ) as item
      ),
      '[]'::jsonb
    )
  );
$$;

create or replace function public.sensitive_permission_scope_digest(
  p_resource_scope jsonb,
  p_sector_scope text[],
  p_entity_scope text[],
  p_geo_policy_scope text[]
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select encode(
    digest(
      convert_to(
        jsonb_build_object(
          'resource_scope', public.sensitive_resource_scope_canonical(p_resource_scope),
          'sector_scope', public.sensitive_sorted_text_array_jsonb(p_sector_scope),
          'entity_scope', public.sensitive_sorted_text_array_jsonb(p_entity_scope),
          'geo_policy_scope', public.sensitive_sorted_text_array_jsonb(p_geo_policy_scope)
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function public.sensitive_sorted_text_array_jsonb(text[]) from public, anon, authenticated;
revoke all on function public.sensitive_resource_scope_canonical(jsonb) from public, anon, authenticated;
revoke all on function public.sensitive_permission_scope_digest(jsonb, text[], text[], text[]) from public, anon, authenticated;

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
    or new.resource_scope is distinct from old.resource_scope
    or new.sector_scope is distinct from old.sector_scope
    or new.entity_scope is distinct from old.entity_scope
    or new.geo_policy_scope is distinct from old.geo_policy_scope
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
    new.consumed_at := statement_timestamp();
  elsif new.status = 'REVOKED' and new.revoked_at is null then
    new.revoked_at := statement_timestamp();
  end if;

  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke execute on function public.create_sensitive_permission_grant(text, text, jsonb, text[], text[], text[], text, text, text, uuid, text, timestamptz, timestamptz, timestamptz, jsonb, text) from service_role;
revoke execute on function public.revoke_sensitive_permission_grant(uuid, text, text, text, timestamptz) from service_role;
revoke execute on function public.expire_sensitive_permission_grant(uuid, text, text, text, timestamptz) from service_role;
revoke execute on function public.create_sensitive_permission_lease(uuid, text, text, text, text, timestamptz, timestamptz, text, timestamptz) from service_role;
revoke execute on function public.consume_sensitive_permission_lease(uuid, text, text, text, text, timestamptz) from service_role;

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
  p_not_before timestamptz,
  p_expires_at timestamptz,
  p_delegability_ceiling jsonb,
  p_audit_evidence_ref text
)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_parent public.sensitive_permission_grants%rowtype;
  v_parent_ceiling_expires_at timestamptz;
  v_new_ceiling_expires_at timestamptz;
  v_grant_id uuid;
  v_server_now timestamptz := statement_timestamp();
  v_not_before timestamptz := greatest(statement_timestamp(), coalesce(p_not_before, statement_timestamp()));
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

  if p_sector_scope is null
    or p_entity_scope is null
    or p_geo_policy_scope is null
    or not public.sensitive_resource_scope_is_bounded(p_resource_scope, false)
    or cardinality(p_sector_scope) = 0
    or cardinality(p_entity_scope) = 0
    or cardinality(p_geo_policy_scope) = 0
    or '*' = any (p_sector_scope)
    or '*' = any (p_entity_scope)
    or '*' = any (p_geo_policy_scope) then
    raise exception 'SENSITIVE_PERMISSION_SCOPE_INVALID';
  end if;

  if p_expires_at is null or p_expires_at <= v_not_before then
    raise exception 'SENSITIVE_PERMISSION_TIME_INVALID';
  end if;

  if jsonb_typeof(p_delegability_ceiling) <> 'object'
    or jsonb_typeof(p_delegability_ceiling -> 'actions') <> 'array'
    or jsonb_typeof(p_delegability_ceiling -> 'sector_scope') <> 'array'
    or jsonb_typeof(p_delegability_ceiling -> 'entity_scope') <> 'array'
    or jsonb_typeof(p_delegability_ceiling -> 'geo_policy_scope') <> 'array'
    or not public.sensitive_resource_scope_is_bounded(p_delegability_ceiling -> 'resource_scope', true) then
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

    select * into v_parent from public.sensitive_permission_grants where id = p_parent_delegation_grant_id;

    if not found
      or v_parent.principal <> p_grantor
      or v_parent.action <> 'DELEGATE_PERMISSION'
      or not public.sensitive_permission_grant_is_active(v_parent.id, v_server_now) then
      raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
    end if;

    begin
      v_parent_ceiling_expires_at := (v_parent.delegability_ceiling ->> 'expires_at')::timestamptz;
    exception when others then
      raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
    end;

    if not public.sensitive_text_array_is_subset(array[p_action], public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'actions'))
      or not public.sensitive_text_array_is_subset(p_sector_scope, public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'sector_scope'))
      or not public.sensitive_text_array_is_subset(p_entity_scope, public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'entity_scope'))
      or not public.sensitive_text_array_is_subset(p_geo_policy_scope, public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'geo_policy_scope'))
      or not public.sensitive_resource_scope_is_subset(p_resource_scope, v_parent.delegability_ceiling -> 'resource_scope')
      or v_not_before < v_parent.not_before
      or p_expires_at > v_parent.expires_at
      or p_expires_at > v_parent_ceiling_expires_at then
      raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
    end if;

    if not public.sensitive_text_array_is_subset(public.sensitive_jsonb_text_array(p_delegability_ceiling -> 'actions'), public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'actions'))
      or not public.sensitive_text_array_is_subset(public.sensitive_jsonb_text_array(p_delegability_ceiling -> 'sector_scope'), public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'sector_scope'))
      or not public.sensitive_text_array_is_subset(public.sensitive_jsonb_text_array(p_delegability_ceiling -> 'entity_scope'), public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'entity_scope'))
      or not public.sensitive_text_array_is_subset(public.sensitive_jsonb_text_array(p_delegability_ceiling -> 'geo_policy_scope'), public.sensitive_jsonb_text_array(v_parent.delegability_ceiling -> 'geo_policy_scope'))
      or not public.sensitive_resource_scope_is_subset(p_delegability_ceiling -> 'resource_scope', v_parent.delegability_ceiling -> 'resource_scope')
      or v_new_ceiling_expires_at > v_parent_ceiling_expires_at then
      raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
    end if;
  elsif p_parent_delegation_grant_id is distinct from null then
    raise exception 'SENSITIVE_PERMISSION_DELEGATION_DENIED';
  end if;

  insert into public.sensitive_permission_grants (
    principal, action, resource_scope, sector_scope, entity_scope, geo_policy_scope,
    purpose, reason, grantor, parent_delegation_grant_id, policy_version,
    issued_at, not_before, expires_at, delegability_ceiling, audit_evidence_ref
  ) values (
    p_principal, p_action, p_resource_scope, p_sector_scope, p_entity_scope, p_geo_policy_scope,
    p_purpose, p_reason, p_grantor, p_parent_delegation_grant_id, p_policy_version,
    v_server_now, v_not_before, p_expires_at, p_delegability_ceiling, p_audit_evidence_ref
  ) returning id into v_grant_id;

  insert into public.sensitive_permission_grant_events (
    grant_id, event_type, actor, reason, audit_evidence_ref, occurred_at
  ) values (
    v_grant_id, 'GRANTED', p_grantor, p_reason, p_audit_evidence_ref, v_server_now
  );

  return v_grant_id;
end;
$$;

create or replace function public.revoke_sensitive_permission_grant(
  p_grant_id uuid,
  p_actor text,
  p_reason text,
  p_audit_evidence_ref text
)
returns boolean
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
begin
  if not public.sensitive_permission_grant_is_active(p_grant_id, v_server_now) then
    return false;
  end if;

  insert into public.sensitive_permission_grant_events (
    grant_id, event_type, actor, reason, audit_evidence_ref, occurred_at
  ) values (
    p_grant_id, 'REVOKED', p_actor, p_reason, p_audit_evidence_ref, v_server_now
  );

  update public.sensitive_permission_leases set status = 'REVOKED', revoked_at = v_server_now, updated_at = v_server_now where grant_id = p_grant_id and status = 'ISSUED';
  return true;
end;
$$;

create or replace function public.expire_sensitive_permission_grant(
  p_grant_id uuid,
  p_actor text,
  p_reason text,
  p_audit_evidence_ref text
)
returns boolean
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_expires_at timestamptz;
  v_server_now timestamptz := statement_timestamp();
begin
  select expires_at into v_expires_at from public.sensitive_permission_grants where id = p_grant_id;

  if not found or v_server_now < v_expires_at then
    return false;
  end if;

  if exists (
    select 1 from public.sensitive_permission_grant_events
    where grant_id = p_grant_id and event_type in ('REVOKED', 'EXPIRED')
  ) then
    return false;
  end if;

  insert into public.sensitive_permission_grant_events (
    grant_id, event_type, actor, reason, audit_evidence_ref, occurred_at
  ) values (
    p_grant_id, 'EXPIRED', p_actor, p_reason, p_audit_evidence_ref, v_server_now
  );

  update public.sensitive_permission_leases set status = 'EXPIRED', updated_at = v_server_now where grant_id = p_grant_id and status = 'ISSUED';
  return true;
end;
$$;

create or replace function public.create_sensitive_permission_lease(
  p_grant_id uuid,
  p_principal text,
  p_action text,
  p_resource_scope jsonb,
  p_sector_scope text[],
  p_entity_scope text[],
  p_geo_policy_scope text[],
  p_nonce_hash text,
  p_not_before timestamptz,
  p_expires_at timestamptz,
  p_audit_evidence_ref text
)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_grant public.sensitive_permission_grants%rowtype;
  v_lease_id uuid;
  v_scope_digest text;
  v_server_now timestamptz := statement_timestamp();
  v_not_before timestamptz := greatest(statement_timestamp(), coalesce(p_not_before, statement_timestamp()));
begin
  select * into v_grant from public.sensitive_permission_grants where id = p_grant_id;

  if not found
    or not public.sensitive_permission_grant_is_active(p_grant_id, v_server_now)
    or v_grant.principal <> p_principal
    or v_grant.action <> p_action
    or p_sector_scope is null
    or p_entity_scope is null
    or p_geo_policy_scope is null
    or not public.sensitive_resource_scope_is_bounded(p_resource_scope, false)
    or cardinality(p_sector_scope) = 0
    or cardinality(p_entity_scope) = 0
    or cardinality(p_geo_policy_scope) = 0
    or not public.sensitive_resource_scope_is_subset(p_resource_scope, v_grant.resource_scope)
    or not public.sensitive_text_array_is_subset(p_sector_scope, v_grant.sector_scope)
    or not public.sensitive_text_array_is_subset(p_entity_scope, v_grant.entity_scope)
    or not public.sensitive_text_array_is_subset(p_geo_policy_scope, v_grant.geo_policy_scope) then
    raise exception 'SENSITIVE_PERMISSION_LEASE_SCOPE_DENIED';
  end if;

  if p_expires_at is null
    or p_expires_at <= v_not_before
    or v_not_before < v_grant.not_before
    or p_expires_at > v_grant.expires_at
    or nullif(btrim(p_nonce_hash), '') is null
    or nullif(btrim(p_audit_evidence_ref), '') is null then
    raise exception 'SENSITIVE_PERMISSION_LEASE_DENIED';
  end if;

  v_scope_digest := public.sensitive_permission_scope_digest(
    p_resource_scope, p_sector_scope, p_entity_scope, p_geo_policy_scope
  );

  insert into public.sensitive_permission_leases (
    grant_id, principal, action, resource_scope, sector_scope, entity_scope, geo_policy_scope,
    scope_digest, nonce_hash, audit_evidence_ref, status, issued_at, not_before, expires_at
  ) values (
    p_grant_id, p_principal, p_action, p_resource_scope, p_sector_scope, p_entity_scope, p_geo_policy_scope,
    v_scope_digest, p_nonce_hash, p_audit_evidence_ref, 'ISSUED', v_server_now, v_not_before, p_expires_at
  ) returning id into v_lease_id;

  return v_lease_id;
end;
$$;

create or replace function public.consume_sensitive_permission_lease(
  p_lease_id uuid,
  p_principal text,
  p_action text,
  p_resource_scope jsonb,
  p_sector_scope text[],
  p_entity_scope text[],
  p_geo_policy_scope text[],
  p_nonce_hash text
)
returns table (
  ok boolean,
  reason_code text,
  lease_id uuid
)
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_lease public.sensitive_permission_leases%rowtype;
  v_rows integer := 0;
  v_requested_scope_digest text;
  v_server_now timestamptz := statement_timestamp();
begin
  if p_sector_scope is null
    or p_entity_scope is null
    or p_geo_policy_scope is null
    or not public.sensitive_resource_scope_is_bounded(p_resource_scope, false) then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_BINDING_MISMATCH'::text, null::uuid;
    return;
  end if;

  v_requested_scope_digest := public.sensitive_permission_scope_digest(
    p_resource_scope, p_sector_scope, p_entity_scope, p_geo_policy_scope
  );

  select * into v_lease from public.sensitive_permission_leases where id = p_lease_id for update;

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
    or v_lease.scope_digest <> v_requested_scope_digest
    or v_lease.nonce_hash <> p_nonce_hash then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_BINDING_MISMATCH'::text, v_lease.id;
    return;
  end if;

  if v_server_now < v_lease.not_before then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_NOT_YET_VALID'::text, v_lease.id;
    return;
  end if;

  if v_server_now >= v_lease.expires_at then
    update public.sensitive_permission_leases set status = 'EXPIRED', updated_at = v_server_now where id = v_lease.id and status = 'ISSUED';
    return query select false, 'SENSITIVE_PERMISSION_LEASE_EXPIRED'::text, v_lease.id;
    return;
  end if;

  if not public.sensitive_permission_grant_is_active(v_lease.grant_id, v_server_now) then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE'::text, v_lease.id;
    return;
  end if;

  update public.sensitive_permission_leases set status = 'CONSUMED', consumed_at = v_server_now, updated_at = v_server_now where id = v_lease.id and status = 'ISSUED' and principal = p_principal and action = p_action and scope_digest = v_requested_scope_digest and nonce_hash = p_nonce_hash and not_before <= v_server_now and expires_at > v_server_now;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_REPLAY_OR_CONFLICT'::text, v_lease.id;
    return;
  end if;

  return query select true, 'SENSITIVE_PERMISSION_LEASE_CONSUMED'::text, v_lease.id;
end;
$$;

revoke all on function public.create_sensitive_permission_grant(text, text, jsonb, text[], text[], text[], text, text, text, uuid, text, timestamptz, timestamptz, jsonb, text) from public, anon, authenticated;
revoke all on function public.revoke_sensitive_permission_grant(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.expire_sensitive_permission_grant(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.create_sensitive_permission_lease(uuid, text, text, jsonb, text[], text[], text[], text, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.consume_sensitive_permission_lease(uuid, text, text, jsonb, text[], text[], text[], text) from public, anon, authenticated;

grant execute on function public.create_sensitive_permission_grant(text, text, jsonb, text[], text[], text[], text, text, text, uuid, text, timestamptz, timestamptz, jsonb, text) to service_role;
grant execute on function public.revoke_sensitive_permission_grant(uuid, text, text, text) to service_role;
grant execute on function public.expire_sensitive_permission_grant(uuid, text, text, text) to service_role;
grant execute on function public.create_sensitive_permission_lease(uuid, text, text, jsonb, text[], text[], text[], text, timestamptz, timestamptz, text) to service_role;
grant execute on function public.consume_sensitive_permission_lease(uuid, text, text, jsonb, text[], text[], text[], text) to service_role;

commit;

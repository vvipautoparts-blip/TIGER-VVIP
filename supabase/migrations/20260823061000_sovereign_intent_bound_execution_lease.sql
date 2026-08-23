-- TIGER Sovereign Proof Continuum v2: intent-bound, non-portable execution lease.
-- Source-only forward migration. No remote apply is performed by this commit.
-- The existing sensitive_permission_leases table remains the only lease authority.
-- session_evidence_ref is a binding reference only: server orchestration MUST
-- reverify live session state immediately before calling consume. The database
-- never accepts a browser-supplied session_active/session_trusted boolean.

begin;

alter table public.sensitive_permission_leases add column if not exists intent_id uuid;
alter table public.sensitive_permission_leases add column if not exists intent_digest text;
alter table public.sensitive_permission_leases add column if not exists proof_evidence_ref text;
alter table public.sensitive_permission_leases add column if not exists session_evidence_ref text;
alter table public.sensitive_permission_leases add column if not exists policy_version text;
alter table public.sensitive_permission_leases add column if not exists authority_version text;

alter table public.sensitive_permission_leases
  add constraint sensitive_permission_lease_intent_fk
  foreign key (intent_id) references public.sovereign_action_intents(intent_id) not valid;

alter table public.sensitive_permission_leases
  add constraint sensitive_permission_lease_v2_binding_check
  check (
    (
      intent_id is null
      and intent_digest is null
      and proof_evidence_ref is null
      and session_evidence_ref is null
      and policy_version is null
      and authority_version is null
    )
    or
    (
      intent_id is distinct from null
      and intent_digest is distinct from null
      and proof_evidence_ref is distinct from null
      and session_evidence_ref is distinct from null
      and policy_version is distinct from null
      and authority_version is distinct from null
      and coalesce(length(btrim(proof_evidence_ref)) between 1 and 512, false)
      and coalesce(length(btrim(session_evidence_ref)) between 1 and 512, false)
      and coalesce(length(btrim(policy_version)) between 1 and 128, false)
      and coalesce(length(btrim(authority_version)) between 1 and 128, false)
    )
  ) not valid;

alter table public.sensitive_permission_leases
  add constraint sensitive_permission_lease_intent_digest_shape_check
  check (intent_digest is null or intent_digest ~ '^[0-9a-f]{64}$') not valid;

create index if not exists sensitive_permission_leases_intent_status_idx
  on public.sensitive_permission_leases (intent_id, status, expires_at);

create or replace function public.guard_sensitive_permission_lease_mutation()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
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
    or new.intent_id is distinct from old.intent_id
    or new.intent_digest is distinct from old.intent_digest
    or new.proof_evidence_ref is distinct from old.proof_evidence_ref
    or new.session_evidence_ref is distinct from old.session_evidence_ref
    or new.policy_version is distinct from old.policy_version
    or new.authority_version is distinct from old.authority_version
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

revoke all on function public.guard_sensitive_permission_lease_mutation() from public, anon, authenticated;

create or replace function public.create_sovereign_intent_bound_execution_lease(
  p_intent_id uuid,
  p_grant_id uuid,
  p_principal text,
  p_action text,
  p_intent_digest text,
  p_resource_scope jsonb,
  p_sector_scope text[],
  p_entity_scope text[],
  p_geo_policy_scope text[],
  p_proof_evidence_ref text,
  p_session_evidence_ref text,
  p_nonce_hash text,
  p_policy_version text,
  p_authority_version text,
  p_audit_evidence_ref text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
  v_intent public.sovereign_action_intents%rowtype;
  v_grant public.sensitive_permission_grants%rowtype;
  v_scope_digest text;
  v_lease_id uuid;
  v_max_expires_at timestamptz;
  v_canonical_requested_scope jsonb;
begin
  if p_intent_id is null
    or p_grant_id is null
    or nullif(btrim(p_principal), '') is null
    or nullif(btrim(p_action), '') is null
    or p_intent_digest !~ '^[0-9a-f]{64}$'
    or nullif(btrim(p_proof_evidence_ref), '') is null
    or length(p_proof_evidence_ref) > 512
    or nullif(btrim(p_session_evidence_ref), '') is null
    or length(p_session_evidence_ref) > 512
    or nullif(btrim(p_nonce_hash), '') is null
    or length(p_nonce_hash) > 512
    or nullif(btrim(p_policy_version), '') is null
    or nullif(btrim(p_authority_version), '') is null
    or nullif(btrim(p_audit_evidence_ref), '') is null then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_REQUIRED_BINDING_MISSING';
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
    raise exception 'SOVEREIGN_EXECUTION_LEASE_SCOPE_INVALID';
  end if;

  select * into v_intent
  from public.sovereign_action_intents
  where intent_id = p_intent_id
  for update;

  if not found then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_INTENT_NOT_FOUND';
  end if;

  if v_intent.status <> 'CONFIRMED' then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_INTENT_NOT_CONFIRMED';
  end if;

  if v_intent.expires_at <= v_server_now then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_INTENT_EXPIRED';
  end if;

  if v_intent.principal <> p_principal
    or v_intent.action <> p_action
    or v_intent.intent_digest <> p_intent_digest
    or v_intent.policy_version <> p_policy_version
    or v_intent.authority_version <> p_authority_version then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_INTENT_BINDING_MISMATCH';
  end if;

  v_canonical_requested_scope := jsonb_build_object(
    'resource_scope', public.sensitive_resource_scope_canonical(p_resource_scope),
    'sector_scope', public.sensitive_sorted_text_array_jsonb(p_sector_scope),
    'entity_scope', public.sensitive_sorted_text_array_jsonb(p_entity_scope),
    'geo_policy_scope', public.sensitive_sorted_text_array_jsonb(p_geo_policy_scope)
  );

  if v_intent.canonical_scope <> v_canonical_requested_scope then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_INTENT_SCOPE_MISMATCH';
  end if;

  select * into v_grant
  from public.sensitive_permission_grants
  where id = p_grant_id
  for update;

  if not found
    or v_grant.principal <> p_principal
    or v_grant.action <> p_action
    or not public.sensitive_permission_grant_is_active(v_grant.id, v_server_now) then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_GRANT_DENIED';
  end if;

  if not public.sensitive_resource_scope_is_subset(p_resource_scope, v_grant.resource_scope)
    or not public.sensitive_text_array_is_subset(p_sector_scope, v_grant.sector_scope)
    or not public.sensitive_text_array_is_subset(p_entity_scope, v_grant.entity_scope)
    or not public.sensitive_text_array_is_subset(p_geo_policy_scope, v_grant.geo_policy_scope) then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_SCOPE_EXCEEDS_GRANT';
  end if;

  v_scope_digest := public.sensitive_permission_scope_digest(
    p_resource_scope,
    p_sector_scope,
    p_entity_scope,
    p_geo_policy_scope
  );

  if v_grant.expires_at is null then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_GRANT_EXPIRY_INVALID';
  end if;

  v_max_expires_at := least(v_server_now + interval '60 seconds', v_intent.expires_at, v_grant.expires_at);

  if p_expires_at is null
    or not (p_expires_at > v_server_now)
    or not (p_expires_at <= v_max_expires_at) then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_EXPIRY_DENIED';
  end if;

  insert into public.sensitive_permission_leases (
    grant_id,
    principal,
    action,
    resource_scope,
    sector_scope,
    entity_scope,
    geo_policy_scope,
    scope_digest,
    nonce_hash,
    audit_evidence_ref,
    status,
    issued_at,
    not_before,
    expires_at,
    updated_at,
    intent_id,
    intent_digest,
    proof_evidence_ref,
    session_evidence_ref,
    policy_version,
    authority_version
  ) values (
    p_grant_id,
    p_principal,
    p_action,
    p_resource_scope,
    p_sector_scope,
    p_entity_scope,
    p_geo_policy_scope,
    v_scope_digest,
    p_nonce_hash,
    p_audit_evidence_ref,
    'ISSUED',
    v_server_now,
    v_server_now,
    p_expires_at,
    v_server_now,
    p_intent_id,
    p_intent_digest,
    p_proof_evidence_ref,
    p_session_evidence_ref,
    p_policy_version,
    p_authority_version
  ) returning id into v_lease_id;

  return v_lease_id;
exception
  when unique_violation then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_REPLAY_OR_DUPLICATE';
end;
$$;

create or replace function public.consume_sovereign_intent_bound_execution_lease(
  p_lease_id uuid,
  p_principal text,
  p_action text,
  p_intent_digest text,
  p_resource_scope jsonb,
  p_sector_scope text[],
  p_entity_scope text[],
  p_geo_policy_scope text[],
  p_session_evidence_ref text,
  p_policy_version text,
  p_authority_version text,
  p_nonce_hash text
)
returns public.sensitive_permission_leases
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
  v_lease public.sensitive_permission_leases%rowtype;
  v_intent public.sovereign_action_intents%rowtype;
  v_grant public.sensitive_permission_grants%rowtype;
  v_scope_digest text;
begin
  if p_lease_id is null
    or nullif(btrim(p_principal), '') is null
    or nullif(btrim(p_action), '') is null
    or p_intent_digest !~ '^[0-9a-f]{64}$'
    or nullif(btrim(p_session_evidence_ref), '') is null
    or nullif(btrim(p_policy_version), '') is null
    or nullif(btrim(p_authority_version), '') is null
    or nullif(btrim(p_nonce_hash), '') is null then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_CONSUME_BINDING_MISSING';
  end if;

  select * into v_lease
  from public.sensitive_permission_leases
  where id = p_lease_id
  for update;

  if not found then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_NOT_FOUND';
  end if;

  if v_lease.status <> 'ISSUED' then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_NOT_ISSUED';
  end if;

  if v_lease.not_before > v_server_now
    or v_lease.expires_at <= v_server_now then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_NOT_CURRENT';
  end if;

  if v_lease.principal <> p_principal
    or v_lease.action <> p_action
    or v_lease.intent_digest <> p_intent_digest
    or v_lease.policy_version <> p_policy_version
    or v_lease.authority_version <> p_authority_version
    or v_lease.session_evidence_ref <> p_session_evidence_ref
    or v_lease.nonce_hash <> p_nonce_hash then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_BINDING_MISMATCH';
  end if;

  v_scope_digest := public.sensitive_permission_scope_digest(
    p_resource_scope,
    p_sector_scope,
    p_entity_scope,
    p_geo_policy_scope
  );

  if v_lease.scope_digest <> v_scope_digest
    or v_lease.resource_scope <> p_resource_scope
    or v_lease.sector_scope <> p_sector_scope
    or v_lease.entity_scope <> p_entity_scope
    or v_lease.geo_policy_scope <> p_geo_policy_scope then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_SCOPE_MISMATCH';
  end if;

  select * into v_intent
  from public.sovereign_action_intents
  where intent_id = v_lease.intent_id
  for update;

  if not found
    or v_intent.status <> 'CONFIRMED'
    or v_intent.expires_at <= v_server_now then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_INTENT_DENIED';
  end if;

  if v_intent.principal <> p_principal
    or v_intent.action <> p_action
    or v_intent.intent_digest <> p_intent_digest
    or v_intent.policy_version <> p_policy_version
    or v_intent.authority_version <> p_authority_version then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_INTENT_BINDING_MISMATCH';
  end if;

  select * into v_grant
  from public.sensitive_permission_grants
  where id = v_lease.grant_id
  for update;

  if not found
    or v_grant.principal <> p_principal
    or v_grant.action <> p_action
    or not public.sensitive_permission_grant_is_active(v_grant.id, v_server_now) then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_GRANT_DENIED';
  end if;

  if not public.sensitive_resource_scope_is_subset(v_lease.resource_scope, v_grant.resource_scope)
    or not public.sensitive_text_array_is_subset(v_lease.sector_scope, v_grant.sector_scope)
    or not public.sensitive_text_array_is_subset(v_lease.entity_scope, v_grant.entity_scope)
    or not public.sensitive_text_array_is_subset(v_lease.geo_policy_scope, v_grant.geo_policy_scope) then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_GRANT_SCOPE_CHANGED';
  end if;

  update public.sensitive_permission_leases
  set status = 'CONSUMED', consumed_at = v_server_now
  where id = p_lease_id and status = 'ISSUED'
  returning * into v_lease;

  if not found then
    raise exception 'SOVEREIGN_EXECUTION_LEASE_REPLAY_OR_CONFLICT';
  end if;

  return v_lease;
end;
$$;

revoke all on function public.create_sovereign_intent_bound_execution_lease(uuid, uuid, text, text, text, jsonb, text[], text[], text[], text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_sovereign_intent_bound_execution_lease(uuid, uuid, text, text, text, jsonb, text[], text[], text[], text, text, text, text, text, text, timestamptz) to service_role;

revoke all on function public.consume_sovereign_intent_bound_execution_lease(uuid, text, text, text, jsonb, text[], text[], text[], text, text, text, text) from public, anon, authenticated;
grant execute on function public.consume_sovereign_intent_bound_execution_lease(uuid, text, text, text, jsonb, text[], text[], text[], text, text, text, text) to service_role;

commit;

-- Unified Authorization Runtime Bridge: persistent owner-sealed disclosure authority.
-- Source-only migration. Sensitive disclosure is exact-bound, database-time authoritative,
-- atomically single-use, and reuses the canonical owner step-up authority.

begin;

-- Extend the existing owner step-up authority instead of creating a parallel authority.
alter table public.ai_owner_stepup_authorizations
  drop constraint if exists ai_owner_stepup_action_check;
alter table public.ai_owner_stepup_authorizations
  add constraint ai_owner_stepup_action_check check (
    action in (
      'MERGE_RELEASE',
      'PROMOTE_DATABASE',
      'ACTIVATE_PRODUCTION',
      'CHANGE_PRICES',
      'CHANGE_OWNER_SECURITY',
      'CHANGE_AI_SECURITY_POLICY',
      'APPROVE_DISCLOSURE'
    )
  );

alter table public.ai_owner_stepup_authorizations
  drop constraint if exists ai_owner_stepup_action_environment_check;
alter table public.ai_owner_stepup_authorizations
  add constraint ai_owner_stepup_action_environment_check check (
    (action = 'MERGE_RELEASE' and environment = 'REPOSITORY')
    or (
      action in (
        'PROMOTE_DATABASE',
        'ACTIVATE_PRODUCTION',
        'CHANGE_PRICES',
        'CHANGE_OWNER_SECURITY',
        'CHANGE_AI_SECURITY_POLICY'
      )
      and environment = 'PRODUCTION'
    )
    or (action = 'APPROVE_DISCLOSURE' and environment in ('REPOSITORY', 'PRODUCTION'))
  );

create table if not exists public.owner_sealed_disclosure_requests (
  request_id text primary key,
  requester text,
  artifact_id text,
  classification text,
  artifact_scope_digest text,
  purpose text,
  nonce_digest text,
  challenge_digest text,
  audit_evidence_ref text,
  requested_at timestamptz default statement_timestamp(),
  expires_at timestamptz,
  constraint owner_sealed_disclosure_request_required_check check (
    request_id is distinct from null
    and requester is distinct from null
    and artifact_id is distinct from null
    and classification is distinct from null
    and artifact_scope_digest is distinct from null
    and purpose is distinct from null
    and nonce_digest is distinct from null
    and challenge_digest is distinct from null
    and audit_evidence_ref is distinct from null
    and requested_at is distinct from null
    and expires_at is distinct from null
  ),
  constraint owner_sealed_disclosure_request_classification_check check (
    classification in ('CONFIDENTIAL', 'OWNER_ONLY')
  ),
  constraint owner_sealed_disclosure_request_scope_digest_check check (
    artifact_scope_digest ~ '^[0-9a-f]{64}$'
  ),
  constraint owner_sealed_disclosure_request_nonce_digest_check check (
    nonce_digest ~ '^[0-9a-f]{64}$'
  ),
  constraint owner_sealed_disclosure_request_challenge_digest_check check (
    challenge_digest ~ '^[0-9a-f]{64}$'
  ),
  constraint owner_sealed_disclosure_request_time_check check (
    expires_at > requested_at
  )
);

create table if not exists public.owner_sealed_disclosure_events (
  event_id uuid primary key default gen_random_uuid(),
  request_id text references public.owner_sealed_disclosure_requests(request_id),
  lease_id uuid,
  event_type text,
  actor text,
  reason_code text,
  audit_evidence_ref text,
  occurred_at timestamptz default statement_timestamp(),
  constraint owner_sealed_disclosure_event_required_check check (
    request_id is distinct from null
    and event_type is distinct from null
    and actor is distinct from null
    and reason_code is distinct from null
    and audit_evidence_ref is distinct from null
    and occurred_at is distinct from null
  ),
  constraint owner_sealed_disclosure_event_type_check check (
    event_type in ('REQUESTED', 'LEASE_ISSUED', 'LEASE_CONSUMED', 'LEASE_REVOKED', 'LEASE_EXPIRED')
  )
);

create table if not exists public.owner_sealed_disclosure_leases (
  lease_id uuid primary key default gen_random_uuid(),
  request_id text references public.owner_sealed_disclosure_requests(request_id),
  requester text,
  artifact_id text,
  classification text,
  artifact_scope_digest text,
  purpose text,
  nonce_digest text,
  challenge_digest text,
  owner_authorization_id uuid references public.ai_owner_stepup_authorizations(id),
  audit_evidence_ref text,
  status text default 'ISSUED',
  issued_at timestamptz default statement_timestamp(),
  not_before timestamptz,
  expires_at timestamptz,
  consumed_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz default statement_timestamp(),
  constraint owner_sealed_disclosure_lease_request_unique unique (request_id),
  constraint owner_sealed_disclosure_lease_authorization_unique unique (owner_authorization_id),
  constraint owner_sealed_disclosure_lease_required_check check (
    lease_id is distinct from null
    and request_id is distinct from null
    and requester is distinct from null
    and artifact_id is distinct from null
    and classification is distinct from null
    and artifact_scope_digest is distinct from null
    and purpose is distinct from null
    and nonce_digest is distinct from null
    and challenge_digest is distinct from null
    and owner_authorization_id is distinct from null
    and audit_evidence_ref is distinct from null
    and status is distinct from null
    and issued_at is distinct from null
    and not_before is distinct from null
    and expires_at is distinct from null
    and updated_at is distinct from null
  ),
  constraint owner_sealed_disclosure_lease_status_check check (
    status in ('ISSUED', 'CONSUMED', 'REVOKED', 'EXPIRED')
  ),
  constraint owner_sealed_disclosure_lease_classification_check check (
    classification in ('CONFIDENTIAL', 'OWNER_ONLY')
  ),
  constraint owner_sealed_disclosure_lease_scope_digest_check check (
    artifact_scope_digest ~ '^[0-9a-f]{64}$'
  ),
  constraint owner_sealed_disclosure_lease_nonce_digest_check check (
    nonce_digest ~ '^[0-9a-f]{64}$'
  ),
  constraint owner_sealed_disclosure_lease_challenge_digest_check check (
    challenge_digest ~ '^[0-9a-f]{64}$'
  ),
  constraint owner_sealed_disclosure_lease_time_check check (
    not_before >= issued_at and expires_at > not_before
  ),
  constraint owner_sealed_disclosure_lease_consumed_check check (
    status <> 'CONSUMED' or consumed_at is distinct from null
  ),
  constraint owner_sealed_disclosure_lease_revoked_check check (
    status <> 'REVOKED' or revoked_at is distinct from null
  )
);

create index if not exists owner_sealed_disclosure_requests_expiry_idx
  on public.owner_sealed_disclosure_requests (expires_at);
create index if not exists owner_sealed_disclosure_leases_status_expiry_idx
  on public.owner_sealed_disclosure_leases (status, expires_at);
create index if not exists owner_sealed_disclosure_events_request_time_idx
  on public.owner_sealed_disclosure_events (request_id, occurred_at desc);

alter table public.owner_sealed_disclosure_requests enable row level security;
alter table public.owner_sealed_disclosure_requests force row level security;
alter table public.owner_sealed_disclosure_events enable row level security;
alter table public.owner_sealed_disclosure_events force row level security;
alter table public.owner_sealed_disclosure_leases enable row level security;
alter table public.owner_sealed_disclosure_leases force row level security;

revoke all on table public.owner_sealed_disclosure_requests from anon, authenticated;
revoke all on table public.owner_sealed_disclosure_events from anon, authenticated;
revoke all on table public.owner_sealed_disclosure_leases from anon, authenticated;
revoke all on table public.owner_sealed_disclosure_requests from service_role;
revoke all on table public.owner_sealed_disclosure_events from service_role;
revoke all on table public.owner_sealed_disclosure_leases from service_role;
grant select on table public.owner_sealed_disclosure_requests to service_role;
grant select on table public.owner_sealed_disclosure_events to service_role;
grant select on table public.owner_sealed_disclosure_leases to service_role;

create or replace function public.guard_owner_sealed_disclosure_request_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'OWNER_SEALED_DISCLOSURE_REQUEST_IMMUTABLE';
end;
$$;

create or replace function public.guard_owner_sealed_disclosure_event_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'OWNER_SEALED_DISCLOSURE_EVENT_IMMUTABLE';
end;
$$;

create or replace function public.guard_owner_sealed_disclosure_lease_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'OWNER_SEALED_DISCLOSURE_LEASE_DELETE_FORBIDDEN';
  end if;

  if new.request_id is distinct from old.request_id
    or new.requester is distinct from old.requester
    or new.artifact_id is distinct from old.artifact_id
    or new.classification is distinct from old.classification
    or new.artifact_scope_digest is distinct from old.artifact_scope_digest
    or new.purpose is distinct from old.purpose
    or new.nonce_digest is distinct from old.nonce_digest
    or new.challenge_digest is distinct from old.challenge_digest
    or new.owner_authorization_id is distinct from old.owner_authorization_id
    or new.audit_evidence_ref is distinct from old.audit_evidence_ref
    or new.issued_at is distinct from old.issued_at
    or new.not_before is distinct from old.not_before
    or new.expires_at is distinct from old.expires_at then
    raise exception 'OWNER_SEALED_DISCLOSURE_LEASE_BINDING_IMMUTABLE';
  end if;

  if old.status <> 'ISSUED'
    or new.status not in ('CONSUMED', 'REVOKED', 'EXPIRED') then
    raise exception 'OWNER_SEALED_DISCLOSURE_LEASE_INVALID_TRANSITION';
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

drop trigger if exists owner_sealed_disclosure_request_immutable_guard
  on public.owner_sealed_disclosure_requests;
create trigger owner_sealed_disclosure_request_immutable_guard
before delete or update
on public.owner_sealed_disclosure_requests
for each row execute function public.guard_owner_sealed_disclosure_request_immutable();

drop trigger if exists owner_sealed_disclosure_event_immutable_guard
  on public.owner_sealed_disclosure_events;
create trigger owner_sealed_disclosure_event_immutable_guard
before delete or update
on public.owner_sealed_disclosure_events
for each row execute function public.guard_owner_sealed_disclosure_event_immutable();

drop trigger if exists owner_sealed_disclosure_lease_mutation_guard
  on public.owner_sealed_disclosure_leases;
create trigger owner_sealed_disclosure_lease_mutation_guard
before delete or update
on public.owner_sealed_disclosure_leases
for each row execute function public.guard_owner_sealed_disclosure_lease_mutation();

create or replace function public.issue_disclosure_lease(
  p_request_id text,
  p_requester text,
  p_artifact_id text,
  p_classification text,
  p_artifact_scope_digest text,
  p_purpose text,
  p_nonce_digest text,
  p_challenge_digest text,
  p_owner_authorization_id uuid,
  p_request_expires_at timestamptz,
  p_audit_evidence_ref text
)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_owner_authorization public.ai_owner_stepup_authorizations%rowtype;
  v_lease_expires_at timestamptz;
  v_lease_id uuid;
  v_rows integer := 0;
begin
  if nullif(btrim(p_request_id), '') is null
    or nullif(btrim(p_requester), '') is null
    or nullif(btrim(p_artifact_id), '') is null
    or nullif(btrim(p_purpose), '') is null
    or nullif(btrim(p_audit_evidence_ref), '') is null then
    raise exception 'DISCLOSURE_REQUEST_INVALID';
  end if;

  if p_classification not in ('CONFIDENTIAL', 'OWNER_ONLY') then
    raise exception 'DISCLOSURE_CLASSIFICATION_NOT_OWNER_SEALED';
  end if;

  if p_artifact_scope_digest is null
    or p_artifact_scope_digest !~ '^[0-9a-f]{64}$'
    or p_nonce_digest is null
    or p_nonce_digest !~ '^[0-9a-f]{64}$'
    or p_challenge_digest is null
    or p_challenge_digest !~ '^[0-9a-f]{64}$'
    or p_owner_authorization_id is null
    or p_request_expires_at is null
    or p_request_expires_at <= v_now then
    raise exception 'DISCLOSURE_REQUEST_INVALID';
  end if;

  if exists (
    select 1
    from public.owner_sealed_disclosure_requests
    where request_id = p_request_id
  ) then
    raise exception 'DISCLOSURE_REQUEST_CONFLICT';
  end if;

  insert into public.owner_sealed_disclosure_requests (
    request_id,
    requester,
    artifact_id,
    classification,
    artifact_scope_digest,
    purpose,
    nonce_digest,
    challenge_digest,
    audit_evidence_ref,
    requested_at,
    expires_at
  ) values (
    p_request_id,
    p_requester,
    p_artifact_id,
    p_classification,
    p_artifact_scope_digest,
    p_purpose,
    p_nonce_digest,
    p_challenge_digest,
    p_audit_evidence_ref,
    v_now,
    p_request_expires_at
  );

  insert into public.owner_sealed_disclosure_events (
    request_id,
    event_type,
    actor,
    reason_code,
    audit_evidence_ref,
    occurred_at
  ) values (
    p_request_id,
    'REQUESTED',
    p_requester,
    'DISCLOSURE_REQUEST_RECORDED',
    p_audit_evidence_ref,
    v_now
  );

  select * into v_owner_authorization
  from public.ai_owner_stepup_authorizations
  where id = p_owner_authorization_id
  for update;

  if not found
    or v_owner_authorization.owner_subject <> 'owner:root'
    or v_owner_authorization.action <> 'APPROVE_DISCLOSURE'
    or v_owner_authorization.assurance <> 'PHISHING_RESISTANT'
    or v_owner_authorization.payload_digest <> p_challenge_digest
    or v_owner_authorization.scope_digest <> p_artifact_scope_digest
    or v_owner_authorization.nonce_hash <> p_nonce_digest
    or v_owner_authorization.status <> 'verified'
    or v_owner_authorization.not_before > v_now
    or v_owner_authorization.expires_at <= v_now
    or v_owner_authorization.consumed_at is distinct from null
    or v_owner_authorization.revoked_at is distinct from null then
    raise exception 'DISCLOSURE_OWNER_AUTHORIZATION_DENIED';
  end if;

  v_lease_expires_at := least(p_request_expires_at, v_owner_authorization.expires_at);
  if v_lease_expires_at <= v_now then
    raise exception 'DISCLOSURE_OWNER_AUTHORIZATION_EXPIRED';
  end if;

  update public.ai_owner_stepup_authorizations set status = 'consumed', consumed_at = v_now, updated_at = v_now where id = p_owner_authorization_id and status = 'verified';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'DISCLOSURE_OWNER_AUTHORIZATION_REPLAY_OR_CONFLICT';
  end if;

  begin
    insert into public.owner_sealed_disclosure_leases (
      request_id,
      requester,
      artifact_id,
      classification,
      artifact_scope_digest,
      purpose,
      nonce_digest,
      challenge_digest,
      owner_authorization_id,
      audit_evidence_ref,
      status,
      issued_at,
      not_before,
      expires_at
    ) values (
      p_request_id,
      p_requester,
      p_artifact_id,
      p_classification,
      p_artifact_scope_digest,
      p_purpose,
      p_nonce_digest,
      p_challenge_digest,
      p_owner_authorization_id,
      p_audit_evidence_ref,
      'ISSUED',
      v_now,
      v_now,
      v_lease_expires_at
    )
    returning lease_id into v_lease_id;
  exception when unique_violation then
    raise exception 'DISCLOSURE_LEASE_ALREADY_ISSUED';
  end;

  insert into public.owner_sealed_disclosure_events (
    request_id,
    lease_id,
    event_type,
    actor,
    reason_code,
    audit_evidence_ref,
    occurred_at
  ) values (
    p_request_id,
    v_lease_id,
    'LEASE_ISSUED',
    'owner:root',
    'DISCLOSURE_LEASE_ISSUED',
    p_audit_evidence_ref,
    v_now
  );

  return v_lease_id;
end;
$$;

create or replace function public.consume_disclosure_lease(
  p_lease_id uuid,
  p_request_id text,
  p_requester text,
  p_artifact_id text,
  p_classification text,
  p_artifact_scope_digest text,
  p_purpose text,
  p_nonce_digest text,
  p_challenge_digest text
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
  v_now timestamptz := statement_timestamp();
  v_lease public.owner_sealed_disclosure_leases%rowtype;
  v_rows integer := 0;
begin
  select * into v_lease
  from public.owner_sealed_disclosure_leases
  where lease_id = p_lease_id
  for update;

  if not found then
    return query select false, 'DISCLOSURE_LEASE_NOT_FOUND'::text, null::uuid;
    return;
  end if;

  if v_lease.status <> 'ISSUED' then
    return query select false, 'DISCLOSURE_LEASE_REPLAY_OR_CONFLICT'::text, v_lease.lease_id;
    return;
  end if;

  if v_lease.request_id <> p_request_id
    or v_lease.requester <> p_requester
    or v_lease.artifact_id <> p_artifact_id
    or v_lease.classification <> p_classification
    or v_lease.artifact_scope_digest <> p_artifact_scope_digest
    or v_lease.purpose <> p_purpose
    or v_lease.nonce_digest <> p_nonce_digest
    or v_lease.challenge_digest <> p_challenge_digest then
    return query select false, 'DISCLOSURE_LEASE_BINDING_MISMATCH'::text, v_lease.lease_id;
    return;
  end if;

  if v_now < v_lease.not_before then
    return query select false, 'DISCLOSURE_LEASE_NOT_YET_VALID'::text, v_lease.lease_id;
    return;
  end if;

  if v_now >= v_lease.expires_at then
    update public.owner_sealed_disclosure_leases set status = 'EXPIRED', updated_at = v_now where lease_id = v_lease.lease_id and status = 'ISSUED';
    insert into public.owner_sealed_disclosure_events (
      request_id,
      lease_id,
      event_type,
      actor,
      reason_code,
      audit_evidence_ref,
      occurred_at
    ) values (
      v_lease.request_id,
      v_lease.lease_id,
      'LEASE_EXPIRED',
      v_lease.requester,
      'DISCLOSURE_LEASE_EXPIRED',
      v_lease.audit_evidence_ref,
      v_now
    );
    return query select false, 'DISCLOSURE_LEASE_EXPIRED'::text, v_lease.lease_id;
    return;
  end if;

  update public.owner_sealed_disclosure_leases set status = 'CONSUMED', consumed_at = v_now, updated_at = v_now where lease_id = v_lease.lease_id and status = 'ISSUED' and request_id = p_request_id and requester = p_requester and artifact_id = p_artifact_id and classification = p_classification and artifact_scope_digest = p_artifact_scope_digest and purpose = p_purpose and nonce_digest = p_nonce_digest and challenge_digest = p_challenge_digest;
  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    return query select false, 'DISCLOSURE_LEASE_REPLAY_OR_CONFLICT'::text, v_lease.lease_id;
    return;
  end if;

  insert into public.owner_sealed_disclosure_events (
    request_id,
    lease_id,
    event_type,
    actor,
    reason_code,
    audit_evidence_ref,
    occurred_at
  ) values (
    v_lease.request_id,
    v_lease.lease_id,
    'LEASE_CONSUMED',
    v_lease.requester,
    'DISCLOSURE_LEASE_CONSUMED',
    v_lease.audit_evidence_ref,
    v_now
  );

  return query select true, 'DISCLOSURE_LEASE_CONSUMED'::text, v_lease.lease_id;
end;
$$;

revoke all on function public.guard_owner_sealed_disclosure_request_immutable() from public, anon, authenticated;
revoke all on function public.guard_owner_sealed_disclosure_event_immutable() from public, anon, authenticated;
revoke all on function public.guard_owner_sealed_disclosure_lease_mutation() from public, anon, authenticated;
revoke all on function public.issue_disclosure_lease(text, text, text, text, text, text, text, text, uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.consume_disclosure_lease(uuid, text, text, text, text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.issue_disclosure_lease(text, text, text, text, text, text, text, text, uuid, timestamptz, text) to service_role;
grant execute on function public.consume_disclosure_lease(uuid, text, text, text, text, text, text, text, text) to service_role;

commit;

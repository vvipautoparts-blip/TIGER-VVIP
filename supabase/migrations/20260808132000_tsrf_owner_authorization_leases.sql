-- TSRF semantic convergence: owner step-up authorization leases.
-- A lease is exact-bound, phishing-resistant, time-bounded and atomically single-use.

begin;

create table if not exists public.ai_owner_stepup_authorizations (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null,
  owner_subject text not null,
  action text not null,
  release_digest text not null,
  payload_digest text not null,
  scope_digest text not null,
  environment text not null,
  verifier_id text not null,
  auth_method text not null,
  assurance text not null,
  authenticator_reference_hash text not null,
  nonce_hash text not null,
  verification_digest text not null,
  max_rollout_percent numeric(5,2) not null default 0,
  status text not null default 'verified',
  created_at timestamptz not null default now(),
  verified_at timestamptz not null,
  not_before timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ai_owner_stepup_challenge_unique unique (challenge_id),
  constraint ai_owner_stepup_nonce_unique unique (nonce_hash),
  constraint ai_owner_stepup_verification_unique unique (verification_digest),
  constraint ai_owner_stepup_action_check check (
    action in (
      'MERGE_RELEASE',
      'PROMOTE_DATABASE',
      'ACTIVATE_PRODUCTION',
      'CHANGE_PRICES',
      'CHANGE_OWNER_SECURITY',
      'CHANGE_AI_SECURITY_POLICY'
    )
  ),
  constraint ai_owner_stepup_environment_check check (
    environment in ('REPOSITORY', 'PRODUCTION')
  ),
  constraint ai_owner_stepup_action_environment_check check (
    (action = 'MERGE_RELEASE' and environment = 'REPOSITORY')
    or (action in ('PROMOTE_DATABASE', 'ACTIVATE_PRODUCTION', 'CHANGE_PRICES', 'CHANGE_OWNER_SECURITY', 'CHANGE_AI_SECURITY_POLICY') and environment = 'PRODUCTION')
  ),
  constraint ai_owner_stepup_method_check check (
    auth_method in ('WEBAUTHN_PASSKEY', 'IDP_PHISHING_RESISTANT_MFA')
  ),
  constraint ai_owner_stepup_assurance_check check (assurance = 'PHISHING_RESISTANT'),
  constraint ai_owner_stepup_release_digest_check check (release_digest ~ '^[0-9a-f]{64}$'),
  constraint ai_owner_stepup_payload_digest_check check (payload_digest ~ '^[0-9a-f]{64}$'),
  constraint ai_owner_stepup_scope_digest_check check (scope_digest ~ '^[0-9a-f]{64}$'),
  constraint ai_owner_stepup_authenticator_hash_check check (authenticator_reference_hash ~ '^[0-9a-f]{64}$'),
  constraint ai_owner_stepup_nonce_hash_check check (nonce_hash ~ '^[0-9a-f]{64}$'),
  constraint ai_owner_stepup_verification_digest_check check (verification_digest ~ '^[0-9a-f]{64}$'),
  constraint ai_owner_stepup_rollout_check check (max_rollout_percent >= 0 and max_rollout_percent <= 100),
  constraint ai_owner_stepup_status_check check (status in ('verified', 'consumed', 'revoked', 'expired')),
  constraint ai_owner_stepup_time_window_check check (not_before >= verified_at and expires_at > not_before),
  constraint ai_owner_stepup_consumed_time_check check ((status <> 'consumed') or consumed_at is not null),
  constraint ai_owner_stepup_revoked_time_check check ((status <> 'revoked') or revoked_at is not null)
);

create index if not exists ai_owner_stepup_owner_created_idx
  on public.ai_owner_stepup_authorizations (owner_subject, created_at desc);
create index if not exists ai_owner_stepup_status_expiry_idx
  on public.ai_owner_stepup_authorizations (status, expires_at);
create index if not exists ai_owner_stepup_binding_idx
  on public.ai_owner_stepup_authorizations (
    action,
    release_digest,
    payload_digest,
    scope_digest,
    environment
  );

alter table public.ai_owner_stepup_authorizations enable row level security;
alter table public.ai_owner_stepup_authorizations force row level security;

revoke all on table public.ai_owner_stepup_authorizations from anon, authenticated;
grant select, insert, update on table public.ai_owner_stepup_authorizations to service_role;

create or replace function public.guard_ai_owner_stepup_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'AI_OWNER_STEPUP_DELETE_FORBIDDEN';
  end if;

  if new.challenge_id is distinct from old.challenge_id
    or new.owner_subject is distinct from old.owner_subject
    or new.action is distinct from old.action
    or new.release_digest is distinct from old.release_digest
    or new.payload_digest is distinct from old.payload_digest
    or new.scope_digest is distinct from old.scope_digest
    or new.environment is distinct from old.environment
    or new.verifier_id is distinct from old.verifier_id
    or new.auth_method is distinct from old.auth_method
    or new.assurance is distinct from old.assurance
    or new.authenticator_reference_hash is distinct from old.authenticator_reference_hash
    or new.nonce_hash is distinct from old.nonce_hash
    or new.verification_digest is distinct from old.verification_digest
    or new.max_rollout_percent is distinct from old.max_rollout_percent
    or new.created_at is distinct from old.created_at
    or new.verified_at is distinct from old.verified_at
    or new.not_before is distinct from old.not_before
    or new.expires_at is distinct from old.expires_at then
    raise exception 'AI_OWNER_STEPUP_IMMUTABLE_BINDING';
  end if;

  if old.status = new.status then
    if new.consumed_at is distinct from old.consumed_at
      or new.revoked_at is distinct from old.revoked_at then
      raise exception 'AI_OWNER_STEPUP_TIMESTAMP_MUTATION_FORBIDDEN';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if not (old.status = 'verified' and new.status in ('consumed', 'revoked', 'expired')) then
    raise exception 'AI_OWNER_STEPUP_INVALID_TRANSITION';
  end if;

  if new.status = 'consumed' and new.consumed_at is null then
    new.consumed_at := now();
  elsif new.status = 'revoked' and new.revoked_at is null then
    new.revoked_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.guard_ai_owner_stepup_mutation() from public, anon, authenticated;
grant execute on function public.guard_ai_owner_stepup_mutation() to service_role;

drop trigger if exists ai_owner_stepup_mutation_guard on public.ai_owner_stepup_authorizations;
create trigger ai_owner_stepup_mutation_guard
before update or delete on public.ai_owner_stepup_authorizations
for each row execute function public.guard_ai_owner_stepup_mutation();

create or replace function public.consume_ai_owner_stepup_authorization(
  p_authorization_id uuid,
  p_owner_subject text,
  p_action text,
  p_release_digest text,
  p_payload_digest text,
  p_scope_digest text,
  p_environment text,
  p_requested_rollout_percent numeric default 0,
  p_now timestamptz default now()
)
returns table (
  ok boolean,
  reason_code text,
  authorization_id uuid
)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_authorization public.ai_owner_stepup_authorizations%rowtype;
  v_rows integer := 0;
begin
  if p_requested_rollout_percent < 0 or p_requested_rollout_percent > 100 then
    return query select false, 'STEPUP_ROLLOUT_INVALID'::text, null::uuid;
    return;
  end if;

  select * into v_authorization
  from public.ai_owner_stepup_authorizations
  where id = p_authorization_id
  for update;

  if not found then
    return query select false, 'STEPUP_NOT_FOUND'::text, null::uuid;
    return;
  end if;

  if v_authorization.status <> 'verified' then
    return query select false, 'STEPUP_NOT_ACTIVE'::text, v_authorization.id;
    return;
  end if;
  if v_authorization.owner_subject <> p_owner_subject then
    return query select false, 'STEPUP_OWNER_MISMATCH'::text, v_authorization.id;
    return;
  end if;
  if v_authorization.action <> p_action then
    return query select false, 'STEPUP_ACTION_MISMATCH'::text, v_authorization.id;
    return;
  end if;
  if v_authorization.release_digest <> p_release_digest then
    return query select false, 'STEPUP_RELEASE_MISMATCH'::text, v_authorization.id;
    return;
  end if;
  if v_authorization.payload_digest <> p_payload_digest then
    return query select false, 'STEPUP_PAYLOAD_MISMATCH'::text, v_authorization.id;
    return;
  end if;
  if v_authorization.scope_digest <> p_scope_digest then
    return query select false, 'STEPUP_SCOPE_MISMATCH'::text, v_authorization.id;
    return;
  end if;
  if v_authorization.environment <> p_environment then
    return query select false, 'STEPUP_ENVIRONMENT_MISMATCH'::text, v_authorization.id;
    return;
  end if;
  if p_requested_rollout_percent > v_authorization.max_rollout_percent then
    return query select false, 'STEPUP_ROLLOUT_SCOPE_MISMATCH'::text, v_authorization.id;
    return;
  end if;
  if p_now < v_authorization.not_before then
    return query select false, 'STEPUP_NOT_YET_VALID'::text, v_authorization.id;
    return;
  end if;
  if v_authorization.expires_at < p_now then
    update public.ai_owner_stepup_authorizations
      set status = 'expired', updated_at = p_now
      where id = p_authorization_id and status = 'verified';
    return query select false, 'STEPUP_EXPIRED'::text, v_authorization.id;
    return;
  end if;

  update public.ai_owner_stepup_authorizations
  set status = 'consumed', consumed_at = p_now, updated_at = p_now
  where id = p_authorization_id
    and status = 'verified'
    and owner_subject = p_owner_subject
    and action = p_action
    and release_digest = p_release_digest
    and payload_digest = p_payload_digest
    and scope_digest = p_scope_digest
    and environment = p_environment
    and max_rollout_percent >= p_requested_rollout_percent
    and not_before <= p_now
    and expires_at >= p_now;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return query select false, 'STEPUP_REPLAY_OR_CONFLICT'::text, v_authorization.id;
    return;
  end if;

  return query select true, 'STEPUP_CONSUMED'::text, v_authorization.id;
end;
$$;

revoke all on function public.consume_ai_owner_stepup_authorization(uuid, text, text, text, text, text, text, numeric, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_ai_owner_stepup_authorization(uuid, text, text, text, text, text, text, numeric, timestamptz) to service_role;

commit;

-- AI-03 modern persistent trust fabric: converge and harden the authoritative TSRF schema.
-- Repository/non-production migration. No remote apply is authorized by this file.

begin;

-- Fail closed if the authoritative TSRF foundation is absent or has drifted.
do $$
begin
  if to_regclass('public.ai_approval_requests') is null
    or to_regclass('public.ai_audit_events') is null
    or to_regclass('public.ai_usage_ledger') is null
    or to_regclass('public.ai_prompt_versions') is null
    or to_regclass('public.ai_agent_runtime_state') is null
    or to_regclass('public.ai_owner_stepup_authorizations') is null then
    raise exception 'AI03_TSRF_PREREQUISITE_MISSING';
  end if;

  if to_regclass('public.ai_agent_usage_ledger') is not null then
    raise exception 'AI03_TSRF_SCHEMA_MISMATCH:PARALLEL_USAGE_LEDGER';
  end if;

  if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ai_approval_requests' and column_name = 'release_digest'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ai_approval_requests' and column_name = 'environment'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ai_approval_requests' and column_name = 'updated_at'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ai_owner_stepup_authorizations' and column_name = 'release_digest'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ai_owner_stepup_authorizations' and column_name = 'environment'
    ) then
    raise exception 'AI03_TSRF_SCHEMA_MISMATCH';
  end if;
end;
$$;

-- Reassert browser isolation and forced RLS on the authoritative TSRF control plane.
alter table public.ai_approval_requests enable row level security;
alter table public.ai_audit_events enable row level security;
alter table public.ai_usage_ledger enable row level security;
alter table public.ai_prompt_versions enable row level security;
alter table public.ai_agent_runtime_state enable row level security;
alter table public.ai_owner_stepup_authorizations enable row level security;

alter table public.ai_approval_requests force row level security;
alter table public.ai_audit_events force row level security;
alter table public.ai_usage_ledger force row level security;
alter table public.ai_prompt_versions force row level security;
alter table public.ai_agent_runtime_state force row level security;
alter table public.ai_owner_stepup_authorizations force row level security;

revoke all on table public.ai_approval_requests from anon, authenticated;
revoke all on table public.ai_audit_events from anon, authenticated;
revoke all on table public.ai_usage_ledger from anon, authenticated;
revoke all on table public.ai_prompt_versions from anon, authenticated;
revoke all on table public.ai_agent_runtime_state from anon, authenticated;
revoke all on table public.ai_owner_stepup_authorizations from anon, authenticated;

-- Preserve fail-safe runtime defaults without mutating any existing runtime row.
alter table public.ai_agent_runtime_state
  alter column enabled set default false,
  alter column shadow_mode set default true,
  alter column kill_switch set default true,
  alter column max_level set default 'L1',
  alter column trust_score set default 0,
  alter column daily_budget_microusd set default 0,
  alter column requests_per_minute set default 0,
  alter column max_concurrency set default 1;

-- Approval requests must enter pending, with database-owned lifecycle time.
create or replace function public.guard_ai_approval_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'AI_APPROVAL_INSERT_MUST_BE_PENDING';
    end if;

    if new.approved_at is not null
      or new.rejected_at is not null
      or new.consumed_at is not null
      or new.revoked_at is not null then
      raise exception 'AI_APPROVAL_INSERT_LIFECYCLE_DIRTY';
    end if;

    if new.expires_at <= v_now or new.expires_at > v_now + interval '15 minutes' then
      raise exception 'AI_APPROVAL_EXPIRY_INVALID';
    end if;

    if octet_length(new.scope::text) > 8192 then
      raise exception 'AI_APPROVAL_SCOPE_TOO_LARGE';
    end if;

    new.created_at := v_now;
    new.updated_at := v_now;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'AI_APPROVAL_DELETE_FORBIDDEN';
  end if;

  if new.id is distinct from old.id
    or new.owner_subject is distinct from old.owner_subject
    or new.requesting_agent is distinct from old.requesting_agent
    or new.action is distinct from old.action
    or new.release_digest is distinct from old.release_digest
    or new.payload_digest is distinct from old.payload_digest
    or new.scope_digest is distinct from old.scope_digest
    or new.environment is distinct from old.environment
    or new.scope is distinct from old.scope
    or new.decision_passport_id is distinct from old.decision_passport_id
    or new.reason is distinct from old.reason
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at then
    raise exception 'AI_APPROVAL_IMMUTABLE_BINDING';
  end if;

  if new.approved_at is distinct from old.approved_at
    or new.rejected_at is distinct from old.rejected_at
    or new.revoked_at is distinct from old.revoked_at
    or new.consumed_at is distinct from old.consumed_at then
    raise exception 'AI_APPROVAL_TIMESTAMP_MUTATION_FORBIDDEN';
  end if;

  if old.status = new.status then
    new.updated_at := v_now;
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('approved', 'rejected', 'expired', 'revoked'))
    or (old.status = 'approved' and new.status in ('consumed', 'expired', 'revoked'))
  ) then
    raise exception 'AI_APPROVAL_INVALID_TRANSITION';
  end if;

  if new.status = 'approved' then
    new.approved_at := v_now;
  elsif new.status = 'rejected' then
    new.rejected_at := v_now;
  elsif new.status = 'revoked' then
    new.revoked_at := v_now;
  elsif new.status = 'consumed' then
    new.consumed_at := v_now;
  end if;

  new.updated_at := v_now;
  return new;
end;
$$;

revoke all on function public.guard_ai_approval_mutation() from public, anon, authenticated;
grant execute on function public.guard_ai_approval_mutation() to service_role;

drop trigger if exists ai_approval_requests_guard on public.ai_approval_requests;
drop trigger if exists ai_approval_requests_mutation_guard on public.ai_approval_requests;
create trigger ai_approval_requests_mutation_guard
before insert or update or delete on public.ai_approval_requests
for each row execute function public.guard_ai_approval_mutation();

-- Remove the legacy caller-clock overload before exposing the hardened RPC.
drop function public.consume_ai_owner_approval(
  uuid, text, text, text, text, text, text, text, timestamptz
);

create or replace function public.consume_ai_owner_approval(
  p_approval_id uuid,
  p_owner_subject text,
  p_agent text,
  p_action text,
  p_release_digest text,
  p_payload_digest text,
  p_scope_digest text,
  p_environment text
)
returns table (ok boolean, reason_code text, approval_id uuid)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_approval public.ai_approval_requests%rowtype;
  v_rows integer := 0;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_approval
  from public.ai_approval_requests
  where id = p_approval_id
  for update;

  if not found then
    return query select false, 'APPROVAL_NOT_FOUND'::text, null::uuid;
    return;
  end if;

  if v_approval.status <> 'approved' then
    return query select false, 'APPROVAL_NOT_ACTIVE'::text, v_approval.id;
    return;
  end if;

  if v_approval.owner_subject <> p_owner_subject
    or v_approval.requesting_agent <> p_agent
    or v_approval.action <> p_action
    or v_approval.release_digest <> p_release_digest
    or v_approval.payload_digest <> p_payload_digest
    or v_approval.scope_digest <> p_scope_digest
    or v_approval.environment <> p_environment then
    return query select false, 'APPROVAL_BINDING_MISMATCH'::text, v_approval.id;
    return;
  end if;

  if v_approval.expires_at <= v_now then
    update public.ai_approval_requests
      set status = 'expired'
      where id = p_approval_id and status = 'approved';
    return query select false, 'APPROVAL_EXPIRED'::text, v_approval.id;
    return;
  end if;

  update public.ai_approval_requests
  set status = 'consumed'
  where id = p_approval_id
    and status = 'approved'
    and owner_subject = p_owner_subject
    and requesting_agent = p_agent
    and action = p_action
    and release_digest = p_release_digest
    and payload_digest = p_payload_digest
    and scope_digest = p_scope_digest
    and environment = p_environment
    and expires_at > v_now;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return query select false, 'APPROVAL_REPLAY_OR_CONFLICT'::text, v_approval.id;
    return;
  end if;

  return query select true, 'APPROVAL_CONSUMED'::text, v_approval.id;
end;
$$;

revoke all on function public.consume_ai_owner_approval(
  uuid, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.consume_ai_owner_approval(
  uuid, text, text, text, text, text, text, text
) to service_role;

-- The owner step-up lease had the same caller-clock weakness. Harden it in place.
create or replace function public.guard_ai_owner_stepup_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
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

  if new.consumed_at is distinct from old.consumed_at
    or new.revoked_at is distinct from old.revoked_at then
    raise exception 'AI_OWNER_STEPUP_TIMESTAMP_MUTATION_FORBIDDEN';
  end if;

  if old.status = new.status then
    new.updated_at := v_now;
    return new;
  end if;

  if not (old.status = 'verified' and new.status in ('consumed', 'revoked', 'expired')) then
    raise exception 'AI_OWNER_STEPUP_INVALID_TRANSITION';
  end if;

  if new.status = 'consumed' then
    new.consumed_at := v_now;
  elsif new.status = 'revoked' then
    new.revoked_at := v_now;
  end if;

  new.updated_at := v_now;
  return new;
end;
$$;

revoke all on function public.guard_ai_owner_stepup_mutation() from public, anon, authenticated;
grant execute on function public.guard_ai_owner_stepup_mutation() to service_role;

drop trigger if exists ai_owner_stepup_mutation_guard on public.ai_owner_stepup_authorizations;
create trigger ai_owner_stepup_mutation_guard
before update or delete on public.ai_owner_stepup_authorizations
for each row execute function public.guard_ai_owner_stepup_mutation();

drop function public.consume_ai_owner_stepup_authorization(
  uuid, text, text, text, text, text, text, numeric, timestamptz
);

create or replace function public.consume_ai_owner_stepup_authorization(
  p_authorization_id uuid,
  p_owner_subject text,
  p_action text,
  p_release_digest text,
  p_payload_digest text,
  p_scope_digest text,
  p_environment text,
  p_requested_rollout_percent numeric default 0
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
  v_now timestamptz := clock_timestamp();
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
  if v_now < v_authorization.not_before then
    return query select false, 'STEPUP_NOT_YET_VALID'::text, v_authorization.id;
    return;
  end if;
  if v_authorization.expires_at <= v_now then
    update public.ai_owner_stepup_authorizations
      set status = 'expired'
      where id = p_authorization_id and status = 'verified';
    return query select false, 'STEPUP_EXPIRED'::text, v_authorization.id;
    return;
  end if;

  update public.ai_owner_stepup_authorizations
  set status = 'consumed'
  where id = p_authorization_id
    and status = 'verified'
    and owner_subject = p_owner_subject
    and action = p_action
    and release_digest = p_release_digest
    and payload_digest = p_payload_digest
    and scope_digest = p_scope_digest
    and environment = p_environment
    and max_rollout_percent >= p_requested_rollout_percent
    and not_before <= v_now
    and expires_at > v_now;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return query select false, 'STEPUP_REPLAY_OR_CONFLICT'::text, v_authorization.id;
    return;
  end if;

  return query select true, 'STEPUP_CONSUMED'::text, v_authorization.id;
end;
$$;

revoke all on function public.consume_ai_owner_stepup_authorization(
  uuid, text, text, text, text, text, text, numeric
) from public, anon, authenticated;
grant execute on function public.consume_ai_owner_stepup_authorization(
  uuid, text, text, text, text, text, text, numeric
) to service_role;

commit;

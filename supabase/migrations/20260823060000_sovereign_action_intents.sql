-- TIGER Sovereign Proof Continuum v2: persistent Action Intent authority.
-- Source-only forward migration. No remote apply is performed by this commit.

begin;

create extension if not exists pgcrypto;

create table if not exists public.sovereign_action_intents (
  intent_id uuid primary key default gen_random_uuid(),
  principal text check (coalesce(length(btrim(principal)) between 1 and 256, false)),
  identity_issuer text check (coalesce(length(btrim(identity_issuer)) between 1 and 512, false)),
  identity_subject text check (coalesce(length(btrim(identity_subject)) between 1 and 256, false)),
  action text check (coalesce(length(btrim(action)) between 1 and 128, false)),
  resource_type text check (coalesce(length(btrim(resource_type)) between 1 and 128, false)),
  resource_id text check (coalesce(length(btrim(resource_id)) between 1 and 256, false)),
  canonical_scope jsonb check (coalesce(jsonb_typeof(canonical_scope) = 'object', false)),
  risk_tier text check (coalesce(risk_tier in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'), false)),
  required_proof_classes text[] default '{}'::text[] check (coalesce(cardinality(required_proof_classes) between 0 and 32, false)),
  policy_version text check (coalesce(length(btrim(policy_version)) between 1 and 128, false)),
  authority_version text check (coalesce(length(btrim(authority_version)) between 1 and 128, false)),
  release_sha text check (coalesce(release_sha ~ '^([0-9a-f]{40}|[0-9a-f]{64})$', false)),
  release_proof_ref text check (coalesce(length(btrim(release_proof_ref)) between 1 and 512, false)),
  request_nonce_digest text check (coalesce(request_nonce_digest ~ '^[0-9a-f]{64}$', false)),
  correlation_id text check (coalesce(length(btrim(correlation_id)) between 1 and 256, false)),
  intent_digest text check (coalesce(intent_digest ~ '^[0-9a-f]{64}$', false)),
  status text default 'PENDING' check (
    coalesce(status in ('PENDING', 'CONFIRMED', 'EXECUTED', 'DENIED', 'EXPIRED', 'CANCELLED'), false)
  ),
  created_at timestamptz check (coalesce(created_at = created_at, false)),
  expires_at timestamptz check (coalesce(expires_at = expires_at, false)),
  finalized_at timestamptz,
  decision_reason_code text check (decision_reason_code is null or length(btrim(decision_reason_code)) between 1 and 256),
  unique (request_nonce_digest),
  unique (correlation_id),
  unique (intent_digest),
  check (coalesce(expires_at > created_at, false))
);

alter table public.sovereign_action_intents enable row level security;
alter table public.sovereign_action_intents force row level security;

revoke all on table public.sovereign_action_intents from public, anon, authenticated;
revoke insert, update, delete on table public.sovereign_action_intents from service_role;

create or replace function public.guard_sovereign_action_intent_mutation()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'SOVEREIGN_ACTION_INTENT_IMMUTABLE';
  end if;

  if old.principal is distinct from new.principal
    or old.identity_issuer is distinct from new.identity_issuer
    or old.identity_subject is distinct from new.identity_subject
    or old.action is distinct from new.action
    or old.resource_type is distinct from new.resource_type
    or old.resource_id is distinct from new.resource_id
    or old.canonical_scope is distinct from new.canonical_scope
    or old.risk_tier is distinct from new.risk_tier
    or old.required_proof_classes is distinct from new.required_proof_classes
    or old.policy_version is distinct from new.policy_version
    or old.authority_version is distinct from new.authority_version
    or old.release_sha is distinct from new.release_sha
    or old.release_proof_ref is distinct from new.release_proof_ref
    or old.request_nonce_digest is distinct from new.request_nonce_digest
    or old.correlation_id is distinct from new.correlation_id
    or old.intent_digest is distinct from new.intent_digest
    or old.created_at is distinct from new.created_at
    or old.expires_at is distinct from new.expires_at then
    raise exception 'SOVEREIGN_ACTION_INTENT_IMMUTABLE';
  end if;

  if old.status = new.status then
    if old.finalized_at is distinct from new.finalized_at
      or old.decision_reason_code is distinct from new.decision_reason_code then
      raise exception 'SOVEREIGN_ACTION_INTENT_IMMUTABLE';
    end if;
    return new;
  end if;

  if old.status = 'PENDING'
    and new.status in ('CONFIRMED', 'DENIED', 'EXPIRED', 'CANCELLED') then
    return new;
  end if;

  if old.status = 'CONFIRMED'
    and new.status in ('EXECUTED', 'DENIED', 'EXPIRED', 'CANCELLED') then
    return new;
  end if;

  raise exception 'SOVEREIGN_ACTION_INTENT_TRANSITION_DENIED';
end;
$$;

revoke all on function public.guard_sovereign_action_intent_mutation() from public, anon, authenticated;

create trigger sovereign_action_intents_immutable_guard
before update or delete on public.sovereign_action_intents -- WHERE scope is each changed row; FOR EACH ROW is the trigger boundary.
for each row execute function public.guard_sovereign_action_intent_mutation();

create or replace function public.create_sovereign_action_intent(
  p_principal text,
  p_identity_issuer text,
  p_identity_subject text,
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_canonical_scope jsonb,
  p_risk_tier text,
  p_required_proof_classes text[],
  p_policy_version text,
  p_authority_version text,
  p_release_sha text,
  p_release_proof_ref text,
  p_request_nonce_digest text,
  p_correlation_id text,
  p_intent_digest text,
  p_expires_at timestamptz
)
returns public.sovereign_action_intents
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
  v_row public.sovereign_action_intents%rowtype;
begin
  if p_expires_at > v_server_now
    and p_expires_at <= v_server_now + interval '120 seconds' then
    null;
  else
    raise exception 'SOVEREIGN_ACTION_INTENT_EXPIRY_DENIED';
  end if;

  insert into public.sovereign_action_intents (
    principal,
    identity_issuer,
    identity_subject,
    action,
    resource_type,
    resource_id,
    canonical_scope,
    risk_tier,
    required_proof_classes,
    policy_version,
    authority_version,
    release_sha,
    release_proof_ref,
    request_nonce_digest,
    correlation_id,
    intent_digest,
    status,
    created_at,
    expires_at
  ) values (
    p_principal,
    p_identity_issuer,
    p_identity_subject,
    p_action,
    p_resource_type,
    p_resource_id,
    p_canonical_scope,
    p_risk_tier,
    p_required_proof_classes,
    p_policy_version,
    p_authority_version,
    p_release_sha,
    p_release_proof_ref,
    p_request_nonce_digest,
    p_correlation_id,
    p_intent_digest,
    'PENDING',
    v_server_now,
    p_expires_at
  ) returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'SOVEREIGN_ACTION_INTENT_REPLAY_OR_DUPLICATE';
end;
$$;

create or replace function public.get_sovereign_action_intent(
  p_intent_id uuid,
  p_principal text
)
returns public.sovereign_action_intents
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_row public.sovereign_action_intents%rowtype;
begin
  select * into v_row
  from public.sovereign_action_intents
  where intent_id = p_intent_id
    and principal = p_principal;

  if not found then
    raise exception 'SOVEREIGN_ACTION_INTENT_NOT_FOUND';
  end if;

  return v_row;
end;
$$;

create or replace function public.finalize_sovereign_action_intent(
  p_intent_id uuid,
  p_principal text,
  p_target_status text,
  p_reason_code text
)
returns public.sovereign_action_intents
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
  v_row public.sovereign_action_intents%rowtype;
begin
  select * into v_row
  from public.sovereign_action_intents
  where intent_id = p_intent_id
    and principal = p_principal
  for update;

  if not found then
    raise exception 'SOVEREIGN_ACTION_INTENT_NOT_FOUND';
  end if;

  if v_row.expires_at <= v_server_now
    and v_row.status in ('PENDING', 'CONFIRMED') then
    update public.sovereign_action_intents set status = 'EXPIRED', finalized_at = v_server_now, decision_reason_code = 'SOVEREIGN_ACTION_INTENT_EXPIRED' where intent_id = p_intent_id returning * into v_row;
    return v_row;
  end if;

  if p_target_status not in ('CONFIRMED', 'EXECUTED', 'DENIED', 'CANCELLED') then
    raise exception 'SOVEREIGN_ACTION_INTENT_TRANSITION_DENIED';
  end if;

  update public.sovereign_action_intents set status = p_target_status, finalized_at = case when p_target_status = 'CONFIRMED' then null else v_server_now end, decision_reason_code = nullif(btrim(p_reason_code), '') where intent_id = p_intent_id returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.expire_sovereign_action_intent(
  p_intent_id uuid,
  p_principal text
)
returns public.sovereign_action_intents
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
  v_row public.sovereign_action_intents%rowtype;
begin
  select * into v_row
  from public.sovereign_action_intents
  where intent_id = p_intent_id
    and principal = p_principal
  for update;

  if not found then
    raise exception 'SOVEREIGN_ACTION_INTENT_NOT_FOUND';
  end if;

  if v_row.status not in ('PENDING', 'CONFIRMED') then
    raise exception 'SOVEREIGN_ACTION_INTENT_TRANSITION_DENIED';
  end if;

  if v_row.expires_at > v_server_now then
    raise exception 'SOVEREIGN_ACTION_INTENT_NOT_EXPIRED';
  end if;

  update public.sovereign_action_intents set status = 'EXPIRED', finalized_at = v_server_now, decision_reason_code = 'SOVEREIGN_ACTION_INTENT_EXPIRED' where intent_id = p_intent_id returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_sovereign_action_intent(text, text, text, text, text, text, jsonb, text, text[], text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_sovereign_action_intent(uuid, text) from public, anon, authenticated;
revoke all on function public.finalize_sovereign_action_intent(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.expire_sovereign_action_intent(uuid, text) from public, anon, authenticated;

grant execute on function public.create_sovereign_action_intent(text, text, text, text, text, text, jsonb, text, text[], text, text, text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.get_sovereign_action_intent(uuid, text) to service_role;
grant execute on function public.finalize_sovereign_action_intent(uuid, text, text, text) to service_role;
grant execute on function public.expire_sovereign_action_intent(uuid, text) to service_role;

commit;

-- TSRF server-time authority hardening.
-- Source only: caller-supplied timestamps must not control security, budget,
-- rate, concurrency, expiry, owner-step-up, or audit decisions.

begin;

-- Remove execution authority from legacy overloads that accept caller time.
revoke execute on function public.consume_ai_owner_stepup_authorization(uuid, text, text, text, text, text, text, numeric, timestamptz) from service_role;
revoke execute on function public.reserve_ai_runtime_capacity(text, text, text, text, text, bigint, timestamptz, integer) from service_role;
revoke execute on function public.settle_ai_runtime_capacity(uuid, bigint, timestamptz) from service_role;
revoke execute on function public.release_ai_runtime_capacity(uuid, timestamptz) from service_role;
revoke execute on function public.expire_ai_runtime_reservations(timestamptz, integer) from service_role;
revoke execute on function public.append_ai_audit_chain_event(text, text, text, text, text, text, text, text, text, jsonb, timestamptz) from service_role;

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
  v_server_now timestamptz := statement_timestamp();
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
  if v_server_now < v_authorization.not_before then
    return query select false, 'STEPUP_NOT_YET_VALID'::text, v_authorization.id;
    return;
  end if;
  if v_authorization.expires_at <= v_server_now then
    update public.ai_owner_stepup_authorizations set status = 'expired', updated_at = v_server_now where id = p_authorization_id and status = 'verified';
    return query select false, 'STEPUP_EXPIRED'::text, v_authorization.id;
    return;
  end if;

  update public.ai_owner_stepup_authorizations set status = 'consumed', consumed_at = v_server_now, updated_at = v_server_now where id = p_authorization_id and status = 'verified' and owner_subject = p_owner_subject and action = p_action and release_digest = p_release_digest and payload_digest = p_payload_digest and scope_digest = p_scope_digest and environment = p_environment and max_rollout_percent >= p_requested_rollout_percent and not_before <= v_server_now and expires_at > v_server_now;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return query select false, 'STEPUP_REPLAY_OR_CONFLICT'::text, v_authorization.id;
    return;
  end if;

  return query select true, 'STEPUP_CONSUMED'::text, v_authorization.id;
end;
$$;

create or replace function public.reserve_ai_runtime_capacity(
  p_actor_subject text,
  p_agent_id text,
  p_correlation_id text,
  p_idempotency_key text,
  p_release_digest text,
  p_estimated_cost_microusd bigint,
  p_ttl_seconds integer default 60
)
returns table (
  ok boolean,
  reason_code text,
  reservation_id uuid,
  max_cost_microusd bigint
)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_runtime public.ai_agent_runtime_state%rowtype;
  v_daily public.ai_runtime_daily_counters%rowtype;
  v_minute_counter public.ai_runtime_minute_counters%rowtype;
  v_concurrency public.ai_runtime_concurrency_counters%rowtype;
  v_existing public.ai_runtime_reservations%rowtype;
  v_reservation_id uuid;
  v_server_now timestamptz := statement_timestamp();
  v_day date := (v_server_now at time zone 'UTC')::date;
  v_minute_bucket timestamptz := date_trunc('minute', v_server_now);
begin
  if p_actor_subject is null or btrim(p_actor_subject) = '' or char_length(p_actor_subject) > 256
    or p_agent_id is null or btrim(p_agent_id) = '' or char_length(p_agent_id) > 128
    or p_correlation_id is null or char_length(btrim(p_correlation_id)) < 8 or char_length(p_correlation_id) > 128
    or p_idempotency_key is null or char_length(btrim(p_idempotency_key)) < 8 or char_length(p_idempotency_key) > 256
    or p_release_digest !~ '^[0-9a-f]{64}$'
    or p_estimated_cost_microusd < 0
    or p_ttl_seconds < 5 or p_ttl_seconds > 900 then
    return query select false, 'RESERVATION_INPUT_INVALID'::text, null::uuid, null::bigint;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_agent_id || ':' || p_idempotency_key, 0));

  select * into v_existing
  from public.ai_runtime_reservations
  where agent_id = p_agent_id and idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing.actor_subject <> p_actor_subject
      or v_existing.correlation_id <> p_correlation_id
      or v_existing.release_digest <> p_release_digest
      or v_existing.estimated_cost_microusd <> p_estimated_cost_microusd then
      return query select false, 'RESERVATION_IDEMPOTENCY_CONFLICT'::text, v_existing.id, null::bigint;
      return;
    end if;
    if v_existing.status = 'reserved' and v_existing.expires_at > v_server_now then
      return query select true, 'RESERVATION_ALREADY_ACTIVE'::text, v_existing.id, v_existing.estimated_cost_microusd;
      return;
    end if;
    return query select false, 'RESERVATION_NOT_REUSABLE'::text, v_existing.id, null::bigint;
    return;
  end if;

  select * into v_runtime
  from public.ai_agent_runtime_state
  where agent_id = p_agent_id
  for update;

  if not found then
    return query select false, 'AGENT_RUNTIME_NOT_FOUND'::text, null::uuid, null::bigint;
    return;
  end if;
  if v_runtime.enabled <> true then
    return query select false, 'AGENT_DISABLED'::text, null::uuid, null::bigint;
    return;
  end if;
  if v_runtime.kill_switch = true then
    return query select false, 'KILL_SWITCH_ACTIVE'::text, null::uuid, null::bigint;
    return;
  end if;
  if v_runtime.max_level = 'L4' then
    return query select false, 'LIVE_L4_NOT_ALLOWED_AT_INFERENCE_BOUNDARY'::text, null::uuid, null::bigint;
    return;
  end if;

  insert into public.ai_runtime_daily_counters (actor_subject, agent_id, day_bucket)
  values (p_actor_subject, p_agent_id, v_day)
  on conflict do nothing;

  select * into v_daily
  from public.ai_runtime_daily_counters
  where actor_subject = p_actor_subject and agent_id = p_agent_id and day_bucket = v_day
  for update;

  insert into public.ai_runtime_minute_counters (actor_subject, agent_id, minute_bucket)
  values (p_actor_subject, p_agent_id, v_minute_bucket)
  on conflict do nothing;

  select * into v_minute_counter
  from public.ai_runtime_minute_counters
  where actor_subject = p_actor_subject and agent_id = p_agent_id and minute_bucket = v_minute_bucket
  for update;

  insert into public.ai_runtime_concurrency_counters (actor_subject, agent_id)
  values (p_actor_subject, p_agent_id)
  on conflict do nothing;

  select * into v_concurrency
  from public.ai_runtime_concurrency_counters
  where actor_subject = p_actor_subject and agent_id = p_agent_id
  for update;

  if v_daily.reserved_cost_microusd + v_daily.settled_cost_microusd + p_estimated_cost_microusd > v_runtime.daily_budget_microusd then
    return query select false, 'BUDGET_EXCEEDED'::text, null::uuid, v_runtime.daily_budget_microusd;
    return;
  end if;
  if v_minute_counter.request_count + 1 > v_runtime.requests_per_minute then
    return query select false, 'RATE_LIMIT_EXCEEDED'::text, null::uuid, null::bigint;
    return;
  end if;
  if v_concurrency.active_count + 1 > v_runtime.max_concurrency then
    return query select false, 'CONCURRENCY_LIMIT_EXCEEDED'::text, null::uuid, null::bigint;
    return;
  end if;

  insert into public.ai_runtime_reservations (
    actor_subject, agent_id, correlation_id, idempotency_key, release_digest,
    estimated_cost_microusd, status, day_bucket, minute_bucket, created_at, expires_at
  ) values (
    p_actor_subject, p_agent_id, p_correlation_id, p_idempotency_key, p_release_digest,
    p_estimated_cost_microusd, 'reserved', v_day, v_minute_bucket, v_server_now,
    v_server_now + make_interval(secs => p_ttl_seconds)
  ) returning id into v_reservation_id;

  update public.ai_runtime_daily_counters set reserved_cost_microusd = reserved_cost_microusd + p_estimated_cost_microusd, reservation_count = reservation_count + 1, updated_at = v_server_now where actor_subject = p_actor_subject and agent_id = p_agent_id and day_bucket = v_day;
  update public.ai_runtime_minute_counters set request_count = request_count + 1, updated_at = v_server_now where actor_subject = p_actor_subject and agent_id = p_agent_id and minute_bucket = v_minute_bucket;
  update public.ai_runtime_concurrency_counters set active_count = active_count + 1, updated_at = v_server_now where actor_subject = p_actor_subject and agent_id = p_agent_id;

  return query select true, 'RESERVED'::text, v_reservation_id, p_estimated_cost_microusd;
end;
$$;

create or replace function public.settle_ai_runtime_capacity(
  p_reservation_id uuid,
  p_actual_cost_microusd bigint
)
returns table (ok boolean, reason_code text)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reservation public.ai_runtime_reservations%rowtype;
  v_server_now timestamptz := statement_timestamp();
begin
  if p_actual_cost_microusd < 0 then
    return query select false, 'ACTUAL_COST_INVALID'::text;
    return;
  end if;

  select * into v_reservation
  from public.ai_runtime_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return query select false, 'RESERVATION_NOT_FOUND'::text;
    return;
  end if;
  if v_reservation.status <> 'reserved' then
    return query select false, 'RESERVATION_NOT_ACTIVE'::text;
    return;
  end if;

  perform 1 from public.ai_runtime_daily_counters where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket for update;
  perform 1 from public.ai_runtime_concurrency_counters where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id for update;

  update public.ai_runtime_reservations set status = 'settled', actual_cost_microusd = p_actual_cost_microusd, settled_at = v_server_now where id = p_reservation_id and status = 'reserved';
  update public.ai_runtime_daily_counters set reserved_cost_microusd = greatest(0, reserved_cost_microusd - v_reservation.estimated_cost_microusd), settled_cost_microusd = settled_cost_microusd + p_actual_cost_microusd, updated_at = v_server_now where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket;
  update public.ai_runtime_concurrency_counters set active_count = greatest(0, active_count - 1), updated_at = v_server_now where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id;

  return query select true, 'SETTLED'::text;
end;
$$;

create or replace function public.release_ai_runtime_capacity(
  p_reservation_id uuid
)
returns table (ok boolean, reason_code text)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reservation public.ai_runtime_reservations%rowtype;
  v_server_now timestamptz := statement_timestamp();
begin
  select * into v_reservation
  from public.ai_runtime_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return query select false, 'RESERVATION_NOT_FOUND'::text;
    return;
  end if;
  if v_reservation.status <> 'reserved' then
    return query select false, 'RESERVATION_NOT_ACTIVE'::text;
    return;
  end if;

  perform 1 from public.ai_runtime_daily_counters where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket for update;
  perform 1 from public.ai_runtime_concurrency_counters where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id for update;

  update public.ai_runtime_reservations set status = 'released', released_at = v_server_now where id = p_reservation_id and status = 'reserved';
  update public.ai_runtime_daily_counters set reserved_cost_microusd = greatest(0, reserved_cost_microusd - v_reservation.estimated_cost_microusd), updated_at = v_server_now where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket;
  update public.ai_runtime_concurrency_counters set active_count = greatest(0, active_count - 1), updated_at = v_server_now where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id;

  return query select true, 'RELEASED'::text;
end;
$$;

create or replace function public.expire_ai_runtime_reservations(
  p_limit integer default 100
)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reservation public.ai_runtime_reservations%rowtype;
  v_expired integer := 0;
  v_server_now timestamptz := statement_timestamp();
begin
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'AI_EXPIRY_LIMIT_INVALID';
  end if;

  for v_reservation in
    select * from public.ai_runtime_reservations
    where status = 'reserved' and expires_at <= v_server_now
    order by expires_at
    limit p_limit
    for update skip locked
  loop
    perform 1 from public.ai_runtime_daily_counters where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket for update;
    perform 1 from public.ai_runtime_concurrency_counters where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id for update;

    update public.ai_runtime_reservations set status = 'expired', expired_at = v_server_now where id = v_reservation.id and status = 'reserved';
    update public.ai_runtime_daily_counters set reserved_cost_microusd = greatest(0, reserved_cost_microusd - v_reservation.estimated_cost_microusd), updated_at = v_server_now where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket;
    update public.ai_runtime_concurrency_counters set active_count = greatest(0, active_count - 1), updated_at = v_server_now where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id;

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;

create or replace function public.append_ai_audit_chain_event(
  p_stream_key text,
  p_previous_hash text,
  p_event_hash text,
  p_release_digest text,
  p_correlation_id text,
  p_actor_subject text,
  p_agent_id text,
  p_decision text,
  p_reason_code text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (ok boolean, reason_code text, sequence_no bigint)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_head public.ai_audit_chain_heads%rowtype;
  v_next_sequence bigint;
  v_server_now timestamptz := statement_timestamp();
begin
  if p_stream_key is null or char_length(btrim(p_stream_key)) < 1 or char_length(p_stream_key) > 256
    or p_release_digest !~ '^[0-9a-f]{64}$'
    or p_event_hash !~ '^[0-9a-f]{64}$'
    or (p_previous_hash is not null and p_previous_hash !~ '^[0-9a-f]{64}$')
    or jsonb_typeof(p_metadata) <> 'object'
    or pg_column_size(p_metadata) > 8192
    or p_metadata ?| array['token', 'password', 'secret', 'authorization', 'rawPrompt', 'raw_prompt'] then
    return query select false, 'AUDIT_EVENT_INVALID'::text, null::bigint;
    return;
  end if;

  insert into public.ai_audit_chain_heads (stream_key)
  values (p_stream_key)
  on conflict do nothing;

  select * into v_head
  from public.ai_audit_chain_heads
  where stream_key = p_stream_key
  for update;

  if v_head.head_hash is distinct from p_previous_hash then
    return query select false, 'AUDIT_PREVIOUS_HASH_MISMATCH'::text, null::bigint;
    return;
  end if;

  v_next_sequence := v_head.sequence_no + 1;

  insert into public.ai_audit_chain_events (
    stream_key, sequence_no, previous_hash, event_hash, release_digest,
    correlation_id, actor_subject, agent_id, decision, reason_code, metadata, created_at
  ) values (
    p_stream_key, v_next_sequence, p_previous_hash, p_event_hash, p_release_digest,
    p_correlation_id, p_actor_subject, p_agent_id, p_decision, p_reason_code, p_metadata, v_server_now
  );

  update public.ai_audit_chain_heads set head_hash = p_event_hash, sequence_no = v_next_sequence, updated_at = v_server_now where stream_key = p_stream_key;

  return query select true, 'AUDIT_APPENDED'::text, v_next_sequence;
end;
$$;

revoke all on function public.consume_ai_owner_stepup_authorization(uuid, text, text, text, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.consume_ai_owner_stepup_authorization(uuid, text, text, text, text, text, text, numeric) to service_role;
revoke all on function public.reserve_ai_runtime_capacity(text, text, text, text, text, bigint, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_runtime_capacity(text, text, text, text, text, bigint, integer) to service_role;
revoke all on function public.settle_ai_runtime_capacity(uuid, bigint) from public, anon, authenticated;
grant execute on function public.settle_ai_runtime_capacity(uuid, bigint) to service_role;
revoke all on function public.release_ai_runtime_capacity(uuid) from public, anon, authenticated;
grant execute on function public.release_ai_runtime_capacity(uuid) to service_role;
revoke all on function public.expire_ai_runtime_reservations(integer) from public, anon, authenticated;
grant execute on function public.expire_ai_runtime_reservations(integer) to service_role;
revoke all on function public.append_ai_audit_chain_event(text, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.append_ai_audit_chain_event(text, text, text, text, text, text, text, text, text, jsonb) to service_role;

commit;

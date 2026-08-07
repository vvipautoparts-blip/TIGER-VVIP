-- TIGER SOVEREIGN AI-13 atomic runtime persistence
-- Apply only through the existing owner-approved local -> preview/staging -> review -> CI -> production pipeline.
-- Browser roles have no direct authority over these tables or functions.

begin;

create table if not exists public.ai_runtime_reservations (
  id uuid primary key default gen_random_uuid(),
  actor_subject text not null,
  agent_id text not null,
  correlation_id text not null,
  estimated_cost_microusd bigint not null,
  actual_cost_microusd bigint,
  status text not null default 'reserved',
  day_bucket date not null,
  minute_bucket timestamptz not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  settled_at timestamptz,
  released_at timestamptz,
  expired_at timestamptz,
  constraint ai_runtime_reservation_cost_check check (estimated_cost_microusd >= 0),
  constraint ai_runtime_actual_cost_check check (actual_cost_microusd is null or actual_cost_microusd >= 0),
  constraint ai_runtime_reservation_status_check check (status in ('reserved', 'settled', 'released', 'expired')),
  constraint ai_runtime_reservation_expiry_check check (expires_at > created_at),
  constraint ai_runtime_reservation_actor_check check (char_length(actor_subject) between 1 and 256),
  constraint ai_runtime_reservation_agent_check check (char_length(agent_id) between 1 and 128),
  constraint ai_runtime_reservation_correlation_check check (char_length(correlation_id) between 8 and 128),
  unique (correlation_id, agent_id)
);

create index if not exists ai_runtime_reservations_expiry_idx
  on public.ai_runtime_reservations (status, expires_at);
create index if not exists ai_runtime_reservations_actor_agent_idx
  on public.ai_runtime_reservations (actor_subject, agent_id, created_at desc);

create table if not exists public.ai_runtime_daily_counters (
  actor_subject text not null,
  agent_id text not null,
  day_bucket date not null,
  reserved_cost_microusd bigint not null default 0,
  settled_cost_microusd bigint not null default 0,
  reservation_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (actor_subject, agent_id, day_bucket),
  constraint ai_runtime_daily_reserved_check check (reserved_cost_microusd >= 0),
  constraint ai_runtime_daily_settled_check check (settled_cost_microusd >= 0),
  constraint ai_runtime_daily_count_check check (reservation_count >= 0)
);

create table if not exists public.ai_runtime_minute_counters (
  actor_subject text not null,
  agent_id text not null,
  minute_bucket timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (actor_subject, agent_id, minute_bucket),
  constraint ai_runtime_minute_count_check check (request_count >= 0)
);

create table if not exists public.ai_runtime_concurrency_counters (
  actor_subject text not null,
  agent_id text not null,
  active_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (actor_subject, agent_id),
  constraint ai_runtime_active_count_check check (active_count >= 0)
);

create table if not exists public.ai_audit_chain_heads (
  stream_key text primary key,
  head_hash text,
  sequence_no bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint ai_audit_chain_head_hash_check check (head_hash is null or head_hash ~ '^[0-9a-f]{64}$'),
  constraint ai_audit_chain_sequence_check check (sequence_no >= 0),
  constraint ai_audit_chain_stream_check check (char_length(stream_key) between 1 and 256)
);

create table if not exists public.ai_audit_chain_events (
  id uuid primary key default gen_random_uuid(),
  stream_key text not null,
  sequence_no bigint not null,
  previous_hash text,
  event_hash text not null,
  correlation_id text not null,
  actor_subject text not null,
  agent_id text not null,
  decision text not null,
  reason_code text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_audit_chain_previous_hash_check check (previous_hash is null or previous_hash ~ '^[0-9a-f]{64}$'),
  constraint ai_audit_chain_event_hash_check check (event_hash ~ '^[0-9a-f]{64}$'),
  constraint ai_audit_chain_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint ai_audit_chain_metadata_size_check check (pg_column_size(metadata) <= 8192),
  constraint ai_audit_chain_metadata_secret_key_check check (
    not (metadata ?| array['token', 'password', 'secret', 'authorization', 'rawPrompt', 'raw_prompt'])
  ),
  constraint ai_audit_chain_sequence_positive_check check (sequence_no > 0),
  constraint ai_audit_chain_event_stream_check check (char_length(stream_key) between 1 and 256),
  constraint ai_audit_chain_event_correlation_check check (char_length(correlation_id) between 8 and 128),
  constraint ai_audit_chain_event_actor_check check (char_length(actor_subject) between 1 and 256),
  constraint ai_audit_chain_event_agent_check check (char_length(agent_id) between 1 and 128),
  constraint ai_audit_chain_event_decision_check check (char_length(decision) between 1 and 64),
  constraint ai_audit_chain_event_reason_check check (char_length(reason_code) between 1 and 128),
  unique (stream_key, sequence_no),
  unique (event_hash)
);

create index if not exists ai_audit_chain_events_correlation_idx
  on public.ai_audit_chain_events (correlation_id, created_at);

alter table public.ai_runtime_reservations enable row level security;
alter table public.ai_runtime_daily_counters enable row level security;
alter table public.ai_runtime_minute_counters enable row level security;
alter table public.ai_runtime_concurrency_counters enable row level security;
alter table public.ai_audit_chain_heads enable row level security;
alter table public.ai_audit_chain_events enable row level security;

revoke all on table public.ai_runtime_reservations from anon, authenticated;
revoke all on table public.ai_runtime_daily_counters from anon, authenticated;
revoke all on table public.ai_runtime_minute_counters from anon, authenticated;
revoke all on table public.ai_runtime_concurrency_counters from anon, authenticated;
revoke all on table public.ai_audit_chain_heads from anon, authenticated;
revoke all on table public.ai_audit_chain_events from anon, authenticated;

grant select, insert, update on table public.ai_runtime_reservations to service_role;
grant select, insert, update on table public.ai_runtime_daily_counters to service_role;
grant select, insert, update on table public.ai_runtime_minute_counters to service_role;
grant select, insert, update on table public.ai_runtime_concurrency_counters to service_role;
grant select, insert, update on table public.ai_audit_chain_heads to service_role;
grant select, insert on table public.ai_audit_chain_events to service_role;

create or replace function public.guard_ai_runtime_reservation_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'AI_RUNTIME_RESERVATION_DELETE_FORBIDDEN';
  end if;

  if new.actor_subject is distinct from old.actor_subject
    or new.agent_id is distinct from old.agent_id
    or new.correlation_id is distinct from old.correlation_id
    or new.estimated_cost_microusd is distinct from old.estimated_cost_microusd
    or new.day_bucket is distinct from old.day_bucket
    or new.minute_bucket is distinct from old.minute_bucket
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at then
    raise exception 'AI_RUNTIME_RESERVATION_IMMUTABLE_BINDING';
  end if;

  if old.status = 'reserved' and new.status in ('settled', 'released', 'expired') then
    return new;
  end if;
  if old.status = new.status then
    return new;
  end if;

  raise exception 'AI_RUNTIME_RESERVATION_INVALID_TRANSITION';
end;
$$;

revoke all on function public.guard_ai_runtime_reservation_mutation() from public, anon, authenticated;
grant execute on function public.guard_ai_runtime_reservation_mutation() to service_role;

drop trigger if exists ai_runtime_reservation_mutation_guard on public.ai_runtime_reservations;
create trigger ai_runtime_reservation_mutation_guard
before update or delete on public.ai_runtime_reservations
for each row execute function public.guard_ai_runtime_reservation_mutation();

create or replace function public.reserve_ai_runtime_capacity(
  p_actor_subject text,
  p_agent_id text,
  p_correlation_id text,
  p_estimated_cost_microusd bigint,
  p_now timestamptz default now(),
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
  v_day date := (p_now at time zone 'UTC')::date;
  v_minute_bucket timestamptz := date_trunc('minute', p_now);
begin
  if p_actor_subject is null or btrim(p_actor_subject) = '' or char_length(p_actor_subject) > 256
    or p_agent_id is null or btrim(p_agent_id) = '' or char_length(p_agent_id) > 128
    or p_correlation_id is null or char_length(btrim(p_correlation_id)) < 8 or char_length(p_correlation_id) > 128
    or p_estimated_cost_microusd < 0
    or p_ttl_seconds < 5 or p_ttl_seconds > 900 then
    return query select false, 'RESERVATION_INPUT_INVALID'::text, null::uuid, null::bigint;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_agent_id || ':' || p_correlation_id, 0));

  select * into v_existing
  from public.ai_runtime_reservations
  where correlation_id = p_correlation_id and agent_id = p_agent_id
  for update;

  if found then
    if v_existing.actor_subject <> p_actor_subject
      or v_existing.estimated_cost_microusd <> p_estimated_cost_microusd then
      return query select false, 'RESERVATION_IDEMPOTENCY_CONFLICT'::text, v_existing.id, null::bigint;
      return;
    end if;
    if v_existing.status = 'reserved' and v_existing.expires_at > p_now then
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
    actor_subject, agent_id, correlation_id, estimated_cost_microusd,
    status, day_bucket, minute_bucket, created_at, expires_at
  ) values (
    p_actor_subject, p_agent_id, p_correlation_id, p_estimated_cost_microusd,
    'reserved', v_day, v_minute_bucket, p_now, p_now + make_interval(secs => p_ttl_seconds)
  ) returning id into v_reservation_id;

  update public.ai_runtime_daily_counters
    set reserved_cost_microusd = reserved_cost_microusd + p_estimated_cost_microusd,
        reservation_count = reservation_count + 1,
        updated_at = p_now
    where actor_subject = p_actor_subject and agent_id = p_agent_id and day_bucket = v_day;

  update public.ai_runtime_minute_counters
    set request_count = request_count + 1, updated_at = p_now
    where actor_subject = p_actor_subject and agent_id = p_agent_id and minute_bucket = v_minute_bucket;

  update public.ai_runtime_concurrency_counters
    set active_count = active_count + 1, updated_at = p_now
    where actor_subject = p_actor_subject and agent_id = p_agent_id;

  return query select true, 'RESERVED'::text, v_reservation_id, p_estimated_cost_microusd;
end;
$$;

create or replace function public.settle_ai_runtime_capacity(
  p_reservation_id uuid,
  p_actual_cost_microusd bigint,
  p_now timestamptz default now()
)
returns table (ok boolean, reason_code text)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reservation public.ai_runtime_reservations%rowtype;
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

  perform 1 from public.ai_runtime_daily_counters
    where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket
    for update;
  perform 1 from public.ai_runtime_concurrency_counters
    where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id
    for update;

  update public.ai_runtime_reservations
    set status = 'settled', actual_cost_microusd = p_actual_cost_microusd, settled_at = p_now
    where id = p_reservation_id and status = 'reserved';

  update public.ai_runtime_daily_counters
    set reserved_cost_microusd = greatest(0, reserved_cost_microusd - v_reservation.estimated_cost_microusd),
        settled_cost_microusd = settled_cost_microusd + p_actual_cost_microusd,
        updated_at = p_now
    where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket;

  update public.ai_runtime_concurrency_counters
    set active_count = greatest(0, active_count - 1), updated_at = p_now
    where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id;

  return query select true, 'SETTLED'::text;
end;
$$;

create or replace function public.release_ai_runtime_capacity(
  p_reservation_id uuid,
  p_now timestamptz default now()
)
returns table (ok boolean, reason_code text)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reservation public.ai_runtime_reservations%rowtype;
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

  perform 1 from public.ai_runtime_daily_counters
    where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket
    for update;
  perform 1 from public.ai_runtime_concurrency_counters
    where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id
    for update;

  update public.ai_runtime_reservations
    set status = 'released', released_at = p_now
    where id = p_reservation_id and status = 'reserved';

  update public.ai_runtime_daily_counters
    set reserved_cost_microusd = greatest(0, reserved_cost_microusd - v_reservation.estimated_cost_microusd),
        updated_at = p_now
    where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket;

  update public.ai_runtime_concurrency_counters
    set active_count = greatest(0, active_count - 1), updated_at = p_now
    where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id;

  return query select true, 'RELEASED'::text;
end;
$$;

create or replace function public.expire_ai_runtime_reservations(
  p_now timestamptz default now(),
  p_limit integer default 100
)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reservation public.ai_runtime_reservations%rowtype;
  v_expired integer := 0;
begin
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'AI_EXPIRY_LIMIT_INVALID';
  end if;

  for v_reservation in
    select * from public.ai_runtime_reservations
    where status = 'reserved' and expires_at <= p_now
    order by expires_at
    limit p_limit
    for update skip locked
  loop
    perform 1 from public.ai_runtime_daily_counters
      where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket
      for update;
    perform 1 from public.ai_runtime_concurrency_counters
      where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id
      for update;

    update public.ai_runtime_reservations
      set status = 'expired', expired_at = p_now
      where id = v_reservation.id and status = 'reserved';

    update public.ai_runtime_daily_counters
      set reserved_cost_microusd = greatest(0, reserved_cost_microusd - v_reservation.estimated_cost_microusd),
          updated_at = p_now
      where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id and day_bucket = v_reservation.day_bucket;

    update public.ai_runtime_concurrency_counters
      set active_count = greatest(0, active_count - 1), updated_at = p_now
      where actor_subject = v_reservation.actor_subject and agent_id = v_reservation.agent_id;

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;

create or replace function public.append_ai_audit_chain_event(
  p_stream_key text,
  p_previous_hash text,
  p_event_hash text,
  p_correlation_id text,
  p_actor_subject text,
  p_agent_id text,
  p_decision text,
  p_reason_code text,
  p_metadata jsonb default '{}'::jsonb,
  p_now timestamptz default now()
)
returns table (ok boolean, reason_code text, sequence_no bigint)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_head public.ai_audit_chain_heads%rowtype;
  v_next_sequence bigint;
begin
  if p_stream_key is null or char_length(btrim(p_stream_key)) < 1 or char_length(p_stream_key) > 256
    or p_correlation_id is null or char_length(btrim(p_correlation_id)) < 8 or char_length(p_correlation_id) > 128
    or p_actor_subject is null or char_length(btrim(p_actor_subject)) < 1 or char_length(p_actor_subject) > 256
    or p_agent_id is null or char_length(btrim(p_agent_id)) < 1 or char_length(p_agent_id) > 128
    or p_decision is null or char_length(btrim(p_decision)) < 1 or char_length(p_decision) > 64
    or p_reason_code is null or char_length(btrim(p_reason_code)) < 1 or char_length(p_reason_code) > 128
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
    stream_key, sequence_no, previous_hash, event_hash, correlation_id,
    actor_subject, agent_id, decision, reason_code, metadata, created_at
  ) values (
    p_stream_key, v_next_sequence, p_previous_hash, p_event_hash, p_correlation_id,
    p_actor_subject, p_agent_id, p_decision, p_reason_code, p_metadata, p_now
  );

  update public.ai_audit_chain_heads
    set head_hash = p_event_hash,
        sequence_no = v_next_sequence,
        updated_at = p_now
    where stream_key = p_stream_key;

  return query select true, 'AUDIT_APPENDED'::text, v_next_sequence;
end;
$$;

-- Chain events are append-only; the guard function is introduced by AI-03.
drop trigger if exists ai_audit_chain_events_append_only_guard on public.ai_audit_chain_events;
create trigger ai_audit_chain_events_append_only_guard
before update or delete on public.ai_audit_chain_events
for each row execute function public.reject_ai_append_only_mutation();

revoke all on function public.reserve_ai_runtime_capacity(text, text, text, bigint, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_runtime_capacity(text, text, text, bigint, timestamptz, integer) to service_role;
revoke all on function public.settle_ai_runtime_capacity(uuid, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.settle_ai_runtime_capacity(uuid, bigint, timestamptz) to service_role;
revoke all on function public.release_ai_runtime_capacity(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.release_ai_runtime_capacity(uuid, timestamptz) to service_role;
revoke all on function public.expire_ai_runtime_reservations(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.expire_ai_runtime_reservations(timestamptz, integer) to service_role;
revoke all on function public.append_ai_audit_chain_event(text, text, text, text, text, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.append_ai_audit_chain_event(text, text, text, text, text, text, text, text, jsonb, timestamptz) to service_role;

commit;

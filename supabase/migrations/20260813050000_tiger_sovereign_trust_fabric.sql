begin;

create table public.ai_approval_requests (
  id uuid primary key default gen_random_uuid(),
  owner_subject text not null check (char_length(owner_subject) between 1 and 255),
  requesting_agent text not null check (
    requesting_agent in (
      'general_manager',
      'technical_manager',
      'financial_analytics_manager',
      'user_assistant'
    )
  ),
  action text not null check (action in ('merge_pr', 'deploy_production', 'change_prices')),
  payload_digest text not null check (payload_digest ~ '^[0-9a-f]{64}$'),
  scope_digest text not null check (scope_digest ~ '^[0-9a-f]{64}$'),
  scope jsonb not null default '{}'::jsonb check (
    jsonb_typeof(scope) = 'object'
    and octet_length(scope::text) <= 8192
  ),
  decision_passport_id uuid,
  reason text check (reason is null or char_length(reason) <= 2048),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'consumed', 'expired', 'revoked')
  ),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  approved_at timestamptz,
  rejected_at timestamptz,
  consumed_at timestamptz,
  expired_at timestamptz,
  revoked_at timestamptz,
  check (
    expires_at > created_at
    and expires_at <= created_at + interval '15 minutes'
  )
);

create index ai_approval_requests_status_expiry_idx
  on public.ai_approval_requests (status, expires_at);
create index ai_approval_requests_owner_created_idx
  on public.ai_approval_requests (owner_subject, created_at desc);

create table public.ai_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  correlation_id text not null check (char_length(correlation_id) between 1 and 255),
  request_id text check (request_id is null or char_length(request_id) <= 255),
  agent_id text not null check (
    agent_id in (
      'general_manager',
      'technical_manager',
      'financial_analytics_manager',
      'user_assistant'
    )
  ),
  provider text check (provider is null or char_length(provider) <= 128),
  model text check (model is null or char_length(model) <= 255),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  cached_input_tokens bigint not null default 0 check (cached_input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  tool_calls integer not null default 0 check (tool_calls >= 0),
  cost_microusd bigint not null default 0 check (cost_microusd >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 8192
  ),
  created_at timestamptz not null default clock_timestamp()
);

create index ai_usage_ledger_agent_created_idx
  on public.ai_usage_ledger (agent_id, created_at desc);
create index ai_usage_ledger_correlation_idx
  on public.ai_usage_ledger (correlation_id);

create table public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null check (
    agent_id in (
      'general_manager',
      'technical_manager',
      'financial_analytics_manager',
      'user_assistant'
    )
  ),
  version text not null check (char_length(version) between 1 and 128),
  prompt_sha256 text not null check (prompt_sha256 ~ '^[0-9a-f]{64}$'),
  prompt_body text not null check (octet_length(prompt_body) between 1 and 262144),
  created_by_subject text not null check (char_length(created_by_subject) between 1 and 255),
  created_at timestamptz not null default clock_timestamp(),
  unique (agent_id, version),
  unique (agent_id, prompt_sha256)
);

create index ai_prompt_versions_agent_created_idx
  on public.ai_prompt_versions (agent_id, created_at desc);

create table public.ai_agent_runtime_state (
  agent_id text primary key check (
    agent_id in (
      'general_manager',
      'technical_manager',
      'financial_analytics_manager',
      'user_assistant'
    )
  ),
  enabled boolean not null default false,
  shadow_mode boolean not null default true,
  kill_switch boolean not null default true,
  max_level text not null default 'L1' check (max_level in ('L1', 'L2', 'L3', 'L4')),
  trust_score numeric(5,2) not null default 0 check (trust_score between 0 and 100),
  daily_budget_microusd bigint not null default 0 check (daily_budget_microusd >= 0),
  requests_per_minute integer not null default 0 check (requests_per_minute >= 0),
  max_concurrency integer not null default 1 check (max_concurrency between 1 and 64),
  config_version bigint not null default 1 check (config_version >= 1),
  updated_by_subject text check (updated_by_subject is null or char_length(updated_by_subject) <= 255),
  updated_at timestamptz not null default clock_timestamp()
);

insert into public.ai_agent_runtime_state (agent_id)
values
  ('general_manager'),
  ('technical_manager'),
  ('financial_analytics_manager'),
  ('user_assistant');

create table public.ai_audit_events (
  id uuid primary key default gen_random_uuid(),
  correlation_id text not null check (char_length(correlation_id) between 1 and 255),
  actor_subject text check (actor_subject is null or char_length(actor_subject) <= 255),
  actor_role text check (actor_role is null or char_length(actor_role) <= 64),
  agent_id text check (agent_id is null or char_length(agent_id) <= 128),
  action text not null check (char_length(action) between 1 and 128),
  decision text not null check (decision in ('ALLOW', 'DENY', 'OWNER_APPROVAL_REQUIRED', 'ERROR')),
  reason_code text not null check (char_length(reason_code) between 1 and 128),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 8192
  ),
  approval_id uuid references public.ai_approval_requests(id) on delete restrict,
  model text check (model is null or char_length(model) <= 255),
  prompt_version_id uuid references public.ai_prompt_versions(id) on delete restrict,
  previous_event_hash text check (
    previous_event_hash is null or previous_event_hash ~ '^[0-9a-f]{64}$'
  ),
  event_hash text not null check (event_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp()
);

create index ai_audit_events_correlation_created_idx
  on public.ai_audit_events (correlation_id, created_at);
create index ai_audit_events_approval_idx
  on public.ai_audit_events (approval_id)
  where approval_id is not null;

alter table public.ai_approval_requests enable row level security;
alter table public.ai_audit_events enable row level security;
alter table public.ai_usage_ledger enable row level security;
alter table public.ai_prompt_versions enable row level security;
alter table public.ai_agent_runtime_state enable row level security;

revoke all on table public.ai_approval_requests from anon, authenticated;
revoke all on table public.ai_audit_events from anon, authenticated;
revoke all on table public.ai_usage_ledger from anon, authenticated;
revoke all on table public.ai_prompt_versions from anon, authenticated;
revoke all on table public.ai_agent_runtime_state from anon, authenticated;

revoke all on table public.ai_approval_requests from public;
revoke all on table public.ai_audit_events from public;
revoke all on table public.ai_usage_ledger from public;
revoke all on table public.ai_prompt_versions from public;
revoke all on table public.ai_agent_runtime_state from public;

grant select, insert, update on table public.ai_approval_requests to service_role;
grant select, insert on table public.ai_audit_events to service_role;
grant select, insert on table public.ai_usage_ledger to service_role;
grant select, insert on table public.ai_prompt_versions to service_role;
grant select, insert, update on table public.ai_agent_runtime_state to service_role;

create or replace function public.reject_ai_append_only_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'AI_APPEND_ONLY_VIOLATION';
end;
$$;

revoke all on function public.reject_ai_append_only_mutation() from public, anon, authenticated;

create trigger ai_audit_events_append_only
before update or delete on public.ai_audit_events
for each row execute function public.reject_ai_append_only_mutation();

create trigger ai_usage_ledger_append_only
before update or delete on public.ai_usage_ledger
for each row execute function public.reject_ai_append_only_mutation();

create trigger ai_prompt_versions_append_only
before update or delete on public.ai_prompt_versions
for each row execute function public.reject_ai_append_only_mutation();

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
       or new.expired_at is not null
       or new.revoked_at is not null then
      raise exception 'AI_APPROVAL_INSERT_LIFECYCLE_DIRTY';
    end if;
    new.created_at := clock_timestamp();
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'AI_APPROVAL_DELETE_FORBIDDEN';
  end if;

  if new.id is distinct from old.id
     or new.owner_subject is distinct from old.owner_subject
     or new.requesting_agent is distinct from old.requesting_agent
     or new.action is distinct from old.action
     or new.payload_digest is distinct from old.payload_digest
     or new.scope_digest is distinct from old.scope_digest
     or new.scope is distinct from old.scope
     or new.decision_passport_id is distinct from old.decision_passport_id
     or new.reason is distinct from old.reason
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at then
    raise exception 'AI_APPROVAL_BINDING_IMMUTABLE';
  end if;

  if new.status is not distinct from old.status then
    if new.approved_at is distinct from old.approved_at
       or new.rejected_at is distinct from old.rejected_at
       or new.consumed_at is distinct from old.consumed_at
       or new.expired_at is distinct from old.expired_at
       or new.revoked_at is distinct from old.revoked_at then
      raise exception 'AI_APPROVAL_LIFECYCLE_TIMESTAMP_IMMUTABLE';
    end if;
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('approved', 'rejected', 'expired', 'revoked'))
    or (old.status = 'approved' and new.status in ('consumed', 'expired', 'revoked'))
  ) then
    raise exception 'AI_APPROVAL_INVALID_TRANSITION';
  end if;

  new.approved_at := old.approved_at;
  new.rejected_at := old.rejected_at;
  new.consumed_at := old.consumed_at;
  new.expired_at := old.expired_at;
  new.revoked_at := old.revoked_at;

  if new.status = 'approved' then
    new.approved_at := v_now;
  elsif new.status = 'rejected' then
    new.rejected_at := v_now;
  elsif new.status = 'consumed' then
    new.consumed_at := v_now;
  elsif new.status = 'expired' then
    new.expired_at := v_now;
  elsif new.status = 'revoked' then
    new.revoked_at := v_now;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_ai_approval_mutation() from public, anon, authenticated;

create trigger ai_approval_requests_guard
before insert or update or delete on public.ai_approval_requests
for each row execute function public.guard_ai_approval_mutation();

create or replace function public.consume_ai_owner_approval(
  p_approval_id uuid,
  p_owner_subject text,
  p_agent text,
  p_action text,
  p_payload_digest text,
  p_scope_digest text
)
returns table (
  ok boolean,
  reason_code text,
  approval_id uuid
)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_row public.ai_approval_requests%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  select *
    into v_row
    from public.ai_approval_requests
   where id = p_approval_id
   for update;

  if not found then
    return query select false, 'APPROVAL_NOT_FOUND'::text, p_approval_id;
    return;
  end if;

  if v_row.status = 'consumed' then
    return query select false, 'APPROVAL_REPLAY'::text, p_approval_id;
    return;
  end if;

  if v_row.status <> 'approved' then
    return query select false, 'APPROVAL_NOT_APPROVED'::text, p_approval_id;
    return;
  end if;

  if v_row.expires_at <= v_now then
    update public.ai_approval_requests set status = 'expired' where id = p_approval_id and status = 'approved';
    return query select false, 'APPROVAL_EXPIRED'::text, p_approval_id;
    return;
  end if;

  if v_row.owner_subject <> p_owner_subject
     or v_row.requesting_agent <> p_agent
     or v_row.action <> p_action
     or v_row.payload_digest <> p_payload_digest
     or v_row.scope_digest <> p_scope_digest then
    return query select false, 'APPROVAL_BINDING_MISMATCH'::text, p_approval_id;
    return;
  end if;

  update public.ai_approval_requests set status = 'consumed'
   where id = p_approval_id
     and owner_subject = p_owner_subject
     and requesting_agent = p_agent
     and action = p_action
     and payload_digest = p_payload_digest
     and scope_digest = p_scope_digest
     and status = 'approved'
     and expires_at > v_now;

  if not found then
    return query select false, 'APPROVAL_REPLAY_OR_CONFLICT'::text, p_approval_id;
    return;
  end if;

  return query select true, 'APPROVAL_CONSUMED'::text, p_approval_id;
end;
$$;

revoke all on function public.consume_ai_owner_approval(uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.consume_ai_owner_approval(uuid, text, text, text, text, text)
  to service_role;

commit;

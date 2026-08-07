-- TIGER SOVEREIGN AI-03 persistent trust fabric
-- REVIEW/APPLY POLICY: this migration must follow the existing owner-approved
-- local -> preview -> BLACKBOX -> GitHub Actions -> owner -> production pipeline.
-- It is intentionally fail-closed for browser roles: privileged trust operations
-- are service-role/server responsibilities only.

begin;

create table if not exists public.ai_approval_requests (
  id uuid primary key default gen_random_uuid(),
  owner_subject text not null,
  requesting_agent text not null,
  action text not null,
  payload_digest text not null,
  scope jsonb not null default '{}'::jsonb,
  decision_passport_id text,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_at timestamptz,
  rejected_at timestamptz,
  revoked_at timestamptz,
  consumed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ai_approval_agent_check check (
    requesting_agent in (
      'general_manager',
      'technical_manager',
      'financial_analytics_manager',
      'user_assistant'
    )
  ),
  constraint ai_approval_action_check check (
    action in ('merge_pr', 'deploy_production', 'change_prices')
  ),
  constraint ai_approval_digest_check check (payload_digest ~ '^[0-9a-f]{64}$'),
  constraint ai_approval_scope_object_check check (jsonb_typeof(scope) = 'object'),
  constraint ai_approval_status_check check (
    status in ('pending', 'approved', 'rejected', 'consumed', 'expired', 'revoked')
  ),
  constraint ai_approval_expiry_check check (expires_at > created_at),
  constraint ai_approval_approved_time_check check (
    (status <> 'approved') or approved_at is not null
  ),
  constraint ai_approval_consumed_time_check check (
    (status <> 'consumed') or consumed_at is not null
  )
);

create index if not exists ai_approval_requests_status_expiry_idx
  on public.ai_approval_requests (status, expires_at);
create index if not exists ai_approval_requests_owner_created_idx
  on public.ai_approval_requests (owner_subject, created_at desc);
create index if not exists ai_approval_requests_payload_idx
  on public.ai_approval_requests (payload_digest);

create table if not exists public.ai_audit_events (
  id uuid primary key default gen_random_uuid(),
  correlation_id text not null,
  actor_subject text not null,
  agent_id text not null,
  action text not null,
  decision text not null,
  reason_code text not null,
  country_code text,
  sector_code text,
  resource text,
  tool_id text,
  approval_id uuid,
  model_id text,
  prompt_version text,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null,
  created_at timestamptz not null default now(),
  constraint ai_audit_decision_check check (
    decision in ('ALLOW', 'DENY', 'OWNER_APPROVAL_REQUIRED', 'ERROR')
  ),
  constraint ai_audit_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint ai_audit_event_hash_check check (event_hash ~ '^[0-9a-f]{64}$'),
  constraint ai_audit_previous_hash_check check (
    previous_hash is null or previous_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint ai_audit_approval_fk foreign key (approval_id)
    references public.ai_approval_requests(id)
    on delete restrict
);

create unique index if not exists ai_audit_events_event_hash_uidx
  on public.ai_audit_events (event_hash);
create index if not exists ai_audit_events_correlation_idx
  on public.ai_audit_events (correlation_id, created_at);
create index if not exists ai_audit_events_created_idx
  on public.ai_audit_events (created_at desc);

create table if not exists public.ai_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  correlation_id text not null,
  actor_subject text not null,
  agent_id text not null,
  provider_id text not null,
  model_id text not null,
  prompt_version text not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cached_input_tokens bigint not null default 0,
  tool_calls integer not null default 0,
  cost_microusd bigint not null default 0,
  latency_ms integer,
  country_code text,
  created_at timestamptz not null default now(),
  constraint ai_usage_input_tokens_check check (input_tokens >= 0),
  constraint ai_usage_output_tokens_check check (output_tokens >= 0),
  constraint ai_usage_cached_tokens_check check (cached_input_tokens >= 0),
  constraint ai_usage_tool_calls_check check (tool_calls >= 0),
  constraint ai_usage_cost_check check (cost_microusd >= 0),
  constraint ai_usage_latency_check check (latency_ms is null or latency_ms >= 0)
);

create index if not exists ai_usage_ledger_actor_created_idx
  on public.ai_usage_ledger (actor_subject, created_at desc);
create index if not exists ai_usage_ledger_agent_created_idx
  on public.ai_usage_ledger (agent_id, created_at desc);
create index if not exists ai_usage_ledger_country_created_idx
  on public.ai_usage_ledger (country_code, created_at desc);

create table if not exists public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id text not null,
  version text not null,
  agent_id text not null,
  prompt_body text not null,
  prompt_checksum text not null,
  status text not null default 'draft',
  created_by text not null,
  created_at timestamptz not null default now(),
  effective_from timestamptz,
  retired_at timestamptz,
  constraint ai_prompt_checksum_check check (prompt_checksum ~ '^[0-9a-f]{64}$'),
  constraint ai_prompt_status_check check (status in ('draft', 'approved', 'active', 'retired')),
  constraint ai_prompt_agent_check check (
    agent_id in (
      'general_manager',
      'technical_manager',
      'financial_analytics_manager',
      'user_assistant'
    )
  ),
  constraint ai_prompt_unique_version unique (prompt_id, version)
);

create index if not exists ai_prompt_versions_lookup_idx
  on public.ai_prompt_versions (prompt_id, status, created_at desc);

create table if not exists public.ai_agent_runtime_state (
  agent_id text primary key,
  enabled boolean not null default false,
  shadow_mode boolean not null default true,
  kill_switch boolean not null default true,
  max_level text not null default 'L1',
  trust_score numeric(5,2) not null default 0,
  daily_budget_microusd bigint not null default 0,
  requests_per_minute integer not null default 0,
  max_concurrency integer not null default 1,
  updated_by text not null default 'SYSTEM_BOOTSTRAP',
  updated_at timestamptz not null default now(),
  constraint ai_runtime_level_check check (max_level in ('L1', 'L2', 'L3', 'L4')),
  constraint ai_runtime_trust_check check (trust_score >= 0 and trust_score <= 100),
  constraint ai_runtime_budget_check check (daily_budget_microusd >= 0),
  constraint ai_runtime_rate_check check (requests_per_minute >= 0),
  constraint ai_runtime_concurrency_check check (max_concurrency between 1 and 20)
);

insert into public.ai_agent_runtime_state (agent_id)
values
  ('general_manager'),
  ('technical_manager'),
  ('financial_analytics_manager'),
  ('user_assistant')
on conflict (agent_id) do nothing;

-- No direct browser authority over the trust fabric.
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

grant select, insert, update on table public.ai_approval_requests to service_role;
grant select, insert on table public.ai_audit_events to service_role;
grant select, insert on table public.ai_usage_ledger to service_role;
grant select, insert on table public.ai_prompt_versions to service_role;
grant select, insert, update on table public.ai_agent_runtime_state to service_role;

create or replace function public.reject_ai_append_only_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'AI_APPEND_ONLY_VIOLATION';
end;
$$;

revoke all on function public.reject_ai_append_only_mutation() from public, anon, authenticated;
grant execute on function public.reject_ai_append_only_mutation() to service_role;

drop trigger if exists ai_audit_events_append_only_guard on public.ai_audit_events;
create trigger ai_audit_events_append_only_guard
before update or delete on public.ai_audit_events
for each row execute function public.reject_ai_append_only_mutation();

drop trigger if exists ai_usage_ledger_append_only_guard on public.ai_usage_ledger;
create trigger ai_usage_ledger_append_only_guard
before update or delete on public.ai_usage_ledger
for each row execute function public.reject_ai_append_only_mutation();

drop trigger if exists ai_prompt_versions_append_only_guard on public.ai_prompt_versions;
create trigger ai_prompt_versions_append_only_guard
before update or delete on public.ai_prompt_versions
for each row execute function public.reject_ai_append_only_mutation();

create or replace function public.guard_ai_approval_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'AI_APPROVAL_DELETE_FORBIDDEN';
  end if;

  if new.owner_subject is distinct from old.owner_subject
    or new.requesting_agent is distinct from old.requesting_agent
    or new.action is distinct from old.action
    or new.payload_digest is distinct from old.payload_digest
    or new.scope is distinct from old.scope
    or new.decision_passport_id is distinct from old.decision_passport_id
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at then
    raise exception 'AI_APPROVAL_IMMUTABLE_BINDING';
  end if;

  if old.status = new.status then
    new.updated_at := now();
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('approved', 'rejected', 'expired', 'revoked'))
    or (old.status = 'approved' and new.status in ('consumed', 'expired', 'revoked'))
  ) then
    raise exception 'AI_APPROVAL_INVALID_TRANSITION';
  end if;

  if new.status = 'approved' and new.approved_at is null then
    new.approved_at := now();
  elsif new.status = 'rejected' and new.rejected_at is null then
    new.rejected_at := now();
  elsif new.status = 'revoked' and new.revoked_at is null then
    new.revoked_at := now();
  elsif new.status = 'consumed' and new.consumed_at is null then
    new.consumed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.guard_ai_approval_mutation() from public, anon, authenticated;
grant execute on function public.guard_ai_approval_mutation() to service_role;

drop trigger if exists ai_approval_requests_mutation_guard on public.ai_approval_requests;
create trigger ai_approval_requests_mutation_guard
before update or delete on public.ai_approval_requests
for each row execute function public.guard_ai_approval_mutation();

create or replace function public.consume_ai_owner_approval(
  p_approval_id uuid,
  p_owner_subject text,
  p_agent text,
  p_action text,
  p_payload_digest text,
  p_now timestamptz default now()
)
returns table (
  ok boolean,
  reason_code text,
  approval_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_approval public.ai_approval_requests%rowtype;
  v_rows integer := 0;
begin
  select *
  into v_approval
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
    or v_approval.action <> p_action then
    return query select false, 'APPROVAL_SCOPE_MISMATCH'::text, v_approval.id;
    return;
  end if;

  if v_approval.payload_digest <> p_payload_digest then
    return query select false, 'PAYLOAD_DIGEST_MISMATCH'::text, v_approval.id;
    return;
  end if;

  if not (v_approval.expires_at >= p_now) then
    update public.ai_approval_requests
      set status = 'expired', updated_at = p_now
      where id = p_approval_id and status = 'approved';
    return query select false, 'APPROVAL_EXPIRED'::text, v_approval.id;
    return;
  end if;

  update public.ai_approval_requests
    set status = 'consumed', consumed_at = p_now, updated_at = p_now
    where id = p_approval_id
      and status = 'approved'
      and owner_subject = p_owner_subject
      and requesting_agent = p_agent
      and action = p_action
      and payload_digest = p_payload_digest
      and expires_at >= p_now;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return query select false, 'APPROVAL_REPLAY_OR_CONFLICT'::text, v_approval.id;
    return;
  end if;

  return query select true, 'APPROVAL_CONSUMED'::text, v_approval.id;
end;
$$;

revoke all on function public.consume_ai_owner_approval(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_ai_owner_approval(uuid, text, text, text, text, timestamptz) to service_role;

commit;

-- TSRF server-time authority hardening.
-- Source only: callers cannot select the timestamp used for owner step-up,
-- budgets, rate limits, concurrency, expiry, reservation lifecycle, or audit time.
-- Secure overloads preserve the reviewed historical business logic by passing
-- database-owned statement time into the legacy implementation internally.

begin;

-- The legacy caller-time overloads remain historical compatibility artifacts,
-- but service_role can no longer invoke them directly.
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
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
begin
  return query
  select * from public.consume_ai_owner_stepup_authorization(
    p_authorization_id,
    p_owner_subject,
    p_action,
    p_release_digest,
    p_payload_digest,
    p_scope_digest,
    p_environment,
    p_requested_rollout_percent,
    v_server_now
  );
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
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
begin
  return query
  select * from public.reserve_ai_runtime_capacity(
    p_actor_subject,
    p_agent_id,
    p_correlation_id,
    p_idempotency_key,
    p_release_digest,
    p_estimated_cost_microusd,
    v_server_now,
    p_ttl_seconds
  );
end;
$$;

create or replace function public.settle_ai_runtime_capacity(
  p_reservation_id uuid,
  p_actual_cost_microusd bigint
)
returns table (ok boolean, reason_code text)
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
begin
  return query
  select * from public.settle_ai_runtime_capacity(
    p_reservation_id,
    p_actual_cost_microusd,
    v_server_now
  );
end;
$$;

create or replace function public.release_ai_runtime_capacity(
  p_reservation_id uuid
)
returns table (ok boolean, reason_code text)
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
begin
  return query
  select * from public.release_ai_runtime_capacity(
    p_reservation_id,
    v_server_now
  );
end;
$$;

create or replace function public.expire_ai_runtime_reservations(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
begin
  return public.expire_ai_runtime_reservations(v_server_now, p_limit);
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
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
begin
  return query
  select * from public.append_ai_audit_chain_event(
    p_stream_key,
    p_previous_hash,
    p_event_hash,
    p_release_digest,
    p_correlation_id,
    p_actor_subject,
    p_agent_id,
    p_decision,
    p_reason_code,
    p_metadata,
    v_server_now
  );
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

-- Unified Authorization Runtime Bridge: sensitive action lease runtime.
-- Source-only forward hardening. Execution authority is database-issued,
-- database-time bounded, policy-bound, and serialized against grant revocation.

begin;

-- Remove direct service-role access to the lower-level lease RPCs. The new
-- wrappers below are the only service-role entry points for sensitive actions.
revoke execute on function public.create_sensitive_permission_lease(uuid, text, text, jsonb, text[], text[], text[], text, timestamptz, timestamptz, text) from service_role;
revoke execute on function public.consume_sensitive_permission_lease(uuid, text, text, jsonb, text[], text[], text[], text) from service_role;

create or replace function public.revoke_sensitive_permission_grant(
  p_grant_id uuid,
  p_actor text,
  p_reason text,
  p_audit_evidence_ref text
)
returns boolean
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_grant public.sensitive_permission_grants%rowtype;
  v_server_now timestamptz := statement_timestamp();
begin
  select * into v_grant
  from public.sensitive_permission_grants
  where id = p_grant_id
  for update;

  if not found
    or not public.sensitive_permission_grant_is_active(p_grant_id, v_server_now) then
    return false;
  end if;

  insert into public.sensitive_permission_grant_events (
    grant_id, event_type, actor, reason, audit_evidence_ref, occurred_at
  ) values (
    p_grant_id, 'REVOKED', p_actor, p_reason, p_audit_evidence_ref, v_server_now
  );

  update public.sensitive_permission_leases set status = 'REVOKED', revoked_at = v_server_now, updated_at = v_server_now where grant_id = p_grant_id and status = 'ISSUED';
  return true;
end;
$$;

create or replace function public.issue_sensitive_action_lease(
  p_grant_id uuid,
  p_principal text,
  p_action text,
  p_resource_scope jsonb,
  p_sector_scope text[],
  p_entity_scope text[],
  p_geo_policy_scope text[],
  p_nonce_hash text,
  p_policy_version text,
  p_audit_evidence_ref text
)
returns table (
  ok boolean,
  reason_code text,
  lease_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_grant public.sensitive_permission_grants%rowtype;
  v_server_now timestamptz := statement_timestamp();
  v_expires_at timestamptz;
  v_lease_id uuid;
begin
  select * into v_grant
  from public.sensitive_permission_grants
  where id = p_grant_id
  for share;

  if not found
    or not public.sensitive_permission_grant_is_active(p_grant_id, v_server_now) then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_grant.principal <> p_principal
    or v_grant.action <> p_action then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_BINDING_MISMATCH'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_grant.policy_version <> p_policy_version then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_POLICY_MISMATCH'::text, null::uuid, null::timestamptz;
    return;
  end if;

  v_expires_at := least(v_grant.expires_at, v_server_now + interval '60 seconds');
  if v_expires_at <= v_server_now then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE'::text, null::uuid, null::timestamptz;
    return;
  end if;

  begin
    v_lease_id := public.create_sensitive_permission_lease(
      p_grant_id,
      p_principal,
      p_action,
      p_resource_scope,
      p_sector_scope,
      p_entity_scope,
      p_geo_policy_scope,
      p_nonce_hash,
      v_server_now,
      v_expires_at,
      p_audit_evidence_ref
    );
  exception
    when others then
      if sqlerrm like '%SENSITIVE_PERMISSION_LEASE_SCOPE_DENIED%' then
        return query select false, 'SENSITIVE_PERMISSION_LEASE_SCOPE_DENIED'::text, null::uuid, null::timestamptz;
        return;
      elsif sqlerrm like '%SENSITIVE_PERMISSION_LEASE_DENIED%' then
        return query select false, 'SENSITIVE_PERMISSION_LEASE_DENIED'::text, null::uuid, null::timestamptz;
        return;
      end if;
      raise;
  end;

  return query select true, 'SENSITIVE_ACTION_LEASE_ISSUED'::text, v_lease_id, v_expires_at;
end;
$$;

create or replace function public.consume_sensitive_action_lease(
  p_lease_id uuid,
  p_principal text,
  p_action text,
  p_resource_scope jsonb,
  p_sector_scope text[],
  p_entity_scope text[],
  p_geo_policy_scope text[],
  p_nonce_hash text,
  p_policy_version text
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
  v_server_now timestamptz := statement_timestamp();
  v_grant public.sensitive_permission_grants%rowtype;
  v_grant_id uuid;
begin
  select lease_row.grant_id into v_grant_id
  from public.sensitive_permission_leases as lease_row
  where lease_row.id = p_lease_id;

  if not found then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_NOT_FOUND'::text, null::uuid;
    return;
  end if;

  select * into v_grant
  from public.sensitive_permission_grants
  where id = v_grant_id;

  if not found
    or not public.sensitive_permission_grant_is_active(v_grant_id, v_server_now) then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE'::text, p_lease_id;
    return;
  end if;

  if v_grant.policy_version <> p_policy_version then
    return query select false, 'SENSITIVE_PERMISSION_LEASE_POLICY_MISMATCH'::text, p_lease_id;
    return;
  end if;

  return query
  select result.ok,
         case
           when result.ok and result.reason_code = 'SENSITIVE_PERMISSION_LEASE_CONSUMED'
             then 'SENSITIVE_ACTION_LEASE_CONSUMED'::text
           else result.reason_code
         end,
         result.lease_id
  from public.consume_sensitive_permission_lease(
    p_lease_id,
    p_principal,
    p_action,
    p_resource_scope,
    p_sector_scope,
    p_entity_scope,
    p_geo_policy_scope,
    p_nonce_hash
  ) as result;
end;
$$;

revoke all on function public.issue_sensitive_action_lease(uuid, text, text, jsonb, text[], text[], text[], text, text, text) from public, anon, authenticated;
revoke all on function public.consume_sensitive_action_lease(uuid, text, text, jsonb, text[], text[], text[], text, text) from public, anon, authenticated;

grant execute on function public.issue_sensitive_action_lease(uuid, text, text, jsonb, text[], text[], text[], text, text, text) to service_role;
grant execute on function public.consume_sensitive_action_lease(uuid, text, text, jsonb, text[], text[], text[], text, text) to service_role;

commit;

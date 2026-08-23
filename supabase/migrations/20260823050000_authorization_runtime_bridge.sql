-- Unified Authorization Runtime Bridge: capability snapshot resolver.
-- Source-only forward migration. This file does not apply itself to any remote environment.

begin;

create or replace function public.resolve_authorization_snapshot(
  p_authenticated_principal text,
  p_target_id text,
  p_surface text,
  p_resource_scope jsonb,
  p_sector_scope text[],
  p_entity_scope text[],
  p_geo_policy_scope text[],
  p_policy_version text
)
returns table (
  capability_id text,
  scope_projection jsonb,
  expires_at timestamptz
)
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_server_now timestamptz := statement_timestamp();
begin
  if nullif(btrim(p_authenticated_principal), '') is null
    or nullif(btrim(p_target_id), '') is null
    or nullif(btrim(p_surface), '') is null
    or nullif(btrim(p_policy_version), '') is null then
    raise exception 'AUTHORIZATION_SNAPSHOT_REQUIRED_FIELD_MISSING';
  end if;

  if p_surface <> 'PROFILE_MORE_MENU' then
    raise exception 'AUTHORIZATION_SNAPSHOT_SURFACE_UNSUPPORTED';
  end if;

  if p_sector_scope is null
    or p_entity_scope is null
    or p_geo_policy_scope is null
    or cardinality(p_sector_scope) = 0
    or cardinality(p_entity_scope) = 0
    or cardinality(p_geo_policy_scope) = 0
    or '*' = any (p_sector_scope)
    or '*' = any (p_entity_scope)
    or '*' = any (p_geo_policy_scope)
    or not public.sensitive_resource_scope_is_bounded(p_resource_scope, false) then
    raise exception 'AUTHORIZATION_SNAPSHOT_SCOPE_INVALID';
  end if;

  if p_resource_scope ->> 'kind' <> 'profile'
    or jsonb_array_length(p_resource_scope -> 'ids') <> 1
    or not (p_resource_scope -> 'ids' @> jsonb_build_array(p_target_id))
    or not (p_target_id = any (p_entity_scope)) then
    raise exception 'AUTHORIZATION_SNAPSHOT_TARGET_SCOPE_MISMATCH';
  end if;

  return query
  select
    grant_row.action as capability_id,
    jsonb_build_object(
      'resource_scope', p_resource_scope,
      'sector_scope', to_jsonb(p_sector_scope),
      'entity_scope', to_jsonb(p_entity_scope),
      'geo_policy_scope', to_jsonb(p_geo_policy_scope)
    ) as scope_projection,
    grant_row.expires_at
  from public.sensitive_permission_grants as grant_row
  where grant_row.principal = p_authenticated_principal
    and grant_row.policy_version = p_policy_version
    and grant_row.action in ('VIEW_PERMISSION_STATE', 'GRANT_PERMISSION')
    and grant_row.not_before <= v_server_now
    and grant_row.expires_at > v_server_now
    and public.sensitive_resource_scope_is_subset(p_resource_scope, grant_row.resource_scope)
    and public.sensitive_text_array_is_subset(p_sector_scope, grant_row.sector_scope)
    and public.sensitive_text_array_is_subset(p_entity_scope, grant_row.entity_scope)
    and public.sensitive_text_array_is_subset(p_geo_policy_scope, grant_row.geo_policy_scope)
    and exists (
      select 1
      from public.sensitive_permission_grant_events as granted_event
      where granted_event.grant_id = grant_row.id
        and granted_event.event_type = 'GRANTED'
        and granted_event.occurred_at <= v_server_now
    )
    and not exists (
      select 1
      from public.sensitive_permission_grant_events as terminal_event
      where terminal_event.grant_id = grant_row.id
        and terminal_event.event_type in ('REVOKED', 'EXPIRED')
        and terminal_event.occurred_at <= v_server_now
    )
  order by grant_row.action;
end;
$$;

revoke all on function public.resolve_authorization_snapshot(text, text, text, jsonb, text[], text[], text[], text) from public, anon, authenticated;
grant execute on function public.resolve_authorization_snapshot(text, text, text, jsonb, text[], text[], text[], text) to service_role;

commit;

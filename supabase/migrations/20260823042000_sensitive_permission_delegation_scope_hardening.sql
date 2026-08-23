-- Sensitive-permission delegation authority hardening.
-- Source only: a delegability ceiling may restrict a grant, never enlarge it.

begin;

create or replace function public.guard_sensitive_permission_delegability_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_ceiling_expires_at timestamptz;
begin
  begin
    v_ceiling_expires_at := (new.delegability_ceiling ->> 'expires_at')::timestamptz;
  exception when others then
    raise exception 'SENSITIVE_PERMISSION_DELEGABILITY_CEILING_EXCEEDS_GRANT_SCOPE';
  end;

  if v_ceiling_expires_at > new.expires_at
    or not public.sensitive_text_array_is_subset(
      public.sensitive_jsonb_text_array(new.delegability_ceiling -> 'sector_scope'),
      new.sector_scope
    )
    or not public.sensitive_text_array_is_subset(
      public.sensitive_jsonb_text_array(new.delegability_ceiling -> 'entity_scope'),
      new.entity_scope
    )
    or not public.sensitive_text_array_is_subset(
      public.sensitive_jsonb_text_array(new.delegability_ceiling -> 'geo_policy_scope'),
      new.geo_policy_scope
    )
    or not public.sensitive_resource_scope_is_subset(
      new.delegability_ceiling -> 'resource_scope',
      new.resource_scope
    ) then
    raise exception 'SENSITIVE_PERMISSION_DELEGABILITY_CEILING_EXCEEDS_GRANT_SCOPE';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_sensitive_permission_delegability_scope() from public, anon, authenticated;
grant execute on function public.guard_sensitive_permission_delegability_scope() to service_role;

create trigger sensitive_permission_delegability_scope_guard
before insert on public.sensitive_permission_grants
for each row execute function public.guard_sensitive_permission_delegability_scope();

commit;

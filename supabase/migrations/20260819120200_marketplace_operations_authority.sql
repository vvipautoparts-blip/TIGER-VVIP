-- Protected Marketplace operations for country/sector activation and moderation evidence.
begin;

grant select on table public.vvip_marketplace_listing_audit to service_role;
grant select,update on table public.vvip_marketplace_reports to service_role;

create or replace function public.vvip_marketplace_set_country_seal(
  p_country_code text,
  p_activation_state text,
  p_seal_status text,
  p_seal_version text,
  p_legal_entity_country text,
  p_data_residency_region text
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $f$
begin
  if upper(p_country_code) !~ '^[A-Z]{2}$' then raise exception 'MARKETPLACE_COUNTRY_INVALID'; end if;
  if p_activation_state not in ('blocked','draft','active','suspended') then raise exception 'MARKETPLACE_COUNTRY_STATE_INVALID'; end if;
  if p_seal_status not in ('UNSEALED','SEALED','REVOKED') then raise exception 'MARKETPLACE_SEAL_STATUS_INVALID'; end if;
  if p_activation_state='active' and (p_seal_status<>'SEALED' or not public.vvip_country_launch_ready(p_country_code)) then
    raise exception 'MARKETPLACE_COUNTRY_LEGAL_GATE_REQUIRED';
  end if;
  insert into public.vvip_country_authority_seals(country_code,activation_state,seal_status,seal_version,legal_entity_country,data_residency_region,updated_at)
  values(upper(p_country_code),p_activation_state,p_seal_status,p_seal_version,upper(p_legal_entity_country),p_data_residency_region,statement_timestamp())
  on conflict(country_code) do update set activation_state=excluded.activation_state,seal_status=excluded.seal_status,seal_version=excluded.seal_version,legal_entity_country=excluded.legal_entity_country,data_residency_region=excluded.data_residency_region,updated_at=statement_timestamp();
  return jsonb_build_object('ok',true,'country',upper(p_country_code),'active',vvip_private.vvip_marketplace_country_is_active(p_country_code));
end;$f$;

create or replace function public.vvip_marketplace_set_sector_activation(
  p_country_code text,
  p_sector text,
  p_activation_state text
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $f$
begin
  if p_activation_state not in ('blocked','active','suspended') then raise exception 'MARKETPLACE_SECTOR_STATE_INVALID'; end if;
  if not exists(select 1 from public.vvip_marketplace_sector_catalog s where s.sector_code=p_sector and s.active) then raise exception 'MARKETPLACE_SECTOR_INVALID'; end if;
  if p_activation_state='active' and not vvip_private.vvip_marketplace_country_is_active(p_country_code) then raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE'; end if;
  insert into public.vvip_marketplace_country_sector_activation(country_code,sector_code,activation_state,updated_at)
  values(upper(p_country_code),p_sector,p_activation_state,statement_timestamp())
  on conflict(country_code,sector_code) do update set activation_state=excluded.activation_state,updated_at=statement_timestamp();
  return jsonb_build_object('ok',true,'country',upper(p_country_code),'sector',p_sector,'state',p_activation_state);
end;$f$;

revoke all on function public.vvip_marketplace_set_country_seal(text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.vvip_marketplace_set_sector_activation(text,text,text) from public,anon,authenticated;
grant execute on function public.vvip_marketplace_set_country_seal(text,text,text,text,text,text) to service_role;
grant execute on function public.vvip_marketplace_set_sector_activation(text,text,text) to service_role;

commit;

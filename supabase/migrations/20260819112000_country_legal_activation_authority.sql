-- VVIP TIGER country legal activation authority. Fail closed by default.
begin;

create table public.vvip_country_legal_evidence (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  activation_state text not null default 'blocked' check (activation_state in ('blocked','draft','active','suspended')),
  privacy_version text, privacy_uri text,
  terms_version text, terms_uri text,
  cookies_version text, cookies_uri text,
  consent_version text, consent_uri text,
  delete_account_verified boolean not null default false,
  legal_approved boolean not null default false,
  tax_configured boolean not null default false,
  data_residency_ready boolean not null default false,
  legal_entity_country text,
  data_residency_region text,
  last_changed_by text not null default current_user,
  updated_at timestamptz not null default statement_timestamp(),
  check (activation_state <> 'active' or (
    nullif(btrim(privacy_version),'') is not null and nullif(btrim(privacy_uri),'') is not null and
    nullif(btrim(terms_version),'') is not null and nullif(btrim(terms_uri),'') is not null and
    nullif(btrim(cookies_version),'') is not null and nullif(btrim(cookies_uri),'') is not null and
    nullif(btrim(consent_version),'') is not null and nullif(btrim(consent_uri),'') is not null and
    delete_account_verified and legal_approved and tax_configured and data_residency_ready and
    nullif(btrim(legal_entity_country),'') is not null and nullif(btrim(data_residency_region),'') is not null
  ))
);

create table public.vvip_country_activation_audit (
  audit_id uuid primary key default gen_random_uuid(),
  country_code text not null,
  previous_state text,
  new_state text not null,
  evidence_snapshot jsonb not null,
  changed_by text not null,
  created_at timestamptz not null default statement_timestamp()
);

alter table public.vvip_country_legal_evidence enable row level security;
alter table public.vvip_country_legal_evidence force row level security;
alter table public.vvip_country_activation_audit enable row level security;
alter table public.vvip_country_activation_audit force row level security;
revoke all privileges on table public.vvip_country_legal_evidence from public,anon,authenticated;
revoke all privileges on table public.vvip_country_activation_audit from public,anon,authenticated;
grant select on table public.vvip_country_legal_evidence to anon,authenticated;
grant select on table public.vvip_country_activation_audit to service_role;
create policy vvip_country_active_legal_metadata_read on public.vvip_country_legal_evidence for select to anon,authenticated using (activation_state='active');

create function public.vvip_country_reject_audit_mutation() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $f$
begin raise exception 'COUNTRY_ACTIVATION_AUDIT_APPEND_ONLY'; end;$f$;
create trigger vvip_country_activation_audit_append_only before update or delete on public.vvip_country_activation_audit for each row execute function public.vvip_country_reject_audit_mutation();

create function public.vvip_country_write_activation_audit() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $f$
begin
 insert into public.vvip_country_activation_audit(country_code,previous_state,new_state,evidence_snapshot,changed_by)
 values(new.country_code,case when tg_op='INSERT' then null else old.activation_state end,new.activation_state,to_jsonb(new)-'last_changed_by',new.last_changed_by);
 return new;
end;$f$;
create trigger vvip_country_activation_audit_write after insert or update on public.vvip_country_legal_evidence for each row execute function public.vvip_country_write_activation_audit();

insert into public.vvip_country_legal_evidence(country_code,activation_state,last_changed_by) values('JO','blocked','bootstrap:owner-authority') on conflict(country_code) do nothing;

create function public.vvip_country_launch_ready(p_country_code text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $f$
 select exists(select 1 from public.vvip_country_legal_evidence e where e.country_code=upper(p_country_code) and e.activation_state='active' and
 nullif(btrim(e.privacy_version),'') is not null and nullif(btrim(e.privacy_uri),'') is not null and
 nullif(btrim(e.terms_version),'') is not null and nullif(btrim(e.terms_uri),'') is not null and
 nullif(btrim(e.cookies_version),'') is not null and nullif(btrim(e.cookies_uri),'') is not null and
 nullif(btrim(e.consent_version),'') is not null and nullif(btrim(e.consent_uri),'') is not null and
 e.delete_account_verified and e.legal_approved and e.tax_configured and e.data_residency_ready and
 nullif(btrim(e.legal_entity_country),'') is not null and nullif(btrim(e.data_residency_region),'') is not null);
$f$;

create function public.vvip_country_activate(
 p_country_code text,p_privacy_version text,p_privacy_uri text,p_terms_version text,p_terms_uri text,
 p_cookies_version text,p_cookies_uri text,p_consent_version text,p_consent_uri text,
 p_delete_account_verified boolean,p_legal_approved boolean,p_tax_configured boolean,p_data_residency_ready boolean,
 p_legal_entity_country text,p_data_residency_region text,p_changed_by text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $f$
begin
 if not coalesce(p_delete_account_verified,false) or not coalesce(p_legal_approved,false) or not coalesce(p_tax_configured,false) or not coalesce(p_data_residency_ready,false) then raise exception 'COUNTRY_LEGAL_GATES_INCOMPLETE'; end if;
 if nullif(btrim(p_privacy_version),'') is null or nullif(btrim(p_privacy_uri),'') is null or nullif(btrim(p_terms_version),'') is null or nullif(btrim(p_terms_uri),'') is null or nullif(btrim(p_cookies_version),'') is null or nullif(btrim(p_cookies_uri),'') is null or nullif(btrim(p_consent_version),'') is null or nullif(btrim(p_consent_uri),'') is null or nullif(btrim(p_legal_entity_country),'') is null or nullif(btrim(p_data_residency_region),'') is null or nullif(btrim(p_changed_by),'') is null then raise exception 'COUNTRY_LEGAL_EVIDENCE_INCOMPLETE'; end if;
 insert into public.vvip_country_legal_evidence(country_code,activation_state,privacy_version,privacy_uri,terms_version,terms_uri,cookies_version,cookies_uri,consent_version,consent_uri,delete_account_verified,legal_approved,tax_configured,data_residency_ready,legal_entity_country,data_residency_region,last_changed_by,updated_at)
 values(upper(p_country_code),'active',p_privacy_version,p_privacy_uri,p_terms_version,p_terms_uri,p_cookies_version,p_cookies_uri,p_consent_version,p_consent_uri,true,true,true,true,upper(p_legal_entity_country),p_data_residency_region,p_changed_by,statement_timestamp())
 on conflict(country_code) do update set activation_state='active',privacy_version=excluded.privacy_version,privacy_uri=excluded.privacy_uri,terms_version=excluded.terms_version,terms_uri=excluded.terms_uri,cookies_version=excluded.cookies_version,cookies_uri=excluded.cookies_uri,consent_version=excluded.consent_version,consent_uri=excluded.consent_uri,delete_account_verified=true,legal_approved=true,tax_configured=true,data_residency_ready=true,legal_entity_country=excluded.legal_entity_country,data_residency_region=excluded.data_residency_region,last_changed_by=excluded.last_changed_by,updated_at=statement_timestamp();
 return jsonb_build_object('ok',public.vvip_country_launch_ready(p_country_code),'country',upper(p_country_code));
end;$f$;

create or replace function public.vvip_ad_country_payment_active(p_country_code text,p_currency_code text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $f$
 select public.vvip_country_launch_ready(p_country_code) and exists(select 1 from public.vvip_ad_country_payment_profiles p where p.country_code=upper(p_country_code) and p.currency_code=upper(p_currency_code) and p.activation_state='active' and p.provider_contract_verified and p.settlement_verified and p.refund_rules_verified and p.chargeback_rules_verified and p.live_webhook_verified);
$f$;

revoke all on function public.vvip_country_reject_audit_mutation() from public,anon,authenticated;
revoke all on function public.vvip_country_write_activation_audit() from public,anon,authenticated;
revoke all on function public.vvip_country_launch_ready(text) from public,anon,authenticated;
revoke all on function public.vvip_country_activate(text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,text,text,text) from public,anon,authenticated;
revoke all on function public.vvip_ad_country_payment_active(text,text) from public,anon,authenticated;
grant execute on function public.vvip_country_launch_ready(text) to anon,authenticated,service_role;
grant execute on function public.vvip_country_activate(text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,text,text,text) to service_role;
commit;

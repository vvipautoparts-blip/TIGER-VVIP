-- VVIP TIGER owner observability authority.
-- Service-only ingestion; immutable events/samples; protected incident lifecycle and owner snapshot.
begin;

create table public.vvip_observability_events (
  event_id uuid primary key default gen_random_uuid(),
  source_kind text not null check(source_kind in ('application','database','edge','security','payment','marketplace','social','app_crash','worker')),
  severity text not null check(severity in ('DEBUG','INFO','WARN','ERROR','CRITICAL')),
  event_code text not null check(length(event_code) between 2 and 120),
  environment text not null check(environment in ('dev','staging','production')),
  country_code text check(country_code is null or country_code ~ '^[A-Z]{2}$'),
  correlation_id text,
  actor_subject text,
  message text not null check(length(message) between 1 and 2000),
  attributes jsonb not null default '{}'::jsonb check(jsonb_typeof(attributes)='object' and octet_length(attributes::text)<=16384),
  occurred_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp()
);
create index vvip_observability_events_time_idx on public.vvip_observability_events(environment,severity,occurred_at desc);
create index vvip_observability_events_code_idx on public.vvip_observability_events(event_code,occurred_at desc);

create table public.vvip_observability_incidents (
  incident_id uuid primary key default gen_random_uuid(),
  incident_key text not null unique,
  severity text not null check(severity in ('WARN','ERROR','CRITICAL')),
  status text not null default 'OPEN' check(status in ('OPEN','ACKNOWLEDGED','RESOLVED')),
  title text not null check(length(title) between 2 and 240),
  summary text not null default '' check(length(summary)<=4000),
  environment text not null check(environment in ('staging','production')),
  source_kind text not null check(source_kind in ('application','database','edge','security','payment','marketplace','social','app_crash','worker')),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);
create index vvip_observability_incidents_open_idx on public.vvip_observability_incidents(status,severity,last_seen_at desc);

create table public.vvip_observability_health_samples (
  sample_id uuid primary key default gen_random_uuid(),
  environment text not null check(environment in ('staging','production')),
  component text not null check(length(component) between 2 and 120),
  status text not null check(status in ('HEALTHY','DEGRADED','DOWN')),
  latency_ms integer check(latency_ms is null or latency_ms>=0),
  error_rate numeric(8,6) check(error_rate is null or (error_rate>=0 and error_rate<=1)),
  attributes jsonb not null default '{}'::jsonb check(jsonb_typeof(attributes)='object' and octet_length(attributes::text)<=8192),
  sampled_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp()
);
create index vvip_observability_health_component_idx on public.vvip_observability_health_samples(environment,component,sampled_at desc);

alter table public.vvip_observability_events enable row level security;
alter table public.vvip_observability_events force row level security;
alter table public.vvip_observability_incidents enable row level security;
alter table public.vvip_observability_incidents force row level security;
alter table public.vvip_observability_health_samples enable row level security;
alter table public.vvip_observability_health_samples force row level security;
revoke all on table public.vvip_observability_events from public,anon,authenticated;
revoke all on table public.vvip_observability_incidents from public,anon,authenticated;
revoke all on table public.vvip_observability_health_samples from public,anon,authenticated;
grant select on table public.vvip_observability_events to service_role;
grant select on table public.vvip_observability_incidents to service_role;
grant select on table public.vvip_observability_health_samples to service_role;

create function public.vvip_observability_reject_event_mutation() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $f$
begin raise exception 'OBSERVABILITY_EVIDENCE_APPEND_ONLY'; end;$f$;
create trigger vvip_observability_events_append_only before update or delete on public.vvip_observability_events for each row execute function public.vvip_observability_reject_event_mutation();
create trigger vvip_observability_health_append_only before update or delete on public.vvip_observability_health_samples for each row execute function public.vvip_observability_reject_event_mutation();

create function public.vvip_observability_record_event(p_source_kind text,p_severity text,p_event_code text,p_environment text,p_message text,p_occurred_at timestamptz,p_country_code text default null,p_correlation_id text default null,p_actor_subject text default null,p_attributes jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $f$
declare v_id uuid;
begin
 insert into public.vvip_observability_events(source_kind,severity,event_code,environment,country_code,correlation_id,actor_subject,message,attributes,occurred_at)
 values(p_source_kind,upper(p_severity),p_event_code,p_environment,case when p_country_code is null then null else upper(p_country_code) end,p_correlation_id,p_actor_subject,p_message,coalesce(p_attributes,'{}'::jsonb),p_occurred_at)
 returning event_id into v_id;
 return v_id;
end;$f$;

create function public.vvip_observability_record_health(p_environment text,p_component text,p_status text,p_sampled_at timestamptz,p_latency_ms integer default null,p_error_rate numeric default null,p_attributes jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $f$
declare v_id uuid;
begin
 insert into public.vvip_observability_health_samples(environment,component,status,latency_ms,error_rate,attributes,sampled_at)
 values(p_environment,p_component,upper(p_status),p_latency_ms,p_error_rate,coalesce(p_attributes,'{}'::jsonb),p_sampled_at)
 returning sample_id into v_id;
 return v_id;
end;$f$;

create function public.vvip_observability_open_incident(p_incident_key text,p_severity text,p_title text,p_summary text,p_environment text,p_source_kind text,p_seen_at timestamptz)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $f$
declare v_row public.vvip_observability_incidents%rowtype;
begin
 insert into public.vvip_observability_incidents(incident_key,severity,status,title,summary,environment,source_kind,first_seen_at,last_seen_at)
 values(p_incident_key,upper(p_severity),'OPEN',p_title,coalesce(p_summary,''),p_environment,p_source_kind,p_seen_at,p_seen_at)
 on conflict(incident_key) do update set severity=excluded.severity,status=case when public.vvip_observability_incidents.status='RESOLVED' then 'OPEN' else public.vvip_observability_incidents.status end,title=excluded.title,summary=excluded.summary,last_seen_at=excluded.last_seen_at,resolved_at=null,resolution_note=null,updated_at=statement_timestamp()
 returning * into v_row;
 return jsonb_build_object('ok',true,'incident_id',v_row.incident_id,'status',v_row.status);
end;$f$;

create function public.vvip_observability_resolve_incident(p_incident_key text,p_resolution_note text,p_resolved_at timestamptz)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $f$
declare v_id uuid;
begin
 update public.vvip_observability_incidents set status='RESOLVED',resolved_at=p_resolved_at,resolution_note=left(coalesce(p_resolution_note,''),4000),updated_at=statement_timestamp() where incident_key=p_incident_key returning incident_id into v_id;
 if v_id is null then raise exception 'OBSERVABILITY_INCIDENT_NOT_FOUND'; end if;
 return jsonb_build_object('ok',true,'incident_id',v_id,'status','RESOLVED');
end;$f$;

create function public.vvip_owner_operational_snapshot(p_environment text default 'production')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $f$
declare v_events jsonb; v_incidents jsonb; v_health jsonb; v_countries integer; v_finance jsonb;
begin
 select jsonb_build_object('last_hour',count(*),'errors',count(*) filter(where severity in('ERROR','CRITICAL')),'critical',count(*) filter(where severity='CRITICAL')) into v_events from public.vvip_observability_events where environment=p_environment and occurred_at>=statement_timestamp()-interval '1 hour';
 select jsonb_build_object('open',count(*) filter(where status<>'RESOLVED'),'critical_open',count(*) filter(where status<>'RESOLVED' and severity='CRITICAL')) into v_incidents from public.vvip_observability_incidents where environment=p_environment;
 select coalesce(jsonb_agg(item),'[]'::jsonb) into v_health from (select distinct on(component) jsonb_build_object('component',component,'status',status,'latency_ms',latency_ms,'error_rate',error_rate,'sampled_at',sampled_at) item,component from public.vvip_observability_health_samples where environment=p_environment order by component,sampled_at desc) latest;
 select count(*) into v_countries from public.vvip_country_legal_evidence where activation_state='active';
 if to_regprocedure('public.vvip_ad_reconciliation_summary(text,text)') is not null then v_finance:=public.vvip_ad_reconciliation_summary('JO','JOD'); else v_finance:=jsonb_build_object('ok',false,'reason','FINANCIAL_AUTHORITY_UNAVAILABLE'); end if;
 return jsonb_build_object('ok',true,'environment',p_environment,'events',v_events,'incidents',v_incidents,'health',v_health,'active_countries',v_countries,'financial_reconciliation_sample',v_finance,'generated_at',statement_timestamp());
end;$f$;

revoke all on function public.vvip_observability_reject_event_mutation() from public,anon,authenticated;
revoke all on function public.vvip_observability_record_event(text,text,text,text,text,timestamptz,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.vvip_observability_record_health(text,text,text,timestamptz,integer,numeric,jsonb) from public,anon,authenticated;
revoke all on function public.vvip_observability_open_incident(text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.vvip_observability_resolve_incident(text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.vvip_owner_operational_snapshot(text) from public,anon,authenticated;
grant execute on function public.vvip_observability_record_event(text,text,text,text,text,timestamptz,text,text,text,jsonb) to service_role;
grant execute on function public.vvip_observability_record_health(text,text,text,timestamptz,integer,numeric,jsonb) to service_role;
grant execute on function public.vvip_observability_open_incident(text,text,text,text,text,text,timestamptz) to service_role;
grant execute on function public.vvip_observability_resolve_incident(text,text,timestamptz) to service_role;
grant execute on function public.vvip_owner_operational_snapshot(text) to service_role;

commit;

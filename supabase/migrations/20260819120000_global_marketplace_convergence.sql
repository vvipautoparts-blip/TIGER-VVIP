-- VVIP TIGER global Marketplace convergence.
-- Forward-only: reproduces the live marketplace on clean Staging and converges existing Production.
-- Countries and sectors remain fail-closed until their authority gates are active.

begin;

create schema if not exists vvip_private;
revoke all on schema vvip_private from public, anon, authenticated;

do $legacy_sector_guard$
begin
  if to_regclass('public.vvip_marketplace_listings') is not null and exists (
    select 1 from public.vvip_marketplace_listings
    where sector not in (
      'AUTOMOTIVE','REAL_ESTATE','CONSTRUCTION','PROFESSIONAL_SERVICES_TRADES',
      'EQUIPMENT','TRADE_SUPPLY_BUSINESS','ENGINEERING_CONSULTING_DESIGN'
    )
  ) then
    raise exception 'MARKETPLACE_LEGACY_SECTOR_MAPPING_REQUIRED';
  end if;
end
$legacy_sector_guard$;

create table if not exists public.vvip_country_authority_seals (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  activation_state text not null default 'blocked' check (activation_state in ('blocked','draft','active','suspended')),
  seal_status text not null default 'UNSEALED' check (seal_status in ('UNSEALED','SEALED','REVOKED')),
  seal_version text,
  legal_entity_country text,
  data_residency_region text,
  updated_at timestamptz not null default statement_timestamp()
);

insert into public.vvip_country_authority_seals(country_code,activation_state,seal_status)
values ('JO','blocked','UNSEALED')
on conflict(country_code) do nothing;

create table if not exists public.vvip_marketplace_sector_catalog (
  sector_code text primary key,
  sector_label text not null,
  active boolean not null default true,
  sort_order smallint not null unique,
  updated_at timestamptz not null default statement_timestamp(),
  check (sector_code in (
    'AUTOMOTIVE','REAL_ESTATE','CONSTRUCTION','PROFESSIONAL_SERVICES_TRADES',
    'EQUIPMENT','TRADE_SUPPLY_BUSINESS','ENGINEERING_CONSULTING_DESIGN'
  ))
);

insert into public.vvip_marketplace_sector_catalog(sector_code,sector_label,active,sort_order) values
 ('AUTOMOTIVE','Automotive & Parts Services',true,1),
 ('REAL_ESTATE','Real Estate',true,2),
 ('CONSTRUCTION','Construction & Contracting',true,3),
 ('PROFESSIONAL_SERVICES_TRADES','Professional Services & Trades',true,4),
 ('EQUIPMENT','Equipment & Machinery',true,5),
 ('TRADE_SUPPLY_BUSINESS','Trade Supply & Business',true,6),
 ('ENGINEERING_CONSULTING_DESIGN','Engineering Consulting & Design',true,7)
on conflict(sector_code) do update set sector_label=excluded.sector_label, sort_order=excluded.sort_order;

create table if not exists public.vvip_marketplace_country_sector_activation (
  country_code text not null references public.vvip_country_authority_seals(country_code) on delete restrict,
  sector_code text not null references public.vvip_marketplace_sector_catalog(sector_code) on delete restrict,
  activation_state text not null default 'blocked' check (activation_state in ('blocked','active','suspended')),
  updated_at timestamptz not null default statement_timestamp(),
  primary key(country_code,sector_code)
);

insert into public.vvip_marketplace_country_sector_activation(country_code,sector_code,activation_state)
select 'JO', sector_code, 'blocked' from public.vvip_marketplace_sector_catalog
on conflict(country_code,sector_code) do nothing;

create table if not exists public.vvip_marketplace_listings (
  listing_id uuid primary key default gen_random_uuid(),
  owner_subject text not null default public.vvip_marketplace_actor_id(),
  active_market_country text not null references public.vvip_country_authority_seals(country_code) on delete restrict,
  sector text not null,
  title text not null check (length(title) between 2 and 80),
  summary text not null default '' check (length(summary) <= 2000),
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications)='object' and octet_length(specifications::text)<=8192),
  price_minor bigint not null check (price_minor > 0 and price_minor <= 99999999999999),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  location_label text not null check (length(location_label) between 1 and 120),
  contact_phone text check (contact_phone is null or length(contact_phone) between 7 and 32),
  whatsapp_enabled boolean not null default false,
  status text not null default 'DRAFT' check (status in ('DRAFT','PENDING_REVIEW','ACTIVE','PAUSED','EXPIRED','REJECTED','BLOCKED','ARCHIVED')),
  rejection_reason text check (rejection_reason is null or length(rejection_reason)<=500),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  check (length(owner_subject) between 1 and 128),
  check (not whatsapp_enabled or contact_phone is not null),
  check (expires_at is null or published_at is null or published_at < expires_at)
);

alter table public.vvip_marketplace_listings drop constraint if exists vvip_marketplace_listings_sector_check;
alter table public.vvip_marketplace_listings
  add constraint vvip_marketplace_listings_sector_check check (sector in (
    'AUTOMOTIVE','REAL_ESTATE','CONSTRUCTION','PROFESSIONAL_SERVICES_TRADES',
    'EQUIPMENT','TRADE_SUPPLY_BUSINESS','ENGINEERING_CONSULTING_DESIGN'
  ));

do $sector_fk$
begin
  if not exists (select 1 from pg_constraint where conname='vvip_marketplace_listings_sector_catalog_fkey') then
    alter table public.vvip_marketplace_listings
      add constraint vvip_marketplace_listings_sector_catalog_fkey
      foreign key(sector) references public.vvip_marketplace_sector_catalog(sector_code) on delete restrict;
  end if;
end
$sector_fk$;

create index if not exists vvip_marketplace_listings_owner_idx on public.vvip_marketplace_listings(owner_subject,created_at desc);
create index if not exists vvip_marketplace_listings_discovery_idx on public.vvip_marketplace_listings(active_market_country,sector,status,created_at desc);
create index if not exists vvip_marketplace_listings_price_idx on public.vvip_marketplace_listings(active_market_country,sector,price_minor) where status='ACTIVE';

create table if not exists public.vvip_marketplace_listing_media (
  media_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.vvip_marketplace_listings(listing_id) on delete cascade,
  owner_subject text not null default public.vvip_marketplace_actor_id(),
  storage_path text not null unique check (length(storage_path) between 1 and 500),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size integer not null check (byte_size between 1 and 10485760),
  width integer not null check (width between 320 and 4096),
  height integer not null check (height between 240 and 4096),
  position smallint not null check (position between 0 and 6),
  is_cover boolean not null default false,
  alt_text text not null default 'صورة الإعلان' check (length(alt_text) between 1 and 160),
  created_at timestamptz not null default statement_timestamp(),
  check (length(owner_subject) between 1 and 128),
  unique(listing_id,position)
);

create index if not exists vvip_marketplace_listing_media_listing_idx on public.vvip_marketplace_listing_media(listing_id,position);

create table if not exists public.vvip_marketplace_listing_audit (
  audit_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  actor_subject text check (actor_subject is null or length(actor_subject) between 1 and 128),
  previous_status text,
  next_status text not null,
  reason text check (reason is null or length(reason)<=500),
  created_at timestamptz not null default statement_timestamp()
);

create table if not exists public.vvip_marketplace_reports (
  report_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.vvip_marketplace_listings(listing_id) on delete restrict,
  reporter_subject text not null,
  reason_code text not null check (reason_code in ('fraud','prohibited','misleading','duplicate','wrong_sector','other')),
  detail text not null default '' check (length(detail)<=1000),
  report_status text not null default 'OPEN' check (report_status in ('OPEN','REVIEWED','DISMISSED','ACTIONED')),
  created_at timestamptz not null default statement_timestamp(),
  check (reporter_subject like 'user\_%' escape '\')
);
create index if not exists vvip_marketplace_reports_queue_idx on public.vvip_marketplace_reports(report_status,created_at);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('listing-media','listing-media',false,10485760,array['image/jpeg','image/png','image/webp']::text[])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.vvip_country_authority_seals enable row level security;
alter table public.vvip_country_authority_seals force row level security;
alter table public.vvip_marketplace_sector_catalog enable row level security;
alter table public.vvip_marketplace_sector_catalog force row level security;
alter table public.vvip_marketplace_country_sector_activation enable row level security;
alter table public.vvip_marketplace_country_sector_activation force row level security;
alter table public.vvip_marketplace_listings enable row level security;
alter table public.vvip_marketplace_listings force row level security;
alter table public.vvip_marketplace_listing_media enable row level security;
alter table public.vvip_marketplace_listing_media force row level security;
alter table public.vvip_marketplace_listing_audit enable row level security;
alter table public.vvip_marketplace_listing_audit force row level security;
alter table public.vvip_marketplace_reports enable row level security;
alter table public.vvip_marketplace_reports force row level security;

revoke all on table public.vvip_country_authority_seals from public,anon,authenticated;
revoke all on table public.vvip_marketplace_sector_catalog from public,anon,authenticated;
revoke all on table public.vvip_marketplace_country_sector_activation from public,anon,authenticated;
revoke all on table public.vvip_marketplace_listings from public,anon,authenticated;
revoke all on table public.vvip_marketplace_listing_media from public,anon,authenticated;
revoke all on table public.vvip_marketplace_listing_audit from public,anon,authenticated;
revoke all on table public.vvip_marketplace_reports from public,anon,authenticated;
grant select,insert,update,delete on table public.vvip_marketplace_listings to authenticated;
grant select,insert,update,delete on table public.vvip_marketplace_listing_media to authenticated;

create or replace function vvip_private.vvip_marketplace_country_is_active(target_country text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $f$
  select public.vvip_country_launch_ready(target_country)
    and exists(select 1 from public.vvip_country_authority_seals s where s.country_code=upper(target_country) and s.activation_state='active' and s.seal_status='SEALED');
$f$;

create or replace function vvip_private.vvip_marketplace_sector_is_active(target_country text,target_sector text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $f$
  select vvip_private.vvip_marketplace_country_is_active(target_country)
    and exists(select 1 from public.vvip_marketplace_country_sector_activation a where a.country_code=upper(target_country) and a.sector_code=target_sector and a.activation_state='active');
$f$;

create or replace function public.vvip_marketplace_guard_listing_write()
returns trigger language plpgsql set search_path=pg_catalog,public as $f$
declare v_actor text:=public.vvip_marketplace_actor_id();
begin
  if v_actor is null and current_user in ('anon','authenticated') then raise exception 'MARKETPLACE_AUTH_REQUIRED'; end if;
  if tg_op='INSERT' then
    if current_user in ('anon','authenticated') and new.owner_subject<>v_actor then raise exception 'MARKETPLACE_OWNER_REQUIRED'; end if;
    if new.status<>'DRAFT' then raise exception 'MARKETPLACE_DRAFT_REQUIRED'; end if;
  elsif tg_op='UPDATE' then
    if new.owner_subject<>old.owner_subject or new.created_at<>old.created_at then raise exception 'MARKETPLACE_IMMUTABLE_SCOPE'; end if;
    if current_user in ('anon','authenticated') and old.owner_subject<>v_actor then raise exception 'MARKETPLACE_OWNER_REQUIRED'; end if;
    if current_user in ('anon','authenticated') and old.status not in ('DRAFT','REJECTED','PAUSED','ACTIVE') then raise exception 'MARKETPLACE_OWNER_UPDATE_DENIED'; end if;
    if current_user in ('anon','authenticated') and new.status not in (old.status,'DRAFT','PAUSED','ARCHIVED') then raise exception 'MARKETPLACE_OWNER_STATUS_TRANSITION_DENIED'; end if;
  elsif tg_op='DELETE' then
    if current_user in ('anon','authenticated') and (old.owner_subject<>v_actor or old.status not in ('DRAFT','ARCHIVED')) then raise exception 'MARKETPLACE_DELETE_DENIED'; end if;
    return old;
  end if;
  if not vvip_private.vvip_marketplace_sector_is_active(new.active_market_country,new.sector) then raise exception 'MARKETPLACE_COUNTRY_SECTOR_NOT_ACTIVE'; end if;
  new.updated_at:=statement_timestamp();
  return new;
end;$f$;

drop trigger if exists vvip_marketplace_listing_write_guard on public.vvip_marketplace_listings;
create trigger vvip_marketplace_listing_write_guard before insert or update or delete on public.vvip_marketplace_listings for each row execute function public.vvip_marketplace_guard_listing_write();

create or replace function public.vvip_marketplace_reject_audit_mutation()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $f$
begin raise exception 'MARKETPLACE_AUDIT_APPEND_ONLY'; end;$f$;

drop trigger if exists vvip_marketplace_audit_append_only on public.vvip_marketplace_listing_audit;
create trigger vvip_marketplace_audit_append_only before update or delete on public.vvip_marketplace_listing_audit for each row execute function public.vvip_marketplace_reject_audit_mutation();

create or replace function public.vvip_marketplace_reject_report_mutation()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $f$
begin if tg_op='DELETE' then raise exception 'MARKETPLACE_REPORT_APPEND_ONLY'; end if; if new.listing_id<>old.listing_id or new.reporter_subject<>old.reporter_subject or new.reason_code<>old.reason_code or new.detail<>old.detail or new.created_at<>old.created_at then raise exception 'MARKETPLACE_REPORT_EVIDENCE_IMMUTABLE'; end if; return new; end;$f$;

drop trigger if exists vvip_marketplace_report_immutability on public.vvip_marketplace_reports;
create trigger vvip_marketplace_report_immutability before update or delete on public.vvip_marketplace_reports for each row execute function public.vvip_marketplace_reject_report_mutation();

create or replace function public.vvip_marketplace_record_listing_audit()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $f$
begin
 if tg_op='INSERT' then
  insert into public.vvip_marketplace_listing_audit(listing_id,actor_subject,previous_status,next_status,reason) values(new.listing_id,new.owner_subject,null,new.status,null);
 elsif new.status is distinct from old.status then
  insert into public.vvip_marketplace_listing_audit(listing_id,actor_subject,previous_status,next_status,reason) values(new.listing_id,public.vvip_marketplace_actor_id(),old.status,new.status,new.rejection_reason);
 end if;
 return new;
end;$f$;

drop trigger if exists vvip_marketplace_listing_audit_write on public.vvip_marketplace_listings;
create trigger vvip_marketplace_listing_audit_write after insert or update on public.vvip_marketplace_listings for each row execute function public.vvip_marketplace_record_listing_audit();

create policy vvip_marketplace_authenticated_read on public.vvip_marketplace_listings for select to authenticated using(owner_subject=(select public.vvip_marketplace_actor_id()) or (status='ACTIVE' and vvip_private.vvip_marketplace_sector_is_active(active_market_country,sector)));
create policy vvip_marketplace_owner_insert_draft on public.vvip_marketplace_listings for insert to authenticated with check(owner_subject=(select public.vvip_marketplace_actor_id()) and status='DRAFT' and vvip_private.vvip_marketplace_sector_is_active(active_market_country,sector));
create policy vvip_marketplace_owner_update on public.vvip_marketplace_listings for update to authenticated using(owner_subject=(select public.vvip_marketplace_actor_id())) with check(owner_subject=(select public.vvip_marketplace_actor_id()) and vvip_private.vvip_marketplace_sector_is_active(active_market_country,sector));
create policy vvip_marketplace_owner_delete on public.vvip_marketplace_listings for delete to authenticated using(owner_subject=(select public.vvip_marketplace_actor_id()) and status in ('DRAFT','ARCHIVED'));

create policy vvip_marketplace_media_owner_read on public.vvip_marketplace_listing_media for select to authenticated using(owner_subject=(select public.vvip_marketplace_actor_id()) or exists(select 1 from public.vvip_marketplace_listings l where l.listing_id=vvip_marketplace_listing_media.listing_id and l.status='ACTIVE' and vvip_private.vvip_marketplace_sector_is_active(l.active_market_country,l.sector)));
create policy vvip_marketplace_media_owner_insert on public.vvip_marketplace_listing_media for insert to authenticated with check(owner_subject=(select public.vvip_marketplace_actor_id()) and storage_path like owner_subject||'/%' and exists(select 1 from public.vvip_marketplace_listings l where l.listing_id=vvip_marketplace_listing_media.listing_id and l.owner_subject=(select public.vvip_marketplace_actor_id()) and l.status in ('DRAFT','REJECTED')));
create policy vvip_marketplace_media_owner_update on public.vvip_marketplace_listing_media for update to authenticated using(owner_subject=(select public.vvip_marketplace_actor_id())) with check(owner_subject=(select public.vvip_marketplace_actor_id()) and storage_path like owner_subject||'/%');
create policy vvip_marketplace_media_owner_delete on public.vvip_marketplace_listing_media for delete to authenticated using(owner_subject=(select public.vvip_marketplace_actor_id()));

create or replace function public.vvip_marketplace_submit_listing(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $f$
declare v_actor text:=public.vvip_marketplace_actor_id(); v_listing public.vvip_marketplace_listings%rowtype; v_media integer;
begin
 if v_actor is null then raise exception 'MARKETPLACE_AUTH_REQUIRED'; end if;
 select * into v_listing from public.vvip_marketplace_listings where listing_id=p_listing_id for update;
 if not found or v_listing.owner_subject<>v_actor then raise exception 'MARKETPLACE_LISTING_NOT_FOUND'; end if;
 if v_listing.status not in ('DRAFT','REJECTED') then raise exception 'MARKETPLACE_SUBMIT_STATE_INVALID'; end if;
 if not vvip_private.vvip_marketplace_sector_is_active(v_listing.active_market_country,v_listing.sector) then raise exception 'MARKETPLACE_COUNTRY_SECTOR_NOT_ACTIVE'; end if;
 select count(*) into v_media from public.vvip_marketplace_listing_media where listing_id=p_listing_id;
 if v_media<1 then raise exception 'MARKETPLACE_MEDIA_REQUIRED'; end if;
 update public.vvip_marketplace_listings set status='PENDING_REVIEW',rejection_reason=null,updated_at=statement_timestamp() where listing_id=p_listing_id;
 return jsonb_build_object('ok',true,'listing_id',p_listing_id,'status','PENDING_REVIEW');
end;$f$;

create or replace function public.vvip_marketplace_review_listing(target_listing uuid,decision text,decision_reason text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $f$
declare v_listing public.vvip_marketplace_listings%rowtype; v_next text;
begin
 select * into v_listing from public.vvip_marketplace_listings where listing_id=target_listing for update;
 if not found then raise exception 'MARKETPLACE_LISTING_NOT_FOUND'; end if;
 if v_listing.status<>'PENDING_REVIEW' then raise exception 'MARKETPLACE_REVIEW_STATE_INVALID'; end if;
 if not vvip_private.vvip_marketplace_sector_is_active(v_listing.active_market_country,v_listing.sector) then raise exception 'MARKETPLACE_COUNTRY_SECTOR_NOT_ACTIVE'; end if;
 if upper(decision)='APPROVE' then v_next:='ACTIVE'; elsif upper(decision)='REJECT' then v_next:='REJECTED'; else raise exception 'MARKETPLACE_REVIEW_DECISION_INVALID'; end if;
 update public.vvip_marketplace_listings set status=v_next,rejection_reason=case when v_next='REJECTED' then left(coalesce(decision_reason,'Rejected'),500) else null end,published_at=case when v_next='ACTIVE' then coalesce(published_at,statement_timestamp()) else published_at end,updated_at=statement_timestamp() where listing_id=target_listing;
 return jsonb_build_object('ok',true,'listing_id',target_listing,'status',v_next);
end;$f$;

create or replace function public.vvip_marketplace_report_listing(p_listing_id uuid,p_reason_code text,p_detail text default '')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $f$
declare v_actor text:=public.vvip_marketplace_actor_id(); v_report uuid; v_owner text;
begin
 if v_actor is null then raise exception 'MARKETPLACE_AUTH_REQUIRED'; end if;
 select owner_subject into v_owner from public.vvip_marketplace_listings where listing_id=p_listing_id and status='ACTIVE';
 if not found then raise exception 'MARKETPLACE_LISTING_NOT_VISIBLE'; end if;
 if v_owner=v_actor then raise exception 'MARKETPLACE_SELF_REPORT_DENIED'; end if;
 if p_reason_code not in ('fraud','prohibited','misleading','duplicate','wrong_sector','other') then raise exception 'MARKETPLACE_REPORT_REASON_INVALID'; end if;
 insert into public.vvip_marketplace_reports(listing_id,reporter_subject,reason_code,detail) values(p_listing_id,v_actor,p_reason_code,left(coalesce(p_detail,''),1000)) returning report_id into v_report;
 return jsonb_build_object('ok',true,'report_id',v_report,'listing_id',p_listing_id);
end;$f$;

create or replace function public.vvip_marketplace_search(p_country_code text,p_sector text default null,p_query text default null,p_price_min bigint default null,p_price_max bigint default null,p_limit integer default 30,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $f$
declare v_items jsonb; v_limit integer:=least(greatest(coalesce(p_limit,30),1),100); v_offset integer:=greatest(coalesce(p_offset,0),0);
begin
 if not vvip_private.vvip_marketplace_country_is_active(p_country_code) then return jsonb_build_object('ok',false,'reason','COUNTRY_NOT_ACTIVE','items','[]'::jsonb); end if;
 if p_sector is not null and not exists(select 1 from public.vvip_marketplace_sector_catalog s where s.sector_code=p_sector and s.active) then raise exception 'MARKETPLACE_SECTOR_INVALID'; end if;
 select coalesce(jsonb_agg(item),'[]'::jsonb) into v_items from (
  select jsonb_build_object('listing_id',l.listing_id,'country',l.active_market_country,'sector',l.sector,'title',l.title,'summary',l.summary,'price_minor',l.price_minor,'currency_code',l.currency_code,'location_label',l.location_label,'published_at',l.published_at,
   'media',(select coalesce(jsonb_agg(jsonb_build_object('storage_path',m.storage_path,'position',m.position,'is_cover',m.is_cover,'alt_text',m.alt_text) order by m.position),'[]'::jsonb) from public.vvip_marketplace_listing_media m where m.listing_id=l.listing_id)) item
  from public.vvip_marketplace_listings l
  where l.active_market_country=upper(p_country_code) and l.status='ACTIVE'
   and vvip_private.vvip_marketplace_sector_is_active(l.active_market_country,l.sector)
   and (p_sector is null or l.sector=p_sector)
   and (p_price_min is null or l.price_minor>=p_price_min)
   and (p_price_max is null or l.price_minor<=p_price_max)
   and (nullif(btrim(coalesce(p_query,'')),'') is null or l.title ilike '%'||btrim(p_query)||'%' or l.summary ilike '%'||btrim(p_query)||'%' or l.location_label ilike '%'||btrim(p_query)||'%')
  order by l.published_at desc nulls last,l.created_at desc
  limit v_limit offset v_offset
 ) q;
 return jsonb_build_object('ok',true,'country',upper(p_country_code),'sector',p_sector,'items',v_items,'limit',v_limit,'offset',v_offset);
end;$f$;

revoke all on function vvip_private.vvip_marketplace_country_is_active(text) from public,anon,authenticated;
revoke all on function vvip_private.vvip_marketplace_sector_is_active(text,text) from public,anon,authenticated;
revoke all on function public.vvip_marketplace_guard_listing_write() from public,anon,authenticated;
revoke all on function public.vvip_marketplace_reject_audit_mutation() from public,anon,authenticated;
revoke all on function public.vvip_marketplace_reject_report_mutation() from public,anon,authenticated;
revoke all on function public.vvip_marketplace_record_listing_audit() from public,anon,authenticated;
revoke all on function public.vvip_marketplace_submit_listing(uuid) from public,anon,authenticated;
revoke all on function public.vvip_marketplace_review_listing(uuid,text,text) from public,anon,authenticated,service_role;
revoke all on function public.vvip_marketplace_report_listing(uuid,text,text) from public,anon,authenticated;
revoke all on function public.vvip_marketplace_search(text,text,text,bigint,bigint,integer,integer) from public,anon,authenticated;
grant execute on function public.vvip_marketplace_submit_listing(uuid) to authenticated;
grant execute on function public.vvip_marketplace_report_listing(uuid,text,text) to authenticated;
grant execute on function public.vvip_marketplace_search(text,text,text,bigint,bigint,integer,integer) to anon,authenticated;
grant execute on function public.vvip_marketplace_review_listing(uuid,text,text) to service_role;

-- Private storage object ownership follows the federated user_* actor folder.
drop policy if exists vvip_marketplace_storage_read on storage.objects;
drop policy if exists vvip_marketplace_storage_insert on storage.objects;
drop policy if exists vvip_marketplace_storage_update on storage.objects;
drop policy if exists vvip_marketplace_storage_delete on storage.objects;
create policy vvip_marketplace_storage_read on storage.objects for select to authenticated using(bucket_id='listing-media' and exists(select 1 from public.vvip_marketplace_listing_media m where m.storage_path=storage.objects.name));
create policy vvip_marketplace_storage_insert on storage.objects for insert to authenticated with check(bucket_id='listing-media' and (storage.foldername(name))[1]=(select public.vvip_marketplace_actor_id()));
create policy vvip_marketplace_storage_update on storage.objects for update to authenticated using(bucket_id='listing-media' and (storage.foldername(name))[1]=(select public.vvip_marketplace_actor_id())) with check(bucket_id='listing-media' and (storage.foldername(name))[1]=(select public.vvip_marketplace_actor_id()));
create policy vvip_marketplace_storage_delete on storage.objects for delete to authenticated using(bucket_id='listing-media' and (storage.foldername(name))[1]=(select public.vvip_marketplace_actor_id()));

commit;

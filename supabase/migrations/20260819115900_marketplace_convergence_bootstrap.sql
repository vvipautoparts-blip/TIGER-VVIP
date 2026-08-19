-- Bootstrap only the relations required by the forward Marketplace convergence guard.
-- Existing Production objects are preserved by IF NOT EXISTS; clean Staging gets the same prerequisites.
begin;

create schema if not exists vvip_private;
revoke all on schema vvip_private from public,anon,authenticated;

create table if not exists public.vvip_country_authority_seals (
  country_code text primary key check(country_code ~ '^[A-Z]{2}$'),
  activation_state text not null default 'blocked' check(activation_state in ('blocked','draft','active','suspended')),
  seal_status text not null default 'UNSEALED' check(seal_status in ('UNSEALED','SEALED','REVOKED')),
  seal_version text,
  legal_entity_country text,
  data_residency_region text,
  updated_at timestamptz not null default statement_timestamp()
);

insert into public.vvip_country_authority_seals(country_code,activation_state,seal_status)
values('JO','blocked','UNSEALED')
on conflict(country_code) do nothing;

create table if not exists public.vvip_marketplace_sector_catalog (
  sector_code text primary key,
  sector_label text not null,
  active boolean not null default true,
  sort_order smallint not null unique,
  updated_at timestamptz not null default statement_timestamp(),
  check(sector_code in (
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
on conflict(sector_code) do update set sector_label=excluded.sector_label,sort_order=excluded.sort_order;

create table if not exists public.vvip_marketplace_country_sector_activation (
  country_code text not null references public.vvip_country_authority_seals(country_code) on delete restrict,
  sector_code text not null references public.vvip_marketplace_sector_catalog(sector_code) on delete restrict,
  activation_state text not null default 'blocked' check(activation_state in ('blocked','active','suspended')),
  updated_at timestamptz not null default statement_timestamp(),
  primary key(country_code,sector_code)
);

insert into public.vvip_marketplace_country_sector_activation(country_code,sector_code,activation_state)
select 'JO',sector_code,'blocked' from public.vvip_marketplace_sector_catalog
on conflict(country_code,sector_code) do nothing;

create table if not exists public.vvip_marketplace_listings (
  listing_id uuid primary key default gen_random_uuid(),
  owner_subject text not null default public.vvip_marketplace_actor_id(),
  active_market_country text not null references public.vvip_country_authority_seals(country_code) on delete restrict,
  sector text not null,
  title text not null check(length(title) between 2 and 80),
  summary text not null default '' check(length(summary)<=2000),
  specifications jsonb not null default '{}'::jsonb check(jsonb_typeof(specifications)='object' and octet_length(specifications::text)<=8192),
  price_minor bigint not null check(price_minor>0 and price_minor<=99999999999999),
  currency_code text not null check(currency_code~'^[A-Z]{3}$'),
  location_label text not null check(length(location_label) between 1 and 120),
  contact_phone text check(contact_phone is null or length(contact_phone) between 7 and 32),
  whatsapp_enabled boolean not null default false,
  status text not null default 'DRAFT' check(status in ('DRAFT','PENDING_REVIEW','ACTIVE','PAUSED','EXPIRED','REJECTED','BLOCKED','ARCHIVED')),
  rejection_reason text check(rejection_reason is null or length(rejection_reason)<=500),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  check(length(owner_subject) between 1 and 128),
  check(not whatsapp_enabled or contact_phone is not null),
  check(expires_at is null or published_at is null or published_at<expires_at)
);

commit;

-- TIGER cleanroom PostgreSQL foundation — NOT APPLIED TO PRODUCTION.

create schema if not exists tiger_core;
revoke create on schema tiger_core from public;
set search_path = tiger_core, pg_catalog;

create table if not exists tiger_actor (
  actor_id text primary key,
  actor_class text not null check (actor_class in ('HUMAN', 'DIGITAL')),
  role_code text not null,
  active boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  check (length(btrim(actor_id)) between 1 and 128),
  check (length(btrim(role_code)) between 1 and 128)
);

create table if not exists tiger_actor_finance_profile (
  actor_id text primary key references tiger_actor(actor_id) on delete restrict,
  is_financial_beneficiary boolean not null default false,
  commission_eligible boolean not null default false,
  partner_share_basis_points integer not null default 0 check (partner_share_basis_points between 0 and 10000),
  sales_commission_basis_points integer not null default 0 check (sales_commission_basis_points between 0 and 10000),
  payout_destination text,
  updated_at timestamptz not null default now()
);

create or replace function tiger_guard_human_finance_profile()
returns trigger
language plpgsql
set search_path = pg_catalog, tiger_core
as $$
declare
  v_actor_class text;
begin
  select actor_class into v_actor_class
  from tiger_actor
  where actor_id = new.actor_id;

  if v_actor_class is null then
    raise exception 'ACTOR_NOT_FOUND';
  end if;

  if v_actor_class <> 'HUMAN' then
    raise exception 'DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN';
  end if;

  return new;
end;
$$;

drop trigger if exists tiger_actor_finance_profile_human_guard on tiger_actor_finance_profile;
create trigger tiger_actor_finance_profile_human_guard
before insert or update on tiger_actor_finance_profile
for each row execute function tiger_guard_human_finance_profile();

create table if not exists tiger_sector (
  sector_id text primary key check (sector_id ~ '^SEC-[0-9]{3}$'),
  label_ar text not null check (length(btrim(label_ar)) > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into tiger_sector (sector_id, label_ar, active) values
  ('SEC-001', 'قطع غيار المركبات', true),
  ('SEC-002', 'خدمات المركبات والخدمات المرتبطة بها', true),
  ('SEC-003', 'المواد والتموين', true),
  ('SEC-004', 'العقارات', true),
  ('SEC-005', 'المقاولات والبناء', true),
  ('SEC-006', 'الخدمات والمهن والحرف', true),
  ('SEC-007', 'المعدات والآليات', true),
  ('SEC-008', 'التجارة والأعمال والتوريد', true),
  ('SEC-009', 'الهندسة والاستشارات', true),
  ('SEC-010', 'التصميم', true)
on conflict (sector_id) do nothing;

create table if not exists tiger_visibility_offer (
  offer_id text primary key,
  price_micro_jod bigint not null check (price_micro_jod in (2000000, 10000000, 20000000, 45000000)),
  purchased_quota bigint not null check (purchased_quota > 0),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  check (length(btrim(offer_id)) between 1 and 128)
);

create table if not exists tiger_purchase (
  purchase_id text primary key,
  idempotency_key text not null unique,
  command_fingerprint text not null,
  user_id text not null,
  post_id text not null,
  sector_id text not null references tiger_sector(sector_id) on delete restrict,
  offer_id text not null references tiger_visibility_offer(offer_id) on delete restrict,
  captured_micro_jod bigint not null check (captured_micro_jod > 0),
  payment_reference text not null,
  ledger_state text not null default 'PENDING' check (ledger_state in ('PENDING', 'POSTED')),
  created_at timestamptz not null default now(),
  check (length(btrim(purchase_id)) between 1 and 128),
  check (length(btrim(idempotency_key)) between 1 and 256),
  check (length(btrim(command_fingerprint)) between 1 and 1024),
  check (length(btrim(user_id)) between 1 and 256),
  check (length(btrim(post_id)) between 1 and 128),
  check (length(btrim(payment_reference)) between 1 and 256)
);

create table if not exists tiger_idempotency_record (
  idempotency_key text primary key,
  command_fingerprint text not null,
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  check (length(btrim(idempotency_key)) between 1 and 256),
  check (length(btrim(command_fingerprint)) between 1 and 1024)
);

create table if not exists tiger_visibility_card (
  card_id text primary key,
  purchase_id text not null unique references tiger_purchase(purchase_id) on delete restrict,
  post_id text not null,
  offer_id text not null references tiger_visibility_offer(offer_id) on delete restrict,
  price_micro_jod bigint not null check (price_micro_jod in (2000000, 10000000, 20000000, 45000000)),
  purchased_quota bigint not null check (purchased_quota > 0),
  consumed_quota bigint not null default 0 check (consumed_quota >= 0),
  state text not null default 'ACTIVE' check (state in ('ACTIVE', 'ENDED')),
  paid_at timestamptz not null,
  ended_at timestamptz,
  check (consumed_quota <= purchased_quota),
  check (
    (state = 'ACTIVE' and ended_at is null and consumed_quota < purchased_quota)
    or
    (state = 'ENDED' and ended_at is not null and consumed_quota = purchased_quota)
  ),
  check (length(btrim(card_id)) between 1 and 128),
  check (length(btrim(post_id)) between 1 and 128)
);

create table if not exists tiger_impression_receipt (
  card_id text not null references tiger_visibility_card(card_id) on delete restrict,
  receipt_id text not null,
  qualified boolean not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (card_id, receipt_id),
  check (length(btrim(receipt_id)) between 1 and 256)
);

create or replace function tiger_consume_verified_impression(
  p_card_id text,
  p_receipt_id text,
  p_qualified boolean,
  p_observed_at timestamptz
)
returns tiger_visibility_card
language plpgsql
set search_path = pg_catalog, tiger_core
as $$
declare
  v_card tiger_visibility_card%rowtype;
  v_inserted integer := 0;
begin
  if p_card_id is null or length(btrim(p_card_id)) = 0
     or p_receipt_id is null or length(btrim(p_receipt_id)) = 0
     or p_observed_at is null then
    raise exception 'IMPRESSION_RECEIPT_INVALID';
  end if;

  select * into v_card
  from tiger_visibility_card
  where card_id = p_card_id
  for update;

  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  if p_qualified is true and v_card.state = 'ENDED' then
    raise exception 'CARD_ALREADY_ENDED';
  end if;

  insert into tiger_impression_receipt (card_id, receipt_id, qualified, observed_at)
  values (p_card_id, p_receipt_id, p_qualified is true, p_observed_at)
  on conflict (card_id, receipt_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return v_card;
  end if;

  if p_qualified is not true then
    return v_card;
  end if;

  update tiger_visibility_card
  set consumed_quota = consumed_quota + 1,
      state = case
        when consumed_quota + 1 = purchased_quota then 'ENDED'
        else state
      end,
      ended_at = case
        when consumed_quota + 1 = purchased_quota then p_observed_at
        else ended_at
      end
  where card_id = p_card_id
  returning * into v_card;

  return v_card;
end;
$$;

create table if not exists tiger_ledger_entry (
  entry_id text primary key,
  purchase_id text not null references tiger_purchase(purchase_id) on delete restrict,
  account_code text not null check (account_code in (
    'OWNER_BASE',
    'PARTNER_1',
    'PARTNER_2',
    'PARTNER_3',
    'RISK',
    'MAINTENANCE',
    'DEVELOPMENT',
    'TECHNICAL_SUPPORT',
    'ADVERTISING',
    'CSR',
    'SALES_COMMISSION',
    'OWNER_SALES_REROUTE',
    'PENDING_OWNER_REALLOCATION',
    'REFUND_REVERSAL'
  )),
  actor_id text references tiger_actor(actor_id) on delete restrict,
  kind text not null check (kind in (
    'OWNERSHIP_ENTITLEMENT',
    'OPERATIONS_ALLOCATION',
    'SALES_COMMISSION',
    'SALES_REROUTE',
    'SUSPENSE',
    'REFUND_REVERSAL'
  )),
  percent_basis_points integer not null check (percent_basis_points between 0 and 10000),
  amount_micro_jod bigint not null check (amount_micro_jod >= 0),
  reason_code text not null check (length(btrim(reason_code)) between 1 and 128),
  created_at timestamptz not null default now(),
  check (account_code <> 'PENDING_OWNER_REALLOCATION' or actor_id is null),
  check (length(btrim(entry_id)) between 1 and 128)
);

create unique index if not exists tiger_one_human_sales_winner_per_purchase
on tiger_ledger_entry (purchase_id)
where kind = 'SALES_COMMISSION';

create or replace function tiger_guard_ledger_beneficiary()
returns trigger
language plpgsql
set search_path = pg_catalog, tiger_core
as $$
declare
  v_actor_class text;
  v_active boolean;
  v_verified boolean;
  v_role_code text;
begin
  if new.actor_id is null then
    return new;
  end if;

  select actor_class, active, verified, role_code
  into v_actor_class, v_active, v_verified, v_role_code
  from tiger_actor
  where actor_id = new.actor_id;

  if v_actor_class is null then
    raise exception 'ACTOR_NOT_FOUND';
  end if;

  if v_actor_class <> 'HUMAN' then
    raise exception 'DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN';
  end if;

  if new.kind = 'SALES_COMMISSION' and (v_active is not true or v_verified is not true or v_role_code not in ('GENERAL_MANAGER', 'SECTOR_MANAGER', 'MARKETER')) then
    raise exception 'HUMAN_SALES_WINNER_NOT_ELIGIBLE';
  end if;

  return new;
end;
$$;

drop trigger if exists tiger_ledger_human_beneficiary_guard on tiger_ledger_entry;
create trigger tiger_ledger_human_beneficiary_guard
before insert on tiger_ledger_entry
for each row execute function tiger_guard_ledger_beneficiary();

create or replace function tiger_deny_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, tiger_core
as $$
begin
  raise exception 'IMMUTABLE_LEDGER';
end;
$$;

drop trigger if exists tiger_ledger_immutable_guard on tiger_ledger_entry;
create trigger tiger_ledger_immutable_guard
before update or delete on tiger_ledger_entry
for each row execute function tiger_deny_ledger_mutation();

create table if not exists tiger_post (
  post_id text primary key,
  owner_user_id text not null,
  sector_id text not null references tiger_sector(sector_id) on delete restrict,
  state text not null check (state in ('DRAFT', 'READY_FOR_CARD', 'ACTIVE', 'EXPIRED')),
  active_card_id text references tiger_visibility_card(card_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state <> 'ACTIVE' or active_card_id is not null),
  check (length(btrim(post_id)) between 1 and 128),
  check (length(btrim(owner_user_id)) between 1 and 256)
);

create or replace function tiger_guard_post_card_link()
returns trigger
language plpgsql
set search_path = pg_catalog, tiger_core
as $$
declare
  v_exists boolean;
begin
  if new.state <> 'ACTIVE' then
    return new;
  end if;

  if new.active_card_id is null then
    raise exception 'PAID_CARD_REQUIRED';
  end if;

  select exists(
    select 1
    from tiger_visibility_card
    where card_id = new.active_card_id and post_id = new.post_id
  ) into v_exists;

  if v_exists is not true then
    raise exception 'PAID_CARD_REQUIRED';
  end if;

  return new;
end;
$$;

drop trigger if exists tiger_post_card_link_guard on tiger_post;
create trigger tiger_post_card_link_guard
before insert or update on tiger_post
for each row execute function tiger_guard_post_card_link();

create or replace function tiger_post_expires_at(p_card_ended_at timestamptz)
returns timestamptz
language sql
immutable
as $$
  select case
    when p_card_ended_at is null then null
    else p_card_ended_at + interval '24 hours'
  end;
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tiger_purchase_post_fk') then
    alter table tiger_purchase
      add constraint tiger_purchase_post_fk
      foreign key (post_id) references tiger_post(post_id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tiger_visibility_card_post_fk') then
    alter table tiger_visibility_card
      add constraint tiger_visibility_card_post_fk
      foreign key (post_id) references tiger_post(post_id) on delete restrict;
  end if;
end;
$$;

create table if not exists tiger_audit_event (
  audit_id text primary key,
  actor_id text references tiger_actor(actor_id) on delete restrict,
  event_type text not null check (length(btrim(event_type)) between 1 and 128),
  policy_id text not null check (length(btrim(policy_id)) between 1 and 128),
  reason_code text not null check (length(btrim(reason_code)) between 1 and 128),
  result_code text not null check (length(btrim(result_code)) between 1 and 128),
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (length(btrim(audit_id)) between 1 and 128)
);

create or replace function tiger_deny_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, tiger_core
as $$
begin
  raise exception 'IMMUTABLE_AUDIT';
end;
$$;

drop trigger if exists tiger_audit_immutable_guard on tiger_audit_event;
create trigger tiger_audit_immutable_guard
before update or delete on tiger_audit_event
for each row execute function tiger_deny_audit_mutation();

alter table tiger_actor enable row level security;
alter table tiger_actor force row level security;
alter table tiger_actor_finance_profile enable row level security;
alter table tiger_actor_finance_profile force row level security;
alter table tiger_purchase enable row level security;
alter table tiger_purchase force row level security;
alter table tiger_idempotency_record enable row level security;
alter table tiger_idempotency_record force row level security;
alter table tiger_visibility_card enable row level security;
alter table tiger_visibility_card force row level security;
alter table tiger_impression_receipt enable row level security;
alter table tiger_impression_receipt force row level security;
alter table tiger_ledger_entry enable row level security;
alter table tiger_ledger_entry force row level security;
alter table tiger_post enable row level security;
alter table tiger_post force row level security;
alter table tiger_audit_event enable row level security;
alter table tiger_audit_event force row level security;

revoke insert, update, delete, truncate, references, trigger on table tiger_actor from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_actor_finance_profile from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_purchase from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_idempotency_record from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_visibility_card from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_impression_receipt from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_ledger_entry from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_post from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_audit_event from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_sector from public;
revoke insert, update, delete, truncate, references, trigger on table tiger_visibility_offer from public;

revoke execute on function tiger_consume_verified_impression(text, text, boolean, timestamptz) from public;

create table if not exists tiger_discount_entry (
  discount_id text primary key,
  purchase_id text not null unique references tiger_purchase(purchase_id) on delete restrict,
  user_id text not null,
  discount_basis_points integer not null check (discount_basis_points = 700),
  amount_micro_jod bigint not null check (amount_micro_jod > 0),
  reason_code text not null check (length(btrim(reason_code)) between 1 and 128),
  created_at timestamptz not null default now(),
  check (length(btrim(discount_id)) between 1 and 128),
  check (length(btrim(user_id)) between 1 and 256)
);

create or replace function tiger_deny_discount_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, tiger_core
as $$
begin
  raise exception 'IMMUTABLE_DISCOUNT_LEDGER';
end;
$$;

drop trigger if exists tiger_discount_immutable_guard on tiger_discount_entry;
create trigger tiger_discount_immutable_guard
before update or delete on tiger_discount_entry
for each row execute function tiger_deny_discount_mutation();

create or replace function tiger_guard_ledger_open()
returns trigger
language plpgsql
set search_path = pg_catalog, tiger_core
as $$
declare
  v_ledger_state text;
begin
  select ledger_state into v_ledger_state
  from tiger_purchase
  where purchase_id = new.purchase_id;

  if v_ledger_state is null then
    raise exception 'PURCHASE_NOT_FOUND';
  end if;

  if v_ledger_state <> 'PENDING' then
    raise exception 'LEDGER_ALREADY_POSTED';
  end if;

  return new;
end;
$$;

drop trigger if exists tiger_ledger_open_guard on tiger_ledger_entry;
create trigger tiger_ledger_open_guard
before insert on tiger_ledger_entry
for each row execute function tiger_guard_ledger_open();

create or replace function tiger_finalize_purchase_ledger(p_purchase_id text)
returns void
language plpgsql
set search_path = pg_catalog, tiger_core
as $$
declare
  v_captured bigint;
  v_ledger_state text;
  v_percent_total bigint;
  v_amount_total bigint;
  v_pending_count integer;
  v_commission_count integer;
  v_commission_basis_points bigint;
  v_sales_reroute_basis_points bigint;
  v_fixed_policy_ok boolean;
begin
  select captured_micro_jod, ledger_state
  into v_captured, v_ledger_state
  from tiger_purchase where purchase_id = p_purchase_id for update;

  if not found then
    raise exception 'PURCHASE_NOT_FOUND';
  end if;

  if v_ledger_state = 'POSTED' then
    return;
  end if;

  select coalesce(sum(percent_basis_points), 0), coalesce(sum(amount_micro_jod), 0)
  into v_percent_total, v_amount_total
  from tiger_ledger_entry
  where purchase_id = p_purchase_id;

  if v_percent_total <> 10000 or v_amount_total <> v_captured then
    raise exception 'LEDGER_NOT_BALANCED';
  end if;

  if exists (
    select 1 from tiger_ledger_entry
    where purchase_id = p_purchase_id
      and amount_micro_jod::numeric * 10000 <> v_captured::numeric * percent_basis_points
  ) then
    raise exception 'LEDGER_ENTRY_AMOUNT_INVALID';
  end if;

  select count(*) into v_pending_count
  from tiger_ledger_entry
  where purchase_id = p_purchase_id
    and account_code = 'PENDING_OWNER_REALLOCATION'
    and percent_basis_points = 1600
    and actor_id is null;

  if v_pending_count <> 1 then
    raise exception 'PENDING_OWNER_REALLOCATION_INVALID';
  end if;

  with expected(account_code, basis_points) as (
    values
      ('OWNER_BASE', 500),
      ('PARTNER_1', 500),
      ('PARTNER_2', 500),
      ('PARTNER_3', 500),
      ('RISK', 800),
      ('MAINTENANCE', 800),
      ('DEVELOPMENT', 800),
      ('TECHNICAL_SUPPORT', 800),
      ('ADVERTISING', 800),
      ('CSR', 300),
      ('PENDING_OWNER_REALLOCATION', 1600)
  ), actual as (
    select account_code, sum(percent_basis_points) as basis_points
    from tiger_ledger_entry
    where purchase_id = p_purchase_id
    group by account_code
  )
  select bool_and(coalesce(actual.basis_points, 0) = expected.basis_points)
  into v_fixed_policy_ok
  from expected
  left join actual using (account_code);

  if v_fixed_policy_ok is not true then
    raise exception 'LEDGER_POLICY_INVALID';
  end if;

  select
    count(*) filter (where kind = 'SALES_COMMISSION'),
    coalesce(sum(percent_basis_points) filter (where kind = 'SALES_COMMISSION'), 0),
    coalesce(sum(percent_basis_points) filter (where account_code = 'OWNER_SALES_REROUTE'), 0)
  into v_commission_count, v_commission_basis_points, v_sales_reroute_basis_points
  from tiger_ledger_entry
  where purchase_id = p_purchase_id;

  if v_commission_count = 0 and v_sales_reroute_basis_points <> 2100 then
    raise exception 'SALES_ENVELOPE_INVALID';
  end if;

  if v_commission_count = 1 and v_sales_reroute_basis_points <> 1400 then
    raise exception 'SALES_ENVELOPE_INVALID';
  end if;

  if v_commission_count = 1 and v_commission_basis_points <> 700 then
    raise exception 'SALES_ENVELOPE_INVALID';
  end if;

  if v_commission_count > 1 then
    raise exception 'MULTIPLE_SALES_WINNERS_FORBIDDEN';
  end if;

  update tiger_purchase set ledger_state = 'POSTED'
  where purchase_id = p_purchase_id;
end;
$$;

alter table tiger_discount_entry enable row level security;
alter table tiger_discount_entry force row level security;
revoke insert, update, delete, truncate, references, trigger on table tiger_discount_entry from public;
revoke execute on function tiger_finalize_purchase_ledger(text) from public;

reset search_path;

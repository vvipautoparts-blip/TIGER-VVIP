begin;

create schema if not exists tsn26_finance;
revoke all on schema tsn26_finance from public;
revoke all on schema tsn26_finance from anon, authenticated;
grant usage on schema tsn26_finance to service_role;

create or replace function tsn26_finance.deny_financial_mutation()
returns trigger
language plpgsql
security definer set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'TSN26_APPEND_ONLY_FINANCIAL_TRUTH';
end;
$$;
revoke all on function tsn26_finance.deny_financial_mutation() from public, anon, authenticated;

create table if not exists tsn26_finance.payment_events (
  event_id text primary key,
  provider text not null check (length(btrim(provider)) > 0),
  provider_event_id text not null check (length(btrim(provider_event_id)) > 0),
  payment_id text not null check (length(btrim(payment_id)) > 0),
  order_id text not null check (length(btrim(order_id)) > 0),
  event_type text not null check (event_type in (
    'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED',
    'PARTIALLY_REFUNDED', 'CHARGEBACK', 'REVERSED'
  )),
  amount_tmu bigint not null check (amount_tmu > 0),
  currency char(3) not null check (currency = upper(currency)),
  occurred_at timestamptz not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create unique index if not exists tsn26_one_capture_per_payment
  on tsn26_finance.payment_events (payment_id)
  where event_type = 'CAPTURED';

create table if not exists tsn26_finance.sale_claims (
  claim_id text primary key,
  seller_uid text not null check (length(btrim(seller_uid)) > 0),
  seller_role text not null check (seller_role in ('GENERAL_MANAGER', 'SECTOR_MANAGER', 'MARKETER')),
  buyer_uid text not null check (length(btrim(buyer_uid)) > 0),
  offer_id text not null check (offer_id in ('T2', 'T10', 'T25', 'T45')),
  sector_id text not null check (length(btrim(sector_id)) > 0),
  country_id text not null check (country_id ~ '^[A-Z]{2}$'),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  nonce text not null unique check (length(btrim(nonce)) > 0),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  signature text not null check (length(btrim(signature)) > 0),
  key_id text not null check (length(btrim(key_id)) > 0),
  status text not null default 'LOCKED' check (status = 'LOCKED'),
  created_at timestamptz not null default now(),
  constraint sale_claim_expiry_after_issue check (expires_at > issued_at)
);

create table if not exists tsn26_finance.settlements (
  settlement_id text primary key,
  transaction_id text not null unique check (length(btrim(transaction_id)) > 0),
  order_id text not null unique check (length(btrim(order_id)) > 0),
  payment_id text not null unique check (length(btrim(payment_id)) > 0),
  constitution_id text not null check (constitution_id = 'TFC-2026.08.001'),
  package_id text not null check (package_id in ('T2', 'T10', 'T25', 'T45')),
  list_price_tmu bigint not null check (list_price_tmu in (2000000, 10000000, 25000000, 45000000)),
  discount_tmu bigint not null check (discount_tmu >= 0),
  collected_tmu bigint not null check (collected_tmu > 0),
  purchase_mode text not null check (purchase_mode in ('DIRECT_SOVEREIGN_PURCHASE', 'ATTRIBUTED')),
  winning_claim_id text references tsn26_finance.sale_claims(claim_id),
  winning_role text check (winning_role is null or winning_role in ('GENERAL_MANAGER', 'SECTOR_MANAGER', 'MARKETER')),
  owner_tmu bigint not null check (owner_tmu >= 0),
  partner_1_tmu bigint not null check (partner_1_tmu >= 0),
  partner_2_tmu bigint not null check (partner_2_tmu >= 0),
  partner_3_tmu bigint not null check (partner_3_tmu >= 0),
  operations_tmu bigint not null check (operations_tmu >= 0),
  fiscal_regulatory_reserve_tmu bigint not null check (fiscal_regulatory_reserve_tmu >= 0),
  general_manager_tmu bigint not null default 0 check (general_manager_tmu >= 0),
  sector_manager_tmu bigint not null default 0 check (sector_manager_tmu >= 0),
  marketer_tmu bigint not null default 0 check (marketer_tmu >= 0),
  sales_absence_tmu bigint not null default 0 check (sales_absence_tmu >= 0),
  rounding_reserve_tmu bigint not null default 0 check (rounding_reserve_tmu >= 0),
  allocated_at timestamptz not null,
  matures_at timestamptz not null,
  epoch_id text not null check (length(btrim(epoch_id)) > 0),
  created_at timestamptz not null default now(),
  constraint package_matches_list_price check (
    (package_id = 'T2' and list_price_tmu = 2000000) or
    (package_id = 'T10' and list_price_tmu = 10000000) or
    (package_id = 'T25' and list_price_tmu = 25000000) or
    (package_id = 'T45' and list_price_tmu = 45000000)
  ),
  constraint collected_equals_list_less_discount check (collected_tmu = list_price_tmu - discount_tmu),
  constraint maturity_is_fourteen_days check (matures_at = allocated_at + interval '14 days'),
  constraint top_level_owner_exact check (owner_tmu * 10000 = collected_tmu * 500),
  constraint top_level_partner_1_exact check (partner_1_tmu * 10000 = collected_tmu * 500),
  constraint top_level_partner_2_exact check (partner_2_tmu * 10000 = collected_tmu * 500),
  constraint top_level_partner_3_exact check (partner_3_tmu * 10000 = collected_tmu * 500),
  constraint top_level_operations_exact check (operations_tmu * 10000 = collected_tmu * 4300),
  constraint top_level_fiscal_exact check (fiscal_regulatory_reserve_tmu * 10000 = collected_tmu * 1600),
  constraint allocation_sum_matches_collected check (
    owner_tmu + partner_1_tmu + partner_2_tmu + partner_3_tmu + operations_tmu +
    fiscal_regulatory_reserve_tmu + general_manager_tmu + sector_manager_tmu +
    marketer_tmu + sales_absence_tmu + rounding_reserve_tmu = collected_tmu
  ),
  constraint one_seller_or_direct_purchase check (
    (purchase_mode = 'DIRECT_SOVEREIGN_PURCHASE' and winning_claim_id is null and winning_role is null and
      discount_tmu * 10000 = list_price_tmu * 700 and general_manager_tmu = 0 and sector_manager_tmu = 0 and marketer_tmu = 0 and
      sales_absence_tmu * 10000 = collected_tmu * 2100 and rounding_reserve_tmu = 0)
    or
    (purchase_mode = 'ATTRIBUTED' and winning_claim_id is not null and winning_role is not null and discount_tmu = 0 and
      sales_absence_tmu * 10000 = collected_tmu * 1400 and rounding_reserve_tmu = 0 and
      ((winning_role = 'GENERAL_MANAGER' and general_manager_tmu * 10000 = collected_tmu * 700 and sector_manager_tmu = 0 and marketer_tmu = 0) or
       (winning_role = 'SECTOR_MANAGER' and sector_manager_tmu * 10000 = collected_tmu * 700 and general_manager_tmu = 0 and marketer_tmu = 0) or
       (winning_role = 'MARKETER' and marketer_tmu * 10000 = collected_tmu * 700 and general_manager_tmu = 0 and sector_manager_tmu = 0)))
  )
);

create table if not exists tsn26_finance.settlement_state_events (
  state_event_id text primary key,
  settlement_id text not null references tsn26_finance.settlements(settlement_id),
  state text not null check (state in ('PENDING', 'VALIDATED', 'VESTED', 'PAYABLE', 'SCHEDULED', 'PAID', 'HELD', 'COMPLIANCE_REVIEW', 'REVERSED', 'CLAWED_BACK')),
  actor_uid text not null check (length(btrim(actor_uid)) > 0),
  reason text,
  external_reference text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table tsn26_finance.payment_events enable row level security;
alter table tsn26_finance.sale_claims enable row level security;
alter table tsn26_finance.settlements enable row level security;
alter table tsn26_finance.settlement_state_events enable row level security;
alter table tsn26_finance.payment_events force row level security;
alter table tsn26_finance.sale_claims force row level security;
alter table tsn26_finance.settlements force row level security;
alter table tsn26_finance.settlement_state_events force row level security;
revoke all on all tables in schema tsn26_finance from public, anon, authenticated;
grant select, insert on tsn26_finance.payment_events to service_role;
grant select, insert on tsn26_finance.sale_claims to service_role;
grant select, insert on tsn26_finance.settlements to service_role;
grant select, insert on tsn26_finance.settlement_state_events to service_role;

create trigger trg_payment_events_append_only before update or delete on tsn26_finance.payment_events
for each row execute function tsn26_finance.deny_financial_mutation();
create trigger trg_sale_claims_append_only before update or delete on tsn26_finance.sale_claims
for each row execute function tsn26_finance.deny_financial_mutation();
create trigger trg_settlements_append_only before update or delete on tsn26_finance.settlements
for each row execute function tsn26_finance.deny_financial_mutation();
create trigger trg_settlement_state_events_append_only before update or delete on tsn26_finance.settlement_state_events
for each row execute function tsn26_finance.deny_financial_mutation();

comment on schema tsn26_finance is 'TSN-26 sovereign financial truth; legacy financial fallback is forbidden.';
comment on table tsn26_finance.settlements is 'Immutable economic settlement proof. State progression is recorded in settlement_state_events.';

commit;

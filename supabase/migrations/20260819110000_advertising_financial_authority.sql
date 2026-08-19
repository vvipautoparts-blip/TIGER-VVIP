-- VVIP TIGER sovereign advertising financial authority.
-- Scope: advertising credit/campaign/verified exposure only. No goods/services checkout.
-- Provider-agnostic; country activation is fail-closed; financial history is append-only.

begin;

create table public.vvip_ad_country_payment_profiles (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  activation_state text not null default 'blocked' check (activation_state in ('blocked','draft','legal_approved','tax_configured','active','suspended')),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  pricing_version text not null,
  provider_contract_verified boolean not null default false,
  settlement_verified boolean not null default false,
  refund_rules_verified boolean not null default false,
  chargeback_rules_verified boolean not null default false,
  live_webhook_verified boolean not null default false,
  updated_at timestamptz not null default statement_timestamp(),
  check (
    activation_state <> 'active'
    or (
      provider_contract_verified
      and settlement_verified
      and refund_rules_verified
      and chargeback_rules_verified
      and live_webhook_verified
    )
  )
);

insert into public.vvip_ad_country_payment_profiles (
  country_code, activation_state, currency_code, pricing_version
) values ('JO','blocked','JOD','UNASSIGNED')
on conflict (country_code) do nothing;

create table public.vvip_ad_payments (
  payment_id text primary key,
  owner_subject text not null check (owner_subject like 'user\_%' escape '\'),
  country_code text not null references public.vvip_ad_country_payment_profiles(country_code),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  pricing_version text not null,
  provider text not null,
  provider_event_id text not null unique,
  amount_minor bigint not null check (amount_minor > 0),
  idempotency_key text not null unique,
  settled_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp()
);

create table public.vvip_ad_financial_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  transaction_type text not null check (transaction_type in ('payment_settlement','refund','campaign_reserve','campaign_release','campaign_spend','chargeback','adjustment')),
  owner_subject text not null check (owner_subject like 'user\_%' escape '\'),
  country_code text not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  pricing_version text not null,
  source_ref text not null,
  idempotency_key text not null unique,
  request_fingerprint text not null,
  created_at timestamptz not null default statement_timestamp()
);

create table public.vvip_ad_ledger_entries (
  entry_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.vvip_ad_financial_transactions(transaction_id) on delete restrict,
  ledger_account text not null check (ledger_account in ('platform_cash','user_ad_credit','campaign_reserved','recognized_revenue','refund_clearing','chargeback_loss')),
  owner_subject text,
  direction text not null check (direction in ('debit','credit')),
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default statement_timestamp(),
  check (owner_subject is null or owner_subject like 'user\_%' escape '\')
);

create index vvip_ad_ledger_entries_tx_idx on public.vvip_ad_ledger_entries(transaction_id);
create index vvip_ad_ledger_entries_wallet_idx on public.vvip_ad_ledger_entries(owner_subject,ledger_account,created_at desc);

create table public.vvip_ad_campaigns (
  campaign_id uuid primary key default gen_random_uuid(),
  owner_subject text not null,
  country_code text not null references public.vvip_ad_country_payment_profiles(country_code),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  pricing_version text not null,
  objective text not null default 'verified_exposure',
  budget_minor bigint not null check (budget_minor > 0),
  spent_minor bigint not null default 0 check (spent_minor >= 0 and spent_minor <= budget_minor),
  campaign_state text not null default 'active' check (campaign_state in ('active','paused','completed','cancelled')),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  check (owner_subject like 'user\_%' escape '\')
);

create index vvip_ad_campaigns_owner_idx on public.vvip_ad_campaigns(owner_subject,created_at desc);
create index vvip_ad_campaigns_delivery_idx on public.vvip_ad_campaigns(campaign_state,country_code,updated_at desc);

create table public.vvip_ad_verified_deliveries (
  delivery_id uuid primary key default gen_random_uuid(),
  exposure_id text not null unique,
  campaign_id uuid not null references public.vvip_ad_campaigns(campaign_id) on delete restrict,
  viewer_evidence_hash text not null,
  visible_ratio numeric(5,4) not null check (visible_ratio >= 0.5000 and visible_ratio <= 1.0000),
  visible_ms integer not null check (visible_ms >= 2000),
  bot_detected boolean not null default false check (bot_detected = false),
  cost_minor bigint not null check (cost_minor > 0),
  delivered_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp()
);

create index vvip_ad_verified_deliveries_campaign_idx on public.vvip_ad_verified_deliveries(campaign_id,delivered_at desc);

alter table public.vvip_ad_country_payment_profiles enable row level security;
alter table public.vvip_ad_country_payment_profiles force row level security;
alter table public.vvip_ad_payments enable row level security;
alter table public.vvip_ad_payments force row level security;
alter table public.vvip_ad_financial_transactions enable row level security;
alter table public.vvip_ad_financial_transactions force row level security;
alter table public.vvip_ad_ledger_entries enable row level security;
alter table public.vvip_ad_ledger_entries force row level security;
alter table public.vvip_ad_campaigns enable row level security;
alter table public.vvip_ad_campaigns force row level security;
alter table public.vvip_ad_verified_deliveries enable row level security;
alter table public.vvip_ad_verified_deliveries force row level security;

revoke all privileges on table public.vvip_ad_country_payment_profiles from public,anon,authenticated;
revoke all privileges on table public.vvip_ad_payments from public,anon,authenticated;
revoke all privileges on table public.vvip_ad_financial_transactions from public,anon,authenticated;
revoke all privileges on table public.vvip_ad_ledger_entries from public,anon,authenticated;
revoke all privileges on table public.vvip_ad_campaigns from public,anon,authenticated;
revoke all privileges on table public.vvip_ad_verified_deliveries from public,anon,authenticated;

grant select on table public.vvip_ad_country_payment_profiles to authenticated;
grant select on table public.vvip_ad_campaigns to authenticated;
grant select on table public.vvip_ad_verified_deliveries to authenticated;

create policy vvip_ad_active_country_profile_read
on public.vvip_ad_country_payment_profiles
for select to authenticated
using (activation_state = 'active');

create policy vvip_ad_campaign_owner_read
on public.vvip_ad_campaigns
for select to authenticated
using (owner_subject = (select public.vvip_marketplace_actor_id()));

create policy vvip_ad_delivery_campaign_owner_read
on public.vvip_ad_verified_deliveries
for select to authenticated
using (
  exists (
    select 1 from public.vvip_ad_campaigns campaign
    where campaign.campaign_id = vvip_ad_verified_deliveries.campaign_id
      and campaign.owner_subject = (select public.vvip_marketplace_actor_id())
  )
);

create function public.vvip_ad_reject_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  raise exception 'AD_FINANCIAL_HISTORY_APPEND_ONLY';
end;
$function$;

create trigger vvip_ad_payments_append_only
before update or delete on public.vvip_ad_payments
for each row execute function public.vvip_ad_reject_ledger_mutation();
create trigger vvip_ad_transactions_append_only
before update or delete on public.vvip_ad_financial_transactions
for each row execute function public.vvip_ad_reject_ledger_mutation();
create trigger vvip_ad_ledger_append_only
before update or delete on public.vvip_ad_ledger_entries
for each row execute function public.vvip_ad_reject_ledger_mutation();
create trigger vvip_ad_deliveries_append_only
before update or delete on public.vvip_ad_verified_deliveries
for each row execute function public.vvip_ad_reject_ledger_mutation();

create function public.vvip_ad_country_payment_active(p_country_code text, p_currency_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.vvip_ad_country_payment_profiles profile
    where profile.country_code = upper(p_country_code)
      and profile.currency_code = upper(p_currency_code)
      and profile.activation_state = 'active'
      and profile.provider_contract_verified
      and profile.settlement_verified
      and profile.refund_rules_verified
      and profile.chargeback_rules_verified
      and profile.live_webhook_verified
  );
$function$;

create function public.vvip_ad_post_balanced_transaction(
  p_transaction_type text,
  p_owner_subject text,
  p_country_code text,
  p_currency_code text,
  p_pricing_version text,
  p_source_ref text,
  p_idempotency_key text,
  p_entries jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_transaction_id uuid;
  v_existing_fingerprint text;
  v_fingerprint text;
  v_balance numeric;
  v_entry record;
begin
  if p_owner_subject is null or p_owner_subject not like 'user\_%' escape '\' then raise exception 'AD_OWNER_INVALID'; end if;
  if p_transaction_type not in ('payment_settlement','refund','campaign_reserve','campaign_release','campaign_spend','chargeback','adjustment') then raise exception 'AD_TRANSACTION_TYPE_INVALID'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then raise exception 'AD_IDEMPOTENCY_KEY_REQUIRED'; end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) < 2 then raise exception 'AD_LEDGER_ENTRIES_REQUIRED'; end if;

  select coalesce(sum(case when entry.direction = 'debit' then entry.amount_minor else -entry.amount_minor end),0)
  into v_balance
  from jsonb_to_recordset(p_entries) as entry(ledger_account text, owner_subject text, direction text, amount_minor bigint);

  if v_balance <> 0 then raise exception 'AD_LEDGER_UNBALANCED: journal must sum to zero'; end if;

  v_fingerprint := md5(concat_ws('|',p_transaction_type,p_owner_subject,upper(p_country_code),upper(p_currency_code),p_pricing_version,p_source_ref,p_entries::text));

  select transaction.transaction_id, transaction.request_fingerprint
  into v_transaction_id, v_existing_fingerprint
  from public.vvip_ad_financial_transactions transaction
  where transaction.idempotency_key = p_idempotency_key;

  if found then
    if v_existing_fingerprint <> v_fingerprint then raise exception 'AD_IDEMPOTENCY_CONFLICT'; end if;
    return v_transaction_id;
  end if;

  insert into public.vvip_ad_financial_transactions (
    transaction_type, owner_subject, country_code, currency_code, pricing_version,
    source_ref, idempotency_key, request_fingerprint
  ) values (
    p_transaction_type, p_owner_subject, upper(p_country_code), upper(p_currency_code),
    p_pricing_version, p_source_ref, p_idempotency_key, v_fingerprint
  ) returning transaction_id into v_transaction_id;

  for v_entry in
    select * from jsonb_to_recordset(p_entries)
      as item(ledger_account text, owner_subject text, direction text, amount_minor bigint)
  loop
    if v_entry.ledger_account not in ('platform_cash','user_ad_credit','campaign_reserved','recognized_revenue','refund_clearing','chargeback_loss') then raise exception 'AD_LEDGER_ACCOUNT_INVALID'; end if;
    if v_entry.direction not in ('debit','credit') then raise exception 'AD_LEDGER_DIRECTION_INVALID'; end if;
    if v_entry.amount_minor is null or v_entry.amount_minor <= 0 then raise exception 'AD_LEDGER_AMOUNT_INVALID'; end if;
    if v_entry.owner_subject is not null and v_entry.owner_subject not like 'user\_%' escape '\' then raise exception 'AD_LEDGER_OWNER_INVALID'; end if;

    insert into public.vvip_ad_ledger_entries (
      transaction_id, ledger_account, owner_subject, direction, amount_minor
    ) values (
      v_transaction_id, v_entry.ledger_account, v_entry.owner_subject, v_entry.direction, v_entry.amount_minor
    );
  end loop;

  return v_transaction_id;
end;
$function$;

create function public.vvip_ad_wallet_balance_for(p_owner_subject text, p_country_code text, p_currency_code text)
returns bigint
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select coalesce(sum(case when entry.direction = 'credit' then entry.amount_minor else -entry.amount_minor end),0)::bigint
  from public.vvip_ad_ledger_entries entry
  join public.vvip_ad_financial_transactions transaction on transaction.transaction_id = entry.transaction_id
  where entry.ledger_account = 'user_ad_credit'
    and entry.owner_subject = p_owner_subject
    and transaction.country_code = upper(p_country_code)
    and transaction.currency_code = upper(p_currency_code);
$function$;

create function public.vvip_ad_wallet_balance(p_country_code text, p_currency_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.vvip_marketplace_actor_id();
  v_balance bigint;
begin
  if v_actor is null or v_actor not like 'user\_%' escape '\' then raise exception 'AD_AUTH_REQUIRED'; end if;
  v_balance := public.vvip_ad_wallet_balance_for(v_actor,p_country_code,p_currency_code);
  return jsonb_build_object('ok',true,'country',upper(p_country_code),'currency',upper(p_currency_code),'available_minor',v_balance);
end;
$function$;

create function public.vvip_ad_post_settled_payment(
  p_payment_id text,
  p_owner_subject text,
  p_country_code text,
  p_currency_code text,
  p_pricing_version text,
  p_provider text,
  p_provider_event_id text,
  p_amount_minor bigint,
  p_idempotency_key text,
  p_settled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_transaction_id uuid;
  v_existing public.vvip_ad_payments%rowtype;
begin
  if not public.vvip_ad_country_payment_active(p_country_code,p_currency_code) then raise exception 'AD_COUNTRY_PAYMENT_NOT_ACTIVE'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'AD_PAYMENT_AMOUNT_INVALID'; end if;
  if p_owner_subject is null or p_owner_subject not like 'user\_%' escape '\' then raise exception 'AD_OWNER_INVALID'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_subject||'|'||upper(p_country_code)||'|'||upper(p_currency_code),0));

  select * into v_existing from public.vvip_ad_payments where payment_id = p_payment_id;
  if found then
    if v_existing.idempotency_key <> p_idempotency_key or v_existing.amount_minor <> p_amount_minor then raise exception 'AD_PAYMENT_IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('ok',true,'payment_id',v_existing.payment_id,'replayed',true);
  end if;

  insert into public.vvip_ad_payments (
    payment_id,owner_subject,country_code,currency_code,pricing_version,provider,
    provider_event_id,amount_minor,idempotency_key,settled_at
  ) values (
    p_payment_id,p_owner_subject,upper(p_country_code),upper(p_currency_code),p_pricing_version,
    p_provider,p_provider_event_id,p_amount_minor,p_idempotency_key,p_settled_at
  );

  v_transaction_id := public.vvip_ad_post_balanced_transaction(
    'payment_settlement',p_owner_subject,p_country_code,p_currency_code,p_pricing_version,
    p_payment_id,'payment:'||p_idempotency_key,
    jsonb_build_array(
      jsonb_build_object('ledger_account','platform_cash','owner_subject',null,'direction','debit','amount_minor',p_amount_minor),
      jsonb_build_object('ledger_account','user_ad_credit','owner_subject',p_owner_subject,'direction','credit','amount_minor',p_amount_minor)
    )
  );

  return jsonb_build_object('ok',true,'payment_id',p_payment_id,'transaction_id',v_transaction_id,'replayed',false);
end;
$function$;

create function public.vvip_ad_post_refund(
  p_refund_id text,
  p_owner_subject text,
  p_country_code text,
  p_currency_code text,
  p_pricing_version text,
  p_amount_minor bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_balance bigint;
  v_transaction_id uuid;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'AD_REFUND_AMOUNT_INVALID'; end if;
  if p_owner_subject is null or p_owner_subject not like 'user\_%' escape '\' then raise exception 'AD_OWNER_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner_subject||'|'||upper(p_country_code)||'|'||upper(p_currency_code),0));
  v_balance := public.vvip_ad_wallet_balance_for(p_owner_subject,p_country_code,p_currency_code);
  if v_balance < p_amount_minor then raise exception 'AD_REFUND_EXCEEDS_AVAILABLE_CREDIT'; end if;

  v_transaction_id := public.vvip_ad_post_balanced_transaction(
    'refund',p_owner_subject,p_country_code,p_currency_code,p_pricing_version,
    p_refund_id,'refund:'||p_idempotency_key,
    jsonb_build_array(
      jsonb_build_object('ledger_account','user_ad_credit','owner_subject',p_owner_subject,'direction','debit','amount_minor',p_amount_minor),
      jsonb_build_object('ledger_account','platform_cash','owner_subject',null,'direction','credit','amount_minor',p_amount_minor)
    )
  );
  return jsonb_build_object('ok',true,'refund_id',p_refund_id,'transaction_id',v_transaction_id);
end;
$function$;

create function public.vvip_ad_create_campaign(
  p_country_code text,
  p_currency_code text,
  p_pricing_version text,
  p_budget_minor bigint,
  p_objective text default 'verified_exposure'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.vvip_marketplace_actor_id();
  v_balance bigint;
  v_campaign_id uuid;
  v_transaction_id uuid;
begin
  if v_actor is null or v_actor not like 'user\_%' escape '\' then raise exception 'AD_AUTH_REQUIRED'; end if;
  if not public.vvip_ad_country_payment_active(p_country_code,p_currency_code) then raise exception 'AD_COUNTRY_PAYMENT_NOT_ACTIVE'; end if;
  if p_budget_minor is null or p_budget_minor <= 0 then raise exception 'AD_CAMPAIGN_BUDGET_INVALID'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_actor||'|'||upper(p_country_code)||'|'||upper(p_currency_code),0));
  v_balance := public.vvip_ad_wallet_balance_for(v_actor,p_country_code,p_currency_code);
  if v_balance < p_budget_minor then raise exception 'AD_INSUFFICIENT_CREDIT'; end if;

  insert into public.vvip_ad_campaigns(owner_subject,country_code,currency_code,pricing_version,objective,budget_minor)
  values(v_actor,upper(p_country_code),upper(p_currency_code),p_pricing_version,p_objective,p_budget_minor)
  returning campaign_id into v_campaign_id;

  v_transaction_id := public.vvip_ad_post_balanced_transaction(
    'campaign_reserve',v_actor,p_country_code,p_currency_code,p_pricing_version,
    v_campaign_id::text,'campaign-reserve:'||v_campaign_id::text,
    jsonb_build_array(
      jsonb_build_object('ledger_account','user_ad_credit','owner_subject',v_actor,'direction','debit','amount_minor',p_budget_minor),
      jsonb_build_object('ledger_account','campaign_reserved','owner_subject',v_actor,'direction','credit','amount_minor',p_budget_minor)
    )
  );

  return jsonb_build_object('ok',true,'campaign_id',v_campaign_id,'transaction_id',v_transaction_id,'reserved_minor',p_budget_minor);
end;
$function$;

create function public.vvip_ad_cancel_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.vvip_marketplace_actor_id();
  v_campaign public.vvip_ad_campaigns%rowtype;
  v_remaining bigint;
  v_transaction_id uuid;
begin
  if v_actor is null or v_actor not like 'user\_%' escape '\' then raise exception 'AD_AUTH_REQUIRED'; end if;
  select * into v_campaign from public.vvip_ad_campaigns where campaign_id=p_campaign_id for update;
  if not found or v_campaign.owner_subject<>v_actor then raise exception 'AD_CAMPAIGN_NOT_FOUND'; end if;
  if v_campaign.campaign_state not in ('active','paused') then return jsonb_build_object('ok',true,'campaign_id',p_campaign_id,'released_minor',0,'replayed',true); end if;

  v_remaining := v_campaign.budget_minor-v_campaign.spent_minor;
  if v_remaining>0 then
    v_transaction_id := public.vvip_ad_post_balanced_transaction(
      'campaign_release',v_actor,v_campaign.country_code,v_campaign.currency_code,v_campaign.pricing_version,
      p_campaign_id::text,'campaign-release:'||p_campaign_id::text,
      jsonb_build_array(
        jsonb_build_object('ledger_account','campaign_reserved','owner_subject',v_actor,'direction','debit','amount_minor',v_remaining),
        jsonb_build_object('ledger_account','user_ad_credit','owner_subject',v_actor,'direction','credit','amount_minor',v_remaining)
      )
    );
  end if;
  update public.vvip_ad_campaigns set campaign_state='cancelled',updated_at=statement_timestamp() where campaign_id=p_campaign_id;
  return jsonb_build_object('ok',true,'campaign_id',p_campaign_id,'released_minor',v_remaining,'transaction_id',v_transaction_id,'replayed',false);
end;
$function$;

create function public.vvip_ad_record_verified_delivery(
  p_exposure_id text,
  p_campaign_id uuid,
  p_viewer_evidence_hash text,
  p_visible_ratio numeric,
  p_visible_ms integer,
  p_bot_detected boolean,
  p_cost_minor bigint,
  p_delivered_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_campaign public.vvip_ad_campaigns%rowtype;
  v_existing public.vvip_ad_verified_deliveries%rowtype;
  v_transaction_id uuid;
begin
  if p_visible_ratio < 0.5 or p_visible_ratio > 1 then raise exception 'AD_DELIVERY_VIEWABILITY_INVALID'; end if;
  if p_visible_ms < 2000 then raise exception 'AD_DELIVERY_DURATION_INVALID'; end if;
  if coalesce(p_bot_detected,true) then raise exception 'AD_DELIVERY_BOT_REJECTED'; end if;
  if p_cost_minor is null or p_cost_minor <= 0 then raise exception 'AD_DELIVERY_COST_INVALID'; end if;
  if p_exposure_id is null or btrim(p_exposure_id)='' then raise exception 'AD_EXPOSURE_ID_REQUIRED'; end if;

  select * into v_existing from public.vvip_ad_verified_deliveries where exposure_id=p_exposure_id;
  if found then
    if v_existing.campaign_id<>p_campaign_id or v_existing.cost_minor<>p_cost_minor then raise exception 'AD_DELIVERY_IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('ok',true,'delivery_id',v_existing.delivery_id,'replayed',true);
  end if;

  select * into v_campaign from public.vvip_ad_campaigns where campaign_id=p_campaign_id for update;
  if not found or v_campaign.campaign_state<>'active' then raise exception 'AD_CAMPAIGN_NOT_ACTIVE'; end if;
  if v_campaign.spent_minor+p_cost_minor>v_campaign.budget_minor then raise exception 'AD_CAMPAIGN_BUDGET_EXCEEDED'; end if;

  insert into public.vvip_ad_verified_deliveries(exposure_id,campaign_id,viewer_evidence_hash,visible_ratio,visible_ms,bot_detected,cost_minor,delivered_at)
  values(p_exposure_id,p_campaign_id,p_viewer_evidence_hash,p_visible_ratio,p_visible_ms,false,p_cost_minor,p_delivered_at)
  returning delivery_id into v_existing.delivery_id;

  v_transaction_id := public.vvip_ad_post_balanced_transaction(
    'campaign_spend',v_campaign.owner_subject,v_campaign.country_code,v_campaign.currency_code,v_campaign.pricing_version,
    p_exposure_id,'delivery:'||p_exposure_id,
    jsonb_build_array(
      jsonb_build_object('ledger_account','campaign_reserved','owner_subject',v_campaign.owner_subject,'direction','debit','amount_minor',p_cost_minor),
      jsonb_build_object('ledger_account','recognized_revenue','owner_subject',null,'direction','credit','amount_minor',p_cost_minor)
    )
  );

  update public.vvip_ad_campaigns
  set spent_minor=spent_minor+p_cost_minor,
      campaign_state=case when spent_minor+p_cost_minor>=budget_minor then 'completed' else campaign_state end,
      updated_at=statement_timestamp()
  where campaign_id=p_campaign_id;

  return jsonb_build_object('ok',true,'delivery_id',v_existing.delivery_id,'transaction_id',v_transaction_id,'replayed',false);
end;
$function$;

create function public.vvip_ad_reconciliation_summary(p_country_code text, p_currency_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_provider_settled bigint;
  v_ledger_settled bigint;
  v_difference bigint;
begin
  select coalesce(sum(payment.amount_minor),0)::bigint into v_provider_settled
  from public.vvip_ad_payments payment
  where payment.country_code=upper(p_country_code) and payment.currency_code=upper(p_currency_code);

  select coalesce(sum(entry.amount_minor),0)::bigint into v_ledger_settled
  from public.vvip_ad_ledger_entries entry
  join public.vvip_ad_financial_transactions transaction on transaction.transaction_id=entry.transaction_id
  where transaction.transaction_type='payment_settlement'
    and transaction.country_code=upper(p_country_code)
    and transaction.currency_code=upper(p_currency_code)
    and entry.ledger_account='platform_cash'
    and entry.direction='debit';

  v_difference:=v_provider_settled-v_ledger_settled;
  return jsonb_build_object('ok',v_difference=0,'country',upper(p_country_code),'currency',upper(p_currency_code),'provider_settled_minor',v_provider_settled,'ledger_settled_minor',v_ledger_settled,'difference_minor',v_difference);
end;
$function$;

revoke all on function public.vvip_ad_reject_ledger_mutation() from public,anon,authenticated;
revoke all on function public.vvip_ad_country_payment_active(text,text) from public,anon,authenticated;
revoke all on function public.vvip_ad_post_balanced_transaction(text,text,text,text,text,text,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.vvip_ad_wallet_balance_for(text,text,text) from public,anon,authenticated,service_role;
revoke all on function public.vvip_ad_wallet_balance(text,text) from public,anon,authenticated;
revoke all on function public.vvip_ad_post_settled_payment(text,text,text,text,text,text,text,bigint,text,timestamptz) from public,anon,authenticated;
revoke all on function public.vvip_ad_post_refund(text,text,text,text,text,bigint,text) from public,anon,authenticated;
revoke all on function public.vvip_ad_create_campaign(text,text,text,bigint,text) from public,anon,authenticated;
revoke all on function public.vvip_ad_cancel_campaign(uuid) from public,anon,authenticated;
revoke all on function public.vvip_ad_record_verified_delivery(text,uuid,text,numeric,integer,boolean,bigint,timestamptz) from public,anon,authenticated;
revoke all on function public.vvip_ad_reconciliation_summary(text,text) from public,anon,authenticated;

grant execute on function public.vvip_ad_wallet_balance(text,text) to authenticated;
grant execute on function public.vvip_ad_create_campaign(text,text,text,bigint,text) to authenticated;
grant execute on function public.vvip_ad_cancel_campaign(uuid) to authenticated;
grant execute on function public.vvip_ad_post_settled_payment(text,text,text,text,text,text,text,bigint,text,timestamptz) to service_role;
grant execute on function public.vvip_ad_post_refund(text,text,text,text,text,bigint,text) to service_role;
grant execute on function public.vvip_ad_record_verified_delivery(text,uuid,text,numeric,integer,boolean,bigint,timestamptz) to service_role;
grant execute on function public.vvip_ad_reconciliation_summary(text,text) to service_role;

comment on table public.vvip_ad_ledger_entries is 'Append-only double-entry advertising ledger. Never used for goods/services checkout.';
comment on table public.vvip_ad_verified_deliveries is 'Verified exposure authority: >=50% visible for >=2s, bot rejected, unique exposure id.';

commit;

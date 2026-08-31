'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sqlPath = path.resolve(__dirname, '../../persistence/postgres/0001_foundation.sql');
function sql() { return fs.readFileSync(sqlPath, 'utf8'); }
function normalized() { return sql().replace(/\s+/g, ' '); }

test('actor schema separates HUMAN and DIGITAL and finance profile is human-only', () => {
  const source = normalized();
  assert.match(source, /create table if not exists tiger_actor/i);
  assert.match(source, /actor_class text not null check \(actor_class in \('HUMAN', 'DIGITAL'\)\)/i);
  assert.match(source, /create table if not exists tiger_actor_finance_profile/i);
  assert.match(source, /create or replace function tiger_guard_human_finance_profile\(\)/i);
  assert.match(source, /actor_class <> 'HUMAN'/i);
  assert.match(source, /DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN/i);
  assert.match(source, /create trigger tiger_actor_finance_profile_human_guard/i);
});

test('sector schema uses stable SEC-001 style ids and seeds the ten current sectors', () => {
  const source = normalized();
  assert.match(source, /create table if not exists tiger_sector/i);
  assert.match(source, /sector_id ~ '\^SEC-\[0-9\]\{3\}\$'/i);
  for (let i = 1; i <= 10; i++) {
    const id = `SEC-${String(i).padStart(3, '0')}`;
    assert.equal(source.includes(`'${id}'`), true, `missing ${id}`);
  }
});

test('foundation persistence contains no password or credential storage columns', () => {
  const source = sql();
  assert.doesNotMatch(source, /\bpassword(?:_hash)?\b/i);
  assert.doesNotMatch(source, /\bcredential(?:s)?\b/i);
  assert.doesNotMatch(source, /encrypted_password/i);
});

test('trusted visibility offer restricts prices and owns authoritative purchased quota', () => {
  const source = normalized();
  assert.match(source, /create table if not exists tiger_visibility_offer/i);
  assert.match(source, /price_micro_jod bigint not null check \(price_micro_jod in \(2000000, 10000000, 20000000, 45000000\)\)/i);
  assert.match(source, /purchased_quota bigint not null check \(purchased_quota > 0\)/i);
});

test('purchase idempotency is durable and fingerprints are mandatory', () => {
  const source = normalized();
  assert.match(source, /create table if not exists tiger_purchase/i);
  assert.match(source, /idempotency_key text not null unique/i);
  assert.match(source, /command_fingerprint text not null/i);
  assert.match(source, /create table if not exists tiger_idempotency_record/i);
  assert.match(source, /idempotency_key text primary key/i);
  assert.match(source, /command_fingerprint text not null/i);
});

test('verified-impression receipts are unique per card and support zero-burn deduplication', () => {
  const source = normalized();
  assert.match(source, /create table if not exists tiger_visibility_card/i);
  assert.match(source, /create table if not exists tiger_impression_receipt/i);
  assert.match(source, /unique \(card_id, receipt_id\)/i);
  assert.match(source, /qualified boolean not null/i);
});

test('verified impression consumption is atomic, row-locked and duplicate-safe', () => {
  const source = normalized();
  assert.match(source, /create or replace function tiger_consume_verified_impression\(/i);
  assert.match(source, /for update/i);
  assert.match(source, /on conflict \(card_id, receipt_id\) do nothing/i);
  assert.match(source, /get diagnostics v_inserted = row_count/i);
  assert.match(source, /if v_inserted = 0 then/i);
  assert.match(source, /if p_qualified is not true then/i);
  assert.match(source, /consumed_quota = consumed_quota \+ 1/i);
  assert.match(source, /when consumed_quota \+ 1 = purchased_quota then 'ENDED'/i);
  assert.match(source, /when consumed_quota \+ 1 = purchased_quota then p_observed_at/i);
});

test('visibility card has no calendar expiry column or time-based card-end expression', () => {
  const source = sql();
  assert.doesNotMatch(source, /card_expires_at/i);
  assert.doesNotMatch(source, /expires_at[^\n]*tiger_visibility_card/i);
  assert.doesNotMatch(source, /ended_at\s*=\s*[^\n]*interval/i);
});

test('ledger uses an explicit account whitelist with pending owner suspense and no TAX_RESERVE', () => {
  const source = normalized();
  assert.match(source, /create table if not exists tiger_ledger_entry/i);
  assert.match(source, /account_code text not null check \(account_code in \(/i);
  assert.match(source, /'PENDING_OWNER_REALLOCATION'/i);
  assert.doesNotMatch(sql(), /\bTAX_RESERVE\b/i);
  assert.match(source, /account_code <> 'PENDING_OWNER_REALLOCATION' or actor_id is null/i);
});

test('ledger beneficiary trigger rejects every digital actor and missing actor', () => {
  const source = normalized();
  assert.match(source, /create or replace function tiger_guard_ledger_beneficiary\(\)/i);
  assert.match(source, /if v_actor_class is null then raise exception 'ACTOR_NOT_FOUND'/i);
  assert.match(source, /if v_actor_class <> 'HUMAN' then raise exception 'DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN'/i);
  assert.match(source, /create trigger tiger_ledger_human_beneficiary_guard/i);
});

test('ledger is append-only and one purchase can have at most one sales commission entry', () => {
  const source = normalized();
  assert.match(source, /create unique index if not exists tiger_one_human_sales_winner_per_purchase/i);
  assert.match(source, /where kind = 'SALES_COMMISSION'/i);
  assert.match(source, /create or replace function tiger_deny_ledger_mutation\(\)/i);
  assert.match(source, /raise exception 'IMMUTABLE_LEDGER'/i);
  assert.match(source, /before update or delete on tiger_ledger_entry/i);
});

test('sales commission beneficiary must be an active verified human in an approved sales role', () => {
  const source = normalized();
  assert.match(source, /select actor_class, active, verified, role_code into v_actor_class, v_active, v_verified, v_role_code/i);
  assert.match(source, /if new.kind = 'SALES_COMMISSION' and \(v_active is not true or v_verified is not true or v_role_code not in \('GENERAL_MANAGER', 'SECTOR_MANAGER', 'MARKETER'\)\)/i);
  assert.match(source, /raise exception 'HUMAN_SALES_WINNER_NOT_ELIGIBLE'/i);
});

test('post persistence cannot be ACTIVE without a paid-card reference', () => {
  const source = normalized();
  assert.match(source, /create table if not exists tiger_post/i);
  assert.match(source, /state text not null check \(state in \('DRAFT', 'READY_FOR_CARD', 'ACTIVE', 'EXPIRED'\)\)/i);
  assert.match(source, /check \(state <> 'ACTIVE' or active_card_id is not null\)/i);
  assert.match(source, /active_card_id text references tiger_visibility_card\(card_id\) on delete restrict/i);
});

test('post expiry is derived from card ended_at plus exactly 24 hours', () => {
  const source = normalized();
  assert.match(source, /create or replace function tiger_post_expires_at\(p_card_ended_at timestamptz\)/i);
  assert.match(source, /p_card_ended_at \+ interval '24 hours'/i);
});

test('purchase and visibility card post references become durable foreign keys', () => {
  const source = normalized();
  assert.match(source, /foreign key \(post_id\) references tiger_post\(post_id\) on delete restrict/i);
});

test('audit events are append-only and preserve actor, policy, reason and result context', () => {
  const source = normalized();
  assert.match(source, /create table if not exists tiger_audit_event/i);
  for (const column of ['actor_id', 'event_type', 'policy_id', 'reason_code', 'result_code', 'event_payload', 'created_at']) {
    assert.equal(source.includes(`${column} `), true, `missing audit field ${column}`);
  }
  assert.match(source, /create or replace function tiger_deny_audit_mutation\(\)/i);
  assert.match(source, /raise exception 'IMMUTABLE_AUDIT'/i);
  assert.match(source, /before update or delete on tiger_audit_event/i);
});

test('ACTIVE post card reference must resolve to the same post context', () => {
  const source = normalized();
  assert.match(source, /create or replace function tiger_guard_post_card_link\(\)/i);
  assert.match(source, /where card_id = new.active_card_id and post_id = new.post_id/i);
  assert.match(source, /raise exception 'PAID_CARD_REQUIRED'/i);
  assert.match(source, /create trigger tiger_post_card_link_guard/i);
});

const sensitiveTables = [
  'tiger_actor',
  'tiger_actor_finance_profile',
  'tiger_purchase',
  'tiger_idempotency_record',
  'tiger_visibility_card',
  'tiger_impression_receipt',
  'tiger_ledger_entry',
  'tiger_post',
  'tiger_audit_event',
  'tiger_discount_entry',
];

test('sensitive tables enable and force RLS fail-closed', () => {
  const source = normalized();
  for (const table of sensitiveTables) {
    assert.match(source, new RegExp(`alter table ${table} enable row level security`, 'i'), `RLS not enabled for ${table}`);
    assert.match(source, new RegExp(`alter table ${table} force row level security`, 'i'), `RLS not forced for ${table}`);
  }
});

test('ordinary PUBLIC database access has no direct write privileges on protected tables', () => {
  const source = normalized();
  for (const table of [...sensitiveTables, 'tiger_sector', 'tiger_visibility_offer']) {
    assert.match(source, new RegExp(`revoke insert, update, delete, truncate, references, trigger on table ${table} from public`, 'i'), `write revoke missing for ${table}`);
  }
});

test('verified-impression mutation function is not executable by PUBLIC by default', () => {
  const source = normalized();
  assert.match(source, /revoke execute on function tiger_consume_verified_impression\(text, text, boolean, timestamptz\) from public/i);
});

test('self-service discount has a dedicated append-only ledger separate from captured allocation', () => {
  const source = normalized();
  assert.match(source, /create table if not exists tiger_discount_entry/i);
  assert.match(source, /discount_basis_points integer not null check \(discount_basis_points = 700\)/i);
  assert.match(source, /amount_micro_jod bigint not null check \(amount_micro_jod > 0\)/i);
  assert.match(source, /reason_code text not null/i);
  assert.match(source, /create trigger tiger_discount_immutable_guard/i);
  const ledgerTable = source.match(/create table if not exists tiger_ledger_entry \((.*?)\);/i)?.[1] || '';
  assert.doesNotMatch(ledgerTable, /SELF_SERVICE_DISCOUNT/i);
});

test('ledger finalization locks purchase and requires exact 100 percent and captured amount', () => {
  const source = normalized();
  assert.match(source, /ledger_state text not null default 'PENDING' check \(ledger_state in \('PENDING', 'POSTED'\)\)/i);
  assert.match(source, /create or replace function tiger_finalize_purchase_ledger\(p_purchase_id text\)/i);
  assert.match(source, /from tiger_purchase where purchase_id = p_purchase_id for update/i);
  assert.match(source, /if v_percent_total <> 10000 or v_amount_total <> v_captured then/i);
  assert.match(source, /raise exception 'LEDGER_NOT_BALANCED'/i);
  assert.match(source, /update tiger_purchase set ledger_state = 'POSTED'/i);
});

test('ledger finalization requires the unresolved 16 percent to remain unassigned suspense', () => {
  const source = normalized();
  assert.match(source, /account_code = 'PENDING_OWNER_REALLOCATION'/i);
  assert.match(source, /percent_basis_points = 1600/i);
  assert.match(source, /actor_id is null/i);
  assert.match(source, /raise exception 'PENDING_OWNER_REALLOCATION_INVALID'/i);
});

test('finalized purchase ledger cannot accept later entries', () => {
  const source = normalized();
  assert.match(source, /create or replace function tiger_guard_ledger_open\(\)/i);
  assert.match(source, /select ledger_state into v_ledger_state from tiger_purchase where purchase_id = new.purchase_id/i);
  assert.match(source, /if v_ledger_state <> 'PENDING' then raise exception 'LEDGER_ALREADY_POSTED'/i);
  assert.match(source, /create trigger tiger_ledger_open_guard/i);
});

test('finalization validates each row amount against its basis points and the approved fixed policy', () => {
  const source = normalized();
  assert.match(source, /amount_micro_jod::numeric \* 10000 <> v_captured::numeric \* percent_basis_points/i);
  for (const pair of [
    ["OWNER_BASE", 500], ["PARTNER_1", 500], ["PARTNER_2", 500], ["PARTNER_3", 500],
    ["RISK", 800], ["MAINTENANCE", 800], ["DEVELOPMENT", 800], ["TECHNICAL_SUPPORT", 800], ["ADVERTISING", 800], ["CSR", 300],
    ["PENDING_OWNER_REALLOCATION", 1600],
  ]) {
    assert.equal(source.includes(`('${pair[0]}', ${pair[1]})`), true, `missing fixed policy ${pair[0]}`);
  }
  assert.match(source, /v_commission_count = 0 and v_sales_reroute_basis_points <> 2100/i);
  assert.match(source, /v_commission_count = 1 and v_sales_reroute_basis_points <> 1400/i);
  assert.match(source, /v_commission_basis_points <> 700/i);
});

test('cleanroom persistence is isolated in tiger_core schema with PUBLIC create revoked', () => {
  const source = normalized();
  assert.match(source, /create schema if not exists tiger_core/i);
  assert.match(source, /revoke create on schema tiger_core from public/i);
  assert.match(source, /set search_path = tiger_core, pg_catalog/i);
  assert.match(source, /reset search_path/i);
});

test('table-accessing functions pin a safe search_path', () => {
  const source = normalized();
  for (const fn of [
    'tiger_guard_human_finance_profile',
    'tiger_consume_verified_impression',
    'tiger_guard_ledger_beneficiary',
    'tiger_guard_ledger_open',
    'tiger_guard_post_card_link',
    'tiger_finalize_purchase_ledger',
  ]) {
    const pattern = new RegExp(`create or replace function ${fn}\\([^$]*?set search_path = pg_catalog, tiger_core`, 'i');
    assert.match(source, pattern, `safe search_path missing for ${fn}`);
  }
});

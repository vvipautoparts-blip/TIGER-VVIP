'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SQL_PATH = path.resolve(__dirname, '../supabase/migrations/20260826_tsn26_sovereign_financial_core.sql');

function sql() {
  return fs.readFileSync(SQL_PATH, 'utf8');
}

test('TSN-26 finance schema is isolated and deny-by-default', () => {
  const text = sql();
  assert.match(text, /create schema if not exists tsn26_finance/i);
  assert.match(text, /revoke all on schema tsn26_finance from public/i);
  assert.match(text, /enable row level security/i);
});

test('payment event ingestion has provider-event and captured-payment idempotency', () => {
  const text = sql();
  assert.match(text, /unique\s*\(provider, provider_event_id\)/i);
  assert.match(text, /unique index[\s\S]*payment_id[\s\S]*where event_type = 'CAPTURED'/i);
});

test('sale claims are locked to the three sovereign seller roles and canonical packages', () => {
  const text = sql();
  assert.match(text, /GENERAL_MANAGER/);
  assert.match(text, /SECTOR_MANAGER/);
  assert.match(text, /MARKETER/);
  assert.match(text, /offer_id in \('T2', 'T10', 'T25', 'T45'\)/i);
});

test('database settlement contract independently enforces commercial percentages', () => {
  const text = sql();
  for (const bps of ['500', '4300', '1600', '2100', '700', '1400']) {
    assert.match(text, new RegExp(`\\*\\s*${bps}\\b`));
  }
  assert.match(text, /allocation_sum_matches_collected/i);
  assert.match(text, /one_seller_or_direct_purchase/i);
});

test('financial truth tables reject update and delete through append-only trigger', () => {
  const text = sql();
  assert.match(text, /tsn26_finance\.deny_financial_mutation/i);
  for (const table of ['payment_events', 'sale_claims', 'settlements', 'settlement_state_events']) {
    assert.match(text, new RegExp(`trigger[\\s\\S]*${table}[\\s\\S]*deny_financial_mutation`, 'i'));
  }
});

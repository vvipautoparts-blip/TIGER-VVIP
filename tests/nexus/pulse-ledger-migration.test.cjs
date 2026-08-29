'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20260829213000_nexus_pulse_verified_delivery.sql');

function sql() {
  return fs.readFileSync(migrationPath, 'utf8');
}

test('Pulse ledger migration defines non-expiring grants, allocation slices, reservations, receipts, and append-only ledger', () => {
  const source = sql();
  for (const table of [
    'vvip_pulse_grants',
    'vvip_pulse_allocations',
    'vvip_pulse_reservations',
    'vvip_pulse_delivery_receipts',
    'vvip_pulse_ledger'
  ]) assert.match(source, new RegExp(`create table public\\.${table}\\b`, 'i'));

  assert.match(source, /level\s+text[\s\S]*PULSE_2[\s\S]*PULSE_10[\s\S]*PULSE_25[\s\S]*PULSE_45/i);
  assert.doesNotMatch(source, /PULSE_(?:3|20|35|80|120)\b/i);
  const grantsBlock = source.match(/create table public\.vvip_pulse_grants\s*\(([\s\S]*?)\n\);/i)?.[1] || '';
  assert.doesNotMatch(grantsBlock, /\bexpires_at\b/i);
  assert.match(source, /PULSE_LEDGER_IMMUTABLE/i);
});

test('browser-facing Pulse RPCs are owner-scoped while issuance and delivery settlement stay service-role only', () => {
  const source = sql();
  assert.match(source, /create function public\.vvip_pulse_vault_read\s*\(\s*\)/i);
  assert.match(source, /create function public\.vvip_pulse_allocate\s*\(/i);
  assert.match(source, /create function public\.vvip_pulse_pause_allocation\s*\(/i);
  assert.match(source, /create function public\.vvip_pulse_mode_set\s*\(/i);
  assert.match(source, /grant execute on function public\.vvip_pulse_vault_read\(\)[\s\S]*to authenticated/i);
  assert.match(source, /grant execute on function public\.vvip_pulse_allocate\(uuid, bigint, text, text\)[\s\S]*to authenticated/i);
  assert.match(source, /grant execute on function public\.vvip_pulse_pause_allocation\(uuid, text\)[\s\S]*to authenticated/i);
  assert.match(source, /grant execute on function public\.vvip_pulse_mode_set\(uuid, text, text\)[\s\S]*to authenticated/i);

  for (const signature of [
    'vvip_pulse_grant_issue\\(text, text, bigint, text, text, text\\)',
    'vvip_pulse_delivery_reserve\\(uuid, text, text\\)',
    'vvip_pulse_delivery_mark_served\\(uuid, text\\)',
    'vvip_pulse_delivery_verify\\(uuid, numeric, integer, boolean, boolean, boolean, boolean, boolean, text, text\\)',
    'vvip_pulse_opportunity_set\\(uuid, text, text, text\\)'
  ]) {
    assert.match(source, new RegExp(`grant execute on function public\\.${signature}[\\s\\S]*to service_role`, 'i'));
    assert.doesNotMatch(source, new RegExp(`grant execute on function public\\.${signature}[\\s\\S]{0,120}to authenticated`, 'i'));
  }
});

test('verified delivery enforces ProofView V1 and zero-burn before consumption', () => {
  const source = sql();
  assert.match(source, /PROOFVIEW_V1/);
  assert.match(source, /viewport_ratio\s*<\s*0\.5/i);
  assert.match(source, /continuous_ms\s*<\s*2000/i);
  assert.match(source, /PROOFVIEW_BACKGROUND/);
  assert.match(source, /PROOFVIEW_INVALID_TRAFFIC/);
  assert.match(source, /PROOFVIEW_DUPLICATE/);
  assert.match(source, /PROOFVIEW_RESERVATION_INVALID/);
  assert.match(source, /set\s+consumed_units\s*=\s*consumed_units\s*\+\s*1/i);
  assert.match(source, /consume_units/i);
  assert.match(source, /check \(consumed_units \+ released_units <= allocation_units\)/i);
});

test('allocation and reservation paths are idempotent and conserve purchased units', () => {
  const source = sql();
  assert.match(source, /idempotency_key\s+text\s+not null/i);
  assert.match(source, /unique\s*\(owner_subject, idempotency_key\)/i);
  assert.match(source, /allocation_group_id/i);
  assert.match(source, /for update/i);
  assert.match(source, /PULSE_INSUFFICIENT_AVAILABLE/i);
  assert.match(source, /PULSE_DELIVERY_SETTLEMENT_PENDING/i);
  assert.match(source, /state\s+text\s+not null\s+default\s+'ACTIVE'[\s\S]*'PAUSED'[\s\S]*'DEPLETED'/i);
});

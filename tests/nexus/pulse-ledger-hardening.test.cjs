'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20260829213000_nexus_pulse_verified_delivery.sql');
const source = fs.readFileSync(migrationPath, 'utf8');

function functionBody(name) {
  const marker = `create function public.${name}`;
  const start = source.toLowerCase().indexOf(marker.toLowerCase());
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.toLowerCase().indexOf('\ncreate function public.', start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

test('append-only Pulse ledger idempotency never resolves conflicts with UPDATE', () => {
  const body = functionBody('vvip_pulse_append_ledger');
  assert.match(body, /on conflict\s*\(owner_subject,\s*idempotency_key\)\s*do nothing/i);
  assert.doesNotMatch(body, /on conflict[\s\S]*do update/i);
  assert.match(body, /select\s+ledger_id[\s\S]*owner_subject\s*=\s*p_owner[\s\S]*idempotency_key\s*=\s*p_idempotency_key/i);
});

test('grant issuance is concurrency-safe for the same purchase reference', () => {
  const body = functionBody('vvip_pulse_grant_issue');
  assert.match(body, /pg_advisory_xact_lock[\s\S]*p_purchase_reference/i);
  assert.match(body, /purchase_reference\s*=\s*btrim\(p_purchase_reference\)/i);
});

test('reservation replay lookup is scoped through the allocation owner and group', () => {
  const body = functionBody('vvip_pulse_delivery_reserve');
  assert.match(body, /from public\.vvip_pulse_reservations\s+reservation[\s\S]*join public\.vvip_pulse_allocations\s+allocation/i);
  assert.match(body, /allocation\.allocation_group_id\s*=\s*p_allocation_group_id/i);
  assert.match(body, /reservation\.owner_subject\s*=\s*allocation\.owner_subject/i);
  assert.match(body, /reservation\.idempotency_key\s*=\s*p_idempotency_key/i);
});

test('expired served or reserved delivery is released as zero-burn without consuming a unit', () => {
  const served = functionBody('vvip_pulse_delivery_mark_served');
  assert.match(served, /lease_expires_at\s*<=\s*statement_timestamp\(\)[\s\S]*state\s*=\s*'RELEASED'/i);
  assert.match(served, /RESERVATION_RELEASED/i);
  assert.match(served, /PROOFVIEW_RESERVATION_INVALID/i);
  assert.doesNotMatch(served, /set\s+consumed_units/i);

  const verify = functionBody('vvip_pulse_delivery_verify');
  assert.match(verify, /PROOFVIEW_RESERVATION_INVALID/i);
  assert.match(verify, /ZERO_BURN/i);
  assert.match(verify, /consume_units[\s\S]*0/i);
  assert.doesNotMatch(verify, /lease_expires_at\s*<=\s*statement_timestamp\(\)[\s\S]{0,220}raise exception 'PROOFVIEW_RESERVATION_INVALID'/i);
});

test('ordinary browser roles have no direct write privilege on Pulse settlement tables', () => {
  for (const table of [
    'vvip_pulse_grants',
    'vvip_pulse_allocations',
    'vvip_pulse_reservations',
    'vvip_pulse_delivery_receipts',
    'vvip_pulse_ledger'
  ]) {
    assert.match(source, new RegExp(`revoke all privileges on table public\\.${table} from public, anon, authenticated`, 'i'));
  }
  assert.doesNotMatch(source, /grant\s+(?:insert|update|delete|all privileges)[\s\S]{0,120}vvip_pulse_(?:grants|allocations|reservations|delivery_receipts|ledger)[\s\S]{0,120}authenticated/i);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260823041000_tsrf_server_time_authority_hardening.sql',
);

function sqlText() {
  return fs.readFileSync(migrationPath, 'utf8');
}

function functionBlock(sql, functionName) {
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}\\s*\\([^)]*\\)[\\s\\S]*?\\$\\$;`,
    'i',
  );
  return sql.match(pattern)?.[0] || '';
}

const secureFunctions = Object.freeze([
  'consume_ai_owner_stepup_authorization',
  'reserve_ai_runtime_capacity',
  'settle_ai_runtime_capacity',
  'release_ai_runtime_capacity',
  'expire_ai_runtime_reservations',
  'append_ai_audit_chain_event',
]);

test('hardening source exists and is explicitly source-only', () => {
  const sql = sqlText();
  assert.match(sql, /source only/i);
  assert.doesNotMatch(sql, /supabase\s+db\s+push/i);
  assert.doesNotMatch(sql, /psql\s+/i);
});

test('legacy caller-time TSRF signatures lose service-role execution authority', () => {
  const sql = sqlText();
  const legacySignatures = [
    'consume_ai_owner_stepup_authorization(uuid, text, text, text, text, text, text, numeric, timestamptz)',
    'reserve_ai_runtime_capacity(text, text, text, text, text, bigint, timestamptz, integer)',
    'settle_ai_runtime_capacity(uuid, bigint, timestamptz)',
    'release_ai_runtime_capacity(uuid, timestamptz)',
    'expire_ai_runtime_reservations(timestamptz, integer)',
    'append_ai_audit_chain_event(text, text, text, text, text, text, text, text, text, jsonb, timestamptz)',
  ];

  for (const signature of legacySignatures) {
    const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      sql,
      new RegExp(`revoke\\s+execute\\s+on\\s+function\\s+public\\.${escaped}\\s+from\\s+service_role`, 'i'),
      `legacy caller-time signature must be revoked: ${signature}`,
    );
  }
});

test('secure TSRF overloads never accept p_now and derive time from the database', () => {
  const sql = sqlText();

  for (const name of secureFunctions) {
    const block = functionBlock(sql, name);
    assert.notEqual(block, '', `${name} secure overload must exist`);
    assert.doesNotMatch(block, /\bp_now\b/i, `${name} must not accept or trust caller time`);
    assert.match(block, /statement_timestamp\(\)/i, `${name} must derive authority time from database`);
  }
});

test('secure overload signatures are browser-denied and service-role only', () => {
  const sql = sqlText();
  const secureSignatures = [
    'consume_ai_owner_stepup_authorization(uuid, text, text, text, text, text, text, numeric)',
    'reserve_ai_runtime_capacity(text, text, text, text, text, bigint, integer)',
    'settle_ai_runtime_capacity(uuid, bigint)',
    'release_ai_runtime_capacity(uuid)',
    'expire_ai_runtime_reservations(integer)',
    'append_ai_audit_chain_event(text, text, text, text, text, text, text, text, text, jsonb)',
  ];

  for (const signature of secureSignatures) {
    const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      sql,
      new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${escaped}\\s+from\\s+public,\\s*anon,\\s*authenticated`, 'i'),
      `secure signature must deny browser/public execution: ${signature}`,
    );
    assert.match(
      sql,
      new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${escaped}\\s+to\\s+service_role`, 'i'),
      `secure signature must be service-role only: ${signature}`,
    );
  }
});

test('runtime budget and rate buckets are derived from database server time', () => {
  const sql = sqlText();
  const reserve = functionBlock(sql, 'reserve_ai_runtime_capacity');

  assert.match(reserve, /v_server_now\s+timestamptz\s*:=\s*statement_timestamp\(\)/i);
  assert.match(reserve, /v_day\s+date\s*:=\s*\(v_server_now\s+at\s+time\s+zone\s+'UTC'\)::date/i);
  assert.match(reserve, /v_minute_bucket\s+timestamptz\s*:=\s*date_trunc\('minute',\s*v_server_now\)/i);
  assert.match(reserve, /created_at,\s*expires_at/i);
  assert.match(reserve, /v_server_now\s*\+\s*make_interval/i);
});

test('owner step-up replay and expiry decisions are bound to database time', () => {
  const sql = sqlText();
  const consume = functionBlock(sql, 'consume_ai_owner_stepup_authorization');

  assert.match(consume, /status\s*<>\s*'verified'/i);
  assert.match(consume, /not_before/i);
  assert.match(consume, /expires_at/i);
  assert.match(consume, /v_server_now/i);
  assert.match(consume, /STEPUP_REPLAY_OR_CONFLICT/i);
  assert.match(consume, /STEPUP_CONSUMED/i);
});

test('reservation lifecycle and audit timestamps are written from database time', () => {
  const sql = sqlText();

  for (const name of [
    'settle_ai_runtime_capacity',
    'release_ai_runtime_capacity',
    'expire_ai_runtime_reservations',
    'append_ai_audit_chain_event',
  ]) {
    const block = functionBlock(sql, name);
    assert.match(block, /v_server_now/i, `${name} must use v_server_now`);
  }

  assert.match(functionBlock(sql, 'settle_ai_runtime_capacity'), /settled_at\s*=\s*v_server_now/i);
  assert.match(functionBlock(sql, 'release_ai_runtime_capacity'), /released_at\s*=\s*v_server_now/i);
  assert.match(functionBlock(sql, 'expire_ai_runtime_reservations'), /expired_at\s*=\s*v_server_now/i);
  assert.match(functionBlock(sql, 'append_ai_audit_chain_event'), /p_metadata,\s*v_server_now/i);
});

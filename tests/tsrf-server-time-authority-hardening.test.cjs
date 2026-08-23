'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const migrationPath = path.join(root, 'supabase', 'migrations', '20260823041000_tsrf_server_time_authority_hardening.sql');
const runtimePath = path.join(root, 'supabase', 'migrations', '20260808131000_tsrf_ai_runtime_atomicity.sql');
const ownerStepupPath = path.join(root, 'supabase', 'migrations', '20260808132000_tsrf_owner_authorization_leases.sql');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
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
  const sql = read(migrationPath);
  assert.match(sql, /source only/i);
  assert.doesNotMatch(sql, /supabase\s+db\s+push/i);
  assert.doesNotMatch(sql, /psql\s+/i);
});

test('legacy caller-time TSRF signatures lose service-role execution authority', () => {
  const sql = read(migrationPath);
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

test('secure TSRF overloads own authority time and use a safe definer path', () => {
  const sql = read(migrationPath);

  for (const name of secureFunctions) {
    const block = functionBlock(sql, name);
    assert.notEqual(block, '', `${name} secure overload must exist`);
    assert.doesNotMatch(block, /\bp_now\b/i, `${name} must not accept or trust caller time`);
    assert.match(block, /v_server_now\s+timestamptz\s*:=\s*statement_timestamp\(\)/i);
    assert.match(block, /security\s+definer\s+set\s+search_path\s*=\s*public,\s*pg_temp/i);
  }
});

test('secure overload signatures are browser-denied and service-role only', () => {
  const sql = read(migrationPath);
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
    assert.match(sql, new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${escaped}\\s+from\\s+public,\\s*anon,\\s*authenticated`, 'i'));
    assert.match(sql, new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${escaped}\\s+to\\s+service_role`, 'i'));
  }
});

test('runtime budget/rate buckets keep reviewed semantics but receive only database time', () => {
  const historical = read(runtimePath);
  const hardened = functionBlock(read(migrationPath), 'reserve_ai_runtime_capacity');

  assert.match(historical, /v_day\s+date\s*:=\s*\(p_now\s+at\s+time\s+zone\s+'UTC'\)::date/i);
  assert.match(historical, /v_minute_bucket\s+timestamptz\s*:=\s*date_trunc\('minute',\s*p_now\)/i);
  assert.match(hardened, /public\.reserve_ai_runtime_capacity\([\s\S]*v_server_now,\s*p_ttl_seconds[\s\S]*\)/i);
});

test('owner step-up keeps exact binding/replay semantics while wrapper supplies database time', () => {
  const historical = functionBlock(read(ownerStepupPath), 'consume_ai_owner_stepup_authorization');
  const hardened = functionBlock(read(migrationPath), 'consume_ai_owner_stepup_authorization');

  assert.match(historical, /status\s*<>\s*'verified'/i);
  assert.match(historical, /not_before/i);
  assert.match(historical, /expires_at/i);
  assert.match(historical, /STEPUP_REPLAY_OR_CONFLICT/i);
  assert.match(historical, /STEPUP_CONSUMED/i);
  assert.match(hardened, /p_requested_rollout_percent,\s*v_server_now[\s\S]*\)/i);
});

test('reservation lifecycle and audit wrappers pass database time into reviewed atomic implementations', () => {
  const sql = read(migrationPath);
  const expectations = [
    ['settle_ai_runtime_capacity', /p_actual_cost_microusd,\s*v_server_now/],
    ['release_ai_runtime_capacity', /p_reservation_id,\s*v_server_now/],
    ['expire_ai_runtime_reservations', /v_server_now,\s*p_limit/],
    ['append_ai_audit_chain_event', /p_metadata,\s*v_server_now/],
  ];

  for (const [name, pattern] of expectations) {
    const block = functionBlock(sql, name);
    assert.match(block, pattern, `${name} must pass database time to the reviewed implementation`);
  }

  const historical = read(runtimePath);
  assert.match(historical, /settled_at\s*=\s*p_now/i);
  assert.match(historical, /released_at\s*=\s*p_now/i);
  assert.match(historical, /expired_at\s*=\s*p_now/i);
  assert.match(historical, /p_metadata,\s*p_now/i);
});

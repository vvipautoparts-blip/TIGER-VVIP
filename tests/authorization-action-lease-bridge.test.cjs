'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const authz = require('../scripts/security/authorization-runtime-bridge.js');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260823052000_sensitive_action_lease_runtime.sql',
);

const D64_A = 'a'.repeat(64);

function scope() {
  return {
    resource_scope: { kind: 'profile', ids: ['profile:target'] },
    sector_scope: ['social'],
    entity_scope: ['profile:target'],
    geo_policy_scope: ['JO'],
  };
}

function makeBridge(overrides = {}) {
  return authz.createSensitiveActionLeaseBridge({
    issuePersistentSensitiveActionLease: async () => ({
      ok: true,
      reason_code: 'SENSITIVE_ACTION_LEASE_ISSUED',
      lease_id: '11111111-1111-4111-8111-111111111111',
      expires_at: '2026-08-23T00:01:00.000Z',
    }),
    consumePersistentSensitiveActionLease: async () => ({
      ok: true,
      reason_code: 'SENSITIVE_ACTION_LEASE_CONSUMED',
      lease_id: '11111111-1111-4111-8111-111111111111',
    }),
    ...overrides,
  });
}

function actionInput(overrides = {}) {
  return {
    grant_id: '22222222-2222-4222-8222-222222222222',
    authenticated_principal: 'partner:alpha',
    action: 'GRANT_PERMISSION',
    requested_scope: scope(),
    nonce_hash: D64_A,
    policy_version: '2026-08-23',
    audit_evidence_ref: 'audit:authz-action:001',
    snapshot: Object.freeze({
      execution_authority: false,
      management_capabilities: ['GRANT_PERMISSION'],
      expires_at: '2099-01-01T00:00:00.000Z',
    }),
    ...overrides,
  };
}

test('sensitive action bridge requires persistent issue and atomic consume authority ports', () => {
  assert.throws(() => authz.createSensitiveActionLeaseBridge({}), /persistent|issue|consume|authority/i);
});

test('stale snapshot cannot authorize issuance after persistent grant authority reports revocation', async () => {
  const bridge = makeBridge({
    issuePersistentSensitiveActionLease: async () => ({
      ok: false,
      reason_code: 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE',
    }),
  });

  const result = await bridge.requestSensitiveActionLease(actionInput());
  assert.deepEqual(result, {
    ok: false,
    reason_code: 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE',
    lease_id: null,
  });
});

test('client-generated scope digest is rejected before persistent authority is called', async () => {
  let calls = 0;
  const bridge = makeBridge({
    issuePersistentSensitiveActionLease: async () => {
      calls += 1;
      return { ok: true, reason_code: 'SENSITIVE_ACTION_LEASE_ISSUED', lease_id: 'x' };
    },
  });

  await assert.rejects(
    bridge.requestSensitiveActionLease(actionInput({ scope_digest: D64_A })),
    /scope.*digest|database|authority/i,
  );
  await assert.rejects(
    bridge.requestSensitiveActionLease(actionInput({
      requested_scope: { ...scope(), scope_digest: D64_A },
    })),
    /scope.*digest|database|authority/i,
  );
  assert.equal(calls, 0);
});

test('request sends canonical scope and policy but never snapshot or client scope digest', async () => {
  let received = null;
  const bridge = makeBridge({
    issuePersistentSensitiveActionLease: async (input) => {
      received = input;
      return {
        ok: true,
        reason_code: 'SENSITIVE_ACTION_LEASE_ISSUED',
        lease_id: '11111111-1111-4111-8111-111111111111',
        expires_at: '2026-08-23T00:01:00.000Z',
      };
    },
  });

  const result = await bridge.requestSensitiveActionLease(actionInput());
  assert.equal(result.ok, true);
  assert.deepEqual(received, {
    grant_id: '22222222-2222-4222-8222-222222222222',
    principal: 'partner:alpha',
    action: 'GRANT_PERMISSION',
    resource_scope: { kind: 'profile', ids: ['profile:target'] },
    sector_scope: ['social'],
    entity_scope: ['profile:target'],
    geo_policy_scope: ['JO'],
    nonce_hash: D64_A,
    policy_version: '2026-08-23',
    audit_evidence_ref: 'audit:authz-action:001',
  });
  assert.equal(Object.hasOwn(received, 'snapshot'), false);
  assert.equal(Object.hasOwn(received, 'scope_digest'), false);
});

test('concurrent/replayed consume is canonicalized by persistent authority: exactly one success', async () => {
  let consumeCalls = 0;
  const bridge = makeBridge({
    consumePersistentSensitiveActionLease: async () => {
      consumeCalls += 1;
      if (consumeCalls === 1) {
        return {
          ok: true,
          reason_code: 'SENSITIVE_ACTION_LEASE_CONSUMED',
          lease_id: '11111111-1111-4111-8111-111111111111',
        };
      }
      return {
        ok: false,
        reason_code: 'SENSITIVE_PERMISSION_LEASE_REPLAY_OR_CONFLICT',
        lease_id: '11111111-1111-4111-8111-111111111111',
      };
    },
  });

  const input = {
    lease_id: '11111111-1111-4111-8111-111111111111',
    authenticated_principal: 'partner:alpha',
    action: 'GRANT_PERMISSION',
    requested_scope: scope(),
    nonce_hash: D64_A,
    policy_version: '2026-08-23',
  };

  const first = await bridge.consumeSensitiveActionLease(input);
  const second = await bridge.consumeSensitiveActionLease(input);
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.reason_code, 'SENSITIVE_PERMISSION_LEASE_REPLAY_OR_CONFLICT');
});

test('principal/action/scope/nonce/policy mismatches remain persistent fail-closed decisions', async () => {
  const reasons = [
    'SENSITIVE_PERMISSION_LEASE_BINDING_MISMATCH',
    'SENSITIVE_PERMISSION_LEASE_POLICY_MISMATCH',
    'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE',
  ];

  for (const reason of reasons) {
    const bridge = makeBridge({
      consumePersistentSensitiveActionLease: async () => ({ ok: false, reason_code: reason }),
    });
    const result = await bridge.consumeSensitiveActionLease({
      lease_id: '11111111-1111-4111-8111-111111111111',
      authenticated_principal: 'partner:alpha',
      action: 'GRANT_PERMISSION',
      requested_scope: scope(),
      nonce_hash: D64_A,
      policy_version: '2026-08-23',
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason_code, reason);
  }
});

test('unknown persistent reason or transport failure maps to bounded fail-closed result', async () => {
  const unknown = makeBridge({
    consumePersistentSensitiveActionLease: async () => ({ ok: false, reason_code: 'UNEXPECTED_INTERNAL_REASON' }),
  });
  const unavailable = makeBridge({
    consumePersistentSensitiveActionLease: async () => { throw new Error('database details'); },
  });
  const input = {
    lease_id: '11111111-1111-4111-8111-111111111111',
    authenticated_principal: 'partner:alpha',
    action: 'GRANT_PERMISSION',
    requested_scope: scope(),
    nonce_hash: D64_A,
    policy_version: '2026-08-23',
  };

  assert.deepEqual(await unknown.consumeSensitiveActionLease(input), {
    ok: false,
    reason_code: 'SENSITIVE_ACTION_AUTHORITY_DENIED',
    lease_id: null,
  });
  assert.deepEqual(await unavailable.consumeSensitiveActionLease(input), {
    ok: false,
    reason_code: 'SENSITIVE_ACTION_AUTHORITY_UNAVAILABLE',
    lease_id: null,
  });
});

test('forward migration removes direct service-role access to legacy lease RPCs and exposes bounded wrappers', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');

  assert.match(source, /revoke execute on function public\.create_sensitive_permission_lease[^;]* from service_role/i);
  assert.match(source, /revoke execute on function public\.consume_sensitive_permission_lease[^;]* from service_role/i);
  assert.match(source, /create or replace function public\.issue_sensitive_action_lease/i);
  assert.match(source, /create or replace function public\.consume_sensitive_action_lease/i);
  assert.match(source, /grant execute on function public\.issue_sensitive_action_lease[^;]* to service_role/i);
  assert.match(source, /grant execute on function public\.consume_sensitive_action_lease[^;]* to service_role/i);
});

test('issue wrapper serializes against revocation, checks policy, derives database time and caps TTL at 60 seconds/grant expiry', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');
  const match = source.match(/create or replace function public\.issue_sensitive_action_lease\b[\s\S]*?\$\$;/i);
  const block = match?.[0] || '';

  assert.match(block, /statement_timestamp\(\)/i);
  assert.doesNotMatch(block, /\bp_now\b/i);
  assert.match(block, /from public\.sensitive_permission_grants/i);
  assert.match(block, /for share/i);
  assert.match(block, /policy_version\s*<>\s*p_policy_version/i);
  assert.match(block, /least\s*\([\s\S]*v_grant\.expires_at[\s\S]*interval\s+'60 seconds'/i);
  assert.match(block, /public\.create_sensitive_permission_lease/i);
  assert.doesNotMatch(block, /p_scope_digest/i);
});

test('revocation takes a conflicting grant row lock before recording revocation', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');
  const match = source.match(/create or replace function public\.revoke_sensitive_permission_grant\b[\s\S]*?\$\$;/i);
  const block = match?.[0] || '';

  assert.match(block, /from public\.sensitive_permission_grants/i);
  assert.match(block, /for update/i);
  const lock = block.search(/for update/i);
  const eventInsert = block.search(/insert into public\.sensitive_permission_grant_events/i);
  assert.ok(lock >= 0 && eventInsert > lock, 'grant row lock must precede revocation event');
});

test('consume wrapper rechecks policy and delegates exact-bound atomic consume to database authority', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');
  const match = source.match(/create or replace function public\.consume_sensitive_action_lease\b[\s\S]*?\$\$;/i);
  const block = match?.[0] || '';

  assert.match(block, /statement_timestamp\(\)/i);
  assert.doesNotMatch(block, /\bp_now\b/i);
  assert.match(block, /policy_version\s*<>\s*p_policy_version/i);
  assert.match(block, /public\.consume_sensitive_permission_lease/i);
  assert.doesNotMatch(block, /p_scope_digest/i);
});

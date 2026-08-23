'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const proof = require('../scripts/security/sovereign-proof-evaluator.js');

function scope() {
  return {
    resource_scope: { kind: 'profile', ids: ['user:target'] },
    sector_scope: ['social'],
    entity_scope: ['profile:user:target'],
    geo_policy_scope: ['global'],
  };
}

function request(overrides = {}) {
  return {
    authenticated_principal: 'user:actor',
    action: 'GRANT_PERMISSION',
    requested_scope: scope(),
    policy_version: 'policy:v2',
    authority_version: 'authority:42',
    ...overrides,
  };
}

function active(overrides = {}) {
  return {
    ok: true,
    reason_code: 'PERSISTENT_GRANT_ACTIVE',
    grant_ref: 'grant:current',
    principal: 'user:actor',
    action: 'GRANT_PERMISSION',
    policy_version: 'policy:v2',
    authority_version: 'authority:42',
    ...overrides,
  };
}

test('proof evaluator requires a persistent grant authority port', () => {
  assert.throws(() => proof.createSovereignProofEvaluator({}), /persistent|grant|authority|port/i);
});

test('pre-execution proof re-resolves current persistent grant with exact server context', async () => {
  let seen;
  const evaluator = proof.createSovereignProofEvaluator({
    resolvePersistentGrantAuthority: async (input) => {
      seen = input;
      return active();
    },
  });

  const result = await evaluator.evaluatePreExecutionProofs(request());

  assert.deepEqual(seen, {
    principal: 'user:actor',
    action: 'GRANT_PERMISSION',
    requested_scope: scope(),
    policy_version: 'policy:v2',
    authority_version: 'authority:42',
  });
  assert.deepEqual(result, {
    ok: true,
    proof_decision: 'SATISFIED',
    reason_code: 'PERSISTENT_GRANT_RE_RESOLVED',
    grant_ref: 'grant:current',
    policy_version: 'policy:v2',
    authority_version: 'authority:42',
    execution_authority: false,
  });
});

test('stale presentation snapshot, role label, client capabilities and client scope digest cannot satisfy proof', async () => {
  let calls = 0;
  const evaluator = proof.createSovereignProofEvaluator({
    resolvePersistentGrantAuthority: async () => { calls += 1; return active(); },
  });

  for (const injected of [
    { presentation_snapshot: { visible_capabilities: ['GRANT_PERMISSION'] } },
    { snapshot_id: 'authz-snapshot:stale' },
    { role_label: 'OWNER' },
    { client_capabilities: ['GRANT_PERMISSION'] },
    { capabilities: ['GRANT_PERMISSION'] },
    { scope_digest: 'a'.repeat(64) },
  ]) {
    await assert.rejects(
      evaluator.evaluatePreExecutionProofs(request(injected)),
      /snapshot|role|capabilit|scope digest|client|forbidden/i,
    );
  }
  assert.equal(calls, 0);
});

test('persistent authority denial or outage fails closed with bounded reasons', async () => {
  for (const [port, expected] of [
    [async () => ({ ok: false, reason_code: 'PERSISTENT_GRANT_INACTIVE' }), 'PERSISTENT_GRANT_INACTIVE'],
    [async () => ({ ok: false, reason_code: 'SOME_INTERNAL_DB_DETAIL' }), 'PERSISTENT_GRANT_DENIED'],
    [async () => { throw new Error('raw database connection detail'); }, 'PERSISTENT_GRANT_AUTHORITY_UNAVAILABLE'],
  ]) {
    const evaluator = proof.createSovereignProofEvaluator({ resolvePersistentGrantAuthority: port });
    const result = await evaluator.evaluatePreExecutionProofs(request());
    assert.equal(result.ok, false);
    assert.equal(result.proof_decision, 'DENIED');
    assert.equal(result.reason_code, expected);
    assert.equal(result.execution_authority, false);
    assert.equal(JSON.stringify(result).includes('database connection'), false);
  }
});

test('persistent authority response must bind exact principal/action/policy/authority version', async () => {
  const mismatches = [
    { principal: 'user:other' },
    { action: 'REVOKE_PERMISSION' },
    { policy_version: 'policy:old' },
    { authority_version: 'authority:41' },
  ];

  for (const mismatch of mismatches) {
    const evaluator = proof.createSovereignProofEvaluator({
      resolvePersistentGrantAuthority: async () => active(mismatch),
    });
    const result = await evaluator.evaluatePreExecutionProofs(request());
    assert.equal(result.ok, false);
    assert.equal(result.reason_code, 'PERSISTENT_GRANT_BINDING_MISMATCH');
    assert.equal(result.execution_authority, false);
  }
});

test('raw persistent grant payload is never returned by evaluator', async () => {
  const evaluator = proof.createSovereignProofEvaluator({
    resolvePersistentGrantAuthority: async () => active({
      raw_grant: { secret_note: 'must-not-leak', scope: '*' },
      database_row: { internal: true },
    }),
  });

  const result = await evaluator.evaluatePreExecutionProofs(request());
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result).includes('must-not-leak'), false);
  assert.equal(Object.hasOwn(result, 'raw_grant'), false);
  assert.equal(Object.hasOwn(result, 'database_row'), false);
});

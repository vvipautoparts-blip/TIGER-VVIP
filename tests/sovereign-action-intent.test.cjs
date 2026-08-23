'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const intent = require('../scripts/security/sovereign-action-intent.js');

function baseInput(overrides = {}) {
  return {
    authenticated_principal: 'user:owner',
    identity_issuer: 'https://identity.example',
    identity_subject: 'subject-123',
    action: 'GRANT_PERMISSION',
    resource_type: 'profile',
    resource_id: 'profile:target',
    requested_scope: {
      resource_scope: { kind: 'profile', ids: ['profile:target', 'profile:aux'] },
      sector_scope: ['social', 'food'],
      entity_scope: ['profile:target'],
      geo_policy_scope: ['JO'],
    },
    authoritative_risk_tier: 'HIGH',
    required_proof_classes: ['PERSISTENT_GRANT', 'FRESH_REVERIFICATION', 'EXECUTION_LEASE'],
    policy_version: '2026-08-23',
    authority_version: 'proof-v2',
    release_sha: 'f'.repeat(40),
    release_proof_ref: 'release-proof:sha256:abc',
    request_nonce: 'nonce:001',
    correlation_id: 'corr:001',
    server_created_at: '2026-08-23T07:30:00.000Z',
    server_expires_at: '2026-08-23T07:31:00.000Z',
    ...overrides,
  };
}

test('buildActionIntent returns frozen non-authoritative intent with deterministic sha256 digest', () => {
  const first = intent.buildActionIntent(baseInput());
  const second = intent.buildActionIntent(baseInput({
    requested_scope: {
      geo_policy_scope: ['JO'],
      entity_scope: ['profile:target'],
      sector_scope: ['food', 'social', 'food'],
      resource_scope: { ids: ['profile:aux', 'profile:target'], kind: 'profile' },
    },
    required_proof_classes: ['EXECUTION_LEASE', 'PERSISTENT_GRANT', 'FRESH_REVERIFICATION'],
  }));

  assert.equal(first.execution_authority, false);
  assert.equal(first.intent_digest, second.intent_digest);
  assert.match(first.intent_digest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.intent), true);
  assert.deepEqual(first.intent.canonical_scope.sector_scope, ['food', 'social']);
  assert.deepEqual(first.intent.canonical_scope.resource_scope.ids, ['profile:aux', 'profile:target']);
  assert.deepEqual(first.intent.required_proof_classes, [
    'EXECUTION_LEASE',
    'FRESH_REVERIFICATION',
    'PERSISTENT_GRANT',
  ]);
});

test('canonical intent uses only the server-owned risk tier and exposes no caller risk field', () => {
  const built = intent.buildActionIntent(baseInput());
  assert.equal(built.intent.risk_tier, 'HIGH');
  assert.equal(Object.hasOwn(built.intent, 'authoritative_risk_tier'), false);
  assert.equal(Object.hasOwn(built.intent, 'client_risk_tier'), false);

  assert.throws(
    () => intent.buildActionIntent(baseInput({ risk_tier: 'LOW' })),
    /client|risk|forbidden/i,
  );
});

test('client cannot inject digest, proof, grant, lease, role or execution authority into action intent', () => {
  for (const [field, value] of [
    ['intent_digest', 'a'.repeat(64)],
    ['proof_decision', 'ALLOW'],
    ['proof_envelope', { ok: true }],
    ['grant_id', 'grant:fake'],
    ['lease_id', 'lease:fake'],
    ['execution_authority', true],
    ['role', 'Owner'],
    ['viewer_capabilities', ['GRANT_PERMISSION']],
    ['scope_digest', 'b'.repeat(64)],
  ]) {
    assert.throws(
      () => intent.buildActionIntent(baseInput({ [field]: value })),
      /forbidden|authority|client/i,
      field,
    );
  }
});

test('scope is bounded and rejects wildcard or platform-wide resource authority', () => {
  assert.throws(
    () => intent.buildActionIntent(baseInput({
      requested_scope: {
        ...baseInput().requested_scope,
        sector_scope: ['*'],
      },
    })),
    /wildcard|bounded/i,
  );

  assert.throws(
    () => intent.buildActionIntent(baseInput({
      requested_scope: {
        ...baseInput().requested_scope,
        resource_scope: { kind: 'platform', ids: ['all'] },
      },
    })),
    /platform|bounded/i,
  );
});

test('dangerous prototype-pollution shaped keys are rejected recursively', () => {
  const polluted = JSON.parse('{"resource_scope":{"kind":"profile","ids":["profile:target"],"__proto__":{"polluted":true}},"sector_scope":["social"],"entity_scope":["profile:target"],"geo_policy_scope":["JO"]}');

  assert.throws(
    () => intent.buildActionIntent(baseInput({ requested_scope: polluted })),
    /prototype|forbidden|unsafe/i,
  );
});

test('server timestamps must be ordered and intent lifetime is bounded to 120 seconds', () => {
  assert.throws(
    () => intent.buildActionIntent(baseInput({
      server_expires_at: '2026-08-23T07:29:59.000Z',
    })),
    /expires|time|after/i,
  );

  assert.throws(
    () => intent.buildActionIntent(baseInput({
      server_expires_at: '2026-08-23T07:33:01.000Z',
    })),
    /120|lifetime|bounded/i,
  );
});

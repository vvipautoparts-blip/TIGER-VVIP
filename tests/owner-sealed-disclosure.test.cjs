'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const disclosure = require('../scripts/security/owner-sealed-disclosure.js');

const D64_A = 'a'.repeat(64);
const D64_B = 'b'.repeat(64);
const D64_C = 'c'.repeat(64);
const ISSUED = '2026-08-23T00:00:00.000Z';
const NOW = '2026-08-23T00:02:00.000Z';
const EXPIRES = '2026-08-23T00:10:00.000Z';

function requestInput(overrides = {}) {
  return {
    id: 'disclosure-request:001',
    requester: 'user:alpha',
    artifact_id: 'artifact:owner-financial:001',
    classification: 'OWNER_ONLY',
    artifact_scope_digest: D64_A,
    purpose: 'view explicitly requested owner-sealed artifact',
    nonce_digest: D64_B,
    challenge_digest: D64_C,
    issued_at: ISSUED,
    expires_at: EXPIRES,
    ...overrides,
  };
}

function ownerEvidence(overrides = {}) {
  return {
    authorization_id: 'owner-stepup:001',
    owner_subject: 'owner:root',
    action: 'APPROVE_DISCLOSURE',
    assurance: 'PHISHING_RESISTANT',
    status: 'VERIFIED',
    challenge_digest: D64_C,
    scope_digest: D64_A,
    verified_at: '2026-08-23T00:01:00.000Z',
    not_before: '2026-08-23T00:01:00.000Z',
    expires_at: '2026-08-23T00:05:00.000Z',
    consumed_at: null,
    ...overrides,
  };
}

test('artifact classification is explicit and limited to the canonical five classes', () => {
  assert.deepEqual(disclosure.ARTIFACT_CLASSIFICATIONS, [
    'PUBLIC',
    'USER_OWN',
    'INTERNAL',
    'CONFIDENTIAL',
    'OWNER_ONLY',
  ]);

  for (const classification of disclosure.ARTIFACT_CLASSIFICATIONS) {
    assert.equal(disclosure.classifyArtifact({ classification }), classification);
  }

  assert.throws(() => disclosure.classifyArtifact({}), /classification/i);
  assert.throws(
    () => disclosure.classifyArtifact({ classification: 'SECRET-ish' }),
    /classification/i,
  );
});

test('disclosure request binds requester, artifact, scope, purpose, nonce, challenge and expiry immutably', () => {
  const request = disclosure.createDisclosureRequest(requestInput());

  assert.equal(request.requester, 'user:alpha');
  assert.equal(request.artifact_id, 'artifact:owner-financial:001');
  assert.equal(request.artifact_scope_digest, D64_A);
  assert.equal(request.purpose, 'view explicitly requested owner-sealed artifact');
  assert.equal(request.nonce_digest, D64_B);
  assert.equal(request.challenge_digest, D64_C);
  assert.equal(request.expires_at, EXPIRES);
  assert.equal(Object.isFrozen(request), true);
});

test('disclosure request fails closed on missing bindings, malformed digests or invalid lifetime', () => {
  for (const field of [
    'id',
    'requester',
    'artifact_id',
    'classification',
    'artifact_scope_digest',
    'purpose',
    'nonce_digest',
    'challenge_digest',
    'issued_at',
    'expires_at',
  ]) {
    const input = requestInput();
    delete input[field];
    assert.throws(() => disclosure.createDisclosureRequest(input), /required|classification|digest|timestamp|field/i);
  }

  assert.throws(
    () => disclosure.createDisclosureRequest(requestInput({ nonce_digest: 'not-a-digest' })),
    /digest/i,
  );
  assert.throws(
    () => disclosure.createDisclosureRequest(requestInput({ expires_at: ISSUED })),
    /expire|time/i,
  );
});

test('CONFIDENTIAL and OWNER_ONLY disclosures require fresh exact-bound owner step-up evidence', () => {
  for (const classification of ['CONFIDENTIAL', 'OWNER_ONLY']) {
    const request = disclosure.createDisclosureRequest(requestInput({ classification }));
    assert.throws(() => disclosure.approveDisclosure(request, null, NOW), /owner|step-up|evidence/i);
    assert.throws(
      () => disclosure.approveDisclosure(request, ownerEvidence({ owner_subject: 'partner:alpha' }), NOW),
      /owner|subject/i,
    );
    assert.throws(
      () => disclosure.approveDisclosure(request, ownerEvidence({ challenge_digest: D64_B }), NOW),
      /challenge|binding/i,
    );
    assert.throws(
      () => disclosure.approveDisclosure(request, ownerEvidence({ scope_digest: D64_B }), NOW),
      /scope|binding/i,
    );
    assert.throws(
      () => disclosure.approveDisclosure(request, ownerEvidence({ expires_at: NOW }), NOW),
      /fresh|expire|active/i,
    );
    assert.throws(
      () => disclosure.approveDisclosure(request, ownerEvidence({ status: 'CONSUMED', consumed_at: NOW }), NOW),
      /active|consumed|status/i,
    );
  }
});

test('PUBLIC, USER_OWN and INTERNAL requests do not invent an owner-code requirement', () => {
  for (const classification of ['PUBLIC', 'USER_OWN', 'INTERNAL']) {
    const request = disclosure.createDisclosureRequest(requestInput({ classification }));
    const lease = disclosure.approveDisclosure(request, null, NOW);
    assert.equal(lease.status, 'ISSUED');
    assert.equal(lease.owner_authorization_id, null);
  }
});

test('approval consumes verified owner evidence conceptually without exposing reusable approval secrets', () => {
  const request = disclosure.createDisclosureRequest(requestInput());
  const evidence = ownerEvidence();
  const lease = disclosure.approveDisclosure(request, evidence, NOW);

  assert.equal(lease.owner_authorization_id, evidence.authorization_id);
  assert.equal(lease.challenge_digest, request.challenge_digest);
  assert.equal(lease.artifact_scope_digest, request.artifact_scope_digest);
  assert.equal(lease.requester, request.requester);
  assert.equal(lease.artifact_id, request.artifact_id);
  assert.equal(lease.status, 'ISSUED');
  assert.equal(Object.isFrozen(lease), true);

  const serializedKeys = Object.keys(lease).join(' ').toLowerCase();
  assert.doesNotMatch(serializedKeys, /approval_code|secret|password|otp/);

  assert.throws(
    () => disclosure.approveDisclosure(request, { ...evidence, owner_approval_code: '123456' }, NOW),
    /raw|secret|approval code|reusable/i,
  );
});

test('disclosure lease is exact-bound to the original request', () => {
  const request = disclosure.createDisclosureRequest(requestInput());
  const lease = disclosure.approveDisclosure(request, ownerEvidence(), NOW);

  const alteredRequest = disclosure.createDisclosureRequest(requestInput({
    id: request.id,
    artifact_id: 'artifact:different',
  }));

  const result = disclosure.consumeDisclosureLease(lease, alteredRequest, '2026-08-23T00:03:00.000Z');
  assert.equal(result.ok, false);
  assert.equal(result.reason_code, 'DISCLOSURE_LEASE_BINDING_MISMATCH');
});

test('issued disclosure lease is single-use and consumed leases fail replay closed', () => {
  const request = disclosure.createDisclosureRequest(requestInput());
  const lease = disclosure.approveDisclosure(request, ownerEvidence(), NOW);

  const first = disclosure.consumeDisclosureLease(lease, request, '2026-08-23T00:03:00.000Z');
  assert.equal(first.ok, true);
  assert.equal(first.reason_code, 'DISCLOSURE_LEASE_CONSUMED');
  assert.equal(first.lease.status, 'CONSUMED');
  assert.equal(first.lease.consumed_at, '2026-08-23T00:03:00.000Z');
  assert.equal(Object.isFrozen(first.lease), true);

  const replay = disclosure.consumeDisclosureLease(first.lease, request, '2026-08-23T00:04:00.000Z');
  assert.equal(replay.ok, false);
  assert.equal(replay.reason_code, 'DISCLOSURE_LEASE_NOT_ACTIVE');
});

test('expired or revoked disclosure leases fail closed', () => {
  const request = disclosure.createDisclosureRequest(requestInput());
  const lease = disclosure.approveDisclosure(request, ownerEvidence(), NOW);

  const expired = disclosure.consumeDisclosureLease(lease, request, EXPIRES);
  assert.equal(expired.ok, false);
  assert.equal(expired.reason_code, 'DISCLOSURE_LEASE_EXPIRED');

  const revokedLease = Object.freeze({ ...lease, status: 'REVOKED', revoked_at: '2026-08-23T00:03:00.000Z' });
  const revoked = disclosure.consumeDisclosureLease(revokedLease, request, '2026-08-23T00:04:00.000Z');
  assert.equal(revoked.ok, false);
  assert.equal(revoked.reason_code, 'DISCLOSURE_LEASE_NOT_ACTIVE');
});

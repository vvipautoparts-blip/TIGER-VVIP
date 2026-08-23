'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const disclosure = require('../scripts/security/owner-sealed-disclosure.js');

const D64_A = 'a'.repeat(64);
const D64_B = 'b'.repeat(64);
const D64_C = 'c'.repeat(64);
const ISSUED = '2026-08-23T00:00:00.000Z';
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

test('legacy approve API cannot mint an in-memory authority lease for any classification', () => {
  for (const classification of disclosure.ARTIFACT_CLASSIFICATIONS) {
    const request = disclosure.createDisclosureRequest(requestInput({ classification }));
    assert.throws(
      () => disclosure.approveDisclosure(request, { authorization_id: 'legacy-local-evidence' }, ISSUED),
      /persistent|authority|runtime|in-memory/i,
    );
  }
});

test('legacy consume API cannot turn a JavaScript lease object into authority', () => {
  const request = disclosure.createDisclosureRequest(requestInput());
  const staleIssuedObject = Object.freeze({
    id: '22222222-2222-4222-8222-222222222222',
    request_id: request.id,
    status: 'ISSUED',
  });

  assert.throws(
    () => disclosure.consumeDisclosureLease(staleIssuedObject, request, '2026-08-23T00:03:00.000Z'),
    /persistent|authority|runtime|in-memory/i,
  );
});

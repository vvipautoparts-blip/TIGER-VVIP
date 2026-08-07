'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const stepup = require('../scripts/ai/sovereign-owner-stepup-authorization');

const H = (char) => char.repeat(64);

function challenge(overrides = {}) {
  return stepup.createOwnerStepUpChallenge({
    ownerSubject: 'owner:primary',
    action: 'MERGE_RELEASE',
    releaseDigest: H('a'),
    payloadDigest: H('b'),
    scopeDigest: H('c'),
    environment: 'REPOSITORY',
    now: '2026-08-07T14:20:00.000Z',
    ttlSeconds: 180,
    ...overrides,
  });
}

function verifier(overrides = {}) {
  return stepup.createTrustedAuthenticatorVerifier({
    verifierId: 'owner-webauthn-primary',
    verifyAssertion: async ({ expectedOwnerSubject }) => ({
      verified: true,
      ownerSubject: expectedOwnerSubject,
      method: 'WEBAUTHN_PASSKEY',
      assurance: 'PHISHING_RESISTANT',
      authenticatorReference: 'credential-reference-not-a-secret',
      verifiedAt: '2026-08-07T14:20:30.000Z',
      ...overrides,
    }),
  });
}

test('AI-18 exports the sovereign step-up API', () => {
  assert.equal(typeof stepup.createTrustedAuthenticatorVerifier, 'function');
  assert.equal(typeof stepup.createOwnerStepUpChallenge, 'function');
  assert.equal(typeof stepup.verifyOwnerStepUp, 'function');
  assert.equal(typeof stepup.consumeVerifiedStepUp, 'function');
});

test('AI-18 creates an immutable transaction-bound challenge without a static secret', () => {
  const created = challenge();
  assert.equal(created.schemaVersion, 'TIGER_OWNER_STEPUP_CHALLENGE_V1');
  assert.equal(created.action, 'MERGE_RELEASE');
  assert.equal(created.environment, 'REPOSITORY');
  assert.match(created.challengeId, /^stepup_[A-Za-z0-9_-]{20,}$/);
  assert.match(created.nonceHash, /^[0-9a-f]{64}$/);
  assert.match(created.digest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(created), true);
  const serialized = JSON.stringify(created).toLowerCase();
  assert.doesNotMatch(serialized, /passcode|password|pin|rawcredential|secret/);
});

test('AI-18 rejects unknown fields that attempt to inject caller authentication authority', () => {
  assert.throws(
    () => stepup.createOwnerStepUpChallenge({
      ownerSubject: 'owner:primary',
      action: 'MERGE_RELEASE',
      releaseDigest: H('a'),
      payloadDigest: H('b'),
      scopeDigest: H('c'),
      environment: 'REPOSITORY',
      now: '2026-08-07T14:20:00.000Z',
      ttlSeconds: 180,
      authenticated: true,
    }),
    /STEPUP_CHALLENGE_UNKNOWN_FIELD/,
  );
});

test('AI-18 trusted authenticator verifier cannot be forged by JSON copying', async () => {
  const trusted = verifier();
  const forged = JSON.parse(JSON.stringify(trusted));
  await assert.rejects(
    () => stepup.verifyOwnerStepUp({
      challenge: challenge(),
      trustedVerifier: forged,
      authenticatorResponse: { assertion: 'client-controlled' },
      now: '2026-08-07T14:20:35.000Z',
    }),
    /STEPUP_VERIFIER_UNTRUSTED/,
  );
});

test('AI-18 accepts only phishing-resistant trusted re-authentication for sovereign actions', async () => {
  const verified = await stepup.verifyOwnerStepUp({
    challenge: challenge(),
    trustedVerifier: verifier(),
    authenticatorResponse: { assertion: 'opaque-provider-response' },
    now: '2026-08-07T14:20:35.000Z',
  });

  assert.equal(verified.schemaVersion, 'TIGER_OWNER_STEPUP_VERIFICATION_V1');
  assert.equal(verified.verified, true);
  assert.equal(verified.ownerSubject, 'owner:primary');
  assert.equal(verified.method, 'WEBAUTHN_PASSKEY');
  assert.equal(verified.assurance, 'PHISHING_RESISTANT');
  assert.match(verified.authenticatorReferenceHash, /^[0-9a-f]{64}$/);
  assert.match(verified.digest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(verified), true);

  const serialized = JSON.stringify(verified);
  assert.doesNotMatch(serialized, /opaque-provider-response|credential-reference-not-a-secret/);
});

test('AI-18 rejects static-passcode or weak assurance results even from a trusted adapter', async () => {
  await assert.rejects(
    () => stepup.verifyOwnerStepUp({
      challenge: challenge(),
      trustedVerifier: verifier({ method: 'STATIC_PASSCODE', assurance: 'SINGLE_FACTOR' }),
      authenticatorResponse: { value: 'do-not-persist-this' },
      now: '2026-08-07T14:20:35.000Z',
    }),
    /STEPUP_METHOD_NOT_ALLOWED|STEPUP_ASSURANCE_INSUFFICIENT/,
  );
});

test('AI-18 rejects a verifier result for a different owner', async () => {
  await assert.rejects(
    () => stepup.verifyOwnerStepUp({
      challenge: challenge(),
      trustedVerifier: verifier({ ownerSubject: 'owner:other' }),
      authenticatorResponse: { assertion: 'opaque' },
      now: '2026-08-07T14:20:35.000Z',
    }),
    /STEPUP_OWNER_MISMATCH/,
  );
});

test('AI-18 rejects expired challenges before calling execution authority', async () => {
  await assert.rejects(
    () => stepup.verifyOwnerStepUp({
      challenge: challenge({ ttlSeconds: 30 }),
      trustedVerifier: verifier(),
      authenticatorResponse: { assertion: 'opaque' },
      now: '2026-08-07T14:21:00.001Z',
    }),
    /STEPUP_CHALLENGE_EXPIRED/,
  );
});

test('AI-18 one-time consumption requires exact transaction binding', async () => {
  const verified = await stepup.verifyOwnerStepUp({
    challenge: challenge(),
    trustedVerifier: verifier(),
    authenticatorResponse: { assertion: 'opaque' },
    now: '2026-08-07T14:20:35.000Z',
  });

  assert.throws(
    () => stepup.consumeVerifiedStepUp({
      verification: verified,
      expectedOwnerSubject: 'owner:primary',
      expectedAction: 'MERGE_RELEASE',
      expectedReleaseDigest: H('a'),
      expectedPayloadDigest: H('d'),
      expectedScopeDigest: H('c'),
      expectedEnvironment: 'REPOSITORY',
      now: '2026-08-07T14:20:40.000Z',
    }),
    /STEPUP_PAYLOAD_MISMATCH/,
  );

  const consumed = stepup.consumeVerifiedStepUp({
    verification: verified,
    expectedOwnerSubject: 'owner:primary',
    expectedAction: 'MERGE_RELEASE',
    expectedReleaseDigest: H('a'),
    expectedPayloadDigest: H('b'),
    expectedScopeDigest: H('c'),
    expectedEnvironment: 'REPOSITORY',
    now: '2026-08-07T14:20:40.000Z',
  });
  assert.equal(consumed.authorized, true);
  assert.equal(consumed.action, 'MERGE_RELEASE');
  assert.equal(consumed.requiresPersistentConsumption, true);

  assert.throws(
    () => stepup.consumeVerifiedStepUp({
      verification: verified,
      expectedOwnerSubject: 'owner:primary',
      expectedAction: 'MERGE_RELEASE',
      expectedReleaseDigest: H('a'),
      expectedPayloadDigest: H('b'),
      expectedScopeDigest: H('c'),
      expectedEnvironment: 'REPOSITORY',
      now: '2026-08-07T14:20:41.000Z',
    }),
    /STEPUP_ALREADY_CONSUMED/,
  );
});

test('AI-18 verified authority cannot be forged by JSON copying', async () => {
  const verified = await stepup.verifyOwnerStepUp({
    challenge: challenge(),
    trustedVerifier: verifier(),
    authenticatorResponse: { assertion: 'opaque' },
    now: '2026-08-07T14:20:35.000Z',
  });
  const forged = JSON.parse(JSON.stringify(verified));

  assert.throws(
    () => stepup.consumeVerifiedStepUp({
      verification: forged,
      expectedOwnerSubject: 'owner:primary',
      expectedAction: 'MERGE_RELEASE',
      expectedReleaseDigest: H('a'),
      expectedPayloadDigest: H('b'),
      expectedScopeDigest: H('c'),
      expectedEnvironment: 'REPOSITORY',
      now: '2026-08-07T14:20:40.000Z',
    }),
    /STEPUP_VERIFICATION_UNTRUSTED/,
  );
});

test('AI-18 rejects environment substitution for a protected action', () => {
  assert.throws(
    () => challenge({ environment: 'PRODUCTION' }),
    /STEPUP_ACTION_ENVIRONMENT_MISMATCH/,
  );
});

'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const proof = require('../scripts/ai/sovereign-proof-system');
const attestation = require('../scripts/ai/sovereign-proof-attestation');

const H = (char) => char.repeat(64);

function makeRelease() {
  return proof.createReleaseDNA({
    commitSha: 'c0e5428c4d6d47dcbc448dcf9940ef1a067ea6a6',
    frontendBuildHash: H('a'),
    backendBuildHash: H('b'),
    migrationDigests: [{ path: 'supabase/migrations/001.sql', sha256: H('c') }],
    aiPolicyHash: H('d'),
    promptHash: H('e'),
    modelConfigHash: H('f'),
    toolRegistryHash: H('1'),
    rlsPolicyHash: H('2'),
    securityConfigHash: H('3'),
    environmentClass: 'RELEASE_CANDIDATE',
  });
}

function makeCapsule(releaseDNA, gateIndex = 0) {
  const gate = proof.REQUIRED_GATES[gateIndex];
  return proof.createEvidenceCapsule({
    releaseDNA,
    gate: gate.id,
    requirementId: `REQ-${gate.id}`,
    status: 'PASS',
    evidenceClass: gate.allowedEvidenceClasses[0],
    environment: gate.allowedEnvironments[0],
    reference: `evidence://trusted/${gate.id}`,
    verifiedAt: '2026-08-07T12:00:00.000Z',
    evidenceSha256: H('4'),
    fixture: false,
    simulated: false,
  });
}

function generateSigner() {
  return crypto.generateKeyPairSync('ed25519');
}

function publicPem(keys) {
  return keys.publicKey.export({ type: 'spki', format: 'pem' });
}

function signMessage(keys, message) {
  return crypto.sign(null, message, keys.privateKey).toString('base64');
}

function trustedRegistry(evidenceKeys, ownerKeys) {
  return attestation.createTrustedKeyRegistry([
    {
      keyId: 'evidence-2026-01',
      purpose: 'EVIDENCE_SIGNER',
      algorithm: 'Ed25519',
      publicKeyPem: publicPem(evidenceKeys),
      status: 'ACTIVE',
      validFrom: '2026-08-01T00:00:00.000Z',
      validTo: '2027-08-01T00:00:00.000Z',
    },
    {
      keyId: 'owner-2026-01',
      purpose: 'OWNER_DECISION_SIGNER',
      algorithm: 'Ed25519',
      publicKeyPem: publicPem(ownerKeys),
      status: 'ACTIVE',
      validFrom: '2026-08-01T00:00:00.000Z',
      validTo: '2027-08-01T00:00:00.000Z',
    },
  ]);
}

function makeEvidenceAttestation(keys, capsule, overrides = {}) {
  const unsigned = {
    schemaVersion: 'TIGER_EVIDENCE_ATTESTATION_V1',
    keyId: 'evidence-2026-01',
    capsuleDigest: capsule.digest,
    releaseDigest: capsule.releaseDigest,
    gate: capsule.gate,
    evidenceSha256: capsule.evidenceSha256,
    issuedAt: '2026-08-07T12:05:00.000Z',
    expiresAt: '2026-08-08T12:05:00.000Z',
    ...overrides,
  };
  const message = attestation.buildEvidenceAttestationMessage(unsigned);
  return Object.freeze({ ...unsigned, signature: signMessage(keys, message) });
}

function makeOwnerReceipt(keys, releaseDNA, overrides = {}) {
  const unsigned = {
    schemaVersion: 'TIGER_OWNER_DECISION_RECEIPT_V1',
    receiptId: 'odr-20260807-000001',
    keyId: 'owner-2026-01',
    ownerSubject: 'owner:primary',
    action: 'MERGE_RELEASE',
    releaseDigest: releaseDNA.digest,
    payloadDigest: H('5'),
    scopeDigest: H('6'),
    environment: 'REPOSITORY',
    decision: 'APPROVE',
    reasonCode: 'OWNER_REVIEW_COMPLETE',
    nonce: 'nonce-20260807-000001',
    issuedAt: '2026-08-07T12:10:00.000Z',
    expiresAt: '2026-08-07T12:25:00.000Z',
    ...overrides,
  };
  const message = attestation.buildOwnerDecisionReceiptMessage(unsigned);
  return Object.freeze({ ...unsigned, signature: signMessage(keys, message) });
}

test('trusted key registry accepts only active Ed25519 public keys with explicit purpose and is non-transferable by JSON clone', () => {
  const evidenceKeys = generateSigner();
  const ownerKeys = generateSigner();
  const registry = trustedRegistry(evidenceKeys, ownerKeys);

  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.keys), true);
  assert.equal(registry.keys.length, 2);
  assert.match(registry.keys[0].fingerprintSha256, /^[0-9a-f]{64}$/);
  assert.equal(attestation.isTrustedKeyRegistry(registry), true);
  assert.equal(attestation.isTrustedKeyRegistry(JSON.parse(JSON.stringify(registry))), false);
});

test('trusted registry rejects private-key-shaped fields, duplicates, wrong algorithms and invalid validity windows', () => {
  const keys = generateSigner();
  const base = {
    keyId: 'evidence-2026-01',
    purpose: 'EVIDENCE_SIGNER',
    algorithm: 'Ed25519',
    publicKeyPem: publicPem(keys),
    status: 'ACTIVE',
    validFrom: '2026-08-01T00:00:00.000Z',
    validTo: '2027-08-01T00:00:00.000Z',
  };

  assert.throws(
    () => attestation.createTrustedKeyRegistry([{ ...base, signingMaterial: 'forbidden' }]),
    /TRUSTED_KEY_UNKNOWN_FIELD/,
  );
  assert.throws(() => attestation.createTrustedKeyRegistry([base, base]), /TRUSTED_KEY_DUPLICATE_ID/);
  assert.throws(() => attestation.createTrustedKeyRegistry([{ ...base, algorithm: 'RSA' }]), /TRUSTED_KEY_ALGORITHM_UNSUPPORTED/);
  assert.throws(
    () => attestation.createTrustedKeyRegistry([{ ...base, validFrom: '2027-08-01T00:00:00.000Z', validTo: '2026-08-01T00:00:00.000Z' }]),
    /TRUSTED_KEY_VALIDITY_INVALID/,
  );
});

test('valid evidence attestation verifies exact capsule, release, gate, evidence hash, key purpose and time', () => {
  const evidenceKeys = generateSigner();
  const ownerKeys = generateSigner();
  const registry = trustedRegistry(evidenceKeys, ownerKeys);
  const releaseDNA = makeRelease();
  const capsule = makeCapsule(releaseDNA);
  const signed = makeEvidenceAttestation(evidenceKeys, capsule);

  const result = attestation.verifyEvidenceAttestation({
    capsule,
    attestation: signed,
    trustedKeys: registry,
    now: '2026-08-07T12:15:00.000Z',
  });

  assert.equal(result.verified, true);
  assert.equal(result.keyId, 'evidence-2026-01');
  assert.equal(result.capsuleDigest, capsule.digest);
  assert.equal(result.releaseDigest, releaseDNA.digest);
  assert.match(result.attestationDigest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(result), true);
});

test('evidence verification fails closed for tampering, wrong-purpose key, revoked key, expiry and JSON-cloned trust registry', () => {
  const evidenceKeys = generateSigner();
  const ownerKeys = generateSigner();
  const registry = trustedRegistry(evidenceKeys, ownerKeys);
  const releaseDNA = makeRelease();
  const capsule = makeCapsule(releaseDNA);
  const signed = makeEvidenceAttestation(evidenceKeys, capsule);

  assert.throws(
    () => attestation.verifyEvidenceAttestation({ capsule, attestation: { ...signed, gate: 'CODEQL' }, trustedKeys: registry, now: '2026-08-07T12:15:00.000Z' }),
    /EVIDENCE_ATTESTATION_BINDING_MISMATCH|EVIDENCE_ATTESTATION_SIGNATURE_INVALID/,
  );
  const wrongPurposeUnsigned = { ...signed, keyId: 'owner-2026-01' };
  delete wrongPurposeUnsigned.signature;
  const wrongPurpose = { ...wrongPurposeUnsigned, signature: signMessage(ownerKeys, attestation.buildEvidenceAttestationMessage(wrongPurposeUnsigned)) };
  assert.throws(
    () => attestation.verifyEvidenceAttestation({ capsule, attestation: wrongPurpose, trustedKeys: registry, now: '2026-08-07T12:15:00.000Z' }),
    /TRUSTED_KEY_PURPOSE_MISMATCH/,
  );

  const revoked = attestation.createTrustedKeyRegistry([
    {
      keyId: 'evidence-2026-01', purpose: 'EVIDENCE_SIGNER', algorithm: 'Ed25519', publicKeyPem: publicPem(evidenceKeys),
      status: 'REVOKED', validFrom: '2026-08-01T00:00:00.000Z', validTo: '2027-08-01T00:00:00.000Z',
    },
  ]);
  assert.throws(
    () => attestation.verifyEvidenceAttestation({ capsule, attestation: signed, trustedKeys: revoked, now: '2026-08-07T12:15:00.000Z' }),
    /TRUSTED_KEY_REVOKED/,
  );
  assert.throws(
    () => attestation.verifyEvidenceAttestation({ capsule, attestation: signed, trustedKeys: registry, now: '2026-08-09T12:15:00.000Z' }),
    /EVIDENCE_ATTESTATION_EXPIRED/,
  );
  assert.throws(
    () => attestation.verifyEvidenceAttestation({ capsule, attestation: signed, trustedKeys: JSON.parse(JSON.stringify(registry)), now: '2026-08-07T12:15:00.000Z' }),
    /TRUSTED_KEY_REGISTRY_UNVERIFIED/,
  );
});

test('evidence signer cannot mint owner authority and owner receipt signer cannot mint evidence trust', () => {
  const evidenceKeys = generateSigner();
  const ownerKeys = generateSigner();
  const registry = trustedRegistry(evidenceKeys, ownerKeys);
  const releaseDNA = makeRelease();
  const capsule = makeCapsule(releaseDNA);

  const receipt = makeOwnerReceipt(evidenceKeys, releaseDNA, { keyId: 'evidence-2026-01' });
  assert.throws(
    () => attestation.verifyOwnerDecisionReceipt({
      receipt,
      trustedKeys: registry,
      releaseDNA,
      expectedAction: 'MERGE_RELEASE',
      expectedPayloadDigest: H('5'),
      expectedScopeDigest: H('6'),
      expectedOwnerSubject: 'owner:primary',
      now: '2026-08-07T12:15:00.000Z',
    }),
    /TRUSTED_KEY_PURPOSE_MISMATCH/,
  );

  const evidenceUnsigned = makeEvidenceAttestation(ownerKeys, capsule, { keyId: 'owner-2026-01' });
  assert.throws(
    () => attestation.verifyEvidenceAttestation({ capsule, attestation: evidenceUnsigned, trustedKeys: registry, now: '2026-08-07T12:15:00.000Z' }),
    /TRUSTED_KEY_PURPOSE_MISMATCH/,
  );
});

test('owner decision receipt verifies exact owner, action, release, payload, scope, environment, decision and time', () => {
  const evidenceKeys = generateSigner();
  const ownerKeys = generateSigner();
  const registry = trustedRegistry(evidenceKeys, ownerKeys);
  const releaseDNA = makeRelease();
  const receipt = makeOwnerReceipt(ownerKeys, releaseDNA);

  const result = attestation.verifyOwnerDecisionReceipt({
    receipt,
    trustedKeys: registry,
    releaseDNA,
    expectedAction: 'MERGE_RELEASE',
    expectedPayloadDigest: H('5'),
    expectedScopeDigest: H('6'),
    expectedOwnerSubject: 'owner:primary',
    now: '2026-08-07T12:15:00.000Z',
  });

  assert.equal(result.verified, true);
  assert.equal(result.action, 'MERGE_RELEASE');
  assert.equal(result.decision, 'APPROVE');
  assert.equal(result.environment, 'REPOSITORY');
  assert.equal(result.replayConsumed, false);
  assert.equal(result.requiresPersistentConsumption, true);
  assert.match(result.receiptDigest, /^[0-9a-f]{64}$/);
});

test('owner receipt rejects wrong release, payload, scope, owner, action, environment, rejection decision, expiry and invalid signature', () => {
  const evidenceKeys = generateSigner();
  const ownerKeys = generateSigner();
  const registry = trustedRegistry(evidenceKeys, ownerKeys);
  const releaseDNA = makeRelease();
  const receipt = makeOwnerReceipt(ownerKeys, releaseDNA);
  const verify = (overrides = {}) => attestation.verifyOwnerDecisionReceipt({
    receipt,
    trustedKeys: registry,
    releaseDNA,
    expectedAction: 'MERGE_RELEASE',
    expectedPayloadDigest: H('5'),
    expectedScopeDigest: H('6'),
    expectedOwnerSubject: 'owner:primary',
    now: '2026-08-07T12:15:00.000Z',
    ...overrides,
  });

  assert.throws(() => verify({ releaseDNA: proof.createReleaseDNA({ ...releaseDNA.components, promptHash: H('8') }) }), /OWNER_RECEIPT_RELEASE_MISMATCH/);
  assert.throws(() => verify({ expectedPayloadDigest: H('7') }), /OWNER_RECEIPT_PAYLOAD_MISMATCH/);
  assert.throws(() => verify({ expectedScopeDigest: H('7') }), /OWNER_RECEIPT_SCOPE_MISMATCH/);
  assert.throws(() => verify({ expectedOwnerSubject: 'owner:other' }), /OWNER_RECEIPT_OWNER_MISMATCH/);
  assert.throws(() => verify({ expectedAction: 'PROMOTE_DATABASE' }), /OWNER_RECEIPT_ACTION_MISMATCH/);
  assert.throws(() => verify({ now: '2026-08-07T12:30:00.000Z' }), /OWNER_RECEIPT_EXPIRED/);

  const wrongEnvironment = makeOwnerReceipt(ownerKeys, releaseDNA, { environment: 'PRODUCTION' });
  assert.throws(() => verify({ receipt: wrongEnvironment }), /OWNER_RECEIPT_ENVIRONMENT_INVALID/);
  const rejected = makeOwnerReceipt(ownerKeys, releaseDNA, { decision: 'REJECT' });
  assert.throws(() => verify({ receipt: rejected }), /OWNER_RECEIPT_NOT_APPROVED/);
  assert.throws(() => verify({ receipt: { ...receipt, signature: Buffer.alloc(64).toString('base64') } }), /OWNER_RECEIPT_SIGNATURE_INVALID/);
});

test('three protected owner actions are separate and have fixed target environments', () => {
  assert.deepEqual(attestation.OWNER_ACTION_ENVIRONMENTS, {
    MERGE_RELEASE: 'REPOSITORY',
    PROMOTE_DATABASE: 'PRODUCTION',
    ACTIVATE_PRODUCTION: 'PRODUCTION',
  });
  assert.equal(Object.isFrozen(attestation.OWNER_ACTION_ENVIRONMENTS), true);
});

test('attestation APIs reject authority-shaped unknown fields and never accept a signing key as input', () => {
  const evidenceKeys = generateSigner();
  const ownerKeys = generateSigner();
  const registry = trustedRegistry(evidenceKeys, ownerKeys);
  const releaseDNA = makeRelease();
  const capsule = makeCapsule(releaseDNA);
  const signed = makeEvidenceAttestation(evidenceKeys, capsule);

  assert.throws(
    () => attestation.verifyEvidenceAttestation({ capsule, attestation: signed, trustedKeys: registry, now: '2026-08-07T12:15:00.000Z', ownerApproved: true }),
    /EVIDENCE_VERIFICATION_UNKNOWN_FIELD/,
  );
  assert.throws(
    () => attestation.buildEvidenceAttestationMessage({ ...signed, signature: signed.signature }),
    /EVIDENCE_ATTESTATION_UNKNOWN_FIELD/,
  );
  assert.throws(
    () => attestation.createTrustedKeyRegistry([{ keyId: 'x', purpose: 'EVIDENCE_SIGNER', algorithm: 'Ed25519', publicKeyPem: publicPem(evidenceKeys), status: 'ACTIVE', validFrom: '2026-08-01T00:00:00.000Z', validTo: '2027-08-01T00:00:00.000Z', ownerApproved: true }]),
    /TRUSTED_KEY_UNKNOWN_FIELD/,
  );
});

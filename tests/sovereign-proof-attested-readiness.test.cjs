'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const proof = require('../scripts/ai/sovereign-proof-system');
const attestation = require('../scripts/ai/sovereign-proof-attestation');

const H = (char) => char.repeat(64);
const OWNER_GATES = Object.freeze({
  OWNER_MERGE_APPROVAL: 'MERGE_RELEASE',
  OWNER_DB_PROMOTION_APPROVAL: 'PROMOTE_DATABASE',
  OWNER_PRODUCTION_ACTIVATION: 'ACTIVATE_PRODUCTION',
});

const OWNER_ISSUED_AT = Object.freeze({
  MERGE_RELEASE: '2026-08-07T12:20:00.000Z',
  PROMOTE_DATABASE: '2026-08-07T12:21:00.000Z',
  ACTIVATE_PRODUCTION: '2026-08-07T12:22:00.000Z',
});

const GATE_VERIFIED_AT = Object.freeze({
  OWNER_MERGE_APPROVAL: '2026-08-07T12:20:00.000Z',
  OWNER_DB_PROMOTION_APPROVAL: '2026-08-07T12:21:00.000Z',
  OWNER_PRODUCTION_ACTIVATION: '2026-08-07T12:22:00.000Z',
  SUPABASE_PRODUCTION_APPLY: '2026-08-07T12:30:00.000Z',
  AI_GATEWAY_PRODUCTION_DEPLOY: '2026-08-07T12:31:00.000Z',
  LIVE_EVIDENCE_PRODUCTION_SMOKE: '2026-08-07T12:32:00.000Z',
  PRODUCTION_POST_DEPLOY_SMOKE: '2026-08-07T12:33:00.000Z',
  MONITORING_ALERTS_PRODUCTION_VERIFIED: '2026-08-07T12:34:00.000Z',
  PRODUCTION_BACKUP_VERIFIED: '2026-08-07T12:35:00.000Z',
  COUNTRY_CONFIG_PRODUCTION_VERIFIED: '2026-08-07T12:36:00.000Z',
});

function makeRelease() {
  return proof.createReleaseDNA({
    commitSha: 'fa9aeb221e7c2c2551f03dcb96377585331f44c8',
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

function keyPair() {
  return crypto.generateKeyPairSync('ed25519');
}

function publicPem(keys) {
  return keys.publicKey.export({ type: 'spki', format: 'pem' });
}

function sign(keys, message) {
  return crypto.sign(null, message, keys.privateKey).toString('base64');
}

function registry(evidenceKeys, ownerKeys) {
  return attestation.createTrustedKeyRegistry([
    {
      keyId: 'evidence-2026-01', purpose: 'EVIDENCE_SIGNER', algorithm: 'Ed25519', publicKeyPem: publicPem(evidenceKeys),
      status: 'ACTIVE', validFrom: '2026-08-01T00:00:00.000Z', validTo: '2027-08-01T00:00:00.000Z',
    },
    {
      keyId: 'owner-2026-01', purpose: 'OWNER_DECISION_SIGNER', algorithm: 'Ed25519', publicKeyPem: publicPem(ownerKeys),
      status: 'ACTIVE', validFrom: '2026-08-01T00:00:00.000Z', validTo: '2027-08-01T00:00:00.000Z',
    },
  ]);
}

function evidenceAttestation(evidenceKeys, capsule) {
  const issuedAt = new Date(Date.parse(capsule.verifiedAt) + 60_000).toISOString();
  const unsigned = {
    schemaVersion: 'TIGER_EVIDENCE_ATTESTATION_V1',
    keyId: 'evidence-2026-01',
    capsuleDigest: capsule.digest,
    releaseDigest: capsule.releaseDigest,
    gate: capsule.gate,
    evidenceSha256: capsule.evidenceSha256,
    issuedAt,
    expiresAt: '2026-08-08T13:00:00.000Z',
  };
  return Object.freeze({ ...unsigned, signature: sign(evidenceKeys, attestation.buildEvidenceAttestationMessage(unsigned)) });
}

function ownerReceipt(ownerKeys, trustedKeys, releaseDNA, gate, index) {
  const action = OWNER_GATES[gate.id];
  const environment = attestation.OWNER_ACTION_ENVIRONMENTS[action];
  const payloadDigest = crypto.createHash('sha256').update(`payload:${gate.id}`).digest('hex');
  const scopeDigest = crypto.createHash('sha256').update(`scope:${gate.id}:${environment}`).digest('hex');
  const unsigned = {
    schemaVersion: 'TIGER_OWNER_DECISION_RECEIPT_V1',
    receiptId: `odr-20260807-${String(index + 1).padStart(6, '0')}`,
    keyId: 'owner-2026-01',
    ownerSubject: 'owner:primary',
    action,
    releaseDigest: releaseDNA.digest,
    payloadDigest,
    scopeDigest,
    environment,
    decision: 'APPROVE',
    reasonCode: 'OWNER_RELEASE_GATE_APPROVED',
    nonce: `nonce-20260807-${String(index + 1).padStart(6, '0')}`,
    issuedAt: OWNER_ISSUED_AT[action],
    expiresAt: '2026-08-07T13:30:00.000Z',
  };
  const receipt = Object.freeze({ ...unsigned, signature: sign(ownerKeys, attestation.buildOwnerDecisionReceiptMessage(unsigned)) });
  const verified = attestation.verifyOwnerDecisionReceipt({
    receipt,
    trustedKeys,
    releaseDNA,
    expectedAction: action,
    expectedPayloadDigest: payloadDigest,
    expectedScopeDigest: scopeDigest,
    expectedOwnerSubject: 'owner:primary',
    now: '2026-08-07T12:55:00.000Z',
  });
  return { receipt, payloadDigest, scopeDigest, receiptDigest: verified.receiptDigest };
}

function buildSignedProofSet() {
  const releaseDNA = makeRelease();
  const evidenceKeys = keyPair();
  const ownerKeys = keyPair();
  const trustedKeys = registry(evidenceKeys, ownerKeys);

  const capsules = [];
  const evidenceAttestations = [];
  const ownerProofs = [];

  proof.REQUIRED_GATES.forEach((gate, index) => {
    if (OWNER_GATES[gate.id]) {
      const owner = ownerReceipt(ownerKeys, trustedKeys, releaseDNA, gate, index);
      const capsule = proof.createEvidenceCapsule({
        releaseDNA,
        gate: gate.id,
        requirementId: `REQ-${gate.id}`,
        status: 'PASS',
        evidenceClass: gate.allowedEvidenceClasses[0],
        environment: gate.allowedEnvironments[0],
        reference: `owner-receipt://${owner.receipt.receiptId}`,
        verifiedAt: OWNER_ISSUED_AT[OWNER_GATES[gate.id]],
        evidenceSha256: owner.receiptDigest,
        fixture: false,
        simulated: false,
      });
      capsules.push(capsule);
      ownerProofs.push(Object.freeze({
        gate: gate.id,
        capsuleDigest: capsule.digest,
        receipt: owner.receipt,
        expectedPayloadDigest: owner.payloadDigest,
        expectedScopeDigest: owner.scopeDigest,
        expectedOwnerSubject: 'owner:primary',
      }));
      return;
    }

    const capsule = proof.createEvidenceCapsule({
      releaseDNA,
      gate: gate.id,
      requirementId: `REQ-${gate.id}`,
      status: 'PASS',
      evidenceClass: gate.allowedEvidenceClasses[0],
      environment: gate.allowedEnvironments[0],
      reference: `evidence://trusted/${gate.id}`,
      verifiedAt: GATE_VERIFIED_AT[gate.id] || '2026-08-07T12:00:00.000Z',
      evidenceSha256: crypto.createHash('sha256').update(`artifact:${gate.id}`).digest('hex'),
      fixture: false,
      simulated: false,
    });
    capsules.push(capsule);
    evidenceAttestations.push(evidenceAttestation(evidenceKeys, capsule));
  });

  return { releaseDNA, trustedKeys, capsules, evidenceAttestations, ownerProofs };
}

test('attested readiness requires exactly 42 evidence attestations plus three owner decision proofs for the canonical 45 gates', () => {
  const bundle = buildSignedProofSet();
  const result = attestation.evaluateAttestedProofReadiness({ ...bundle, now: '2026-08-07T12:55:00.000Z' });

  assert.equal(result.productionReady, true);
  assert.equal(result.status, 'TIGER_ATTESTED_PROOF_100');
  assert.equal(result.verifiedEvidenceAttestationCount, 42);
  assert.equal(result.verifiedOwnerDecisionCount, 3);
  assert.equal(result.totalVerifiedGateProofs, 45);
  assert.equal(result.structuralReadiness.productionReady, true);
  assert.match(result.attestationRootHash, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(result), true);
});

test('45 structurally valid capsules without cryptographic proofs remain blocked', () => {
  const bundle = buildSignedProofSet();
  const result = attestation.evaluateAttestedProofReadiness({
    ...bundle,
    evidenceAttestations: [],
    ownerProofs: [],
    now: '2026-08-07T12:55:00.000Z',
  });

  assert.equal(result.productionReady, false);
  assert.equal(result.status, 'TIGER_ATTESTED_PROOF_BLOCKED');
  assert.equal(result.missingCryptographicProofGateIds.length, 45);
  assert.equal(result.structuralReadiness.productionReady, true);
});

test('missing one non-owner evidence attestation blocks only that cryptographic gate proof', () => {
  const bundle = buildSignedProofSet();
  const removed = bundle.evidenceAttestations[0];
  const result = attestation.evaluateAttestedProofReadiness({
    ...bundle,
    evidenceAttestations: bundle.evidenceAttestations.slice(1),
    now: '2026-08-07T12:55:00.000Z',
  });

  assert.equal(result.productionReady, false);
  assert.deepEqual(result.missingCryptographicProofGateIds, [removed.gate]);
  assert.equal(result.verifiedEvidenceAttestationCount, 41);
  assert.equal(result.verifiedOwnerDecisionCount, 3);
});

test('owner gates cannot be satisfied by Evidence Signer attestations instead of Owner Decision Receipts', () => {
  const bundle = buildSignedProofSet();
  const ownerCapsule = bundle.capsules.find((capsule) => capsule.gate === 'OWNER_MERGE_APPROVAL');
  const fakeOwnerEvidence = {
    ...bundle.evidenceAttestations[0],
    capsuleDigest: ownerCapsule.digest,
    releaseDigest: ownerCapsule.releaseDigest,
    gate: ownerCapsule.gate,
    evidenceSha256: ownerCapsule.evidenceSha256,
  };

  assert.throws(
    () => attestation.evaluateAttestedProofReadiness({
      releaseDNA: bundle.releaseDNA,
      trustedKeys: bundle.trustedKeys,
      capsules: bundle.capsules,
      evidenceAttestations: [...bundle.evidenceAttestations, fakeOwnerEvidence],
      ownerProofs: bundle.ownerProofs.filter((entry) => entry.gate !== 'OWNER_MERGE_APPROVAL'),
      now: '2026-08-07T12:55:00.000Z',
    }),
    /OWNER_GATE_REQUIRES_OWNER_DECISION_RECEIPT/,
  );
});

test('owner proof must bind exact owner-gate capsule and its receipt digest must equal the capsule evidence hash', () => {
  const bundle = buildSignedProofSet();
  const ownerProofs = [...bundle.ownerProofs];
  ownerProofs[0] = { ...ownerProofs[0], capsuleDigest: H('9') };

  assert.throws(
    () => attestation.evaluateAttestedProofReadiness({ ...bundle, ownerProofs, now: '2026-08-07T12:55:00.000Z' }),
    /OWNER_PROOF_CAPSULE_MISMATCH/,
  );

  const tamperedCapsules = bundle.capsules.map((capsule) => capsule.gate === bundle.ownerProofs[0].gate
    ? { ...capsule, evidenceSha256: H('8') }
    : capsule);
  assert.throws(
    () => attestation.evaluateAttestedProofReadiness({ ...bundle, capsules: tamperedCapsules, now: '2026-08-07T12:55:00.000Z' }),
    /EVIDENCE_INTEGRITY_INVALID|OWNER_PROOF_RECEIPT_DIGEST_MISMATCH/,
  );
});

test('duplicate cryptographic proof material fails closed and changed Release DNA remains blocked', () => {
  const bundle = buildSignedProofSet();
  assert.throws(
    () => attestation.evaluateAttestedProofReadiness({
      ...bundle,
      evidenceAttestations: [...bundle.evidenceAttestations, bundle.evidenceAttestations[0]],
      now: '2026-08-07T12:55:00.000Z',
    }),
    /ATTESTED_PROOF_DUPLICATE_ATTESTATION/,
  );
  assert.throws(
    () => attestation.evaluateAttestedProofReadiness({
      ...bundle,
      ownerProofs: [...bundle.ownerProofs, bundle.ownerProofs[0]],
      now: '2026-08-07T12:55:00.000Z',
    }),
    /ATTESTED_PROOF_DUPLICATE_OWNER_PROOF/,
  );

  const changedRelease = proof.createReleaseDNA({ ...bundle.releaseDNA.components, promptHash: H('7') });
  const changed = attestation.evaluateAttestedProofReadiness({ ...bundle, releaseDNA: changedRelease, now: '2026-08-07T12:55:00.000Z' });
  assert.equal(changed.productionReady, false);
  assert.equal(changed.structuralReadiness.productionReady, false);
});

test('attested Golden Passport cannot be issued without all cryptographic proofs', () => {
  const bundle = buildSignedProofSet();
  const passport = attestation.createAttestedGoldenReleasePassport({
    ...bundle,
    now: '2026-08-07T12:55:00.000Z',
    issuedAt: '2026-08-07T13:00:00.000Z',
  });

  assert.equal(passport.schemaVersion, 'TIGER_ATTESTED_GOLDEN_RELEASE_PASSPORT_V1');
  assert.equal(passport.productionReady, true);
  assert.equal(passport.releaseDigest, bundle.releaseDNA.digest);
  assert.equal(passport.verifiedEvidenceAttestations, 42);
  assert.equal(passport.verifiedOwnerDecisions, 3);
  assert.match(passport.attestationRootHash, /^[0-9a-f]{64}$/);
  assert.match(passport.digest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(passport), true);

  assert.throws(
    () => attestation.createAttestedGoldenReleasePassport({
      ...bundle,
      evidenceAttestations: bundle.evidenceAttestations.slice(1),
      now: '2026-08-07T12:55:00.000Z',
      issuedAt: '2026-08-07T13:00:00.000Z',
    }),
    /ATTESTED_GOLDEN_PASSPORT_BLOCKED/,
  );
});

test('attested readiness APIs reject authority-shaped extras and do not accept private signing material', () => {
  const bundle = buildSignedProofSet();
  assert.throws(
    () => attestation.evaluateAttestedProofReadiness({ ...bundle, now: '2026-08-07T12:55:00.000Z', ownerApproved: true }),
    /ATTESTED_PROOF_UNKNOWN_FIELD/,
  );
  assert.throws(
    () => attestation.createAttestedGoldenReleasePassport({
      ...bundle,
      now: '2026-08-07T12:55:00.000Z',
      issuedAt: '2026-08-07T13:00:00.000Z',
      privateKey: 'forbidden',
    }),
    /ATTESTED_PASSPORT_UNKNOWN_FIELD/,
  );
});

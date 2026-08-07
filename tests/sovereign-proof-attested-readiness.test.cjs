'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const proof = require('../scripts/ai/sovereign-proof-system');
const cryptoProof = require('../scripts/ai/sovereign-proof-attestation');
const trust = require('../scripts/ai/sovereign-proof-attested-readiness');

const H = (char) => char.repeat(64);
const OWNER_GATES = Object.freeze({
  OWNER_MERGE_APPROVAL: 'MERGE_RELEASE',
  OWNER_DB_PROMOTION_APPROVAL: 'PROMOTE_DATABASE',
  OWNER_PRODUCTION_ACTIVATION: 'ACTIVATE_PRODUCTION',
});
const VERIFIED_AT = Object.freeze({
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

function release() {
  return proof.createReleaseDNA({
    commitSha: 'c0e5428c4d6d47dcbc448dcf9940ef1a067ea6a6',
    frontendBuildHash: H('a'), backendBuildHash: H('b'),
    migrationDigests: [{ path: 'supabase/migrations/001.sql', sha256: H('c') }],
    aiPolicyHash: H('d'), promptHash: H('e'), modelConfigHash: H('f'),
    toolRegistryHash: H('1'), rlsPolicyHash: H('2'), securityConfigHash: H('3'),
    environmentClass: 'RELEASE_CANDIDATE',
  });
}

function keys() { return crypto.generateKeyPairSync('ed25519'); }
function publicPem(pair) { return pair.publicKey.export({ type: 'spki', format: 'pem' }); }
function sign(pair, message) { return crypto.sign(null, message, pair.privateKey).toString('base64'); }

function registry(evidenceKeys, ownerKeys) {
  return cryptoProof.createTrustedKeyRegistry([
    { keyId: 'evidence-2026-01', purpose: 'EVIDENCE_SIGNER', algorithm: 'Ed25519', publicKeyPem: publicPem(evidenceKeys), status: 'ACTIVE', validFrom: '2026-08-01T00:00:00.000Z', validTo: '2027-08-01T00:00:00.000Z' },
    { keyId: 'owner-2026-01', purpose: 'OWNER_DECISION_SIGNER', algorithm: 'Ed25519', publicKeyPem: publicPem(ownerKeys), status: 'ACTIVE', validFrom: '2026-08-01T00:00:00.000Z', validTo: '2027-08-01T00:00:00.000Z' },
  ]);
}

function buildBundle() {
  const releaseDNA = release();
  const evidenceKeys = keys();
  const ownerKeys = keys();
  const trustedKeys = registry(evidenceKeys, ownerKeys);
  const capsules = [];
  const evidenceAttestations = [];
  const ownerProofs = [];

  proof.REQUIRED_GATES.forEach((gate, index) => {
    if (OWNER_GATES[gate.id]) {
      const action = OWNER_GATES[gate.id];
      const environment = cryptoProof.OWNER_ACTION_ENVIRONMENTS[action];
      const payloadDigest = crypto.createHash('sha256').update(`payload:${gate.id}`).digest('hex');
      const scopeDigest = crypto.createHash('sha256').update(`scope:${gate.id}:${environment}`).digest('hex');
      const unsigned = {
        schemaVersion: 'TIGER_OWNER_DECISION_RECEIPT_V1', receiptId: `odr-${index + 1}`, keyId: 'owner-2026-01',
        ownerSubject: 'owner:primary', action, releaseDigest: releaseDNA.digest, payloadDigest, scopeDigest,
        environment, decision: 'APPROVE', reasonCode: 'OWNER_RELEASE_GATE_APPROVED', nonce: `nonce-20260807-${index + 1}`,
        issuedAt: VERIFIED_AT[gate.id], expiresAt: '2026-08-07T13:30:00.000Z',
      };
      const receipt = Object.freeze({ ...unsigned, signature: sign(ownerKeys, cryptoProof.buildOwnerDecisionReceiptMessage(unsigned)) });
      const verified = cryptoProof.verifyOwnerDecisionReceipt({ receipt, trustedKeys, releaseDNA, expectedAction: action, expectedPayloadDigest: payloadDigest, expectedScopeDigest: scopeDigest, expectedOwnerSubject: 'owner:primary', now: '2026-08-07T12:55:00.000Z' });
      const capsule = proof.createEvidenceCapsule({
        releaseDNA, gate: gate.id, requirementId: `REQ-${gate.id}`, status: 'PASS', evidenceClass: gate.allowedEvidenceClasses[0],
        environment: gate.allowedEnvironments[0], reference: `owner-receipt://${unsigned.receiptId}`,
        verifiedAt: VERIFIED_AT[gate.id], evidenceSha256: verified.receiptDigest, fixture: false, simulated: false,
      });
      capsules.push(capsule);
      ownerProofs.push(Object.freeze({ gate: gate.id, capsuleDigest: capsule.digest, receipt, expectedPayloadDigest: payloadDigest, expectedScopeDigest: scopeDigest, expectedOwnerSubject: 'owner:primary' }));
      return;
    }

    const verifiedAt = VERIFIED_AT[gate.id] || '2026-08-07T12:00:00.000Z';
    const capsule = proof.createEvidenceCapsule({
      releaseDNA, gate: gate.id, requirementId: `REQ-${gate.id}`, status: 'PASS', evidenceClass: gate.allowedEvidenceClasses[0],
      environment: gate.allowedEnvironments[0], reference: `evidence://trusted/${gate.id}`, verifiedAt,
      evidenceSha256: crypto.createHash('sha256').update(`artifact:${gate.id}`).digest('hex'), fixture: false, simulated: false,
    });
    const unsigned = {
      schemaVersion: 'TIGER_EVIDENCE_ATTESTATION_V1', keyId: 'evidence-2026-01', capsuleDigest: capsule.digest,
      releaseDigest: capsule.releaseDigest, gate: capsule.gate, evidenceSha256: capsule.evidenceSha256,
      issuedAt: new Date(Date.parse(verifiedAt) + 60_000).toISOString(), expiresAt: '2026-08-08T13:00:00.000Z',
    };
    capsules.push(capsule);
    evidenceAttestations.push(Object.freeze({ ...unsigned, signature: sign(evidenceKeys, cryptoProof.buildEvidenceAttestationMessage(unsigned)) }));
  });

  return { releaseDNA, trustedKeys, capsules, evidenceAttestations, ownerProofs };
}

test('attested truth requires 42 signed evidence proofs plus three separate owner receipts', () => {
  const bundle = buildBundle();
  const result = trust.evaluateAttestedProofReadiness({ ...bundle, now: '2026-08-07T12:55:00.000Z' });
  assert.equal(result.productionReady, true);
  assert.equal(result.status, 'TIGER_ATTESTED_PROOF_100');
  assert.equal(result.verifiedEvidenceAttestationCount, 42);
  assert.equal(result.verifiedOwnerDecisionCount, 3);
  assert.equal(result.totalVerifiedGateProofs, 45);
  assert.equal(result.structuralReadiness.productionReady, true);
  assert.match(result.attestationRootHash, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(result), true);
});

test('45 structural PASS capsules without cryptographic proof remain blocked', () => {
  const bundle = buildBundle();
  const result = trust.evaluateAttestedProofReadiness({ ...bundle, evidenceAttestations: [], ownerProofs: [], now: '2026-08-07T12:55:00.000Z' });
  assert.equal(result.productionReady, false);
  assert.equal(result.structuralReadiness.productionReady, true);
  assert.equal(result.missingCryptographicProofGateIds.length, 45);
});

test('one missing evidence attestation blocks exactly that gate', () => {
  const bundle = buildBundle();
  const removed = bundle.evidenceAttestations[0];
  const result = trust.evaluateAttestedProofReadiness({ ...bundle, evidenceAttestations: bundle.evidenceAttestations.slice(1), now: '2026-08-07T12:55:00.000Z' });
  assert.equal(result.productionReady, false);
  assert.deepEqual(result.missingCryptographicProofGateIds, [removed.gate]);
});

test('owner gates reject Evidence Signer substitution', () => {
  const bundle = buildBundle();
  const ownerGate = 'OWNER_MERGE_APPROVAL';
  const ownerCapsule = bundle.capsules.find((capsule) => capsule.gate === ownerGate);
  const fake = { ...bundle.evidenceAttestations[0], capsuleDigest: ownerCapsule.digest, releaseDigest: ownerCapsule.releaseDigest, gate: ownerGate, evidenceSha256: ownerCapsule.evidenceSha256 };
  assert.throws(
    () => trust.evaluateAttestedProofReadiness({ ...bundle, evidenceAttestations: [...bundle.evidenceAttestations, fake], ownerProofs: bundle.ownerProofs.filter((entry) => entry.gate !== ownerGate), now: '2026-08-07T12:55:00.000Z' }),
    /OWNER_GATE_REQUIRES_OWNER_DECISION_RECEIPT/,
  );
});

test('duplicate or mismatched cryptographic proof fails closed', () => {
  const bundle = buildBundle();
  assert.throws(
    () => trust.evaluateAttestedProofReadiness({ ...bundle, evidenceAttestations: [...bundle.evidenceAttestations, bundle.evidenceAttestations[0]], now: '2026-08-07T12:55:00.000Z' }),
    /ATTESTED_PROOF_DUPLICATE_ATTESTATION/,
  );
  const ownerProofs = [...bundle.ownerProofs];
  ownerProofs[0] = { ...ownerProofs[0], capsuleDigest: H('9') };
  assert.throws(() => trust.evaluateAttestedProofReadiness({ ...bundle, ownerProofs, now: '2026-08-07T12:55:00.000Z' }), /OWNER_PROOF_CAPSULE_MISMATCH/);
});

test('attested Golden Passport exists only for complete cryptographic truth', () => {
  const bundle = buildBundle();
  const passport = trust.createAttestedGoldenReleasePassport({ ...bundle, now: '2026-08-07T12:55:00.000Z', issuedAt: '2026-08-07T13:00:00.000Z' });
  assert.equal(passport.schemaVersion, 'TIGER_ATTESTED_GOLDEN_RELEASE_PASSPORT_V1');
  assert.equal(passport.productionReady, true);
  assert.equal(passport.verifiedEvidenceAttestations, 42);
  assert.equal(passport.verifiedOwnerDecisions, 3);
  assert.match(passport.attestationRootHash, /^[0-9a-f]{64}$/);
  assert.match(passport.digest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(passport), true);

  assert.throws(
    () => trust.createAttestedGoldenReleasePassport({ ...bundle, evidenceAttestations: bundle.evidenceAttestations.slice(1), now: '2026-08-07T12:55:00.000Z', issuedAt: '2026-08-07T13:00:00.000Z' }),
    /ATTESTED_GOLDEN_PASSPORT_BLOCKED/,
  );
});

test('attested truth APIs reject authority-shaped extras and private signing material', () => {
  const bundle = buildBundle();
  assert.throws(() => trust.evaluateAttestedProofReadiness({ ...bundle, now: '2026-08-07T12:55:00.000Z', ownerApproved: true }), /ATTESTED_PROOF_UNKNOWN_FIELD/);
  assert.throws(() => trust.createAttestedGoldenReleasePassport({ ...bundle, now: '2026-08-07T12:55:00.000Z', issuedAt: '2026-08-07T13:00:00.000Z', privateKey: 'forbidden' }), /ATTESTED_PASSPORT_UNKNOWN_FIELD/);
});

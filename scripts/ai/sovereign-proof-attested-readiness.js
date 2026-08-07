'use strict';

const crypto = require('node:crypto');
const proof = require('./sovereign-proof-system');
const cryptoProof = require('./sovereign-proof-attestation');

const OWNER_GATES = Object.freeze({
  OWNER_MERGE_APPROVAL: 'MERGE_RELEASE',
  OWNER_DB_PROMOTION_APPROVAL: 'PROMOTE_DATABASE',
  OWNER_PRODUCTION_ACTIVATION: 'ACTIVATE_PRODUCTION',
});
const OWNER_GATE_IDS = new Set(Object.keys(OWNER_GATES));
const READINESS_FIELDS = Object.freeze(['releaseDNA', 'trustedKeys', 'capsules', 'evidenceAttestations', 'ownerProofs', 'now']);
const PASSPORT_FIELDS = Object.freeze([...READINESS_FIELDS, 'issuedAt']);
const OWNER_PROOF_FIELDS = Object.freeze(['gate', 'capsuleDigest', 'receipt', 'expectedPayloadDigest', 'expectedScopeDigest', 'expectedOwnerSubject']);
const HEX_256 = /^[0-9a-f]{64}$/;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, allowed, code) {
  if (!isPlainObject(value)) fail(code);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) fail('UNSAFE_KEY');
    if (!allowedSet.has(key)) fail(code);
  }
}

function assertRequiredKeys(value, required, code) {
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) fail(code);
  }
}

function assertArray(value, code, max = 256) {
  if (!Array.isArray(value) || value.length > max) fail(code);
  return value;
}

function assertIso(value, code) {
  const ms = Date.parse(String(value || ''));
  if (!Number.isFinite(ms)) fail(code);
  return new Date(ms).toISOString();
}

function assertHash(value, code) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!HEX_256.test(normalized)) fail(code);
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function stableJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('ATTESTED_CANONICAL_VALUE_INVALID');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (!isPlainObject(value)) fail('ATTESTED_CANONICAL_VALUE_INVALID');
  const pairs = [];
  for (const key of Object.keys(value).sort()) {
    if (UNSAFE_KEYS.has(key)) fail('UNSAFE_KEY');
    if (value[key] === undefined) fail('ATTESTED_CANONICAL_VALUE_INVALID');
    pairs.push(`${JSON.stringify(key)}:${stableJson(value[key])}`);
  }
  return `{${pairs.join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(Buffer.from(stableJson(value), 'utf8')).digest('hex');
}

function capsuleMap(capsules) {
  const map = new Map();
  for (const capsule of capsules) {
    if (!proof.verifyEvidenceCapsuleIntegrity(capsule)) fail('EVIDENCE_INTEGRITY_INVALID');
    if (map.has(capsule.gate)) fail('ATTESTED_PROOF_DUPLICATE_CAPSULE');
    map.set(capsule.gate, capsule);
  }
  return map;
}

function normalizeOwnerProof(ownerProof) {
  assertExactKeys(ownerProof, OWNER_PROOF_FIELDS, 'OWNER_PROOF_UNKNOWN_FIELD');
  assertRequiredKeys(ownerProof, OWNER_PROOF_FIELDS, 'OWNER_PROOF_REQUIRED_FIELD');
  const gate = String(ownerProof.gate || '').trim().toUpperCase();
  if (!OWNER_GATE_IDS.has(gate)) fail('OWNER_PROOF_GATE_INVALID');
  return {
    gate,
    capsuleDigest: assertHash(ownerProof.capsuleDigest, 'OWNER_PROOF_CAPSULE_DIGEST_INVALID'),
    receipt: ownerProof.receipt,
    expectedPayloadDigest: assertHash(ownerProof.expectedPayloadDigest, 'OWNER_PROOF_PAYLOAD_DIGEST_INVALID'),
    expectedScopeDigest: assertHash(ownerProof.expectedScopeDigest, 'OWNER_PROOF_SCOPE_DIGEST_INVALID'),
    expectedOwnerSubject: String(ownerProof.expectedOwnerSubject || '').trim(),
  };
}

function evaluateAttestedProofReadiness(input) {
  assertExactKeys(input, READINESS_FIELDS, 'ATTESTED_PROOF_UNKNOWN_FIELD');
  assertRequiredKeys(input, READINESS_FIELDS, 'ATTESTED_PROOF_REQUIRED_FIELD');
  if (!proof.verifyReleaseDNAIntegrity(input.releaseDNA)) fail('ATTESTED_PROOF_RELEASE_DNA_INVALID');
  if (!cryptoProof.isTrustedKeyRegistry(input.trustedKeys)) fail('TRUSTED_KEY_REGISTRY_UNVERIFIED');

  const now = assertIso(input.now, 'ATTESTED_PROOF_NOW_INVALID');
  const capsules = assertArray(input.capsules, 'ATTESTED_PROOF_CAPSULES_INVALID', 128);
  const evidenceAttestations = assertArray(input.evidenceAttestations, 'ATTESTED_PROOF_ATTESTATIONS_INVALID', 128);
  const ownerProofs = assertArray(input.ownerProofs, 'ATTESTED_PROOF_OWNER_PROOFS_INVALID', 16);
  const byGate = capsuleMap(capsules);

  const structuralReadiness = proof.evaluateProofReadiness({ releaseDNA: input.releaseDNA, capsules });
  const verifiedByGate = new Map();
  const proofLeaves = [];

  for (const signed of evidenceAttestations) {
    if (!isPlainObject(signed)) fail('EVIDENCE_ATTESTATION_INVALID');
    const gate = String(signed.gate || '').trim().toUpperCase();
    if (OWNER_GATE_IDS.has(gate)) fail('OWNER_GATE_REQUIRES_OWNER_DECISION_RECEIPT');
    if (!gate || verifiedByGate.has(gate)) fail('ATTESTED_PROOF_DUPLICATE_ATTESTATION');
    const capsule = byGate.get(gate);
    if (!capsule) fail('ATTESTED_PROOF_ATTESTATION_WITHOUT_CAPSULE');
    const verified = cryptoProof.verifyEvidenceAttestation({ capsule, attestation: signed, trustedKeys: input.trustedKeys, now });
    verifiedByGate.set(gate, 'EVIDENCE_ATTESTATION');
    proofLeaves.push({ gate, proofType: 'EVIDENCE_ATTESTATION', proofDigest: verified.attestationDigest, capsuleDigest: capsule.digest });
  }

  for (const rawOwnerProof of ownerProofs) {
    const ownerProof = normalizeOwnerProof(rawOwnerProof);
    if (verifiedByGate.has(ownerProof.gate)) fail('ATTESTED_PROOF_DUPLICATE_OWNER_PROOF');
    const capsule = byGate.get(ownerProof.gate);
    if (!capsule) fail('OWNER_PROOF_WITHOUT_CAPSULE');
    if (capsule.digest !== ownerProof.capsuleDigest) fail('OWNER_PROOF_CAPSULE_MISMATCH');

    const verified = cryptoProof.verifyOwnerDecisionReceipt({
      receipt: ownerProof.receipt,
      trustedKeys: input.trustedKeys,
      releaseDNA: input.releaseDNA,
      expectedAction: OWNER_GATES[ownerProof.gate],
      expectedPayloadDigest: ownerProof.expectedPayloadDigest,
      expectedScopeDigest: ownerProof.expectedScopeDigest,
      expectedOwnerSubject: ownerProof.expectedOwnerSubject,
      now,
    });
    if (verified.receiptDigest !== capsule.evidenceSha256) fail('OWNER_PROOF_RECEIPT_DIGEST_MISMATCH');
    verifiedByGate.set(ownerProof.gate, 'OWNER_DECISION_RECEIPT');
    proofLeaves.push({ gate: ownerProof.gate, proofType: 'OWNER_DECISION_RECEIPT', proofDigest: verified.receiptDigest, capsuleDigest: capsule.digest });
  }

  const missingCryptographicProofGateIds = proof.REQUIRED_GATES
    .map((gate) => gate.id)
    .filter((gateId) => !verifiedByGate.has(gateId));

  const verifiedEvidenceAttestationCount = [...verifiedByGate.values()].filter((type) => type === 'EVIDENCE_ATTESTATION').length;
  const verifiedOwnerDecisionCount = [...verifiedByGate.values()].filter((type) => type === 'OWNER_DECISION_RECEIPT').length;
  const totalVerifiedGateProofs = verifiedByGate.size;
  const productionReady = structuralReadiness.productionReady && missingCryptographicProofGateIds.length === 0 && totalVerifiedGateProofs === proof.REQUIRED_GATES.length;

  proofLeaves.sort((left, right) => left.gate.localeCompare(right.gate));
  const attestationRootHash = sha256({ schemaVersion: 'TIGER_ATTESTATION_ROOT_V1', releaseDigest: input.releaseDNA.digest, leaves: proofLeaves });

  return deepFreeze({
    schemaVersion: 'TIGER_ATTESTED_READINESS_V1',
    status: productionReady ? 'TIGER_ATTESTED_PROOF_100' : 'TIGER_ATTESTED_PROOF_BLOCKED',
    productionReady,
    releaseDigest: input.releaseDNA.digest,
    structuralReadiness,
    verifiedEvidenceAttestationCount,
    verifiedOwnerDecisionCount,
    totalVerifiedGateProofs,
    missingCryptographicProofGateIds,
    attestationRootHash,
  });
}

function createAttestedGoldenReleasePassport(input) {
  assertExactKeys(input, PASSPORT_FIELDS, 'ATTESTED_PASSPORT_UNKNOWN_FIELD');
  assertRequiredKeys(input, PASSPORT_FIELDS, 'ATTESTED_PASSPORT_REQUIRED_FIELD');
  const issuedAt = assertIso(input.issuedAt, 'ATTESTED_PASSPORT_ISSUED_AT_INVALID');
  const now = assertIso(input.now, 'ATTESTED_PROOF_NOW_INVALID');
  if (Date.parse(issuedAt) < Date.parse(now)) fail('ATTESTED_PASSPORT_ISSUED_AT_INVALID');

  const readinessInput = {};
  for (const field of READINESS_FIELDS) readinessInput[field] = input[field];
  const result = evaluateAttestedProofReadiness(readinessInput);
  if (!result.productionReady) fail('ATTESTED_GOLDEN_PASSPORT_BLOCKED');

  const envelope = {
    schemaVersion: 'TIGER_ATTESTED_GOLDEN_RELEASE_PASSPORT_V1',
    status: 'TIGER_ATTESTED_GOLDEN_RELEASE_PASSPORT_ISSUED',
    productionReady: true,
    releaseDigest: result.releaseDigest,
    evidenceRootHash: result.structuralReadiness.evidenceRootHash,
    attestationRootHash: result.attestationRootHash,
    verifiedEvidenceAttestations: result.verifiedEvidenceAttestationCount,
    verifiedOwnerDecisions: result.verifiedOwnerDecisionCount,
    totalVerifiedGateProofs: result.totalVerifiedGateProofs,
    issuedAt,
  };

  return deepFreeze({ ...envelope, digest: sha256(envelope) });
}

module.exports = Object.freeze({
  OWNER_GATES,
  evaluateAttestedProofReadiness,
  createAttestedGoldenReleasePassport,
});

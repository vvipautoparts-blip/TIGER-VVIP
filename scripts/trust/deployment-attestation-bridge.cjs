'use strict';

const {
  TrustContractError,
  canonicalJson,
  sha256Hex,
  validateTrustDna,
  validateEpochVector,
  digestValidated,
} = require('./contracts.cjs');
const {
  validateAttestationResult,
  digestAttestationResult,
  isTrustedAttestationResult,
} = require('./runtime-attestation.cjs');
const {
  validateMarketSourceReadinessEvidence,
} = require('../marketplace/market-source-readiness-evidence.js');
const {
  validateContactReplayReleaseEvidence,
} = require('../marketplace/market-release-evidence-contract.js');

const DEPLOYMENT_ATTESTATION_BRIDGE_SCHEMA = 'TIGER_DEPLOYMENT_ATTESTATION_BRIDGE_V1';
const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = /^0{64}$/;
const ENVIRONMENTS = new Set(['staging', 'production']);
const DERIVE_KEYS = Object.freeze([
  'sourceReadinessEvidence',
  'releaseEvidence',
  'attestationResult',
]);

const trustedBridgeResults = new WeakSet();

function fail(code) {
  throw new TrustContractError(code);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function isSha256(value) {
  return typeof value === 'string' && SHA256.test(value) && !ZERO_SHA256.test(value);
}

function safeNow(clock) {
  let value;
  try {
    value = clock();
  } catch {
    fail('ATTESTATION_FRESHNESS_INVALID');
  }
  if (!Number.isSafeInteger(value) || value < 0) fail('ATTESTATION_FRESHNESS_INVALID');
  return value;
}

function validateTrustedDna(value, expectedSourceSha, expectedSourceTree) {
  let normalized;
  try {
    normalized = validateTrustDna(value);
  } catch {
    fail('TRUST_DNA_BINDING_MISMATCH');
  }
  if (normalized.source_sha !== expectedSourceSha || normalized.source_tree !== expectedSourceTree) {
    fail('TRUST_DNA_BINDING_MISMATCH');
  }
  return normalized;
}

function validateTrustedEpochs(value) {
  try {
    return validateEpochVector(value);
  } catch {
    fail('TRUST_EPOCH_BINDING_MISMATCH');
  }
}

function createDeploymentAttestationBridge({
  expectedSourceSha,
  expectedSourceTree,
  observedHeadSha,
  expectedEnvironment,
  expectedArtifactSha256,
  trustDna,
  epochVector,
  clock,
} = {}) {
  if (!SHA40.test(expectedSourceSha || '')
    || !SHA40.test(expectedSourceTree || '')
    || !SHA40.test(observedHeadSha || '')
    || !ENVIRONMENTS.has(expectedEnvironment)
    || !isSha256(expectedArtifactSha256)
    || typeof clock !== 'function') {
    fail('DEPLOYMENT_EVIDENCE_UNVERIFIED');
  }

  const normalizedDna = validateTrustedDna(trustDna, expectedSourceSha, expectedSourceTree);
  const normalizedEpochs = validateTrustedEpochs(epochVector);
  const trustDnaSha256 = digestValidated(normalizedDna, validateTrustDna);
  const epochVectorSha256 = digestValidated(normalizedEpochs, validateEpochVector);

  return Object.freeze({
    derive(input) {
      if (!hasExactKeys(input, DERIVE_KEYS)) fail('DEPLOYMENT_EVIDENCE_UNVERIFIED');

      const sourceValidation = validateMarketSourceReadinessEvidence(
        input.sourceReadinessEvidence,
        {
          expectedSourceSha,
          expectedSourceTree,
        },
      );
      if (sourceValidation.ok !== true) fail('SOURCE_READINESS_UNVERIFIED');

      const sourceReadinessSha256 = sha256Hex(canonicalJson(input.sourceReadinessEvidence));
      if (normalizedDna.source_readiness_sha256 !== sourceReadinessSha256) {
        fail('TRUST_DNA_BINDING_MISMATCH');
      }

      const releaseValidation = validateContactReplayReleaseEvidence({
        release: input.releaseEvidence,
        expectedHeadSha: expectedSourceSha,
        observedHeadSha,
      });
      if (releaseValidation.ok !== true) fail('DEPLOYMENT_EVIDENCE_UNVERIFIED');

      if (input.releaseEvidence.target_environment !== expectedEnvironment) {
        fail('ATTESTATION_ENVIRONMENT_MISMATCH');
      }

      if (!isTrustedAttestationResult(input.attestationResult)) {
        fail('ATTESTATION_VERIFIER_UNTRUSTED');
      }

      const nowMs = safeNow(clock);
      const attestation = validateAttestationResult(input.attestationResult, { nowMs });

      if (attestation.release_sha !== expectedSourceSha
        || attestation.release_sha !== observedHeadSha
        || attestation.release_sha !== input.releaseEvidence.contact_replay_release_evidence.release_sha) {
        fail('ATTESTATION_RELEASE_MISMATCH');
      }
      if (attestation.environment !== expectedEnvironment
        || attestation.environment !== input.releaseEvidence.target_environment) {
        fail('ATTESTATION_ENVIRONMENT_MISMATCH');
      }
      if (attestation.runtime_artifact_sha256 !== expectedArtifactSha256) {
        fail('ATTESTATION_ARTIFACT_MISMATCH');
      }

      const result = Object.freeze({
        schema: DEPLOYMENT_ATTESTATION_BRIDGE_SCHEMA,
        release_sha: expectedSourceSha,
        source_tree: expectedSourceTree,
        environment: expectedEnvironment,
        runtime_artifact_sha256: expectedArtifactSha256,
        verifier_ref_sha256: attestation.verifier_ref_sha256,
        attester_ref_sha256: attestation.attester_ref_sha256,
        source_readiness_sha256: sourceReadinessSha256,
        deployment_evidence_sha256: sha256Hex(canonicalJson(input.releaseEvidence)),
        trust_dna_sha256: trustDnaSha256,
        epoch_vector_sha256: epochVectorSha256,
        attestation_result_sha256: digestAttestationResult(attestation, { nowMs }),
        verified_at_ms: nowMs,
        attestation_fresh_until_ms: attestation.fresh_until_ms,
        source_readiness_verified: true,
        deployment_evidence_verified: true,
        runtime_attestation_verified: true,
        production_activation_authorized: false,
        transaction_authority_enabled: false,
        state: 'PASS',
      });
      trustedBridgeResults.add(result);
      return result;
    },
  });
}

function isTrustedDeploymentAttestationBridge(value) {
  return Boolean(value && typeof value === 'object' && trustedBridgeResults.has(value));
}

module.exports = {
  DEPLOYMENT_ATTESTATION_BRIDGE_SCHEMA,
  createDeploymentAttestationBridge,
  isTrustedDeploymentAttestationBridge,
};

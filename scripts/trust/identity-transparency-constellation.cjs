'use strict';

const {
  TrustContractError,
  canonicalJson,
  sha256Hex,
} = require('./contracts.cjs');
const {
  isTrustedDeploymentAttestationBridge,
} = require('./deployment-attestation-bridge.cjs');
const {
  validateWorkloadIdentity,
  digestWorkloadIdentity,
  isTrustedWorkloadIdentity,
} = require('./workload-identity.cjs');
const {
  validateTransparencyResult,
  digestTransparencyResult,
  isTrustedTransparencyResult,
} = require('./transparency-evidence.cjs');

const IDENTITY_TRANSPARENCY_CONSTELLATION_SCHEMA = 'TIGER_IDENTITY_TRANSPARENCY_CONSTELLATION_V1';
const SHA256 = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = /^0{64}$/;
const ENVIRONMENTS = new Set(['staging', 'production']);
const DERIVE_KEYS = Object.freeze(['bridgeResult', 'workloadIdentity', 'transparencyResult']);
const CONSTELLATION_KEYS = Object.freeze([
  'schema',
  'release_dna_sha256',
  'runtime_artifact_sha256',
  'environment',
  'workload_identity_sha256',
  'workload_ref_sha256',
  'transparency_result_sha256',
  'statement_sha256',
  'registry_ref_sha256',
  'bridge_result_sha256',
  'verified_at_ms',
  'fresh_until_ms',
  'state',
]);
const trustedConstellations = new WeakSet();

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

function safeInt(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function strongSha256(value) {
  return typeof value === 'string' && SHA256.test(value) && !ZERO_SHA256.test(value);
}

function safeNow(clock) {
  let value;
  try {
    value = clock();
  } catch {
    fail('TRUST_CONSTELLATION_TIME_INVALID');
  }
  if (!safeInt(value)) fail('TRUST_CONSTELLATION_TIME_INVALID');
  return value;
}

function validateIdentityTransparencyConstellation(value, { nowMs } = {}) {
  if (!safeInt(nowMs)) fail('TRUST_CONSTELLATION_TIME_INVALID');
  if (!hasExactKeys(value, CONSTELLATION_KEYS)
    || value.schema !== IDENTITY_TRANSPARENCY_CONSTELLATION_SCHEMA
    || !strongSha256(value.release_dna_sha256)
    || !strongSha256(value.runtime_artifact_sha256)
    || !ENVIRONMENTS.has(value.environment)
    || !strongSha256(value.workload_identity_sha256)
    || !strongSha256(value.workload_ref_sha256)
    || !strongSha256(value.transparency_result_sha256)
    || !strongSha256(value.statement_sha256)
    || !strongSha256(value.registry_ref_sha256)
    || !strongSha256(value.bridge_result_sha256)
    || !safeInt(value.verified_at_ms)
    || !safeInt(value.fresh_until_ms)
    || value.fresh_until_ms <= value.verified_at_ms
    || value.state !== 'PASS') {
    fail('TRUST_CONSTELLATION_INVALID');
  }
  if (value.verified_at_ms > nowMs) fail('TRUST_CONSTELLATION_TIME_INVALID');
  if (nowMs >= value.fresh_until_ms) fail('TRUST_CONSTELLATION_STALE');
  return Object.freeze({ ...value });
}

function digestIdentityTransparencyConstellation(value, { nowMs } = {}) {
  return sha256Hex(canonicalJson(validateIdentityTransparencyConstellation(value, { nowMs })));
}

function createIdentityTransparencyConstellation({
  expectedReleaseDnaSha256,
  expectedEnvironment,
  expectedArtifactSha256,
  expectedWorkloadRefSha256,
  expectedStatementSha256,
  expectedRegistryRefSha256,
  clock,
} = {}) {
  if (!strongSha256(expectedReleaseDnaSha256)
    || !ENVIRONMENTS.has(expectedEnvironment)
    || !strongSha256(expectedArtifactSha256)
    || !strongSha256(expectedWorkloadRefSha256)
    || !strongSha256(expectedStatementSha256)
    || !strongSha256(expectedRegistryRefSha256)
    || typeof clock !== 'function') {
    fail('TRUST_CONSTELLATION_INVALID');
  }

  return Object.freeze({
    derive(input) {
      if (!hasExactKeys(input, DERIVE_KEYS)) fail('TRUST_CONSTELLATION_INVALID');
      if (!isTrustedDeploymentAttestationBridge(input.bridgeResult)
        || !isTrustedWorkloadIdentity(input.workloadIdentity)
        || !isTrustedTransparencyResult(input.transparencyResult)) {
        fail('TRUST_CONSTELLATION_UNTRUSTED');
      }

      const nowMs = safeNow(clock);
      let workload;
      let transparency;
      try {
        workload = validateWorkloadIdentity(input.workloadIdentity, { nowMs });
        transparency = validateTransparencyResult(input.transparencyResult, { nowMs });
      } catch (error) {
        if (error?.code === 'TRUST_WORKLOAD_IDENTITY_STALE'
          || error?.code === 'TRUST_TRANSPARENCY_STALE') {
          fail('TRUST_CONSTELLATION_STALE');
        }
        throw error;
      }

      const bridge = input.bridgeResult;
      if (!safeInt(bridge.attestation_fresh_until_ms) || nowMs >= bridge.attestation_fresh_until_ms) {
        fail('TRUST_CONSTELLATION_STALE');
      }
      if (bridge.trust_dna_sha256 !== expectedReleaseDnaSha256
        || workload.release_dna_sha256 !== expectedReleaseDnaSha256
        || transparency.release_dna_sha256 !== expectedReleaseDnaSha256
        || bridge.runtime_artifact_sha256 !== expectedArtifactSha256
        || workload.runtime_artifact_sha256 !== expectedArtifactSha256
        || transparency.runtime_artifact_sha256 !== expectedArtifactSha256
        || bridge.environment !== expectedEnvironment
        || workload.environment !== expectedEnvironment) {
        fail('TRUST_CONSTELLATION_RUNTIME_MISMATCH');
      }
      if (workload.workload_ref_sha256 !== expectedWorkloadRefSha256) {
        fail('TRUST_WORKLOAD_IDENTITY_MISMATCH');
      }
      if (transparency.statement_sha256 !== expectedStatementSha256
        || transparency.registry_ref_sha256 !== expectedRegistryRefSha256) {
        fail('TRUST_TRANSPARENCY_MISMATCH');
      }

      const freshUntilMs = Math.min(
        bridge.attestation_fresh_until_ms,
        workload.fresh_until_ms,
        transparency.fresh_until_ms,
      );
      if (freshUntilMs <= nowMs) fail('TRUST_CONSTELLATION_STALE');

      const result = Object.freeze({
        schema: IDENTITY_TRANSPARENCY_CONSTELLATION_SCHEMA,
        release_dna_sha256: expectedReleaseDnaSha256,
        runtime_artifact_sha256: expectedArtifactSha256,
        environment: expectedEnvironment,
        workload_identity_sha256: digestWorkloadIdentity(workload, { nowMs }),
        workload_ref_sha256: expectedWorkloadRefSha256,
        transparency_result_sha256: digestTransparencyResult(transparency, { nowMs }),
        statement_sha256: expectedStatementSha256,
        registry_ref_sha256: expectedRegistryRefSha256,
        bridge_result_sha256: sha256Hex(canonicalJson(bridge)),
        verified_at_ms: nowMs,
        fresh_until_ms: freshUntilMs,
        state: 'PASS',
      });
      trustedConstellations.add(result);
      return result;
    },
  });
}

function isTrustedIdentityTransparencyConstellation(value) {
  return Boolean(value && typeof value === 'object' && trustedConstellations.has(value));
}

module.exports = {
  IDENTITY_TRANSPARENCY_CONSTELLATION_SCHEMA,
  createIdentityTransparencyConstellation,
  validateIdentityTransparencyConstellation,
  digestIdentityTransparencyConstellation,
  isTrustedIdentityTransparencyConstellation,
};

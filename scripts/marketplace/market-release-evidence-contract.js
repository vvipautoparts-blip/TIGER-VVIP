'use strict';

const RELEASE_EVIDENCE_SCHEMA_VERSION = 'market-contact-replay-release-evidence-v1';
const REVIEWED_REPLAY_MIGRATION_SHA256 = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';
const SUPPORTED_RELEASE_ENVIRONMENTS = Object.freeze(['staging', 'production']);

const RELEASE_KEYS = Object.freeze([
  'target_environment',
  'contact_replay_release_evidence',
]);

const EVIDENCE_KEYS = Object.freeze([
  'schema_version',
  'environment',
  'release_sha',
  'migration_sha256',
  'migration_applied',
  'migration_applied_at',
  'probe_completed_at',
  'probe_run_id',
  'runtime_instance_count',
  'duplicate_nonce_probe',
  'duplicate_consume_probe',
]);

const PROBE_KEYS = Object.freeze([
  'attempts',
  'successes',
  'replay_rejections',
]);

const SHA40_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function verdict(ok, reasonCode) {
  return Object.freeze({ ok, reason_code: reasonCode });
}

function fail(reasonCode) {
  return verdict(false, reasonCode);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, expectedKeys) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== expectedKeys.length) return false;
  return expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isSupportedEnvironment(value) {
  return typeof value === 'string' && SUPPORTED_RELEASE_ENVIRONMENTS.includes(value);
}

function parseCanonicalIsoTimestamp(value) {
  if (typeof value !== 'string') return null;
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) return null;
  if (new Date(epoch).toISOString() !== value) return null;
  return epoch;
}

function isBoundedProbeRunId(value) {
  return typeof value === 'string'
    && value.length >= 1
    && value.length <= 256
    && value.trim().length > 0;
}

function isProbeShape(value) {
  return hasExactKeys(value, PROBE_KEYS)
    && PROBE_KEYS.every((key) => Number.isInteger(value[key]) && value[key] >= 0);
}

function isExpectedReplayProbe(value) {
  return value.attempts === 2
    && value.successes === 1
    && value.replay_rejections === 1;
}

function validateContactReplayReleaseEvidence({ release, expectedHeadSha, observedHeadSha } = {}) {
  if (release === undefined || release === null) {
    return fail('CONTACT_REPLAY_RELEASE_EVIDENCE_MISSING');
  }

  if (!hasExactKeys(release, RELEASE_KEYS)) {
    return fail('CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');
  }

  const evidence = release.contact_replay_release_evidence;
  if (!hasExactKeys(evidence, EVIDENCE_KEYS)) {
    return fail('CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');
  }

  if (!isSupportedEnvironment(release.target_environment)
    || !isSupportedEnvironment(evidence.environment)
    || evidence.schema_version !== RELEASE_EVIDENCE_SCHEMA_VERSION
    || typeof evidence.migration_applied !== 'boolean'
    || !SHA40_PATTERN.test(evidence.release_sha)
    || !SHA256_PATTERN.test(evidence.migration_sha256)
    || !SHA40_PATTERN.test(expectedHeadSha)
    || !SHA40_PATTERN.test(observedHeadSha)
    || !isBoundedProbeRunId(evidence.probe_run_id)
    || !Number.isInteger(evidence.runtime_instance_count)
    || evidence.runtime_instance_count < 0
    || !isProbeShape(evidence.duplicate_nonce_probe)
    || !isProbeShape(evidence.duplicate_consume_probe)) {
    return fail('CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');
  }

  const migrationAppliedAt = parseCanonicalIsoTimestamp(evidence.migration_applied_at);
  const probeCompletedAt = parseCanonicalIsoTimestamp(evidence.probe_completed_at);
  if (migrationAppliedAt === null || probeCompletedAt === null || probeCompletedAt < migrationAppliedAt) {
    return fail('CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');
  }

  if (evidence.environment !== release.target_environment) {
    return fail('CONTACT_REPLAY_RELEASE_ENVIRONMENT_MISMATCH');
  }

  if (evidence.release_sha !== expectedHeadSha || evidence.release_sha !== observedHeadSha) {
    return fail('CONTACT_REPLAY_RELEASE_SHA_MISMATCH');
  }

  if (evidence.migration_sha256 !== REVIEWED_REPLAY_MIGRATION_SHA256) {
    return fail('CONTACT_REPLAY_MIGRATION_DIGEST_MISMATCH');
  }

  if (evidence.migration_applied !== true) {
    return fail('CONTACT_REPLAY_MIGRATION_NOT_APPLIED');
  }

  if (evidence.runtime_instance_count < 2) {
    return fail('CONTACT_REPLAY_RUNTIME_COUNT_INSUFFICIENT');
  }

  if (!isExpectedReplayProbe(evidence.duplicate_nonce_probe)) {
    return fail('CONTACT_REPLAY_NONCE_PROBE_FAILED');
  }

  if (!isExpectedReplayProbe(evidence.duplicate_consume_probe)) {
    return fail('CONTACT_REPLAY_CONSUME_PROBE_FAILED');
  }

  return verdict(true, 'CONTACT_REPLAY_RELEASE_EVIDENCE_VERIFIED');
}

module.exports = {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  REVIEWED_REPLAY_MIGRATION_SHA256,
  SUPPORTED_RELEASE_ENVIRONMENTS,
  validateContactReplayReleaseEvidence,
};

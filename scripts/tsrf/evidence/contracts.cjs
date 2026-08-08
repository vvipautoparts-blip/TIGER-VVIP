'use strict';

const { createHash } = require('node:crypto');

class EvidenceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'EvidenceError';
    this.code = code;
  }
}

const CAPSULE_CLASSES = Object.freeze([
  'OTP_PROOF_CAPSULE',
  'DB_REBUILD_PROOF_CAPSULE',
  'PR36_IMAGE_PROOF_CAPSULE',
  'AI_SHADOW_PROOF_CAPSULE',
  'OWNER_SOVEREIGNTY_PROOF_CAPSULE',
  'BLACKBOX_PROOF_CAPSULE',
  'PERFORMANCE_PROOF_CAPSULE',
  'RECOVERY_PROOF_CAPSULE',
  'JO_LEGAL_PROOF_CAPSULE',
]);

const ENVIRONMENT_BY_CLASS = Object.freeze({
  OTP_PROOF_CAPSULE: Object.freeze(['STAGING']),
  DB_REBUILD_PROOF_CAPSULE: Object.freeze(['LOCAL']),
  PR36_IMAGE_PROOF_CAPSULE: Object.freeze(['STAGING']),
  AI_SHADOW_PROOF_CAPSULE: Object.freeze(['STAGING']),
  OWNER_SOVEREIGNTY_PROOF_CAPSULE: Object.freeze(['STAGING']),
  BLACKBOX_PROOF_CAPSULE: Object.freeze(['STAGING']),
  PERFORMANCE_PROOF_CAPSULE: Object.freeze(['STAGING']),
  RECOVERY_PROOF_CAPSULE: Object.freeze(['STAGING']),
  JO_LEGAL_PROOF_CAPSULE: Object.freeze(['NON_RUNTIME']),
});

const CAPSULE_FIELDS = Object.freeze([
  'capsule_version',
  'capsule_class',
  'release_digest',
  'source_sha',
  'source_tree',
  'environment',
  'test_version',
  'workflow_run_id',
  'runner_identity',
  'artifact_name',
  'artifact_sha256',
  'started_at',
  'completed_at',
  'generated_at',
  'kill_switch_state',
  'validation_results',
  'result',
]);

const RELEASE_DNA_FIELDS = Object.freeze([
  'dna_version',
  'source_sha',
  'source_tree',
  'frontend_build_sha256',
  'backend_edge_build_sha256',
  'migration_digests',
  'ai_policy_sha256',
  'prompt_sha256',
  'model_config_sha256',
  'tool_registry_sha256',
  'rls_sha256',
  'security_config_sha256',
  'environment_class',
]);

const AUTHORITY_KEYS = new Set([
  'authorized',
  'authorization',
  'approved',
  'ownerapproved',
  'productionready',
  'mergeauthorized',
  'productiondbauthorized',
  'productionactivationauthorized',
]);

const SECRET_KEYS = new Set([
  'secret',
  'password',
  'token',
  'servicerole',
  'privatekey',
  'apikey',
]);

function fail(code, message) {
  throw new EvidenceError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeKey(key) {
  return String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function canonicalize(value, stack) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail('EVIDENCE_CANONICAL_VALUE_INVALID', 'Canonical evidence supports safe integers only.');
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (stack.has(value)) {
      fail('EVIDENCE_CANONICAL_VALUE_INVALID', 'Canonical evidence cannot contain cycles.');
    }
    stack.add(value);
    const result = value.map((item) => canonicalize(item, stack));
    stack.delete(value);
    return result;
  }

  if (!isPlainObject(value)) {
    fail('EVIDENCE_CANONICAL_VALUE_INVALID', 'Canonical evidence contains an unsupported value type.');
  }

  if (stack.has(value)) {
    fail('EVIDENCE_CANONICAL_VALUE_INVALID', 'Canonical evidence cannot contain cycles.');
  }

  stack.add(value);
  const result = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = canonicalize(value[key], stack);
  }
  stack.delete(value);
  return result;
}

function canonicalJson(value) {
  const normalized = canonicalize(value, new Set());
  return JSON.stringify(normalized);
}

function sha256Hex(value) {
  if (typeof value !== 'string' && !Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    fail('EVIDENCE_HASH_INPUT_INVALID', 'SHA-256 input must be text or bytes.');
  }
  return createHash('sha256').update(value).digest('hex');
}

function assertSha40(_name, value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    fail('EVIDENCE_SHA40_INVALID', 'Expected a full lowercase Git SHA.');
  }
  return value;
}

function assertSha256(_name, value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    fail('EVIDENCE_SHA256_INVALID', 'Expected a lowercase SHA-256 digest.');
  }
  return value;
}

function assertIsoUtc(_name, value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    fail('EVIDENCE_TIMESTAMP_INVALID', 'Expected a canonical UTC ISO-8601 timestamp.');
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    fail('EVIDENCE_TIMESTAMP_INVALID', 'Expected a canonical UTC ISO-8601 timestamp.');
  }
  return value;
}

function assertAllowedCapsuleEnvironment(capsuleClass, environment, killSwitchState) {
  if (!Object.hasOwn(ENVIRONMENT_BY_CLASS, capsuleClass)) {
    fail('EVIDENCE_CAPSULE_CLASS_UNSUPPORTED', 'Unsupported proof capsule class.');
  }

  if (environment === 'PRODUCTION' || !ENVIRONMENT_BY_CLASS[capsuleClass].includes(environment)) {
    fail('EVIDENCE_ENVIRONMENT_BLOCKED', 'Proof capsule environment is not permitted for this class.');
  }

  const expectedKillSwitch = environment === 'STAGING' ? 'TRUE' : 'NOT_APPLICABLE';
  if (killSwitchState !== expectedKillSwitch) {
    fail('EVIDENCE_KILL_SWITCH_INVALID', 'Kill-switch evidence does not match the proof environment.');
  }

  return true;
}

function assertNoForbiddenShape(value) {
  const visit = (current) => {
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }

    if (!isPlainObject(current)) return;

    for (const [key, child] of Object.entries(current)) {
      const normalized = normalizeKey(key);
      if (AUTHORITY_KEYS.has(normalized)) {
        fail('EVIDENCE_FORBIDDEN_FIELD', 'Authority-bearing fields are forbidden in evidence.');
      }
      if (SECRET_KEYS.has(normalized)) {
        fail('EVIDENCE_SECRET_FIELD', 'Secret-shaped fields are forbidden in evidence.');
      }
      visit(child);
    }
  };

  visit(value);
  return true;
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return value;
}

module.exports = {
  EvidenceError,
  CAPSULE_CLASSES,
  ENVIRONMENT_BY_CLASS,
  CAPSULE_FIELDS,
  RELEASE_DNA_FIELDS,
  canonicalJson,
  sha256Hex,
  assertSha40,
  assertSha256,
  assertIsoUtc,
  assertAllowedCapsuleEnvironment,
  assertNoForbiddenShape,
  deepFreeze,
};

'use strict';

const {
  EvidenceError,
  assertIsoUtc,
  canonicalJson,
  deepFreeze,
  sha256Hex,
} = require('./contracts.cjs');

const GATE_ID_PATTERN = /^P(?:0[1-9]|1[0-9]|20)$/;
const EVIDENCE_CLASS_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const SUBJECT_PATTERN = /^(?:sha256:[0-9a-f]{64}|[A-Z][A-Z0-9_:-]{1,127})$/;
const FACT_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const FACT_VALUES = new Set(['PASS', 'BLOCKED', 'FAIL', 'UNKNOWN', 'SKIPPED', 'TRUE', 'NOT_APPLICABLE']);
const TRUSTED_FIELDS = new Set([
  'producer_identity',
  'runner_identity',
  'workflow_identity',
  'expected_source_sha',
  'expected_source_tree',
  'source_sha',
  'source_tree',
  'environment',
  'now_ms',
]);
const INPUT_FIELDS = new Set([
  'gate_id',
  'evidence_class',
  'subject',
  'observed_at',
  'facts',
  'proof_capsule_digest',
]);
const ENVELOPE_FIELDS = new Set([
  'schema_version',
  ...INPUT_FIELDS,
  'envelope_digest',
]);

function fail(code, message) {
  throw new EvidenceError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeFacts(facts) {
  if (!isPlainObject(facts) || Object.keys(facts).length === 0 || Object.keys(facts).length > 64) {
    fail('EVIDENCE_FACTS_INVALID', 'Evidence facts must be a non-empty bounded object.');
  }
  const normalized = {};
  for (const key of Object.keys(facts).sort()) {
    const value = facts[key];
    const digest = typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
    if (!FACT_PATTERN.test(key) || (!digest && !FACT_VALUES.has(value))) {
      fail('EVIDENCE_FACTS_INVALID', 'Evidence fact key or value is invalid.');
    }
    normalized[key] = value;
  }
  return normalized;
}

function normalizeCore(input, allowedFields) {
  if (!isPlainObject(input)) fail('EVIDENCE_ENVELOPE_INVALID', 'Evidence envelope must be an object.');
  for (const key of Object.keys(input)) {
    if (TRUSTED_FIELDS.has(key)) fail('EVIDENCE_TRUSTED_FIELD_FORGED', 'Trusted context fields cannot be supplied by evidence payload.');
    if (!allowedFields.has(key)) fail('EVIDENCE_ENVELOPE_FIELD_INVALID', 'Evidence envelope contains an unknown field.');
  }
  for (const field of ['gate_id', 'evidence_class', 'subject', 'observed_at', 'facts']) {
    if (!Object.hasOwn(input, field)) fail('EVIDENCE_ENVELOPE_FIELD_MISSING', `Evidence envelope is missing ${field}.`);
  }
  if (!GATE_ID_PATTERN.test(input.gate_id)) fail('EVIDENCE_GATE_ID_INVALID', 'Evidence gate identifier is invalid.');
  if (!EVIDENCE_CLASS_PATTERN.test(input.evidence_class)) fail('EVIDENCE_CLASS_INVALID', 'Evidence class is invalid.');
  if (!SUBJECT_PATTERN.test(input.subject)) fail('EVIDENCE_SUBJECT_INVALID', 'Evidence subject is invalid.');
  assertIsoUtc('observed_at', input.observed_at);
  if (Object.hasOwn(input, 'proof_capsule_digest') && !/^[0-9a-f]{64}$/.test(input.proof_capsule_digest)) {
    fail('EVIDENCE_CAPSULE_DIGEST_INVALID', 'Proof Capsule digest is invalid.');
  }

  return {
    schema_version: 'TIGER_VERITY_EVIDENCE_V1',
    gate_id: input.gate_id,
    evidence_class: input.evidence_class,
    subject: input.subject,
    observed_at: input.observed_at,
    facts: normalizeFacts(input.facts),
    ...(Object.hasOwn(input, 'proof_capsule_digest') ? { proof_capsule_digest: input.proof_capsule_digest } : {}),
  };
}

function createEvidenceEnvelope(input) {
  const core = normalizeCore(input, INPUT_FIELDS);
  return deepFreeze({
    ...core,
    envelope_digest: sha256Hex(canonicalJson(core)),
  });
}

function validateEvidenceEnvelope(input) {
  const core = normalizeCore(input, ENVELOPE_FIELDS);
  if (input.schema_version !== 'TIGER_VERITY_EVIDENCE_V1') {
    fail('EVIDENCE_ENVELOPE_VERSION_INVALID', 'Evidence envelope version is invalid.');
  }
  const expectedDigest = sha256Hex(canonicalJson(core));
  if (input.envelope_digest !== expectedDigest) {
    fail('EVIDENCE_ENVELOPE_DIGEST_MISMATCH', 'Evidence envelope digest does not match its contents.');
  }
  return deepFreeze({ ...core, envelope_digest: expectedDigest });
}

module.exports = {
  createEvidenceEnvelope,
  validateEvidenceEnvelope,
};

'use strict';

const {
  assertIsoUtc,
  assertNoForbiddenShape,
  canonicalJson,
  deepFreeze,
  sha256Hex,
} = require('./contracts.cjs');
const { GATE_ID_RE } = require('./gate-definition.cjs');

const INPUT_FIELDS = new Set([
  'gate_id',
  'evidence_class',
  'subject',
  'observed_at',
  'facts',
]);

const NORMALIZED_FIELDS = new Set([
  'envelope_version',
  'gate_id',
  'evidence_class',
  'subject',
  'observed_at',
  'facts',
  'evidence_digest',
]);

const TRUSTED_CONTEXT_FIELDS = new Set([
  'producer_identity',
  'runner_identity',
  'workflow_identity',
  'source_sha',
  'source_tree',
  'expected_source_sha',
  'expected_source_tree',
  'environment',
  'now_ms',
]);

const FACT_VALUE_SET = new Set(['PASS', 'FAIL', 'BLOCKED', 'UNKNOWN', 'SKIPPED']);
const SYMBOL_RE = /^[A-Z][A-Z0-9_:-]{1,127}$/;
const SUBJECT_RE = /^(?:sha256:[0-9a-f]{64}|[A-Z][A-Z0-9_:-]{1,127})$/;
const FACT_RE = /^[a-z][a-z0-9_]{0,63}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

function envelopeError(message) {
  throw new Error(`TIGER_VERITY_EVIDENCE_INVALID: ${message}`);
}

function assertObject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    envelopeError('evidence envelope must be an object.');
  }
}

function assertNoTrustedOrUnknownFields(input, allowedFields) {
  for (const key of Object.keys(input)) {
    if (TRUSTED_CONTEXT_FIELDS.has(key)) {
      envelopeError(`trusted context field ${key} is forbidden in evidence payloads.`);
    }
    if (!allowedFields.has(key)) {
      envelopeError(`untrusted or unknown evidence payload field ${key}.`);
    }
  }
}

function normalizeFacts(facts) {
  if (!facts || typeof facts !== 'object' || Array.isArray(facts)) {
    envelopeError('facts must be an object.');
  }

  const keys = Object.keys(facts).sort();
  if (keys.length === 0) envelopeError('facts cannot be empty.');

  const normalized = {};
  for (const key of keys) {
    if (!FACT_RE.test(key)) envelopeError(`invalid fact key ${key}.`);
    const value = facts[key];
    if (!FACT_VALUE_SET.has(value)) envelopeError(`invalid fact value for ${key}.`);
    normalized[key] = value;
  }
  return normalized;
}

function buildCore(input) {
  if (typeof input.gate_id !== 'string' || !GATE_ID_RE.test(input.gate_id)) {
    envelopeError('gate_id must be PNN.');
  }
  if (typeof input.evidence_class !== 'string' || !SYMBOL_RE.test(input.evidence_class)) {
    envelopeError('evidence_class is invalid.');
  }
  if (typeof input.subject !== 'string' || !SUBJECT_RE.test(input.subject)) {
    envelopeError('subject is invalid.');
  }

  assertIsoUtc('observed_at', input.observed_at);
  const facts = normalizeFacts(input.facts);

  const core = {
    envelope_version: 'TIGER_VERITY_EVIDENCE_V1',
    gate_id: input.gate_id,
    evidence_class: input.evidence_class,
    subject: input.subject,
    observed_at: input.observed_at,
    facts,
  };
  assertNoForbiddenShape(core);
  return core;
}

function digestCore(core) {
  return `sha256:${sha256Hex(canonicalJson(core))}`;
}

function createEvidenceEnvelope(input) {
  assertObject(input);
  assertNoTrustedOrUnknownFields(input, INPUT_FIELDS);
  const core = buildCore(input);
  return deepFreeze({
    ...core,
    evidence_digest: digestCore(core),
  });
}

function validateEvidenceEnvelope(input) {
  assertObject(input);
  assertNoTrustedOrUnknownFields(input, NORMALIZED_FIELDS);
  if (input.envelope_version !== 'TIGER_VERITY_EVIDENCE_V1') {
    envelopeError('unsupported envelope_version.');
  }
  if (typeof input.evidence_digest !== 'string' || !DIGEST_RE.test(input.evidence_digest)) {
    envelopeError('evidence_digest is invalid.');
  }

  const core = buildCore(input);
  const expected = digestCore(core);
  if (input.evidence_digest !== expected) envelopeError('evidence digest mismatch.');

  return deepFreeze({
    ...core,
    evidence_digest: expected,
  });
}

module.exports = {
  createEvidenceEnvelope,
  validateEvidenceEnvelope,
};

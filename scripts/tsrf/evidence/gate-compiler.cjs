'use strict';

const {
  EvidenceError,
  assertSha40,
  canonicalJson,
  deepFreeze,
  sha256Hex,
} = require('./contracts.cjs');
const {
  validateGateDefinition,
  validateGateDefinitions,
} = require('./gate-definition.cjs');
const { validateEvidenceEnvelope } = require('./evidence-envelope.cjs');

const NEGATIVE_FACT_VALUES = new Set(['BLOCKED', 'FAIL', 'SKIPPED', 'UNKNOWN']);

const TRUSTED_CONTEXT_FIELDS = Object.freeze([
  'environment',
  'expected_source_sha',
  'expected_source_tree',
  'now_ms',
  'producer_identity',
  'runner_identity',
  'source_sha',
  'source_tree',
  'workflow_identity',
]);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertIdentity(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 220 || !/^[A-Za-z0-9._:/-]+$/.test(value)) {
    throw new EvidenceError('GATE_TRUSTED_CONTEXT_INVALID', 'Trusted execution identity is invalid.');
  }
  return value;
}

function validateTrustedContext(input) {
  if (!isPlainObject(input) || canonicalJson(Object.keys(input).sort()) !== canonicalJson(TRUSTED_CONTEXT_FIELDS)) {
    throw new EvidenceError('GATE_TRUSTED_CONTEXT_INVALID', 'Trusted gate context fields are invalid.');
  }
  const context = {
    producer_identity: assertIdentity(input.producer_identity),
    runner_identity: assertIdentity(input.runner_identity),
    workflow_identity: assertIdentity(input.workflow_identity),
    expected_source_sha: assertSha40('expected_source_sha', input.expected_source_sha),
    expected_source_tree: assertSha40('expected_source_tree', input.expected_source_tree),
    source_sha: assertSha40('source_sha', input.source_sha),
    source_tree: assertSha40('source_tree', input.source_tree),
    environment: assertIdentity(input.environment),
    now_ms: input.now_ms,
  };
  if (!Number.isSafeInteger(context.now_ms) || context.now_ms < 0) {
    throw new EvidenceError('GATE_TRUSTED_CONTEXT_INVALID', 'Trusted gate time is invalid.');
  }
  return deepFreeze(context);
}

function isBoundCompiledPrerequisite(value, prerequisiteId, context) {
  if (!isPlainObject(value) || value.schema_version !== 'TIGER_VERITY_GATE_RESULT_V1') return false;
  if (value.gate_id !== prerequisiteId || value.result !== 'PASS') return false;
  if (!Array.isArray(value.reason_codes) || value.reason_codes.length !== 0) return false;
  if (!Array.isArray(value.evidence_digests) || !isPlainObject(value.trusted_binding)) return false;
  if (!/^[0-9a-f]{64}$/.test(value.result_digest || '')) return false;
  const { result_digest: suppliedDigest, ...compiled } = value;
  if (sha256Hex(canonicalJson(compiled)) !== suppliedDigest) return false;
  return value.trusted_binding.source_sha === context.source_sha
    && value.trusted_binding.source_tree === context.source_tree;
}

function compileGateResult({ definition: rawDefinition, evidence, trustedContext, prerequisiteResults } = {}) {
  const definition = validateGateDefinition(rawDefinition);
  const context = validateTrustedContext(trustedContext);
  const reasons = new Set();

  if (context.source_sha !== context.expected_source_sha) reasons.add('SOURCE_IDENTITY_MISMATCH');
  if (context.source_tree !== context.expected_source_tree) reasons.add('TREE_IDENTITY_MISMATCH');
  if (context.environment !== definition.environment) reasons.add('ENVIRONMENT_MISMATCH');

  if (!isPlainObject(prerequisiteResults)) {
    reasons.add('PREREQUISITE_RESULTS_INVALID');
  } else {
    for (const prerequisite of definition.prerequisites) {
      if (!isBoundCompiledPrerequisite(prerequisiteResults[prerequisite], prerequisite, context)) {
        reasons.add('PREREQUISITE_BLOCKED');
      }
    }
  }

  const envelopes = [];
  if (!Array.isArray(evidence) || evidence.length === 0) {
    reasons.add('EVIDENCE_MISSING');
  } else if (evidence.length > 64) {
    reasons.add('EVIDENCE_SET_INVALID');
  } else {
    for (const rawEnvelope of evidence) {
      let envelope;
      try {
        envelope = validateEvidenceEnvelope(rawEnvelope);
      } catch (_) {
        reasons.add('EVIDENCE_INVALID');
        continue;
      }
      envelopes.push(envelope);
      if (envelope.gate_id !== definition.id) reasons.add('EVIDENCE_GATE_MISMATCH');
      if (envelope.evidence_class !== definition.evidence_class) reasons.add('EVIDENCE_CLASS_MISMATCH');
      if (envelope.subject !== definition.subject) reasons.add('SUBJECT_MISMATCH');
      if (Object.values(envelope.facts).some((value) => NEGATIVE_FACT_VALUES.has(value))) {
        reasons.add('EVIDENCE_NEGATIVE_FACT');
      }

      const observedAt = Date.parse(envelope.observed_at);
      if (observedAt > context.now_ms) reasons.add('EVIDENCE_FUTURE');
      if (context.now_ms - observedAt > definition.max_age_ms) reasons.add('EVIDENCE_STALE');
      for (const fact of definition.required_facts) {
        if (!Object.hasOwn(envelope.facts, fact)) reasons.add('REQUIRED_FACT_MISSING');
        else if (envelope.facts[fact] !== 'PASS') reasons.add('REQUIRED_FACT_NOT_PASS');
      }
    }
  }

  const reasonCodes = [...reasons].sort();
  const result = reasonCodes.length === 0 ? 'PASS' : 'BLOCKED';
  const compiled = {
    schema_version: 'TIGER_VERITY_GATE_RESULT_V1',
    gate_id: definition.id,
    result,
    reason_codes: reasonCodes,
    evidence_digests: envelopes.map((item) => item.envelope_digest).sort(),
    trusted_binding: {
      producer_identity: context.producer_identity,
      runner_identity: context.runner_identity,
      workflow_identity: context.workflow_identity,
      source_sha: context.source_sha,
      source_tree: context.source_tree,
      environment: context.environment,
      now_ms: context.now_ms,
    },
  };
  return deepFreeze({
    ...compiled,
    result_digest: sha256Hex(canonicalJson(compiled)),
  });
}

module.exports = {
  compileGateResult,
  validateGateDefinitions,
};

'use strict';

const {
  assertSha40,
  canonicalJson,
  deepFreeze,
  sha256Hex,
} = require('./contracts.cjs');
const {
  normalizeGateDefinition,
  validateGateDefinitions,
} = require('./gate-definition.cjs');
const { validateEvidenceEnvelope } = require('./evidence-envelope.cjs');

const SYMBOL_RE = /^[A-Z][A-Z0-9_:-]{1,127}$/;

function compilerError(message) {
  throw new Error(`TIGER_VERITY_COMPILER_INPUT_INVALID: ${message}`);
}

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 256) {
    compilerError(`${field} must be bounded non-empty text.`);
  }
  return value.trim();
}

function normalizeTrustedContext(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    compilerError('trustedContext must be an object.');
  }

  const producerIdentity = nonEmptyString(input.producer_identity, 'producer_identity');
  const runnerIdentity = nonEmptyString(input.runner_identity, 'runner_identity');
  const workflowIdentity = nonEmptyString(input.workflow_identity, 'workflow_identity');
  const sourceSha = assertSha40('source_sha', input.source_sha);
  const sourceTree = assertSha40('source_tree', input.source_tree);
  const expectedSourceSha = assertSha40('expected_source_sha', input.expected_source_sha);
  const expectedSourceTree = assertSha40('expected_source_tree', input.expected_source_tree);

  if (typeof input.environment !== 'string' || !SYMBOL_RE.test(input.environment)) {
    compilerError('environment is invalid.');
  }
  if (!Number.isSafeInteger(input.now_ms) || input.now_ms < 0) {
    compilerError('now_ms must be a non-negative safe integer from trusted time.');
  }

  return deepFreeze({
    producer_identity: producerIdentity,
    runner_identity: runnerIdentity,
    workflow_identity: workflowIdentity,
    source_sha: sourceSha,
    source_tree: sourceTree,
    expected_source_sha: expectedSourceSha,
    expected_source_tree: expectedSourceTree,
    environment: input.environment,
    now_ms: input.now_ms,
  });
}

function normalizePrerequisiteResults(input) {
  if (input === undefined) return {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    compilerError('prerequisiteResults must be an object.');
  }

  const result = {};
  for (const key of Object.keys(input).sort()) {
    if (!/^P\d{2}$/.test(key)) compilerError(`invalid prerequisite result key ${key}.`);
    if (!['PASS', 'BLOCKED'].includes(input[key])) {
      compilerError(`invalid prerequisite result value for ${key}.`);
    }
    result[key] = input[key];
  }
  return result;
}

function digest(value) {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}

function compileGateResult({ definition, evidence, trustedContext, prerequisiteResults = {} }) {
  const normalizedDefinition = normalizeGateDefinition(definition);
  const trusted = normalizeTrustedContext(trustedContext);
  const prerequisites = normalizePrerequisiteResults(prerequisiteResults);

  if (!Array.isArray(evidence)) compilerError('evidence must be an array.');

  const reasons = new Set();
  const validatedEvidence = [];
  let evidenceInvalid = false;

  for (const item of evidence) {
    try {
      validatedEvidence.push(validateEvidenceEnvelope(item));
    } catch (_error) {
      evidenceInvalid = true;
    }
  }

  if (evidenceInvalid) reasons.add('EVIDENCE_INVALID');
  if (trusted.source_sha !== trusted.expected_source_sha) reasons.add('SOURCE_IDENTITY_MISMATCH');
  if (trusted.source_tree !== trusted.expected_source_tree) reasons.add('SOURCE_TREE_MISMATCH');
  if (trusted.environment !== normalizedDefinition.environment) reasons.add('ENVIRONMENT_MISMATCH');

  for (const prerequisite of normalizedDefinition.prerequisites) {
    if (prerequisites[prerequisite] !== 'PASS') {
      reasons.add(`PREREQUISITE_BLOCKED:${prerequisite}`);
    }
  }

  const matchingEvidence = validatedEvidence.filter((item) => (
    item.gate_id === normalizedDefinition.id &&
    item.evidence_class === normalizedDefinition.evidence_class &&
    item.subject === normalizedDefinition.subject
  ));

  if (matchingEvidence.length === 0) {
    reasons.add('MISSING_MATCHING_EVIDENCE');
  } else {
    let hasQualifyingEvidence = false;
    const candidateReasons = new Set();

    for (const item of matchingEvidence) {
      const observedMs = Date.parse(item.observed_at);
      if (observedMs > trusted.now_ms) {
        candidateReasons.add('EVIDENCE_FROM_FUTURE');
        continue;
      }
      if (trusted.now_ms - observedMs > normalizedDefinition.max_age_ms) {
        candidateReasons.add('EVIDENCE_STALE');
        continue;
      }

      let factsPass = true;
      for (const fact of normalizedDefinition.required_facts) {
        if (!Object.hasOwn(item.facts, fact)) {
          candidateReasons.add(`REQUIRED_FACT_MISSING:${fact}`);
          factsPass = false;
          continue;
        }
        if (item.facts[fact] !== 'PASS') {
          candidateReasons.add(`REQUIRED_FACT_NOT_PASS:${fact}:${item.facts[fact]}`);
          factsPass = false;
        }
      }

      if (factsPass) {
        hasQualifyingEvidence = true;
        break;
      }
    }

    if (!hasQualifyingEvidence) {
      for (const reason of candidateReasons) reasons.add(reason);
      if (candidateReasons.size === 0) reasons.add('EVIDENCE_NOT_QUALIFIED');
    }
  }

  const reasonCodes = [...reasons].sort();
  const result = reasonCodes.length === 0 ? 'PASS' : 'BLOCKED';

  const resultCore = {
    compiler_version: 'TIGER_VERITY_COMPILER_V1',
    gate_id: normalizedDefinition.id,
    result,
    reasons: reasonCodes,
    definition_digest: digest(normalizedDefinition),
    evidence_digests: validatedEvidence.map((item) => item.evidence_digest).sort(),
    trusted_binding: {
      producer_identity: trusted.producer_identity,
      runner_identity: trusted.runner_identity,
      workflow_identity: trusted.workflow_identity,
      source_sha: trusted.source_sha,
      source_tree: trusted.source_tree,
      expected_source_sha: trusted.expected_source_sha,
      expected_source_tree: trusted.expected_source_tree,
      environment: trusted.environment,
      now_ms: trusted.now_ms,
    },
    prerequisite_results: prerequisites,
  };

  return deepFreeze({
    gate_id: normalizedDefinition.id,
    result,
    reasons: reasonCodes,
    result_digest: digest(resultCore),
  });
}

module.exports = {
  compileGateResult,
  validateGateDefinitions,
};

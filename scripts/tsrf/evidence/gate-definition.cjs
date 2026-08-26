'use strict';

const {
  EvidenceError,
  canonicalJson,
  deepFreeze,
} = require('./contracts.cjs');

const GATE_ID_PATTERN = /^P(?:0[1-9]|1[0-9]|20)$/;
const EVIDENCE_CLASS_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const SUBJECT_PATTERN = /^(?:sha256:[0-9a-f]{64}|[A-Z][A-Z0-9_:-]{1,127})$/;
const FACT_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const ENVIRONMENTS = new Set(['LOCAL', 'CI', 'STAGING', 'NON_RUNTIME', 'PRODUCTION']);
const ALLOWED_FIELDS = new Set([
  'id',
  'name',
  'evidence_class',
  'environment',
  'subject',
  'max_age_ms',
  'prerequisites',
  'required_facts',
  'fail_closed',
]);

function fail(code, message) {
  throw new EvidenceError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertUniqueStrings(values, pattern, code, message, maxItems) {
  if (!Array.isArray(values) || values.length > maxItems) fail(code, message);
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== 'string' || !pattern.test(value) || seen.has(value)) fail(code, message);
    seen.add(value);
  }
  return [...values];
}

function validateGateDefinition(input) {
  if (!isPlainObject(input)) fail('GATE_DEFINITION_INVALID', 'Gate definition must be an object.');
  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) fail('GATE_DEFINITION_FIELD_INVALID', 'Gate definition contains an unknown field.');
  }

  for (const field of ['id', 'evidence_class', 'environment', 'subject', 'max_age_ms', 'prerequisites', 'required_facts']) {
    if (!Object.hasOwn(input, field)) fail('GATE_DEFINITION_FIELD_MISSING', `Gate definition is missing ${field}.`);
  }

  if (!GATE_ID_PATTERN.test(input.id)) fail('GATE_ID_INVALID', 'Gate identifier must be P01 through P20.');
  if (!EVIDENCE_CLASS_PATTERN.test(input.evidence_class)) fail('GATE_EVIDENCE_CLASS_INVALID', 'Gate evidence class is invalid.');
  if (!ENVIRONMENTS.has(input.environment)) fail('GATE_ENVIRONMENT_INVALID', 'Gate environment is invalid.');
  if (!SUBJECT_PATTERN.test(input.subject)) fail('GATE_SUBJECT_INVALID', 'Gate subject is invalid.');
  if (!Number.isSafeInteger(input.max_age_ms) || input.max_age_ms < 1 || input.max_age_ms > 31 * 24 * 60 * 60 * 1000) {
    fail('GATE_MAX_AGE_INVALID', 'Gate freshness window is invalid.');
  }
  if (Object.hasOwn(input, 'name') && (typeof input.name !== 'string' || input.name.length < 1 || input.name.length > 180)) {
    fail('GATE_NAME_INVALID', 'Gate name is invalid.');
  }
  if (Object.hasOwn(input, 'fail_closed') && input.fail_closed !== true) {
    fail('GATE_FAIL_CLOSED_REQUIRED', 'Every V1 gate must fail closed.');
  }

  const prerequisites = assertUniqueStrings(
    input.prerequisites,
    GATE_ID_PATTERN,
    'GATE_PREREQUISITE_INVALID',
    'Gate prerequisite identifiers are invalid.',
    19,
  );
  if (prerequisites.includes(input.id)) fail('GATE_PREREQUISITE_INVALID', 'A gate cannot require itself.');
  const requiredFacts = assertUniqueStrings(
    input.required_facts,
    FACT_PATTERN,
    'GATE_REQUIRED_FACT_INVALID',
    'Gate required facts are invalid.',
    64,
  );
  if (requiredFacts.length === 0) fail('GATE_REQUIRED_FACT_INVALID', 'A gate requires at least one fact.');

  const definition = {
    id: input.id,
    ...(Object.hasOwn(input, 'name') ? { name: input.name } : {}),
    evidence_class: input.evidence_class,
    environment: input.environment,
    subject: input.subject,
    max_age_ms: input.max_age_ms,
    prerequisites,
    required_facts: requiredFacts,
    fail_closed: true,
  };
  return deepFreeze(definition);
}

function validateGateDefinitions(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 20) {
    fail('GATE_REGISTRY_INVALID', 'Gate registry must contain one to twenty definitions.');
  }
  const definitions = inputs.map(validateGateDefinition);
  const byId = new Map();
  for (const definition of definitions) {
    if (byId.has(definition.id)) fail('GATE_DUPLICATE_ID', 'Gate registry contains a duplicate identifier.');
    byId.set(definition.id, definition);
  }
  for (const definition of definitions) {
    for (const prerequisite of definition.prerequisites) {
      if (!byId.has(prerequisite)) fail('GATE_PREREQUISITE_UNKNOWN', 'Gate prerequisite is not defined.');
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) fail('GATE_PREREQUISITE_CYCLE', 'Gate prerequisite cycle detected.');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of byId.get(id).prerequisites) visit(prerequisite);
    visiting.delete(id);
    visited.add(id);
  }
  for (const definition of definitions) visit(definition.id);

  canonicalJson(definitions);
  return deepFreeze(definitions);
}

module.exports = {
  validateGateDefinition,
  validateGateDefinitions,
};

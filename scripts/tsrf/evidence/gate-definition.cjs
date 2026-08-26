'use strict';

const { deepFreeze } = require('./contracts.cjs');

const GATE_ID_RE = /^P\d{2}$/;
const SYMBOL_RE = /^[A-Z][A-Z0-9_:-]{1,127}$/;
const SUBJECT_SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const FACT_RE = /^[a-z][a-z0-9_]{0,63}$/;

function gateError(message) {
  throw new Error(`TIGER_VERITY_GATE_DEFINITION_INVALID: ${message}`);
}

function uniqueStrings(values, field, pattern) {
  if (!Array.isArray(values)) gateError(`${field} must be an array.`);
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (typeof value !== 'string' || !pattern.test(value)) {
      gateError(`${field} contains an invalid value.`);
    }
    if (seen.has(value)) gateError(`${field} contains a duplicate value.`);
    seen.add(value);
    result.push(value);
  }
  return result;
}

function normalizeGateDefinition(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    gateError('gate definition must be an object.');
  }

  const id = input.id;
  if (typeof id !== 'string' || !GATE_ID_RE.test(id)) gateError('id must be PNN.');

  const evidenceClass = input.evidence_class;
  if (typeof evidenceClass !== 'string' || !SYMBOL_RE.test(evidenceClass)) {
    gateError('evidence_class must be a bounded symbolic identifier.');
  }

  const environment = input.environment;
  if (typeof environment !== 'string' || !SYMBOL_RE.test(environment)) {
    gateError('environment must be a bounded symbolic identifier.');
  }

  const subject = input.subject;
  if (
    typeof subject !== 'string' ||
    (!SUBJECT_SHA256_RE.test(subject) && !SYMBOL_RE.test(subject))
  ) {
    gateError('subject must be a sha256 digest subject or bounded symbolic subject.');
  }

  if (!Number.isSafeInteger(input.max_age_ms) || input.max_age_ms <= 0) {
    gateError('max_age_ms must be a positive safe integer.');
  }

  const prerequisites = uniqueStrings(input.prerequisites ?? [], 'prerequisites', GATE_ID_RE);
  if (prerequisites.includes(id)) gateError('a gate cannot list itself as a prerequisite.');

  const requiredFacts = uniqueStrings(input.required_facts ?? [], 'required_facts', FACT_RE);
  if (requiredFacts.length === 0) gateError('required_facts cannot be empty.');

  if (input.fail_closed !== undefined && input.fail_closed !== true) {
    gateError('fail_closed must be true when specified.');
  }

  const normalized = {
    id,
    evidence_class: evidenceClass,
    environment,
    subject,
    max_age_ms: input.max_age_ms,
    prerequisites,
    required_facts: requiredFacts,
    fail_closed: true,
  };

  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim().length === 0 || input.name.length > 160) {
      gateError('name must be bounded non-empty text.');
    }
    normalized.name = input.name.trim();
  }

  return deepFreeze(normalized);
}

function validateGateDefinitions(definitions) {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    gateError('definitions must be a non-empty array.');
  }

  const normalized = definitions.map(normalizeGateDefinition);
  const byId = new Map();
  for (const definition of normalized) {
    if (byId.has(definition.id)) gateError(`duplicate gate id ${definition.id}.`);
    byId.set(definition.id, definition);
  }

  for (const definition of normalized) {
    for (const prerequisite of definition.prerequisites) {
      if (!byId.has(prerequisite)) {
        gateError(`unknown prerequisite ${prerequisite} for ${definition.id}.`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();

  function visit(id, trail) {
    if (visiting.has(id)) {
      gateError(`cycle detected in gate prerequisites: ${[...trail, id].join(' -> ')}.`);
    }
    if (visited.has(id)) return;

    visiting.add(id);
    const definition = byId.get(id);
    for (const prerequisite of definition.prerequisites) {
      visit(prerequisite, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const definition of normalized) visit(definition.id, []);
  return deepFreeze(normalized.slice());
}

module.exports = {
  GATE_ID_RE,
  normalizeGateDefinition,
  validateGateDefinitions,
};

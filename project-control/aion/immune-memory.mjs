import { createHash } from 'node:crypto';

import { verifyActionPassport } from './agentic-control.mjs';

const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DATA_MODES = new Set(['SYNTHETIC', 'SANITIZED']);
const RED_CAPABILITIES = new Set([
  'ATTACK_SIMULATION',
  'FAULT_INJECTION_SIMULATION',
  'ADVERSARIAL_REPLAY_SIMULATION',
]);
const BLUE_CAPABILITIES = new Set(['DETECT', 'CONTAIN', 'RECOVER', 'PROPOSE']);
const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 4096;
const MAX_LIST_ITEMS = 128;
const MAX_VERSION = 1_000_000;
const MAX_STEPS = 100_000;

export class AionImmuneMemoryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionImmuneMemoryError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionImmuneMemoryError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    fail('AION_IMMUNE_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field, 64);
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!pattern.test(value)) fail('AION_IMMUNE_INVALID', `${field} must be ISO-8601 with timezone`);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail('AION_IMMUNE_INVALID', `${field} is invalid`);
  return ms;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = canonicalize(value[key]);
    return output;
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value)), 'utf8').digest('hex');
}

function seal(value) {
  return Object.freeze({ ...value, content_digest: digest(value) });
}

function verifyDigest(record, code, label) {
  if (typeof record?.content_digest !== 'string' || !SHA256_PATTERN.test(record.content_digest)) {
    fail(code, `${label} content digest is invalid`);
  }
  const { content_digest: ignored, ...payload } = record;
  if (digest(payload) !== record.content_digest) {
    fail(code, `${label} content digest does not match its payload`);
  }
}

function valueLooksSecret(value) {
  if (typeof value !== 'string') return false;
  if (/^Bearer\s+\S{12,}$/i.test(value)) return true;
  if (/^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(value)) return true;
  if (value.includes('-----BEGIN') && value.includes('PRIVATE KEY-----')) return true;
  return false;
}

function assertNoSecretLikeStrings(values, field) {
  for (let index = 0; index < values.length; index += 1) {
    if (valueLooksSecret(values[index])) {
      fail('AION_IMMUNE_SECRET_MATERIAL_REJECTED', `${field}[${index}] contains secret-like material`);
    }
  }
}

function normalizeUniqueStrings(values, field, { allowEmpty = false } = {}) {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS || (!allowEmpty && values.length === 0)) {
    fail('AION_IMMUNE_INVALID', `${field} must be a bounded${allowEmpty ? '' : ' non-empty'} array`);
  }
  const seen = new Set();
  const output = values.map((value, index) => {
    const item = requireString(value, `${field}[${index}]`, MAX_TEXT_LENGTH);
    if (seen.has(item)) fail('AION_IMMUNE_INVALID', `${field} contains duplicate value: ${item}`);
    seen.add(item);
    return item;
  });
  assertNoSecretLikeStrings(output, field);
  output.sort();
  return Object.freeze(output);
}

function requireConfidence(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    fail('AION_IMMUNE_INVALID', 'confidence must be between 0 and 1');
  }
  return value;
}

function requireExactSha(value, field) {
  if (typeof value !== 'string' || !SHA1_PATTERN.test(value)) {
    fail('AION_IMMUNE_INVALID', `${field} must be an exact 40-character Git SHA`);
  }
  return value;
}

function normalizeIncidentProof(proof) {
  if (!isPlainObject(proof)) fail('AION_IMMUNE_INCIDENT_UNCONFIRMED', 'incident proof must be a plain object');
  if (
    proof.status !== 'CONFIRMED'
    || proof.fact_class !== 'PRODUCTION_FACT'
    || proof.authoritative_source !== true
  ) {
    fail('AION_IMMUNE_INCIDENT_UNCONFIRMED', 'Digital Antibody requires confirmed authoritative Production incident evidence');
  }

  return Object.freeze({
    incident_id: requireString(proof.incident_id, 'incident_proof.incident_id'),
    status: 'CONFIRMED',
    fact_class: 'PRODUCTION_FACT',
    authoritative_source: true,
    causal_graph_ref: requireString(proof.causal_graph_ref, 'incident_proof.causal_graph_ref', MAX_TEXT_LENGTH),
    exact_source_sha: requireExactSha(proof.exact_source_sha, 'incident_proof.exact_source_sha'),
    observed_at: proof.observed_at,
    evidence_refs: normalizeUniqueStrings(proof.evidence_refs, 'incident_proof.evidence_refs'),
  });
}

function ensureAntibody(antibody) {
  if (!isPlainObject(antibody) || antibody.schema_version !== 'TIGER-AION-DIGITAL-ANTIBODY-1') {
    fail('AION_IMMUNE_INTEGRITY_INVALID', 'invalid Digital Antibody');
  }
  requireString(antibody.antibody_id, 'antibody.antibody_id');
  if (!Number.isInteger(antibody.version) || antibody.version <= 0 || antibody.version > MAX_VERSION) {
    fail('AION_IMMUNE_INTEGRITY_INVALID', 'antibody version is outside bounds');
  }
  if (antibody.fact_class !== 'DERIVED_DEFENSIVE_MEMORY' || antibody.advisory_only !== true) {
    fail('AION_IMMUNE_INTEGRITY_INVALID', 'Digital Antibody cannot claim execution authority or Production fact status');
  }
  requireString(antibody.incident_ref, 'antibody.incident_ref');
  requireString(antibody.causal_graph_ref, 'antibody.causal_graph_ref', MAX_TEXT_LENGTH);
  requireExactSha(antibody.exact_source_sha, 'antibody.exact_source_sha');
  parseTimestamp(antibody.incident_observed_at, 'antibody.incident_observed_at');
  const createdAt = parseTimestamp(antibody.created_at, 'antibody.created_at');
  const validUntil = parseTimestamp(antibody.valid_until, 'antibody.valid_until');
  if (validUntil <= createdAt) fail('AION_IMMUNE_INTEGRITY_INVALID', 'Digital Antibody validity window is invalid');
  normalizeUniqueStrings(antibody.evidence_refs, 'antibody.evidence_refs');
  normalizeUniqueStrings(antibody.indicators, 'antibody.indicators');
  normalizeUniqueStrings(antibody.successful_defenses, 'antibody.successful_defenses', { allowEmpty: true });
  normalizeUniqueStrings(antibody.failed_defenses, 'antibody.failed_defenses', { allowEmpty: true });
  normalizeUniqueStrings(antibody.remediation_refs, 'antibody.remediation_refs');
  requireString(antibody.rollback_ref, 'antibody.rollback_ref', MAX_TEXT_LENGTH);
  requireConfidence(antibody.confidence);
  verifyDigest(antibody, 'AION_IMMUNE_INTEGRITY_INVALID', 'Digital Antibody');
}

export function createDigitalAntibody(input) {
  if (!isPlainObject(input)) fail('AION_IMMUNE_INVALID', 'Digital Antibody input must be a plain object');
  const incident = normalizeIncidentProof(input.incident_proof);
  const observedAt = parseTimestamp(incident.observed_at, 'incident_proof.observed_at');
  const createdAt = parseTimestamp(input.created_at, 'created_at');
  const validUntil = parseTimestamp(input.valid_until, 'valid_until');
  if (createdAt < observedAt) fail('AION_IMMUNE_INVALID', 'Digital Antibody cannot predate its confirmed incident evidence');
  if (validUntil <= createdAt) fail('AION_IMMUNE_INVALID', 'Digital Antibody validity must follow creation');
  if (!Number.isInteger(input.version) || input.version <= 0 || input.version > MAX_VERSION) {
    fail('AION_IMMUNE_INVALID', 'version must be a positive bounded integer');
  }

  return seal({
    schema_version: 'TIGER-AION-DIGITAL-ANTIBODY-1',
    antibody_id: requireString(input.antibody_id, 'antibody_id'),
    version: input.version,
    fact_class: 'DERIVED_DEFENSIVE_MEMORY',
    advisory_only: true,
    incident_ref: incident.incident_id,
    causal_graph_ref: incident.causal_graph_ref,
    incident_observed_at: incident.observed_at,
    exact_source_sha: incident.exact_source_sha,
    evidence_refs: incident.evidence_refs,
    created_at: input.created_at,
    valid_until: input.valid_until,
    indicators: normalizeUniqueStrings(input.indicators, 'indicators'),
    successful_defenses: normalizeUniqueStrings(input.successful_defenses, 'successful_defenses', { allowEmpty: true }),
    failed_defenses: normalizeUniqueStrings(input.failed_defenses, 'failed_defenses', { allowEmpty: true }),
    remediation_refs: normalizeUniqueStrings(input.remediation_refs, 'remediation_refs'),
    rollback_ref: requireString(input.rollback_ref, 'rollback_ref', MAX_TEXT_LENGTH),
    confidence: requireConfidence(input.confidence),
  });
}

export function verifyDigitalAntibody(antibody) {
  ensureAntibody(antibody);
  return true;
}

export function isAntibodyFresh(antibody, nowMs) {
  ensureAntibody(antibody);
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
    fail('AION_IMMUNE_INVALID', 'now_ms must be a finite injected clock value');
  }
  return nowMs >= Date.parse(antibody.created_at) && nowMs <= Date.parse(antibody.valid_until);
}

export function antibodyEvidenceRef(antibody) {
  ensureAntibody(antibody);
  return `antibody:${antibody.antibody_id}:${antibody.content_digest}`;
}

function ensureA5Authorization(authorization, passport) {
  if (!isPlainObject(authorization) || authorization.schema_version !== 'TIGER-AION-AUTHORIZATION-DECISION-1') {
    fail('AION_IMMUNE_A5_AUTHORIZATION_INVALID', 'missing deterministic A5 authorization decision');
  }
  try {
    verifyDigest(authorization, 'AION_IMMUNE_A5_AUTHORIZATION_INVALID', 'A5 authorization decision');
  } catch (error) {
    if (error?.code === 'AION_IMMUNE_A5_AUTHORIZATION_INVALID') throw error;
    fail('AION_IMMUNE_A5_AUTHORIZATION_INVALID', 'A5 authorization decision integrity is invalid');
  }
  if (
    authorization.decision !== 'AUTHORIZED'
    || authorization.passport_id !== passport.passport_id
    || authorization.exact_source_sha !== passport.exact_source_sha
    || authorization.autonomy_level !== passport.requested_autonomy_level
    || authorization.production_mutation_authorized !== false
    || authorization.unrestricted_production_mutation !== false
  ) {
    fail('AION_IMMUNE_A5_AUTHORIZATION_INVALID', 'A5 authorization is not bound to the supplied Action Passport');
  }
}

export function authorizeAntibodyReuse({ antibody, remediation_ref: remediationRef, passport, authorization, now_ms: nowMs }) {
  ensureAntibody(antibody);
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) fail('AION_IMMUNE_INVALID', 'now_ms must be a finite injected clock value');
  if (!isAntibodyFresh(antibody, nowMs)) fail('AION_IMMUNE_EXPIRED', 'expired Digital Antibody cannot be reused');

  try {
    verifyActionPassport(passport);
  } catch (error) {
    fail('AION_IMMUNE_A5_BINDING_REQUIRED', `invalid A5 Action Passport: ${error?.code ?? 'UNKNOWN'}`);
  }

  const remediation = requireString(remediationRef, 'remediation_ref', MAX_TEXT_LENGTH);
  if (!antibody.remediation_refs.includes(remediation) || passport.action_type !== remediation) {
    fail('AION_IMMUNE_A5_BINDING_REQUIRED', 'requested remediation is not bound to this antibody and passport');
  }
  if (!passport.evidence_refs.includes(antibodyEvidenceRef(antibody))) {
    fail('AION_IMMUNE_A5_BINDING_REQUIRED', 'Action Passport does not carry the exact Digital Antibody evidence reference');
  }
  if (passport.exact_source_sha !== antibody.exact_source_sha) {
    fail('AION_IMMUNE_A5_BINDING_REQUIRED', 'Action Passport source identity does not match the antibody source identity');
  }
  if (nowMs > Date.parse(passport.freshness_deadline)) {
    fail('AION_IMMUNE_A5_BINDING_REQUIRED', 'Action Passport evidence is stale at antibody reuse time');
  }

  ensureA5Authorization(authorization, passport);
  if (!Number.isFinite(authorization.decided_at_ms) || authorization.decided_at_ms > nowMs) {
    fail('AION_IMMUNE_A5_AUTHORIZATION_INVALID', 'A5 authorization decision time is invalid');
  }

  return seal({
    schema_version: 'TIGER-AION-ANTIBODY-REUSE-CANDIDATE-1',
    decision: 'ELIGIBLE_FOR_A5_BOUNDED_PATH',
    antibody_id: antibody.antibody_id,
    antibody_version: antibody.version,
    antibody_digest: antibody.content_digest,
    remediation_ref: remediation,
    passport_id: passport.passport_id,
    authorization_digest: authorization.content_digest,
    exact_source_sha: passport.exact_source_sha,
    autonomy_level: authorization.autonomy_level,
    execution_performed: false,
    production_mutation_authorized: false,
    unrestricted_production_mutation: false,
    evaluated_at_ms: nowMs,
  });
}

function assertRangeIsolation(input) {
  if (input.execution_target !== 'ISOLATED_CYBER_RANGE') {
    fail('AION_IMMUNE_RANGE_ISOLATION_VIOLATION', 'Red/Blue execution target must be ISOLATED_CYBER_RANGE');
  }
  if (!DATA_MODES.has(input.data_mode)) {
    fail('AION_IMMUNE_RANGE_ISOLATION_VIOLATION', 'Red/Blue data must be SYNTHETIC or SANITIZED');
  }
  if (input.production_credentials !== false || input.production_write_capability !== false || input.external_targets !== false) {
    fail('AION_IMMUNE_RANGE_ISOLATION_VIOLATION', 'Production credentials, Production writes, and external targets are forbidden');
  }
}

function normalizeTargets(targets) {
  const normalized = normalizeUniqueStrings(targets, 'targets');
  for (const target of normalized) {
    if (!(target.startsWith('range://') || target.startsWith('twin://'))) {
      fail('AION_IMMUNE_RANGE_ISOLATION_VIOLATION', 'cyber-range targets must use internal range:// or twin:// locators');
    }
  }
  return normalized;
}

function normalizeCapabilitySet(values, field, allowed) {
  const normalized = normalizeUniqueStrings(values, field);
  for (const capability of normalized) {
    if (!allowed.has(capability)) fail('AION_IMMUNE_RANGE_ISOLATION_VIOLATION', `${field} contains a capability outside the isolated range contract`);
  }
  return normalized;
}

function ensureCyberRange(exercise) {
  if (!isPlainObject(exercise) || exercise.schema_version !== 'TIGER-AION-CYBER-RANGE-1') {
    fail('AION_IMMUNE_INTEGRITY_INVALID', 'invalid cyber-range exercise');
  }
  assertRangeIsolation(exercise);
  requireString(exercise.range_id, 'exercise.range_id');
  const createdAt = parseTimestamp(exercise.created_at, 'exercise.created_at');
  const expiresAt = parseTimestamp(exercise.expires_at, 'exercise.expires_at');
  if (expiresAt <= createdAt) fail('AION_IMMUNE_INTEGRITY_INVALID', 'cyber-range validity window is invalid');
  normalizeUniqueStrings(exercise.scenario_refs, 'exercise.scenario_refs');
  normalizeTargets(exercise.targets);
  normalizeCapabilitySet(exercise.red_capabilities, 'exercise.red_capabilities', RED_CAPABILITIES);
  normalizeCapabilitySet(exercise.blue_capabilities, 'exercise.blue_capabilities', BLUE_CAPABILITIES);
  if (!Number.isInteger(exercise.max_steps) || exercise.max_steps <= 0 || exercise.max_steps > MAX_STEPS) {
    fail('AION_IMMUNE_INTEGRITY_INVALID', 'cyber-range max_steps is outside bounds');
  }
  if (exercise.fact_class !== 'SIMULATION' || exercise.production_fact !== false) {
    fail('AION_IMMUNE_INTEGRITY_INVALID', 'cyber-range exercise can never be a Production fact');
  }
  verifyDigest(exercise, 'AION_IMMUNE_INTEGRITY_INVALID', 'cyber-range exercise');
}

export function createCyberRangeExercise(input) {
  if (!isPlainObject(input)) fail('AION_IMMUNE_INVALID', 'cyber-range input must be a plain object');
  assertRangeIsolation(input);
  const createdAt = parseTimestamp(input.created_at, 'created_at');
  const expiresAt = parseTimestamp(input.expires_at, 'expires_at');
  if (expiresAt <= createdAt) fail('AION_IMMUNE_INVALID', 'cyber-range expiry must follow creation');
  if (!Number.isInteger(input.max_steps) || input.max_steps <= 0 || input.max_steps > MAX_STEPS) {
    fail('AION_IMMUNE_INVALID', 'max_steps is outside allowed bounds');
  }

  return seal({
    schema_version: 'TIGER-AION-CYBER-RANGE-1',
    range_id: requireString(input.range_id, 'range_id'),
    fact_class: 'SIMULATION',
    production_fact: false,
    created_at: input.created_at,
    expires_at: input.expires_at,
    execution_target: 'ISOLATED_CYBER_RANGE',
    data_mode: input.data_mode,
    production_credentials: false,
    production_write_capability: false,
    external_targets: false,
    scenario_refs: normalizeUniqueStrings(input.scenario_refs, 'scenario_refs'),
    targets: normalizeTargets(input.targets),
    red_capabilities: normalizeCapabilitySet(input.red_capabilities, 'red_capabilities', RED_CAPABILITIES),
    blue_capabilities: normalizeCapabilitySet(input.blue_capabilities, 'blue_capabilities', BLUE_CAPABILITIES),
    max_steps: input.max_steps,
  });
}

export function verifyCyberRangeExercise(exercise) {
  ensureCyberRange(exercise);
  return true;
}

export function recordCyberRangeResult(input) {
  if (!isPlainObject(input)) fail('AION_IMMUNE_INVALID', 'cyber-range result input must be a plain object');
  ensureCyberRange(input.exercise);
  if (input.completed !== true) fail('AION_IMMUNE_INVALID', 'only completed cyber-range exercises can produce a sealed result');
  const observedAt = parseTimestamp(input.observed_at, 'observed_at');
  const createdAt = Date.parse(input.exercise.created_at);
  const expiresAt = Date.parse(input.exercise.expires_at);
  if (observedAt < createdAt || observedAt > expiresAt) {
    fail('AION_IMMUNE_INVALID', 'cyber-range result must be observed inside the exercise validity window');
  }

  return seal({
    schema_version: 'TIGER-AION-CYBER-RANGE-RESULT-1',
    range_id: input.exercise.range_id,
    fact_class: 'SIMULATION',
    production_fact: false,
    observed_at: input.observed_at,
    completed: true,
    red_findings: normalizeUniqueStrings(input.red_findings, 'red_findings', { allowEmpty: true }),
    blue_defenses: normalizeUniqueStrings(input.blue_defenses, 'blue_defenses', { allowEmpty: true }),
    candidate_remediations: normalizeUniqueStrings(input.candidate_remediations, 'candidate_remediations', { allowEmpty: true }),
    range_digest: input.exercise.content_digest,
    execution_authority_granted: false,
    production_mutation_authorized: false,
    unrestricted_production_mutation: false,
  });
}

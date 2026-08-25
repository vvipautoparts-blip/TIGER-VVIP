import { createHash } from 'node:crypto';

export const PERSONA_CLASSES = Object.freeze([
  'NORMAL',
  'CONSTRAINED_DEVICE',
  'ABUSIVE',
  'SPAM',
  'FRAUD',
  'COORDINATED',
]);

export const OUTCOME_DIMENSIONS = Object.freeze([
  'TECHNICAL',
  'SECURITY',
  'HUMAN',
  'ECONOMIC',
  'LEGAL',
  'SOCIAL',
]);

const PERSONA_CLASS_SET = new Set(PERSONA_CLASSES);
const DIMENSION_SET = new Set(OUTCOME_DIMENSIONS);
const DECISION_SET = new Set(['PASS', 'HOLD', 'FAIL']);
const EXECUTION_TARGETS = new Set(['SHADOW', 'ISOLATED_TWIN']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 4096;
const MAX_TRAITS = 32;
const MAX_STEPS = 64;
const MAX_COHORT_MEMBERS = 256;
const MAX_EVIDENCE_REFS = 128;

export class AionSocietyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionSocietyError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionSocietyError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    fail('AION_SOCIETY_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field, 64);
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!isoPattern.test(value)) fail('AION_SOCIETY_INVALID', `${field} must be ISO-8601 with timezone`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) fail('AION_SOCIETY_INVALID', `${field} is invalid`);
  return milliseconds;
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

function normalizedKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function identityKey(key) {
  const normalized = normalizedKey(key);
  return [
    'email',
    'phone',
    'realname',
    'fullname',
    'governmentid',
    'passport',
    'nationalid',
    'address',
    'ipaddress',
    'productionuserid',
    'userid',
    'accountid',
    'clerkid',
  ].some((fragment) => normalized.includes(fragment));
}

function secretKey(key) {
  const normalized = normalizedKey(key);
  return [
    'apikey',
    'authorization',
    'credential',
    'password',
    'passwd',
    'privatekey',
    'refreshtoken',
    'accesstoken',
    'secretkey',
    'secrettoken',
  ].some((fragment) => normalized.includes(fragment));
}

function secretValue(value) {
  if (typeof value !== 'string') return false;
  if (/^Bearer\s+\S{12,}$/i.test(value)) return true;
  if (/^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(value)) return true;
  if (value.includes('-----BEGIN') && value.includes('PRIVATE KEY-----')) return true;
  return false;
}

function assertSyntheticMaterial(value, field = 'traits') {
  if (secretValue(value)) {
    fail('AION_SOCIETY_SECRET_MATERIAL_REJECTED', `${field} contains secret-like material`);
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertSyntheticMaterial(value[index], `${field}[${index}]`);
    }
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (identityKey(key)) {
      fail('AION_SOCIETY_IDENTITY_MATERIAL_REJECTED', `${field} contains real-person/account identity material`);
    }
    if (secretKey(key)) {
      fail('AION_SOCIETY_SECRET_MATERIAL_REJECTED', `${field} contains secret-bearing material`);
    }
    assertSyntheticMaterial(nested, `${field}.${key}`);
  }
}

function requireScalar(value, field) {
  if (typeof value === 'string') return requireString(value, field, MAX_TEXT_LENGTH);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  fail('AION_SOCIETY_INVALID', `${field} must be a bounded string, finite number, or boolean`);
}

function normalizeTraits(traits) {
  if (!isPlainObject(traits)) fail('AION_SOCIETY_INVALID', 'traits must be a plain object');
  const entries = Object.entries(traits);
  if (entries.length === 0 || entries.length > MAX_TRAITS) {
    fail('AION_SOCIETY_INVALID', 'traits are outside allowed bounds');
  }
  assertSyntheticMaterial(traits);
  const output = {};
  for (const [key, value] of entries) {
    requireString(key, `traits.${key}`, 128);
    output[key] = requireScalar(value, `traits.${key}`);
  }
  return Object.freeze(output);
}

function verifyPersonaDigest(persona) {
  if (typeof persona?.content_digest !== 'string' || !SHA256_PATTERN.test(persona.content_digest)) {
    fail('AION_SOCIETY_INTEGRITY_INVALID', 'persona content digest is invalid');
  }
  const { content_digest: ignored, ...payload } = persona;
  if (digest(payload) !== persona.content_digest) {
    fail('AION_SOCIETY_INTEGRITY_INVALID', 'persona content digest does not match its payload');
  }
}

function ensurePersona(persona) {
  if (!isPlainObject(persona) || persona.schema_version !== 'TIGER-AION-SYNTHETIC-PERSONA-1') {
    fail('AION_SOCIETY_INTEGRITY_INVALID', 'invalid synthetic persona');
  }
  if (persona.synthetic !== true) {
    fail('AION_SOCIETY_IDENTITY_MATERIAL_REJECTED', 'persona must remain synthetic');
  }
  requireString(persona.persona_id, 'persona.persona_id');
  if (!PERSONA_CLASS_SET.has(persona.persona_class)) {
    fail('AION_SOCIETY_INVALID', 'persona_class is not supported');
  }
  requireString(persona.model_version, 'persona.model_version');
  normalizeTraits(persona.traits);
  verifyPersonaDigest(persona);
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > MAX_STEPS) {
    fail('AION_SOCIETY_INVALID', 'journey steps are outside allowed bounds');
  }
  const seen = new Set();
  return Object.freeze(steps.map((step, index) => {
    if (!isPlainObject(step)) fail('AION_SOCIETY_INVALID', `steps[${index}] must be a plain object`);
    assertSyntheticMaterial(step, `steps[${index}]`);
    const id = requireString(step.id, `steps[${index}].id`);
    if (seen.has(id)) fail('AION_SOCIETY_INVALID', `duplicate journey step id: ${id}`);
    seen.add(id);
    if (step.mode !== 'SIMULATE' || step.production_write_capability === true) {
      fail('AION_SOCIETY_ISOLATION_VIOLATION', 'journey steps must remain simulation-only');
    }
    if (step.target !== undefined && !EXECUTION_TARGETS.has(step.target)) {
      fail('AION_SOCIETY_ISOLATION_VIOLATION', 'journey step cannot target Production');
    }
    return Object.freeze({
      id,
      action: requireString(step.action, `steps[${index}].action`),
      mode: 'SIMULATE',
      ...(step.target === undefined ? {} : { target: step.target }),
      production_write_capability: false,
    });
  }));
}

function normalizeRefs(refs, field, max = MAX_EVIDENCE_REFS) {
  if (!Array.isArray(refs) || refs.length === 0 || refs.length > max) {
    fail('AION_SOCIETY_GATE_INVALID', `${field} must be a non-empty bounded array`);
  }
  return Object.freeze(refs.map((ref, index) => requireString(ref, `${field}[${index}]`, MAX_TEXT_LENGTH)));
}

export function createSyntheticPersona(input) {
  if (!isPlainObject(input)) fail('AION_SOCIETY_INVALID', 'persona input must be a plain object');
  if (input.synthetic !== true) {
    fail('AION_SOCIETY_IDENTITY_MATERIAL_REJECTED', 'A4 personas must be synthetic');
  }
  if (!PERSONA_CLASS_SET.has(input.persona_class)) {
    fail('AION_SOCIETY_INVALID', 'persona_class is not supported');
  }

  return seal({
    schema_version: 'TIGER-AION-SYNTHETIC-PERSONA-1',
    persona_id: requireString(input.persona_id, 'persona_id'),
    persona_class: input.persona_class,
    synthetic: true,
    model_version: requireString(input.model_version, 'model_version'),
    traits: normalizeTraits(input.traits),
  });
}

export function verifySyntheticPersona(persona) {
  ensurePersona(persona);
  return true;
}

export function createSyntheticJourney(input) {
  if (!isPlainObject(input)) fail('AION_SOCIETY_INVALID', 'journey input must be a plain object');
  ensurePersona(input.persona);
  if (!EXECUTION_TARGETS.has(input.execution_target) || input.production_write_capability !== false) {
    fail('AION_SOCIETY_ISOLATION_VIOLATION', 'journey must remain isolated from Production');
  }
  if (typeof input.scenario_digest !== 'string' || !SHA256_PATTERN.test(input.scenario_digest)) {
    fail('AION_SOCIETY_INVALID', 'scenario_digest must be sha256');
  }
  const createdAtMs = parseTimestamp(input.created_at, 'created_at');
  const expiresAtMs = parseTimestamp(input.expires_at, 'expires_at');
  if (expiresAtMs <= createdAtMs) fail('AION_SOCIETY_INVALID', 'journey expiry must follow creation');

  return seal({
    schema_version: 'TIGER-AION-SYNTHETIC-JOURNEY-1',
    journey_id: requireString(input.journey_id, 'journey_id'),
    persona_id: input.persona.persona_id,
    persona_digest: input.persona.content_digest,
    scenario_ref: requireString(input.scenario_ref, 'scenario_ref', MAX_TEXT_LENGTH),
    scenario_digest: input.scenario_digest,
    created_at: input.created_at,
    expires_at: input.expires_at,
    fact_class: 'SIMULATION',
    synthetic: true,
    execution_target: input.execution_target,
    production_write_capability: false,
    steps: normalizeSteps(input.steps),
  });
}

export function createSyntheticCohort(input) {
  if (!isPlainObject(input)) fail('AION_SOCIETY_INVALID', 'cohort input must be a plain object');
  if (!Array.isArray(input.members) || input.members.length < 2 || input.members.length > MAX_COHORT_MEMBERS) {
    fail('AION_SOCIETY_INVALID', 'cohort members are outside allowed bounds');
  }
  const seen = new Set();
  const members = input.members.map((persona) => {
    ensurePersona(persona);
    if (seen.has(persona.persona_id)) fail('AION_SOCIETY_INVALID', `duplicate persona in cohort: ${persona.persona_id}`);
    seen.add(persona.persona_id);
    return Object.freeze({ persona_id: persona.persona_id, persona_digest: persona.content_digest });
  });
  members.sort((left, right) => left.persona_id.localeCompare(right.persona_id));

  return seal({
    schema_version: 'TIGER-AION-SYNTHETIC-COHORT-1',
    cohort_id: requireString(input.cohort_id, 'cohort_id'),
    model_version: requireString(input.model_version, 'model_version'),
    synthetic: true,
    coordination_mode: 'SYNTHETIC',
    members: Object.freeze(members),
  });
}

export function evaluateSyntheticSocietyGate(input) {
  if (!isPlainObject(input)) fail('AION_SOCIETY_GATE_INVALID', 'gate input must be a plain object');
  if (!Array.isArray(input.decisions) || input.decisions.length !== OUTCOME_DIMENSIONS.length) {
    fail('AION_SOCIETY_GATE_INVALID', 'all six release dimensions are required');
  }

  const seen = new Set();
  const dimensions = input.decisions.map((decision, index) => {
    if (!isPlainObject(decision)) fail('AION_SOCIETY_GATE_INVALID', `decisions[${index}] must be a plain object`);
    if (!DIMENSION_SET.has(decision.dimension) || seen.has(decision.dimension)) {
      fail('AION_SOCIETY_GATE_INVALID', 'release dimensions must be unique and complete');
    }
    seen.add(decision.dimension);
    if (!DECISION_SET.has(decision.decision)) {
      fail('AION_SOCIETY_GATE_INVALID', 'dimension decision must be PASS, HOLD, or FAIL');
    }
    if (decision.dimension === 'LEGAL' && decision.human_approved !== true) {
      fail('AION_SOCIETY_LEGAL_APPROVAL_REQUIRED', 'LEGAL dimension requires explicit human approval');
    }
    assertSyntheticMaterial(decision, `decisions[${index}]`);
    return Object.freeze({
      dimension: decision.dimension,
      decision: decision.decision,
      evidence_refs: normalizeRefs(decision.evidence_refs, `decisions[${index}].evidence_refs`),
      policy_ref: requireString(decision.policy_ref, `decisions[${index}].policy_ref`, MAX_TEXT_LENGTH),
      ...(decision.dimension === 'LEGAL' ? { human_approved: true } : {}),
    });
  });

  for (const dimension of OUTCOME_DIMENSIONS) {
    if (!seen.has(dimension)) fail('AION_SOCIETY_GATE_INVALID', `missing required dimension: ${dimension}`);
  }
  dimensions.sort((left, right) => left.dimension.localeCompare(right.dimension));

  const status = dimensions.some((item) => item.decision === 'FAIL')
    ? 'REJECTED'
    : dimensions.some((item) => item.decision === 'HOLD')
      ? 'HOLD'
      : 'APPROVED';

  return seal({
    schema_version: 'TIGER-AION-SOCIETY-GATE-1',
    gate_id: requireString(input.gate_id, 'gate_id'),
    release_ref: requireString(input.release_ref, 'release_ref', MAX_TEXT_LENGTH),
    status,
    dimensions: Object.freeze(dimensions),
  });
}

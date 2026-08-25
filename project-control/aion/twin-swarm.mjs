import { createHash } from 'node:crypto';

export const FOUNDATION_TWIN_CLASSES = Object.freeze([
  'RELEASE',
  'PERFORMANCE',
  'DATABASE',
  'SECURITY',
]);

const TWIN_CLASSES = new Set(FOUNDATION_TWIN_CLASSES);
const DATA_MODES = new Set(['SYNTHETIC', 'SANITIZED']);
const EXECUTION_TARGETS = new Set(['SHADOW', 'ISOLATED_TWIN']);
const SENSITIVITY_CLASSES = new Set(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']);
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_ID_LENGTH = 256;
const MAX_ASSUMPTIONS = 64;
const MAX_INTERVENTIONS = 64;
const MAX_OBSERVATIONS = 128;
const MAX_HORIZON_SECONDS = 31_536_000;
const MAX_TEXT_LENGTH = 4096;

export class AionTwinError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionTwinError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionTwinError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    fail('AION_TWIN_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field, 64);
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!isoPattern.test(value)) fail('AION_TWIN_INVALID', `${field} must be ISO-8601 with timezone`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) fail('AION_TWIN_INVALID', `${field} is invalid`);
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

function keyLooksSecret(key) {
  const normalized = normalizedKey(key);
  return [
    'apikey',
    'authorization',
    'credential',
    'credentials',
    'password',
    'passwd',
    'privatekey',
    'refreshtoken',
    'secrettoken',
    'secretkey',
    'accesstoken',
  ].some((fragment) => normalized.includes(fragment));
}

function valueLooksSecret(value) {
  if (typeof value !== 'string') return false;
  if (/^Bearer\s+\S{12,}$/i.test(value)) return true;
  if (/^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(value)) return true;
  if (value.includes('-----BEGIN') && value.includes('PRIVATE KEY-----')) return true;
  return false;
}

function assertNoSecretMaterial(value, field = 'input') {
  if (valueLooksSecret(value)) {
    fail('AION_TWIN_SECRET_MATERIAL_REJECTED', `${field} contains secret-like material`);
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertNoSecretMaterial(value[index], `${field}[${index}]`);
    }
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (keyLooksSecret(key)) {
      fail('AION_TWIN_SECRET_MATERIAL_REJECTED', `${field} contains a secret-bearing key`);
    }
    assertNoSecretMaterial(nested, `${field}.${key}`);
  }
}

function requireScalar(value, field) {
  if (typeof value === 'string') return requireString(value, field, MAX_TEXT_LENGTH);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  fail('AION_TWIN_INVALID', `${field} must be a bounded string, finite number, or boolean`);
}

function normalizeAssumptions(assumptions) {
  if (!Array.isArray(assumptions) || assumptions.length === 0 || assumptions.length > MAX_ASSUMPTIONS) {
    fail('AION_TWIN_INVALID', 'assumptions must be a non-empty bounded array');
  }

  assertNoSecretMaterial(assumptions, 'assumptions');
  const seen = new Set();
  const normalized = assumptions.map((assumption, index) => {
    if (!isPlainObject(assumption)) fail('AION_TWIN_INVALID', `assumptions[${index}] must be a plain object`);
    const id = requireString(assumption.id, `assumptions[${index}].id`);
    if (keyLooksSecret(id)) {
      fail('AION_TWIN_SECRET_MATERIAL_REJECTED', `assumptions[${index}].id names a secret-bearing class`);
    }
    if (seen.has(id)) fail('AION_TWIN_INVALID', `duplicate assumption id: ${id}`);
    seen.add(id);
    return Object.freeze({ id, value: requireScalar(assumption.value, `assumptions[${index}].value`) });
  });

  normalized.sort((left, right) => left.id.localeCompare(right.id));
  return Object.freeze(normalized);
}

function requireTwinClass(value) {
  if (!TWIN_CLASSES.has(value)) fail('AION_TWIN_CLASS_INVALID', 'twin_class is not an A3 foundation twin class');
  return value;
}

function requireIsolation(input) {
  if (!DATA_MODES.has(input.data_mode)) {
    fail('AION_TWIN_ISOLATION_VIOLATION', 'Twin data must be SYNTHETIC or SANITIZED');
  }
  if (!EXECUTION_TARGETS.has(input.execution_target)) {
    fail('AION_TWIN_ISOLATION_VIOLATION', 'Twin execution target must remain isolated from Production');
  }
  if (input.production_write_capability !== false) {
    fail('AION_TWIN_ISOLATION_VIOLATION', 'Production write capability is forbidden in A3');
  }
}

function verifyScenarioDigest(scenario) {
  if (typeof scenario?.content_digest !== 'string' || !SHA256_PATTERN.test(scenario.content_digest)) {
    fail('AION_TWIN_INTEGRITY_INVALID', 'scenario content digest is invalid');
  }
  const { content_digest: ignored, ...payload } = scenario;
  if (digest(payload) !== scenario.content_digest) {
    fail('AION_TWIN_INTEGRITY_INVALID', 'scenario content digest does not match its payload');
  }
}

function ensureScenarioShape(scenario) {
  if (!isPlainObject(scenario) || scenario.schema_version !== 'TIGER-AION-TWIN-SCENARIO-1') {
    fail('AION_TWIN_INVALID', 'invalid Twin scenario');
  }
  requireString(scenario.scenario_id, 'scenario.scenario_id');
  requireTwinClass(scenario.twin_class);
  requireIsolation(scenario);
  if (scenario.fact_class !== 'SIMULATION') {
    fail('AION_TWIN_INTEGRITY_INVALID', 'Twin scenario fact class must remain SIMULATION');
  }
  verifyScenarioDigest(scenario);
}

function normalizeInterventions(interventions) {
  if (!Array.isArray(interventions) || interventions.length === 0 || interventions.length > MAX_INTERVENTIONS) {
    fail('AION_TWIN_INVALID', 'interventions must be a non-empty bounded array');
  }
  assertNoSecretMaterial(interventions, 'interventions');

  const seen = new Set();
  return Object.freeze(interventions.map((intervention, index) => {
    if (!isPlainObject(intervention)) fail('AION_TWIN_INVALID', `interventions[${index}] must be a plain object`);
    const id = requireString(intervention.id, `interventions[${index}].id`);
    if (seen.has(id)) fail('AION_TWIN_INVALID', `duplicate intervention id: ${id}`);
    seen.add(id);
    if (!EXECUTION_TARGETS.has(intervention.target)) {
      fail('AION_TWIN_ISOLATION_VIOLATION', 'counterfactual intervention cannot target Production');
    }
    if (intervention.mode !== 'SIMULATE' || intervention.production_write_capability === true) {
      fail('AION_TWIN_ISOLATION_VIOLATION', 'counterfactual intervention must remain simulation-only');
    }
    return Object.freeze({
      id,
      type: requireString(intervention.type, `interventions[${index}].type`),
      target: intervention.target,
      mode: 'SIMULATE',
      production_write_capability: false,
    });
  }));
}

function normalizeObservationRefs(refs) {
  if (!Array.isArray(refs) || refs.length === 0 || refs.length > MAX_OBSERVATIONS) {
    fail('AION_TWIN_INVALID', 'observation_refs must be a non-empty bounded array');
  }
  return Object.freeze(refs.map((ref, index) => requireString(ref, `observation_refs[${index}]`, MAX_TEXT_LENGTH)));
}

function normalizeOutcome(outcome) {
  if (!isPlainObject(outcome)) fail('AION_TWIN_INVALID', 'outcome must be a plain object');
  assertNoSecretMaterial(outcome, 'outcome');
  return Object.freeze({
    status: requireString(outcome.status, 'outcome.status'),
    summary: requireString(outcome.summary, 'outcome.summary', MAX_TEXT_LENGTH),
  });
}

export function createTwinScenario(input) {
  if (!isPlainObject(input)) fail('AION_TWIN_INVALID', 'Twin scenario input must be a plain object');
  assertNoSecretMaterial(input.assumptions, 'assumptions');
  requireIsolation(input);

  const createdAtMs = parseTimestamp(input.created_at, 'created_at');
  const expiresAtMs = parseTimestamp(input.expires_at, 'expires_at');
  if (expiresAtMs <= createdAtMs) fail('AION_TWIN_INVALID', 'scenario expiry must follow creation');
  if (!Number.isInteger(input.horizon_seconds) || input.horizon_seconds <= 0 || input.horizon_seconds > MAX_HORIZON_SECONDS) {
    fail('AION_TWIN_INVALID', 'horizon_seconds is outside the bounded range');
  }
  if (!SENSITIVITY_CLASSES.has(input.sensitivity)) {
    fail('AION_TWIN_INVALID', 'sensitivity is not an allowed class');
  }

  let sourceReleaseSha;
  if (input.source_release_sha !== undefined) {
    if (typeof input.source_release_sha !== 'string' || !SHA1_PATTERN.test(input.source_release_sha)) {
      fail('AION_TWIN_INVALID', 'source_release_sha must be an exact 40-character Git SHA');
    }
    sourceReleaseSha = input.source_release_sha;
  }

  const scenario = {
    schema_version: 'TIGER-AION-TWIN-SCENARIO-1',
    scenario_id: requireString(input.scenario_id, 'scenario_id'),
    twin_class: requireTwinClass(input.twin_class),
    fact_class: 'SIMULATION',
    source_state_ref: requireString(input.source_state_ref, 'source_state_ref', MAX_TEXT_LENGTH),
    created_at: input.created_at,
    expires_at: input.expires_at,
    horizon_seconds: input.horizon_seconds,
    generator_version: requireString(input.generator_version, 'generator_version'),
    model_version: requireString(input.model_version, 'model_version'),
    sensitivity: input.sensitivity,
    data_mode: input.data_mode,
    execution_target: input.execution_target,
    production_write_capability: false,
    assumptions: normalizeAssumptions(input.assumptions),
  };
  if (sourceReleaseSha !== undefined) scenario.source_release_sha = sourceReleaseSha;

  return seal(scenario);
}

export function verifyTwinScenario(scenario) {
  ensureScenarioShape(scenario);
  return true;
}

export function isTwinScenarioFresh(scenario, nowMs) {
  ensureScenarioShape(scenario);
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
    fail('AION_TWIN_INVALID', 'now_ms must be a finite injected clock value');
  }
  const createdAtMs = Date.parse(scenario.created_at);
  const expiresAtMs = Date.parse(scenario.expires_at);
  return nowMs >= createdAtMs && nowMs <= expiresAtMs;
}

export function replayCounterfactual(input) {
  if (!isPlainObject(input)) fail('AION_TWIN_INVALID', 'replay input must be a plain object');
  const scenario = input.scenario;
  ensureScenarioShape(scenario);

  if (typeof input.now_ms !== 'number' || !Number.isFinite(input.now_ms)) {
    fail('AION_TWIN_INVALID', 'now_ms must be a finite injected clock value');
  }
  const executedAtMs = parseTimestamp(input.executed_at, 'executed_at');
  const createdAtMs = Date.parse(scenario.created_at);
  if (!isTwinScenarioFresh(scenario, input.now_ms) || executedAtMs < createdAtMs || executedAtMs > input.now_ms) {
    fail('AION_TWIN_SCENARIO_EXPIRED', 'scenario is stale or replay time is outside its validity window');
  }

  const replay = {
    schema_version: 'TIGER-AION-TWIN-REPLAY-1',
    replay_id: requireString(input.replay_id, 'replay_id'),
    scenario_id: scenario.scenario_id,
    twin_class: scenario.twin_class,
    fact_class: 'SIMULATION',
    executed_at: input.executed_at,
    execution_target: scenario.execution_target,
    production_write_capability: false,
    interventions: normalizeInterventions(input.interventions),
    observation_refs: normalizeObservationRefs(input.observation_refs),
    outcome: normalizeOutcome(input.outcome),
    scenario_digest: scenario.content_digest,
  };

  return seal(replay);
}

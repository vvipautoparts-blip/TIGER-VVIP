import { createHash } from 'node:crypto';

import { verifyActionPassport } from './agentic-control.mjs';

export const DELIVERY_STAGES = Object.freeze(['SHADOW', 'CANARY', 'COHORT_1', 'COHORT_N', 'FULL']);

const STAGES = new Set(DELIVERY_STAGES);
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 4096;
const MAX_LIST_ITEMS = 128;
const ALLOWED_AUTONOMY = new Set(['L4_CONTROLLED_CANARY', 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION']);
const METRIC_KEYS = Object.freeze([
  'error_rate',
  'p95_ms',
  'p99_ms',
  'db_saturation',
  'security_findings',
  'business_kpi',
  'user_harm_rate',
  'cost_rate',
]);
const GUARDRAIL_KEYS = Object.freeze([
  'max_error_rate',
  'max_p95_ms',
  'max_p99_ms',
  'max_db_saturation',
  'max_security_findings',
  'min_business_kpi',
  'max_user_harm_rate',
  'max_cost_rate',
]);

export class AionRemediationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionRemediationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionRemediationError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    fail('AION_REMEDIATION_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function requireExactSha(value, field = 'exact_source_sha') {
  if (typeof value !== 'string' || !SHA1_PATTERN.test(value)) {
    fail('AION_REMEDIATION_INVALID', `${field} must be an exact 40-character Git SHA`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field, 64);
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!pattern.test(value)) fail('AION_REMEDIATION_INVALID', `${field} must be ISO-8601 with timezone`);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail('AION_REMEDIATION_INVALID', `${field} is invalid`);
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

function verifyDigest(record, label) {
  if (typeof record?.content_digest !== 'string' || !SHA256_PATTERN.test(record.content_digest)) {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', `${label} content digest is invalid`);
  }
  const { content_digest: ignored, ...payload } = record;
  if (digest(payload) !== record.content_digest) {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', `${label} content digest does not match its payload`);
  }
}

function normalizeUniqueStrings(values, field) {
  if (!Array.isArray(values) || values.length === 0 || values.length > MAX_LIST_ITEMS) {
    fail('AION_REMEDIATION_INVALID', `${field} must be a bounded non-empty array`);
  }
  const seen = new Set();
  const output = values.map((value, index) => {
    const item = requireString(value, `${field}[${index}]`, MAX_TEXT_LENGTH);
    if (seen.has(item)) fail('AION_REMEDIATION_INVALID', `${field} contains duplicate value: ${item}`);
    seen.add(item);
    return item;
  });
  output.sort();
  return Object.freeze(output);
}

function finiteNonNegative(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail('AION_REMEDIATION_METRICS_INVALID', `${field} must be a finite non-negative number`);
  }
  return value;
}

function normalizeExactNumericObject(value, expectedKeys, field) {
  if (!isPlainObject(value)) fail('AION_REMEDIATION_METRICS_INVALID', `${field} must be a plain object`);
  const keys = Object.keys(value);
  if (keys.length !== expectedKeys.length || expectedKeys.some((key) => !Object.hasOwn(value, key))) {
    fail('AION_REMEDIATION_METRICS_INVALID', `${field} must contain every required dimension exactly once`);
  }
  const output = {};
  for (const key of expectedKeys) output[key] = finiteNonNegative(value[key], `${field}.${key}`);
  return Object.freeze(output);
}

function normalizeBaseline(value) {
  return normalizeExactNumericObject(value, METRIC_KEYS, 'baseline');
}

function normalizeGuardrails(value) {
  const normalized = normalizeExactNumericObject(value, GUARDRAIL_KEYS, 'guardrails');
  if (normalized.max_error_rate > 1 || normalized.max_db_saturation > 1 || normalized.max_user_harm_rate > 1) {
    fail('AION_REMEDIATION_METRICS_INVALID', 'rate/saturation guardrails must remain inside 0..1');
  }
  if (!Number.isInteger(normalized.max_security_findings)) {
    fail('AION_REMEDIATION_METRICS_INVALID', 'max_security_findings must be an integer');
  }
  return normalized;
}

function normalizeMetrics(value) {
  const normalized = normalizeExactNumericObject(value, METRIC_KEYS, 'metrics');
  if (normalized.error_rate > 1 || normalized.db_saturation > 1 || normalized.user_harm_rate > 1) {
    fail('AION_REMEDIATION_METRICS_INVALID', 'observed rate/saturation metrics must remain inside 0..1');
  }
  if (!Number.isInteger(normalized.security_findings)) {
    fail('AION_REMEDIATION_METRICS_INVALID', 'security_findings must be an integer');
  }
  return normalized;
}

function verifyA5Authorization(authorization, passport) {
  if (!isPlainObject(authorization) || authorization.schema_version !== 'TIGER-AION-AUTHORIZATION-DECISION-1') {
    fail('AION_REMEDIATION_A5_BINDING_INVALID', 'missing deterministic A5 authorization');
  }
  if (typeof authorization.content_digest !== 'string' || !SHA256_PATTERN.test(authorization.content_digest)) {
    fail('AION_REMEDIATION_A5_BINDING_INVALID', 'A5 authorization digest is invalid');
  }
  const { content_digest: ignored, ...payload } = authorization;
  if (digest(payload) !== authorization.content_digest) {
    fail('AION_REMEDIATION_A5_BINDING_INVALID', 'A5 authorization was tampered');
  }
  if (
    authorization.decision !== 'AUTHORIZED'
    || authorization.passport_id !== passport.passport_id
    || authorization.exact_source_sha !== passport.exact_source_sha
    || authorization.autonomy_level !== passport.requested_autonomy_level
    || authorization.production_mutation_authorized !== false
    || authorization.unrestricted_production_mutation !== false
  ) {
    fail('AION_REMEDIATION_A5_BINDING_INVALID', 'A5 authorization does not exactly bind the supplied Action Passport');
  }
}

function ensureRollout(rollout) {
  if (!isPlainObject(rollout) || rollout.schema_version !== 'TIGER-AION-PROGRESSIVE-ROLLOUT-1') {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', 'invalid progressive rollout');
  }
  requireString(rollout.rollout_id, 'rollout.rollout_id');
  parseTimestamp(rollout.created_at, 'rollout.created_at');
  requireExactSha(rollout.exact_source_sha, 'rollout.exact_source_sha');
  if (!STAGES.has(rollout.current_stage) || rollout.current_stage !== 'SHADOW') {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', 'new A8 rollout must begin at SHADOW');
  }
  if (!ALLOWED_AUTONOMY.has(rollout.autonomy_level)) {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', 'rollout autonomy must remain bounded to L4 or L5');
  }
  normalizeBaseline(rollout.baseline);
  normalizeGuardrails(rollout.guardrails);
  requireString(rollout.rollback_ref, 'rollout.rollback_ref', MAX_TEXT_LENGTH);
  requireString(rollout.recovery_checkpoint_ref, 'rollout.recovery_checkpoint_ref', MAX_TEXT_LENGTH);
  requireString(rollout.blast_radius, 'rollout.blast_radius', MAX_TEXT_LENGTH);
  if (typeof rollout.passport_digest !== 'string' || !SHA256_PATTERN.test(rollout.passport_digest)) {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', 'rollout passport digest is invalid');
  }
  if (typeof rollout.authorization_digest !== 'string' || !SHA256_PATTERN.test(rollout.authorization_digest)) {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', 'rollout authorization digest is invalid');
  }
  parseTimestamp(rollout.passport_freshness_deadline, 'rollout.passport_freshness_deadline');
  for (const flag of ['rollback_verified', 'recovery_verified', 'preapproved', 'reversible']) {
    if (typeof rollout[flag] !== 'boolean') fail('AION_REMEDIATION_INTEGRITY_INVALID', `${flag} must be boolean`);
  }
  if (
    rollout.execution_performed !== false
    || rollout.production_mutation_authorized !== false
    || rollout.unrestricted_production_mutation !== false
  ) {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', 'A8 rollout cannot carry direct execution authority');
  }
  verifyDigest(rollout, 'progressive rollout');
}

function ensureObservation(observation) {
  if (!isPlainObject(observation) || observation.schema_version !== 'TIGER-AION-REMEDIATION-OBSERVATION-1') {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', 'invalid remediation stage observation');
  }
  requireString(observation.observation_id, 'observation.observation_id');
  if (!STAGES.has(observation.stage)) fail('AION_REMEDIATION_STAGE_INVALID', 'observation stage is invalid');
  requireExactSha(observation.exact_source_sha, 'observation.exact_source_sha');
  parseTimestamp(observation.observed_at, 'observation.observed_at');
  normalizeUniqueStrings(observation.evidence_refs, 'observation.evidence_refs');
  normalizeMetrics(observation.metrics);
  if (observation.fact_class !== 'PRODUCTION_OR_SHADOW_OBSERVATION' || observation.execution_authority_granted !== false) {
    fail('AION_REMEDIATION_INTEGRITY_INVALID', 'observation cannot grant execution authority');
  }
  verifyDigest(observation, 'remediation stage observation');
}

export function nextDeliveryStage(stage) {
  if (!STAGES.has(stage)) fail('AION_REMEDIATION_STAGE_INVALID', 'unknown delivery stage');
  const index = DELIVERY_STAGES.indexOf(stage);
  return index === DELIVERY_STAGES.length - 1 ? null : DELIVERY_STAGES[index + 1];
}

export function createProgressiveRemediationRollout(input) {
  if (!isPlainObject(input)) fail('AION_REMEDIATION_INVALID', 'progressive rollout input must be a plain object');
  try {
    verifyActionPassport(input.passport);
  } catch (error) {
    fail('AION_REMEDIATION_A5_BINDING_INVALID', `invalid A5 Action Passport: ${error?.code ?? 'UNKNOWN'}`);
  }
  verifyA5Authorization(input.authorization, input.passport);
  if (!ALLOWED_AUTONOMY.has(input.authorization.autonomy_level)) {
    fail('AION_REMEDIATION_A5_BINDING_INVALID', 'A8 requires A5 L4 or L5 authorization');
  }
  const createdAtMs = parseTimestamp(input.created_at, 'created_at');
  if (createdAtMs < input.authorization.decided_at_ms) {
    fail('AION_REMEDIATION_A5_BINDING_INVALID', 'rollout cannot predate its A5 authorization');
  }
  if (createdAtMs > Date.parse(input.passport.freshness_deadline)) {
    fail('AION_REMEDIATION_EVIDENCE_STALE', 'A5 Action Passport is stale at rollout creation');
  }
  if (input.blast_radius !== input.passport.blast_radius) {
    fail('AION_REMEDIATION_A5_BINDING_INVALID', 'rollout blast radius must match the A5 Action Passport');
  }

  return seal({
    schema_version: 'TIGER-AION-PROGRESSIVE-ROLLOUT-1',
    rollout_id: requireString(input.rollout_id, 'rollout_id'),
    created_at: input.created_at,
    current_stage: 'SHADOW',
    action_type: input.passport.action_type,
    autonomy_level: input.authorization.autonomy_level,
    exact_source_sha: requireExactSha(input.passport.exact_source_sha),
    passport_id: input.passport.passport_id,
    passport_digest: input.passport.content_digest,
    authorization_digest: input.authorization.content_digest,
    passport_freshness_deadline: input.passport.freshness_deadline,
    baseline: normalizeBaseline(input.baseline),
    guardrails: normalizeGuardrails(input.guardrails),
    rollback_ref: input.passport.rollback_ref,
    recovery_checkpoint_ref: input.passport.recovery_checkpoint_ref,
    rollback_verified: input.rollback_verified === true,
    recovery_verified: input.recovery_verified === true,
    preapproved: input.preapproved === true,
    reversible: input.reversible === true,
    blast_radius: requireString(input.blast_radius, 'blast_radius', MAX_TEXT_LENGTH),
    execution_performed: false,
    production_mutation_authorized: false,
    unrestricted_production_mutation: false,
  });
}

export function verifyProgressiveRemediationRollout(rollout) {
  ensureRollout(rollout);
  return true;
}

export function createStageObservation(input) {
  if (!isPlainObject(input)) fail('AION_REMEDIATION_INVALID', 'stage observation input must be a plain object');
  if (!STAGES.has(input.stage)) fail('AION_REMEDIATION_STAGE_INVALID', 'stage observation references an invalid stage');
  parseTimestamp(input.observed_at, 'observed_at');
  return seal({
    schema_version: 'TIGER-AION-REMEDIATION-OBSERVATION-1',
    observation_id: requireString(input.observation_id, 'observation_id'),
    stage: input.stage,
    exact_source_sha: requireExactSha(input.exact_source_sha),
    observed_at: input.observed_at,
    evidence_refs: normalizeUniqueStrings(input.evidence_refs, 'evidence_refs'),
    metrics: normalizeMetrics(input.metrics),
    fact_class: 'PRODUCTION_OR_SHADOW_OBSERVATION',
    execution_authority_granted: false,
  });
}

export function verifyStageObservation(observation) {
  ensureObservation(observation);
  return true;
}

function evaluateGuardrails(metrics, guardrails) {
  const checks = Object.freeze({
    error_rate: metrics.error_rate <= guardrails.max_error_rate,
    p95_ms: metrics.p95_ms <= guardrails.max_p95_ms,
    p99_ms: metrics.p99_ms <= guardrails.max_p99_ms,
    db_saturation: metrics.db_saturation <= guardrails.max_db_saturation,
    security_findings: metrics.security_findings <= guardrails.max_security_findings,
    business_kpi: metrics.business_kpi >= guardrails.min_business_kpi,
    user_harm_rate: metrics.user_harm_rate <= guardrails.max_user_harm_rate,
    cost_rate: metrics.cost_rate <= guardrails.max_cost_rate,
  });
  return Object.freeze({
    checks,
    failed: Object.freeze(METRIC_KEYS.filter((key) => checks[key] !== true)),
  });
}

function compareToBaseline(baseline, metrics) {
  const output = {};
  for (const key of METRIC_KEYS) {
    output[key] = Object.freeze({ baseline: baseline[key], observed: metrics[key], delta: metrics[key] - baseline[key] });
  }
  return Object.freeze(output);
}

export function evaluateRemediationStage({ rollout, observation, requested_next_stage: requestedNextStage, now_ms: nowMs }) {
  ensureRollout(rollout);
  ensureObservation(observation);
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) fail('AION_REMEDIATION_INVALID', 'now_ms must be a finite injected clock value');
  if (observation.exact_source_sha !== rollout.exact_source_sha) {
    fail('AION_REMEDIATION_SOURCE_MISMATCH', 'observation source does not match rollout source');
  }
  if (observation.stage !== rollout.current_stage) {
    fail('AION_REMEDIATION_STAGE_INVALID', 'observation must describe the rollout current stage');
  }
  const legalNextStage = nextDeliveryStage(rollout.current_stage);
  if (legalNextStage === null || requestedNextStage !== legalNextStage) {
    fail('AION_REMEDIATION_STAGE_INVALID', 'requested stage is not the sole legal successor');
  }
  const observedAtMs = Date.parse(observation.observed_at);
  if (observedAtMs < Date.parse(rollout.created_at) || observedAtMs > nowMs) {
    fail('AION_REMEDIATION_INVALID', 'observation time is outside the rollout evaluation window');
  }
  if (nowMs > Date.parse(rollout.passport_freshness_deadline)) {
    fail('AION_REMEDIATION_EVIDENCE_STALE', 'A5 evidence freshness deadline has passed');
  }

  const guardrailEvaluation = evaluateGuardrails(observation.metrics, rollout.guardrails);
  const baselineComparison = compareToBaseline(rollout.baseline, observation.metrics);
  const allGuardrailsPass = guardrailEvaluation.failed.length === 0;
  const automaticRollbackEligible = !allGuardrailsPass
    && rollout.autonomy_level === 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION'
    && rollout.preapproved
    && rollout.reversible
    && rollout.rollback_verified
    && rollout.recovery_verified;
  const decision = allGuardrailsPass
    ? 'PROMOTION_CANDIDATE'
    : automaticRollbackEligible
      ? 'ROLLBACK_CANDIDATE'
      : 'HOLD_FOR_HUMAN';

  return seal({
    schema_version: 'TIGER-AION-REMEDIATION-STAGE-DECISION-1',
    decision,
    rollout_id: rollout.rollout_id,
    rollout_digest: rollout.content_digest,
    observation_id: observation.observation_id,
    observation_digest: observation.content_digest,
    exact_source_sha: rollout.exact_source_sha,
    current_stage: rollout.current_stage,
    next_stage: allGuardrailsPass ? legalNextStage : null,
    all_guardrails_pass: allGuardrailsPass,
    failed_guardrails: guardrailEvaluation.failed,
    baseline_comparison: baselineComparison,
    automatic_rollback_eligible: automaticRollbackEligible,
    rollback_ref: automaticRollbackEligible ? rollout.rollback_ref : null,
    recovery_checkpoint_ref: automaticRollbackEligible ? rollout.recovery_checkpoint_ref : null,
    evaluated_at_ms: nowMs,
    execution_performed: false,
    production_mutation_authorized: false,
    unrestricted_production_mutation: false,
  });
}

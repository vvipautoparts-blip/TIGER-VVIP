import { createHash } from 'node:crypto';

export const AUTONOMY_LEVELS = Object.freeze([
  'L0_OBSERVE',
  'L1_DIAGNOSE',
  'L2_PROPOSE',
  'L3_CREATE_PR_OR_RUNBOOK',
  'L4_CONTROLLED_CANARY',
  'L5_PREAPPROVED_REVERSIBLE_REMEDIATION',
]);

export const FORBIDDEN_AUTONOMY_LEVEL = 'L6_UNRESTRICTED_PRODUCTION_MUTATION';

const AUTONOMY_INDEX = new Map(AUTONOMY_LEVELS.map((level, index) => [level, index]));
const CRITICAL_ADMIN_CAPABILITIES = new Set([
  'REPOSITORY_MERGE',
  'PRODUCTION_DEPLOY',
  'PRODUCTION_DB_ADMIN',
  'SECRETS_ADMIN',
]);
const SANDBOX_PROFILES = new Set(['WASI_COMPONENT', 'EQUIVALENT_CAPABILITY_SANDBOX']);
const DENY_BY_DEFAULT = 'DENY_BY_DEFAULT';
const POLICY_TERMS = Object.freeze([
  'constitution',
  'policy',
  'identity',
  'provenance',
  'evidence',
  'recovery_path',
  'risk_budget',
]);
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 4096;
const MAX_LIST_ITEMS = 128;
const MAX_BUDGET = 1_000_000_000;
const BLAST_RADIUS_VALUES = new Set([
  'OBSERVATION_ONLY',
  'SHADOW_ONLY',
  'REPOSITORY_BRANCH_ONLY',
  'SINGLE_CANARY',
  'SINGLE_COHORT',
  'MULTI_COHORT',
]);

export class AionAgentControlError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionAgentControlError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionAgentControlError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    fail('AION_AGENT_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field, 64);
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!pattern.test(value)) fail('AION_AGENT_INVALID', `${field} must be ISO-8601 with timezone`);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail('AION_AGENT_INVALID', `${field} is invalid`);
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
    fail('AION_AGENT_INTEGRITY_INVALID', `${label} content digest is invalid`);
  }
  const { content_digest: ignored, ...payload } = record;
  if (digest(payload) !== record.content_digest) {
    fail('AION_AGENT_INTEGRITY_INVALID', `${label} content digest does not match its payload`);
  }
}

function requireAutonomyLevel(value, field = 'autonomy_level') {
  if (value === FORBIDDEN_AUTONOMY_LEVEL) {
    fail('AION_AGENT_L6_FORBIDDEN', 'unrestricted Production mutation is permanently forbidden');
  }
  if (!AUTONOMY_INDEX.has(value)) fail('AION_AGENT_INVALID', `${field} is not an allowed autonomy level`);
  return value;
}

function normalizeUniqueStrings(values, field, { allowEmpty = false, max = MAX_LIST_ITEMS } = {}) {
  if (!Array.isArray(values) || values.length > max || (!allowEmpty && values.length === 0)) {
    fail('AION_AGENT_INVALID', `${field} must be a bounded${allowEmpty ? '' : ' non-empty'} array`);
  }
  const seen = new Set();
  const output = values.map((value, index) => {
    const item = requireString(value, `${field}[${index}]`, MAX_TEXT_LENGTH);
    if (seen.has(item)) fail('AION_AGENT_INVALID', `${field} contains duplicate value: ${item}`);
    seen.add(item);
    return item;
  });
  output.sort();
  return Object.freeze(output);
}

function normalizeCapabilities(values) {
  const capabilities = normalizeUniqueStrings(values, 'capabilities');
  const criticalCount = capabilities.filter((capability) => CRITICAL_ADMIN_CAPABILITIES.has(capability)).length;
  if (criticalCount >= 2) {
    fail('AION_AGENT_SEPARATION_OF_DUTIES', 'one Capability Cell cannot combine critical administrative powers');
  }
  return capabilities;
}

function requirePositiveBudget(value, field) {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_BUDGET) {
    fail('AION_AGENT_INVALID', `${field} is outside allowed budget bounds`);
  }
  return value;
}

function normalizeBudgets(budgets) {
  if (!isPlainObject(budgets)) fail('AION_AGENT_INVALID', 'budgets must be a plain object');
  return Object.freeze({
    max_actions: requirePositiveBudget(budgets.max_actions, 'budgets.max_actions'),
    max_tool_calls: requirePositiveBudget(budgets.max_tool_calls, 'budgets.max_tool_calls'),
    max_loops: requirePositiveBudget(budgets.max_loops, 'budgets.max_loops'),
    max_cost_units: requirePositiveBudget(budgets.max_cost_units, 'budgets.max_cost_units'),
  });
}

function normalizeSandbox(sandbox) {
  if (!isPlainObject(sandbox) || !SANDBOX_PROFILES.has(sandbox.profile)) {
    fail('AION_AGENT_SANDBOX_INVALID', 'sandbox profile must be an approved capability sandbox');
  }
  for (const field of ['network', 'filesystem', 'environment']) {
    if (sandbox[field] !== DENY_BY_DEFAULT) {
      fail('AION_AGENT_SANDBOX_INVALID', `${field} must be DENY_BY_DEFAULT`);
    }
  }
  return Object.freeze({
    profile: sandbox.profile,
    network: DENY_BY_DEFAULT,
    filesystem: DENY_BY_DEFAULT,
    environment: DENY_BY_DEFAULT,
    allowed_interfaces: normalizeUniqueStrings(sandbox.allowed_interfaces, 'sandbox.allowed_interfaces'),
  });
}

function ensureCapabilityCell(cell) {
  if (!isPlainObject(cell) || cell.schema_version !== 'TIGER-AION-CAPABILITY-CELL-1') {
    fail('AION_AGENT_INTEGRITY_INVALID', 'invalid Capability Cell');
  }
  requireString(cell.cell_id, 'cell.cell_id');
  requireString(cell.agent_id, 'cell.agent_id');
  requireAutonomyLevel(cell.autonomy_ceiling, 'cell.autonomy_ceiling');
  normalizeCapabilities(cell.capabilities);
  normalizeUniqueStrings(cell.target_scopes, 'cell.target_scopes');
  normalizeBudgets(cell.budgets);
  normalizeSandbox(cell.sandbox);
  normalizeUniqueStrings(cell.denied_boundaries, 'cell.denied_boundaries');
  parseTimestamp(cell.issued_at, 'cell.issued_at');
  parseTimestamp(cell.expires_at, 'cell.expires_at');
  verifyDigest(cell, 'Capability Cell');
}

function normalizePolicyDecisions(decisions) {
  if (!isPlainObject(decisions)) fail('AION_AGENT_INVALID', 'policy_decisions must be a plain object');
  const output = {};
  for (const term of POLICY_TERMS) {
    if (typeof decisions[term] !== 'boolean') fail('AION_AGENT_INVALID', `policy_decisions.${term} must be boolean`);
    output[term] = decisions[term];
  }
  return Object.freeze(output);
}

function ensurePassport(passport) {
  if (!isPlainObject(passport) || passport.schema_version !== 'TIGER-AION-ACTION-PASSPORT-1') {
    fail('AION_AGENT_INTEGRITY_INVALID', 'invalid Action Passport');
  }
  requireString(passport.passport_id, 'passport.passport_id');
  requireString(passport.action_type, 'passport.action_type');
  requireAutonomyLevel(passport.requested_autonomy_level, 'passport.requested_autonomy_level');
  normalizeUniqueStrings(passport.requested_capabilities, 'passport.requested_capabilities');
  if (typeof passport.exact_source_sha !== 'string' || !SHA1_PATTERN.test(passport.exact_source_sha)) {
    fail('AION_AGENT_INVALID', 'passport exact_source_sha must be a 40-character Git SHA');
  }
  normalizeUniqueStrings(passport.evidence_refs, 'passport.evidence_refs');
  normalizeUniqueStrings(passport.provenance_refs, 'passport.provenance_refs');
  normalizePolicyDecisions(passport.policy_decisions);
  parseTimestamp(passport.freshness_deadline, 'passport.freshness_deadline');
  verifyDigest(passport, 'Action Passport');
}

function requireNullableRef(value, field) {
  if (value === null) return null;
  return requireString(value, field, MAX_TEXT_LENGTH);
}

function requireConfidence(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    fail('AION_AGENT_INVALID', 'confidence must be between 0 and 1');
  }
  return value;
}

function normalizeBlastRadius(value) {
  if (!BLAST_RADIUS_VALUES.has(value)) fail('AION_AGENT_INVALID', 'blast_radius is not allowed');
  return value;
}

function normalizePassportSafeguards(input, levelIndex) {
  const simulationRefs = normalizeUniqueStrings(input.simulation_refs, 'simulation_refs', { allowEmpty: true });
  const rollbackRef = requireNullableRef(input.rollback_ref, 'rollback_ref');
  const recoveryRef = requireNullableRef(input.recovery_checkpoint_ref, 'recovery_checkpoint_ref');

  if (levelIndex >= 4 && (simulationRefs.length === 0 || rollbackRef === null || recoveryRef === null)) {
    fail('AION_AGENT_RECOVERY_REQUIRED', 'L4/L5 require Twin proof, rollback, and recovery checkpoint');
  }
  if (levelIndex === 5 && (input.preapproved !== true || input.reversible !== true)) {
    fail('AION_AGENT_PREAPPROVAL_REQUIRED', 'L5 requires explicit preapproval and reversibility');
  }
  return { simulationRefs, rollbackRef, recoveryRef };
}

export function createCapabilityCell(input) {
  if (!isPlainObject(input)) fail('AION_AGENT_INVALID', 'Capability Cell input must be a plain object');
  const issuedAt = parseTimestamp(input.issued_at, 'issued_at');
  const expiresAt = parseTimestamp(input.expires_at, 'expires_at');
  if (expiresAt <= issuedAt) fail('AION_AGENT_INVALID', 'Capability Cell expiry must follow issue time');

  return seal({
    schema_version: 'TIGER-AION-CAPABILITY-CELL-1',
    cell_id: requireString(input.cell_id, 'cell_id'),
    agent_id: requireString(input.agent_id, 'agent_id'),
    issued_at: input.issued_at,
    expires_at: input.expires_at,
    autonomy_ceiling: requireAutonomyLevel(input.autonomy_ceiling, 'autonomy_ceiling'),
    capabilities: normalizeCapabilities(input.capabilities),
    target_scopes: normalizeUniqueStrings(input.target_scopes, 'target_scopes'),
    budgets: normalizeBudgets(input.budgets),
    sandbox: normalizeSandbox(input.sandbox),
    denied_boundaries: normalizeUniqueStrings(input.denied_boundaries, 'denied_boundaries'),
  });
}

export function verifyCapabilityCell(cell) {
  ensureCapabilityCell(cell);
  return true;
}

export function createActionPassport(input) {
  if (!isPlainObject(input)) fail('AION_AGENT_INVALID', 'Action Passport input must be a plain object');
  const requestedLevel = requireAutonomyLevel(input.requested_autonomy_level, 'requested_autonomy_level');
  const levelIndex = AUTONOMY_INDEX.get(requestedLevel);
  if (typeof input.exact_source_sha !== 'string' || !SHA1_PATTERN.test(input.exact_source_sha)) {
    fail('AION_AGENT_INVALID', 'exact_source_sha must be an exact 40-character Git SHA');
  }
  parseTimestamp(input.freshness_deadline, 'freshness_deadline');
  const safeguards = normalizePassportSafeguards(input, levelIndex);

  return seal({
    schema_version: 'TIGER-AION-ACTION-PASSPORT-1',
    passport_id: requireString(input.passport_id, 'passport_id'),
    action_type: requireString(input.action_type, 'action_type'),
    requested_autonomy_level: requestedLevel,
    requested_capabilities: normalizeUniqueStrings(input.requested_capabilities, 'requested_capabilities'),
    exact_source_sha: input.exact_source_sha,
    evidence_refs: normalizeUniqueStrings(input.evidence_refs, 'evidence_refs'),
    confidence: requireConfidence(input.confidence),
    freshness_deadline: input.freshness_deadline,
    simulation_refs: safeguards.simulationRefs,
    policy_decisions: normalizePolicyDecisions(input.policy_decisions),
    blast_radius: normalizeBlastRadius(input.blast_radius),
    provenance_refs: normalizeUniqueStrings(input.provenance_refs, 'provenance_refs'),
    rollback_ref: safeguards.rollbackRef,
    recovery_checkpoint_ref: safeguards.recoveryRef,
    required_approvals: normalizeUniqueStrings(input.required_approvals, 'required_approvals', { allowEmpty: true }),
    satisfied_approvals: normalizeUniqueStrings(input.satisfied_approvals, 'satisfied_approvals', { allowEmpty: true }),
    verification_conditions: normalizeUniqueStrings(input.verification_conditions, 'verification_conditions'),
    abort_conditions: normalizeUniqueStrings(input.abort_conditions, 'abort_conditions'),
    reversible: input.reversible === true,
    preapproved: input.preapproved === true,
  });
}

export function verifyActionPassport(passport) {
  ensurePassport(passport);
  return true;
}

function assertFresh(cell, passport, nowMs) {
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) fail('AION_AGENT_INVALID', 'now_ms must be a finite injected clock value');
  const issuedAt = Date.parse(cell.issued_at);
  const cellExpires = Date.parse(cell.expires_at);
  const passportExpires = Date.parse(passport.freshness_deadline);
  if (nowMs < issuedAt || nowMs > cellExpires) fail('AION_AGENT_CELL_EXPIRED', 'Capability Cell is outside its active window');
  if (nowMs > passportExpires) fail('AION_AGENT_PASSPORT_EXPIRED', 'Action Passport evidence is stale');
}

function assertCapabilities(cell, passport) {
  const allowed = new Set(cell.capabilities);
  for (const capability of passport.requested_capabilities) {
    if (!allowed.has(capability)) fail('AION_AGENT_CAPABILITY_DENIED', `Capability Cell does not grant ${capability}`);
  }
}

function assertApprovals(passport) {
  const satisfied = new Set(passport.satisfied_approvals);
  for (const approval of passport.required_approvals) {
    if (!satisfied.has(approval)) fail('AION_AGENT_APPROVAL_REQUIRED', `required approval is missing: ${approval}`);
  }
}

function assertPolicy(passport) {
  for (const term of POLICY_TERMS) {
    if (passport.policy_decisions[term] !== true) fail('AION_AGENT_POLICY_DENIED', `deterministic policy term denied action: ${term}`);
  }
}

export function authorizeAction({ cell, passport, now_ms: nowMs, behavior_state: behaviorState }) {
  ensureCapabilityCell(cell);
  ensurePassport(passport);
  if (behaviorState !== 'ACTIVE') fail('AION_AGENT_BEHAVIOR_DENIED', 'quarantined or revoked agent behavior cannot authorize actions');
  assertFresh(cell, passport, nowMs);

  const requestedIndex = AUTONOMY_INDEX.get(passport.requested_autonomy_level);
  const ceilingIndex = AUTONOMY_INDEX.get(cell.autonomy_ceiling);
  if (requestedIndex > ceilingIndex) fail('AION_AGENT_CAPABILITY_DENIED', 'requested autonomy exceeds Capability Cell ceiling');
  assertCapabilities(cell, passport);
  assertPolicy(passport);
  assertApprovals(passport);

  if (requestedIndex >= 4 && (passport.simulation_refs.length === 0 || passport.rollback_ref === null || passport.recovery_checkpoint_ref === null)) {
    fail('AION_AGENT_RECOVERY_REQUIRED', 'L4/L5 authorization requires Twin, rollback, and recovery proof');
  }
  if (requestedIndex === 5 && (passport.preapproved !== true || passport.reversible !== true)) {
    fail('AION_AGENT_PREAPPROVAL_REQUIRED', 'L5 authorization requires explicit preapproval and reversibility');
  }

  return seal({
    schema_version: 'TIGER-AION-AUTHORIZATION-DECISION-1',
    decision: 'AUTHORIZED',
    passport_id: passport.passport_id,
    capability_cell_id: cell.cell_id,
    autonomy_level: passport.requested_autonomy_level,
    exact_source_sha: passport.exact_source_sha,
    authorized_capabilities: passport.requested_capabilities,
    behavior_state: 'ACTIVE',
    decided_at_ms: nowMs,
    production_mutation_authorized: false,
    unrestricted_production_mutation: false,
  });
}

function validateFactors(factors) {
  if (!isPlainObject(factors)) fail('AION_AGENT_INVALID', 'adaptive autonomy factors must be a plain object');
  for (const field of ['evidence_fresh', 'reversible', 'sensitive_data', 'legal_impact', 'financial_impact', 'novelty']) {
    if (typeof factors[field] !== 'boolean') fail('AION_AGENT_INVALID', `${field} must be boolean`);
  }
  if (!Number.isInteger(factors.prior_verified_successes) || factors.prior_verified_successes < 0 || factors.prior_verified_successes > 1_000_000) {
    fail('AION_AGENT_INVALID', 'prior_verified_successes is outside bounds');
  }
  if (typeof factors.uncertainty !== 'number' || !Number.isFinite(factors.uncertainty) || factors.uncertainty < 0 || factors.uncertainty > 1) {
    fail('AION_AGENT_INVALID', 'uncertainty must be between 0 and 1');
  }
  if (!BLAST_RADIUS_VALUES.has(factors.blast_radius)) fail('AION_AGENT_INVALID', 'adaptive blast_radius is invalid');
}

export function recommendAutonomyLevel({ cell, factors }) {
  ensureCapabilityCell(cell);
  validateFactors(factors);

  let score = 2;
  if (factors.evidence_fresh) score += 1;
  else score -= 2;
  if (factors.reversible) score += 1;
  else score -= 1;
  if (factors.prior_verified_successes >= 5) score += 1;
  if (factors.blast_radius === 'SHADOW_ONLY' || factors.blast_radius === 'OBSERVATION_ONLY') score += 1;
  if (factors.blast_radius === 'MULTI_COHORT') score -= 1;
  if (factors.sensitive_data) score -= 1;
  if (factors.legal_impact) score -= 1;
  if (factors.financial_impact) score -= 1;
  if (factors.novelty) score -= 1;
  if (factors.uncertainty >= 0.5) score -= 1;
  if (factors.uncertainty >= 0.8) score -= 1;

  const ceilingIndex = AUTONOMY_INDEX.get(cell.autonomy_ceiling);
  const boundedIndex = Math.max(0, Math.min(5, ceilingIndex, score));
  return AUTONOMY_LEVELS[boundedIndex];
}

function requireCounter(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > MAX_BUDGET) fail('AION_AGENT_INVALID', `${field} is outside bounds`);
  return value;
}

export function evaluateAgentBehavior({ cell, actions, tool_calls: toolCalls, loops, cost_units: costUnits, denied_boundary_attempts: deniedAttempts }) {
  ensureCapabilityCell(cell);
  const counters = {
    actions: requireCounter(actions, 'actions'),
    tool_calls: requireCounter(toolCalls, 'tool_calls'),
    loops: requireCounter(loops, 'loops'),
    cost_units: requireCounter(costUnits, 'cost_units'),
    denied_boundary_attempts: requireCounter(deniedAttempts, 'denied_boundary_attempts'),
  };

  let state = 'ACTIVE';
  let reason = 'WITHIN_BUDGET';
  if (counters.denied_boundary_attempts > 0) {
    state = 'REVOKED';
    reason = 'DENIED_BOUNDARY_ATTEMPT';
  } else if (
    counters.actions > cell.budgets.max_actions
    || counters.tool_calls > cell.budgets.max_tool_calls
    || counters.loops > cell.budgets.max_loops
    || counters.cost_units > cell.budgets.max_cost_units
  ) {
    state = 'QUARANTINED';
    reason = 'BUDGET_EXCEEDED';
  }

  return seal({
    schema_version: 'TIGER-AION-AGENT-BEHAVIOR-DECISION-1',
    capability_cell_id: cell.cell_id,
    state,
    reason,
    counters: Object.freeze(counters),
  });
}

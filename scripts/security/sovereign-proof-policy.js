'use strict';

const TIER_ORDER = Object.freeze({ LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 });
const TIERS = Object.freeze(Object.keys(TIER_ORDER));

const ACTION_BASELINE = Object.freeze({
  DISCOVERY_QUERY: 'LOW',
  VIEW_PUBLIC_PROFILE: 'LOW',
  SOCIAL_REACTION: 'LOW',
  GRANT_PERMISSION: 'HIGH',
  REVOKE_PERMISSION: 'HIGH',
  APPROVE_DISCLOSURE: 'HIGH',
  RELEASE_DISCLOSURE: 'HIGH',
  DELEGATE_PERMISSION: 'CRITICAL',
  SECURITY_POLICY_MUTATION: 'CRITICAL',
  FINANCIAL_PLATFORM_CONTROL: 'CRITICAL',
  PAYMENT_CONFIGURATION: 'CRITICAL',
  PRODUCTION_ENABLEMENT: 'CRITICAL',
});

const SIGNAL_TYPES = new Set([
  'SESSION_ACTIVE',
  'RISK_ELEVATED',
  'RISK_CRITICAL',
  'SESSION_REVOKED',
  'ACCOUNT_DISABLED',
  'CREDENTIAL_CHANGED',
  'DEVICE_BINDING_LOST',
  'UNKNOWN',
]);

const SIGNAL_KEYS = new Set(['type', 'source', 'evidence_ref']);
const INPUT_KEYS = new Set(['action', 'risk_signals']);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const AUTHORITYISH_SIGNAL_KEYS = new Set([
  'capabilities',
  'grants',
  'scope',
  'expanded_scope',
  'authorization',
  'execution_authority',
  'permission',
  'permissions',
  'requested_tier',
]);

const PROOF_CLASSES = Object.freeze({
  LOW: Object.freeze([]),
  MEDIUM: Object.freeze([
    'EXECUTION_LEASE',
    'PERSISTENT_GRANT',
    'PRIVILEGED_BFF',
  ]),
  HIGH: Object.freeze([
    'EXECUTION_LEASE',
    'FRESH_REVERIFICATION',
    'PERSISTENT_GRANT',
    'PRIVILEGED_BFF',
    'SECURITY_ISLAND',
  ]),
  CRITICAL: Object.freeze([
    'EXECUTION_LEASE',
    'FRESH_REVERIFICATION',
    'OWNER_OR_POLICY_APPROVAL',
    'PERSISTENT_GRANT',
    'PRIVILEGED_BFF',
    'RELEASE_PROOF',
    'SECURITY_ISLAND',
    'SESSION_REVOCATION_PROOF',
  ]),
});

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertSafeKeys(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) fail('RISK_SIGNAL_UNSAFE_PROTOTYPE_KEY_FORBIDDEN');
    assertSafeKeys(value[key]);
  }
}

function boundedToken(value, name, max = 128) {
  if (typeof value !== 'string') fail(name + '_INVALID');
  const normalized = value.trim();
  if (!normalized || normalized.length > max || !/^[A-Za-z0-9._:/-]+$/.test(normalized)) {
    fail(name + '_INVALID');
  }
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function resolveBaselineRisk(action) {
  const normalized = boundedToken(action, 'RISK_ACTION', 128);
  const tier = ACTION_BASELINE[normalized];
  if (!tier) fail('RISK_ACTION_UNCLASSIFIED_DENY:' + normalized);
  return tier;
}

function validateInput(input) {
  if (!isPlainObject(input)) fail('RISK_POLICY_INPUT_INVALID');
  assertSafeKeys(input);
  for (const key of Object.keys(input)) {
    if (!INPUT_KEYS.has(key)) {
      if (/risk|tier/i.test(key)) fail('CLIENT_RISK_FIELD_FORBIDDEN:' + key);
      fail('CLIENT_POLICY_FIELD_FORBIDDEN:' + key);
    }
  }
}

function validateSignal(signal) {
  if (!isPlainObject(signal)) fail('RISK_SIGNAL_INVALID');
  assertSafeKeys(signal);
  for (const key of Object.keys(signal)) {
    if (!SIGNAL_KEYS.has(key)) {
      if (AUTHORITYISH_SIGNAL_KEYS.has(key)) fail('RISK_SIGNAL_AUTHORITY_FIELD_FORBIDDEN:' + key);
      fail('RISK_SIGNAL_FIELD_FORBIDDEN:' + key);
    }
  }

  const normalized = Object.freeze({
    type: boundedToken(signal.type, 'RISK_SIGNAL_TYPE', 64).toUpperCase(),
    source: boundedToken(signal.source, 'RISK_SIGNAL_SOURCE', 128),
    evidence_ref: boundedToken(signal.evidence_ref, 'RISK_SIGNAL_EVIDENCE_REF', 256),
  });

  if (!SIGNAL_TYPES.has(normalized.type)) fail('RISK_SIGNAL_UNSUPPORTED:' + normalized.type);
  return normalized;
}

function higherTier(current, candidate) {
  return TIER_ORDER[candidate] > TIER_ORDER[current] ? candidate : current;
}

function applyRiskRatchet(input) {
  validateInput(input);
  const baseline = resolveBaselineRisk(input.action);
  const signals = input.risk_signals === undefined ? [] : input.risk_signals;
  if (!Array.isArray(signals) || signals.length > 32) fail('RISK_SIGNALS_BOUNDED_ARRAY_REQUIRED');

  let effective = baseline;
  let denied = false;
  const reasons = [];

  for (const raw of signals) {
    const signal = validateSignal(raw);
    switch (signal.type) {
      case 'SESSION_ACTIVE':
      case 'UNKNOWN':
        break;
      case 'RISK_ELEVATED':
        if (effective === 'LOW') effective = 'MEDIUM';
        else if (effective === 'MEDIUM') effective = 'HIGH';
        else if (effective === 'HIGH') effective = 'CRITICAL';
        reasons.push(signal.type);
        break;
      case 'RISK_CRITICAL':
        effective = higherTier(effective, 'CRITICAL');
        reasons.push(signal.type);
        break;
      case 'SESSION_REVOKED':
      case 'ACCOUNT_DISABLED':
        denied = true;
        reasons.push(signal.type);
        break;
      case 'CREDENTIAL_CHANGED':
      case 'DEVICE_BINDING_LOST':
        effective = higherTier(effective, 'CRITICAL');
        reasons.push(signal.type);
        break;
      default:
        fail('RISK_SIGNAL_UNSUPPORTED:' + signal.type);
    }
  }

  if (TIER_ORDER[effective] < TIER_ORDER[baseline]) fail('RISK_RATCHET_LOWERING_FORBIDDEN');

  return deepFreeze({
    baseline_tier: baseline,
    effective_tier: effective,
    denied,
    reason_codes: Object.freeze([...new Set(reasons)].sort()),
  });
}

function resolveRequiredProofClasses(input) {
  const decision = applyRiskRatchet(input);
  if (decision.denied) {
    fail('RISK_DECISION_DENIED:' + decision.reason_codes.join(','));
  }
  const proofs = PROOF_CLASSES[decision.effective_tier];
  if (!proofs) fail('RISK_PROOF_POLICY_UNAVAILABLE');
  return Object.freeze([...proofs]);
}

module.exports = Object.freeze({
  resolveBaselineRisk,
  applyRiskRatchet,
  resolveRequiredProofClasses,
  TIER_ORDER,
});

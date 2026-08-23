'use strict';

const {
  applyRiskRatchet,
  resolveRequiredProofClasses,
} = require('./sovereign-proof-policy.js');

const KNOWN_EVENT_TYPES = new Set([
  'SESSION_ACTIVE',
  'SESSION_REVOKED',
  'ACCOUNT_DISABLED',
  'RISK_ELEVATED',
  'RISK_CRITICAL',
  'CREDENTIAL_CHANGED',
  'DEVICE_BINDING_LOST',
]);

const DESCRIPTOR_KEYS = new Set(['source', 'evidence_ref']);
const INPUT_KEYS = new Set(['action', 'event_evidence']);
const MAX_EVENTS = 32;

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

function boundedToken(value, name, max = 128) {
  if (typeof value !== 'string') fail(name + '_INVALID');
  const normalized = value.trim();
  if (!normalized || normalized.length > max || !/^[A-Za-z0-9._:/-]+$/.test(normalized)) {
    fail(name + '_INVALID');
  }
  return normalized;
}

function validateDescriptor(raw) {
  if (!isPlainObject(raw)) fail('CONTINUOUS_TRUST_EVENT_DESCRIPTOR_INVALID');

  for (const key of Object.keys(raw)) {
    if (!DESCRIPTOR_KEYS.has(key)) {
      if (/authorization|token|secret|password|credential/i.test(key)) {
        fail('CONTINUOUS_TRUST_CREDENTIAL_FIELD_FORBIDDEN:' + key);
      }
      if (/behavior|risk|tier/i.test(key)) {
        fail('CONTINUOUS_TRUST_BEHAVIOR_OR_RISK_FIELD_FORBIDDEN:' + key);
      }
      fail('CONTINUOUS_TRUST_AUTHORITY_FIELD_FORBIDDEN:' + key);
    }
  }

  return Object.freeze({
    source: boundedToken(raw.source, 'CONTINUOUS_TRUST_SOURCE', 128),
    evidence_ref: boundedToken(raw.evidence_ref, 'CONTINUOUS_TRUST_EVIDENCE_REF', 256),
  });
}

function unknownEvent(source, evidenceRef) {
  return Object.freeze({
    type: 'UNKNOWN',
    source,
    evidence_ref: evidenceRef,
  });
}

function normalizeVerifiedEvent(descriptor, verified) {
  if (!isPlainObject(verified) || verified.ok !== true) {
    return unknownEvent(descriptor.source, descriptor.evidence_ref);
  }

  if (verified.source !== descriptor.source || verified.evidence_ref !== descriptor.evidence_ref) {
    return unknownEvent(descriptor.source, descriptor.evidence_ref);
  }

  if (typeof verified.type !== 'string') {
    return unknownEvent(descriptor.source, descriptor.evidence_ref);
  }

  const type = verified.type.trim().toUpperCase();
  if (!KNOWN_EVENT_TYPES.has(type)) {
    return unknownEvent(descriptor.source, descriptor.evidence_ref);
  }

  return Object.freeze({
    type,
    source: descriptor.source,
    evidence_ref: descriptor.evidence_ref,
  });
}

function validateEvaluationInput(raw) {
  if (!isPlainObject(raw)) fail('CONTINUOUS_TRUST_INPUT_INVALID');
  for (const key of Object.keys(raw)) {
    if (!INPUT_KEYS.has(key)) fail('CONTINUOUS_TRUST_INPUT_FIELD_FORBIDDEN:' + key);
  }

  const action = boundedToken(raw.action, 'CONTINUOUS_TRUST_ACTION', 128);
  const evidence = raw.event_evidence === undefined ? [] : raw.event_evidence;
  if (!Array.isArray(evidence) || evidence.length > MAX_EVENTS) {
    fail('CONTINUOUS_TRUST_EVENT_EVIDENCE_BOUNDED_ARRAY_REQUIRED');
  }

  return Object.freeze({ action, event_evidence: evidence });
}

function createContinuousTrustAdapter({ verifyEventEvidence } = {}) {
  if (typeof verifyEventEvidence !== 'function') {
    throw new TypeError('continuous trust evidence verification port is required');
  }

  return Object.freeze({
    async evaluate(rawInput) {
      const input = validateEvaluationInput(rawInput);
      const descriptors = input.event_evidence.map(validateDescriptor);
      const normalizedEvents = [];

      if (descriptors.length === 0) {
        normalizedEvents.push(unknownEvent('continuous-trust', 'signal-source:none'));
      } else {
        for (const descriptor of descriptors) {
          let verified;
          try {
            verified = await verifyEventEvidence(Object.freeze({
              source: descriptor.source,
              evidence_ref: descriptor.evidence_ref,
            }));
          } catch {
            verified = null;
          }
          normalizedEvents.push(normalizeVerifiedEvent(descriptor, verified));
        }
      }

      const riskInput = Object.freeze({
        action: input.action,
        risk_signals: normalizedEvents,
      });
      const decision = applyRiskRatchet(riskInput);
      const requiredProofClasses = decision.denied
        ? Object.freeze([])
        : resolveRequiredProofClasses(riskInput);

      return Object.freeze({
        ok: !decision.denied,
        denied: decision.denied,
        baseline_tier: decision.baseline_tier,
        effective_tier: decision.effective_tier,
        reason_codes: decision.reason_codes,
        required_proof_classes: requiredProofClasses,
        normalized_events: Object.freeze(normalizedEvents),
        execution_authority: false,
      });
    },
  });
}

module.exports = Object.freeze({
  createContinuousTrustAdapter,
});

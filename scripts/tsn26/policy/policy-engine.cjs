'use strict';

const { createHash } = require('node:crypto');
const { canonicalJson } = require('../financial/constitution-compiler.cjs');

const DECISION_VERSION = 'TIGER_POLICY_DECISION_V1';

function digest(value) {
  return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('decision policy is required');
  if (policy.reference !== 'TSN-26') throw new Error('decision policy reference must be TSN-26');
  if (policy.fail_closed !== true) throw new Error('decision policy must fail closed');
  if (!policy.actions || typeof policy.actions !== 'object' || Array.isArray(policy.actions)) throw new Error('decision policy actions are required');
  if (!Number.isInteger(policy.decision_ttl_seconds) || policy.decision_ttl_seconds <= 0) throw new Error('decision ttl must be a positive integer');
  return policy;
}

function normalizeSubject(subject) {
  if (!subject || typeof subject !== 'object' || Array.isArray(subject)) return null;
  if (typeof subject.id !== 'string' || subject.id.trim() === '') return null;
  if (typeof subject.type !== 'string' || subject.type.trim() === '') return null;
  if (!Array.isArray(subject.capabilities)) return null;
  if (subject.capabilities.some((value) => typeof value !== 'string' || value.trim() === '')) return null;
  return {
    id: subject.id.trim(),
    type: subject.type.trim(),
    capabilities: [...new Set(subject.capabilities.map((value) => value.trim()))].sort(),
  };
}

function normalizeResource(resource) {
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) return { type: 'UNKNOWN', id: 'UNKNOWN' };
  return {
    type: typeof resource.type === 'string' && resource.type.trim() ? resource.type.trim() : 'UNKNOWN',
    id: typeof resource.id === 'string' && resource.id.trim() ? resource.id.trim() : 'UNKNOWN',
  };
}

function normalizeEvidence(evidenceRefs) {
  if (!Array.isArray(evidenceRefs)) return [];
  return [...new Set(evidenceRefs.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))].sort();
}

function evaluatePolicy(input, rawPolicy) {
  const policy = validatePolicy(rawPolicy);
  const now = input?.now instanceof Date ? input.now : new Date(input?.now || Date.now());
  if (!Number.isFinite(now.getTime())) throw new Error('trusted evaluation time is required');

  const subject = normalizeSubject(input?.subject);
  const action = typeof input?.action === 'string' ? input.action.trim() : '';
  const resource = normalizeResource(input?.resource);
  const context = input?.context && typeof input.context === 'object' && !Array.isArray(input.context) ? input.context : {};
  const evidenceRefs = normalizeEvidence(input?.evidenceRefs);
  const actionPolicy = policy.actions[action];
  const reasons = [];

  if (!subject) reasons.push('SUBJECT_INVALID');
  if (!actionPolicy) reasons.push('UNKNOWN_ACTION');

  if (subject && (policy.globally_forbidden_subject_types || []).includes(subject.type)) {
    reasons.push('SUBJECT_TYPE_FORBIDDEN');
  }

  if (subject && actionPolicy) {
    if (!(actionPolicy.allowed_subject_types || []).includes(subject.type)) reasons.push('SUBJECT_TYPE_NOT_ALLOWED');
    for (const capability of actionPolicy.required_capabilities || []) {
      if (!subject.capabilities.includes(capability)) reasons.push(`CAPABILITY_REQUIRED:${capability}`);
    }
    for (const key of actionPolicy.required_context_true || []) {
      if (context[key] !== true) reasons.push(`CONTEXT_REQUIRED:${key}`);
    }
  }

  if (policy.require_evidence_for_allow === true && evidenceRefs.length === 0) reasons.push('EVIDENCE_REQUIRED');

  const decision = reasons.length === 0 ? 'ALLOW' : 'DENY';
  const evaluatedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + policy.decision_ttl_seconds * 1000).toISOString();

  return freezeDeep({
    decision_version: DECISION_VERSION,
    policy_id: policy.policy_id,
    policy_schema_version: policy.schema_version,
    reference: policy.reference,
    subject_id: subject?.id || null,
    subject_type: subject?.type || null,
    action: action || null,
    resource,
    context_digest: digest(context),
    decision,
    reasons: [...reasons].sort(),
    obligations: decision === 'ALLOW' ? [...(actionPolicy.obligations || [])] : [],
    evidence_refs: evidenceRefs,
    evaluated_at: evaluatedAt,
    expires_at: expiresAt,
  });
}

module.exports = Object.freeze({
  DECISION_VERSION,
  evaluatePolicy,
  validatePolicy,
});

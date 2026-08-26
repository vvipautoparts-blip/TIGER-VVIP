'use strict';

const { createHash } = require('node:crypto');
const { canonicalJson } = require('../financial/constitution-compiler.cjs');

const DECISION_VERSION = 'TIGER_AI_ACTION_DECISION_V1';

function sha256(value) {
  return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('AI action policy is required');
  if (policy.reference !== 'TSN-26' || policy.fail_closed !== true) throw new Error('AI action policy must be TSN-26 fail-closed');
  if (policy.money_authority_for_ai !== false || policy.root_authority_for_ai !== false) throw new Error('AI money/root authority must remain disabled');
  if (!policy.action_classes || typeof policy.action_classes !== 'object') throw new Error('AI action classes are required');
  return policy;
}

function normalizeAgent(agent) {
  if (!agent || typeof agent !== 'object' || Array.isArray(agent)) return null;
  if (typeof agent.id !== 'string' || agent.id.trim() === '') return null;
  if (!Array.isArray(agent.capabilities)) return null;
  return {
    id: agent.id.trim(),
    capabilities: [...new Set(agent.capabilities.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))].sort(),
  };
}

function containsCredentialMaterial(value, forbiddenKeys) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => containsCredentialMaterial(item, forbiddenKeys));
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key.toLowerCase())) return true;
    if (containsCredentialMaterial(child, forbiddenKeys)) return true;
  }
  return false;
}

function validateIntent(capsule, { action, resourceRef, now, policy, verifyIntent }) {
  const reasons = [];
  if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule)) return { reasons: ['INTENT_REQUIRED'], digest: null };

  const forbiddenKeys = new Set((policy.forbidden_credential_keys || []).map((key) => String(key).toLowerCase()));
  if (containsCredentialMaterial(capsule, forbiddenKeys)) reasons.push('CREDENTIAL_MATERIAL_FORBIDDEN');

  const requiredStrings = ['intent_id', 'subject_ref', 'issued_at', 'expires_at', 'verification_ref'];
  for (const field of requiredStrings) {
    if (typeof capsule[field] !== 'string' || capsule[field].trim() === '') reasons.push(`INTENT_FIELD_REQUIRED:${field}`);
  }
  if (!Array.isArray(capsule.allowed_actions)) reasons.push('INTENT_FIELD_REQUIRED:allowed_actions');
  if (!Array.isArray(capsule.allowed_resources)) reasons.push('INTENT_FIELD_REQUIRED:allowed_resources');

  const issuedAt = new Date(capsule.issued_at);
  const expiresAt = new Date(capsule.expires_at);
  if (!Number.isFinite(issuedAt.getTime()) || !Number.isFinite(expiresAt.getTime())) {
    reasons.push('INTENT_TIME_INVALID');
  } else {
    if (issuedAt > now || expiresAt <= now) reasons.push('INTENT_EXPIRED_OR_NOT_YET_VALID');
    if (expiresAt <= issuedAt) reasons.push('INTENT_TIME_INVALID');
    if (expiresAt.getTime() - issuedAt.getTime() > policy.max_intent_ttl_seconds * 1000) reasons.push('INTENT_TTL_EXCEEDED');
  }

  if (Array.isArray(capsule.allowed_actions) && !capsule.allowed_actions.includes(action)) reasons.push('INTENT_ACTION_SCOPE_DENIED');
  if (Array.isArray(capsule.allowed_resources) && !capsule.allowed_resources.includes(resourceRef)) reasons.push('INTENT_RESOURCE_SCOPE_DENIED');

  if (typeof verifyIntent !== 'function') reasons.push('TRUSTED_INTENT_VERIFIER_REQUIRED');
  else if (!verifyIntent(capsule)) reasons.push('INTENT_VERIFICATION_FAILED');

  return {
    reasons,
    digest: reasons.includes('CREDENTIAL_MATERIAL_FORBIDDEN') ? null : sha256(capsule),
  };
}

function authorizeAgentAction(input, { policy: rawPolicy, verifyIntent } = {}) {
  const policy = validatePolicy(rawPolicy);
  const now = input?.now instanceof Date ? input.now : new Date(input?.now || Date.now());
  if (!Number.isFinite(now.getTime())) throw new Error('trusted current time is required');

  const agent = normalizeAgent(input?.agent);
  const actionClass = typeof input?.action_class === 'string' ? input.action_class.trim() : '';
  const action = typeof input?.action === 'string' ? input.action.trim() : '';
  const resourceRef = typeof input?.resource_ref === 'string' ? input.resource_ref.trim() : '';
  const evidenceRefs = Array.isArray(input?.evidence_refs)
    ? [...new Set(input.evidence_refs.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))].sort()
    : [];
  const classPolicy = policy.action_classes[actionClass];
  const reasons = [];
  let intentDigest = null;

  if (!agent) reasons.push('AGENT_INVALID');
  if (!classPolicy) reasons.push('UNKNOWN_ACTION_CLASS');
  if (!action) reasons.push('ACTION_REQUIRED');
  if (!resourceRef) reasons.push('RESOURCE_REQUIRED');
  if (policy.require_evidence_for_allow === true && evidenceRefs.length === 0) reasons.push('EVIDENCE_REQUIRED');

  if (classPolicy) {
    if (classPolicy.always_deny === true) {
      reasons.push(classPolicy.deny_reason || 'ACTION_CLASS_FORBIDDEN');
    } else {
      if (agent && !agent.capabilities.includes(classPolicy.required_capability)) reasons.push(`CAPABILITY_REQUIRED:${classPolicy.required_capability}`);
      if (!(classPolicy.allowed_actions || []).includes(action)) reasons.push('ACTION_NOT_ALLOWED');
      if (classPolicy.intent_required === true) {
        const intent = validateIntent(input.intent_capsule, { action, resourceRef, now, policy, verifyIntent });
        reasons.push(...intent.reasons);
        intentDigest = intent.digest;
      }
    }
  }

  const decision = reasons.length === 0 ? 'ALLOW' : 'DENY';
  return freezeDeep({
    decision_version: DECISION_VERSION,
    policy_id: policy.policy_id,
    reference: policy.reference,
    agent_id: agent?.id || null,
    action_class: actionClass || null,
    action: action || null,
    resource_ref: resourceRef || null,
    decision,
    reasons: [...new Set(reasons)].sort(),
    execution_authority: decision === 'ALLOW' ? classPolicy.execution_authority : 'NONE',
    money_authority: false,
    root_authority: false,
    intent_digest: intentDigest,
    evidence_refs: evidenceRefs,
    evaluated_at: now.toISOString(),
  });
}

module.exports = Object.freeze({
  DECISION_VERSION,
  authorizeAgentAction,
  validatePolicy,
});

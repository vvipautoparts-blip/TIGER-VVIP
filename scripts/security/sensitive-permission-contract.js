'use strict';

const SENSITIVE_CAPABILITIES = Object.freeze([
  'VIEW_FINANCIAL_EARNINGS',
  'GRANT_PERMISSION',
  'DELEGATE_PERMISSION',
  'MANAGE_PAYMENT_DATA_HOLDER',
  'CONFIGURE_PAYMENT',
  'TEST_PAYMENT_CONNECTION',
  'APPROVE_PAYMENT_DATA_STAGING',
  'APPROVE_PAYMENT_DATA_PRODUCTION',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const ROLE_BUNDLES = deepFreeze({
  authority: 'DISPLAY_ONLY_NOT_AUTHORIZATION',
  owner: {
    label: 'owner',
    capabilities: [...SENSITIVE_CAPABILITIES],
  },
  partner: {
    label: 'partner',
    capabilities: [],
  },
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requirePlainObject(value, field) {
  if (!isPlainObject(value)) throw new TypeError(`${field} must be an object`);
  return value;
}

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function requireStringArray(value, field, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new TypeError(`${field} must be ${allowEmpty ? 'an' : 'a non-empty'} array`);
  }
  for (const item of value) {
    requireNonEmptyString(item, field);
    if (item === '*') throw new TypeError(`${field} wildcard scope is not bounded`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireNonEmptyString(value, field);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new TypeError(`${field} must be a valid timestamp`);
  return timestamp;
}

function validateResourceScope(value, field, { allowEmptyIds = false } = {}) {
  const scope = requirePlainObject(value, field);
  requireNonEmptyString(scope.kind, `${field}.kind`);
  if (scope.kind === '*' || scope.kind === 'platform') {
    throw new TypeError(`${field} must be bounded and cannot use platform/wildcard scope`);
  }
  requireStringArray(scope.ids, `${field}.ids`, { allowEmpty: allowEmptyIds });
  return scope;
}

function validateCapability(action, field = 'action') {
  requireNonEmptyString(action, field);
  if (!SENSITIVE_CAPABILITIES.includes(action)) {
    throw new TypeError(`${field} is not a supported sensitive capability`);
  }
  return action;
}

function cloneResourceScope(scope) {
  return {
    kind: scope.kind,
    ids: [...scope.ids],
  };
}

function cloneCeiling(ceiling) {
  return {
    actions: [...ceiling.actions],
    sector_scope: [...ceiling.sector_scope],
    entity_scope: [...ceiling.entity_scope],
    geo_policy_scope: [...ceiling.geo_policy_scope],
    resource_scope: cloneResourceScope(ceiling.resource_scope),
    expires_at: ceiling.expires_at,
  };
}

function validateDelegabilityCeiling(value) {
  const ceiling = requirePlainObject(value, 'delegability_ceiling');
  requireStringArray(ceiling.actions, 'delegability_ceiling.actions', { allowEmpty: true });
  for (const action of ceiling.actions) validateCapability(action, 'delegability_ceiling.actions');
  requireStringArray(ceiling.sector_scope, 'delegability_ceiling.sector_scope', { allowEmpty: true });
  requireStringArray(ceiling.entity_scope, 'delegability_ceiling.entity_scope', { allowEmpty: true });
  requireStringArray(ceiling.geo_policy_scope, 'delegability_ceiling.geo_policy_scope', { allowEmpty: true });
  validateResourceScope(ceiling.resource_scope, 'delegability_ceiling.resource_scope', { allowEmptyIds: true });
  parseTimestamp(ceiling.expires_at, 'delegability_ceiling.expires_at');
  return ceiling;
}

function createSensitiveGrant(input) {
  requirePlainObject(input, 'grant');

  const requiredStrings = [
    'principal',
    'action',
    'purpose',
    'reason',
    'grantor',
    'policy_version',
    'issued_at',
    'not_before',
    'expires_at',
    'audit_evidence_ref',
  ];
  for (const field of requiredStrings) requireNonEmptyString(input[field], field);

  validateCapability(input.action);
  validateResourceScope(input.resource_scope, 'resource_scope');
  requireStringArray(input.sector_scope, 'sector_scope');
  requireStringArray(input.entity_scope, 'entity_scope');
  requireStringArray(input.geo_policy_scope, 'geo_policy_scope');
  const ceiling = validateDelegabilityCeiling(input.delegability_ceiling);

  const issuedAt = parseTimestamp(input.issued_at, 'issued_at');
  const notBefore = parseTimestamp(input.not_before, 'not_before');
  const expiresAt = parseTimestamp(input.expires_at, 'expires_at');
  const ceilingExpiry = parseTimestamp(ceiling.expires_at, 'delegability_ceiling.expires_at');
  if (notBefore < issuedAt) throw new TypeError('not_before cannot precede issued_at');
  if (expiresAt <= notBefore) throw new TypeError('expires_at must be later than not_before');
  if (ceilingExpiry > expiresAt
    || !isSubset(ceiling.sector_scope, input.sector_scope)
    || !isSubset(ceiling.entity_scope, input.entity_scope)
    || !isSubset(ceiling.geo_policy_scope, input.geo_policy_scope)
    || !isResourceSubset(ceiling.resource_scope, input.resource_scope)) {
    throw new TypeError('delegability_ceiling cannot exceed the grant authority scope or expiry');
  }

  const status = input.status === undefined ? 'ACTIVE' : input.status;
  if (status !== 'ACTIVE' && status !== 'REVOKED') {
    throw new TypeError('status must be ACTIVE or REVOKED');
  }

  let revokedAt = null;
  if (input.revoked_at !== undefined && input.revoked_at !== null) {
    parseTimestamp(input.revoked_at, 'revoked_at');
    revokedAt = input.revoked_at;
  }
  if (status === 'REVOKED' && revokedAt === null) {
    throw new TypeError('revoked_at is required for revoked grants');
  }

  const grant = {
    principal: input.principal,
    action: input.action,
    resource_scope: cloneResourceScope(input.resource_scope),
    sector_scope: [...input.sector_scope],
    entity_scope: [...input.entity_scope],
    geo_policy_scope: [...input.geo_policy_scope],
    purpose: input.purpose,
    reason: input.reason,
    grantor: input.grantor,
    policy_version: input.policy_version,
    issued_at: input.issued_at,
    not_before: input.not_before,
    expires_at: input.expires_at,
    delegability_ceiling: cloneCeiling(ceiling),
    audit_evidence_ref: input.audit_evidence_ref,
    status,
    revoked_at: revokedAt,
  };

  return deepFreeze(grant);
}

function safeTimestamp(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isGrantActive(grant, now) {
  if (!isPlainObject(grant) || !SENSITIVE_CAPABILITIES.includes(grant.action)) return false;
  if (grant.status !== 'ACTIVE' || grant.revoked_at !== null) return false;

  const current = safeTimestamp(now);
  const notBefore = safeTimestamp(grant.not_before);
  const expiresAt = safeTimestamp(grant.expires_at);
  if (current === null || notBefore === null || expiresAt === null) return false;

  return current >= notBefore && current < expiresAt;
}

function isSensitiveCapabilityGranted(grants, action, now) {
  if (!Array.isArray(grants) || !SENSITIVE_CAPABILITIES.includes(action)) return false;
  return grants.some((grant) => grant.action === action && isGrantActive(grant, now));
}

function isSubset(requested, ceiling) {
  if (!Array.isArray(requested) || !Array.isArray(ceiling)) return false;
  const allowed = new Set(ceiling);
  return requested.every((item) => allowed.has(item));
}

function isResourceSubset(requested, ceiling) {
  if (!isPlainObject(requested) || !isPlainObject(ceiling)) return false;
  if (requested.kind !== ceiling.kind) return false;
  return isSubset(requested.ids, ceiling.ids);
}

function ceilingIsWithin(requestedCeiling, parentCeiling) {
  if (!isPlainObject(requestedCeiling) || !isPlainObject(parentCeiling)) return false;
  if (!isSubset(requestedCeiling.actions, parentCeiling.actions)) return false;
  if (!isSubset(requestedCeiling.sector_scope, parentCeiling.sector_scope)) return false;
  if (!isSubset(requestedCeiling.entity_scope, parentCeiling.entity_scope)) return false;
  if (!isSubset(requestedCeiling.geo_policy_scope, parentCeiling.geo_policy_scope)) return false;
  if (!isResourceSubset(requestedCeiling.resource_scope, parentCeiling.resource_scope)) return false;

  const requestedExpiry = safeTimestamp(requestedCeiling.expires_at);
  const parentExpiry = safeTimestamp(parentCeiling.expires_at);
  return requestedExpiry !== null && parentExpiry !== null && requestedExpiry <= parentExpiry;
}

function canDelegate(grantorGrant, requestedGrant, now) {
  if (!isGrantActive(grantorGrant, now) || !isGrantActive(requestedGrant, now)) return false;
  if (grantorGrant.action !== 'DELEGATE_PERMISSION') return false;
  if (requestedGrant.principal === 'owner:root') return false;
  if (requestedGrant.grantor !== grantorGrant.principal) return false;

  if (!isSubset(requestedGrant.sector_scope, grantorGrant.sector_scope)) return false;
  if (!isSubset(requestedGrant.entity_scope, grantorGrant.entity_scope)) return false;
  if (!isSubset(requestedGrant.geo_policy_scope, grantorGrant.geo_policy_scope)) return false;
  if (!isResourceSubset(requestedGrant.resource_scope, grantorGrant.resource_scope)) return false;

  const ceiling = grantorGrant.delegability_ceiling;
  if (!isPlainObject(ceiling)) return false;
  if (!isSubset([requestedGrant.action], ceiling.actions)) return false;
  if (!isSubset(requestedGrant.sector_scope, ceiling.sector_scope)) return false;
  if (!isSubset(requestedGrant.entity_scope, ceiling.entity_scope)) return false;
  if (!isSubset(requestedGrant.geo_policy_scope, ceiling.geo_policy_scope)) return false;
  if (!isResourceSubset(requestedGrant.resource_scope, ceiling.resource_scope)) return false;

  const requestedExpiry = safeTimestamp(requestedGrant.expires_at);
  const grantorExpiry = safeTimestamp(grantorGrant.expires_at);
  const ceilingExpiry = safeTimestamp(ceiling.expires_at);
  if (requestedExpiry === null || grantorExpiry === null || ceilingExpiry === null) return false;
  if (requestedExpiry > grantorExpiry || requestedExpiry > ceilingExpiry) return false;

  const requestedNotBefore = safeTimestamp(requestedGrant.not_before);
  const grantorNotBefore = safeTimestamp(grantorGrant.not_before);
  if (requestedNotBefore === null || grantorNotBefore === null || requestedNotBefore < grantorNotBefore) return false;

  if (!ceilingIsWithin(requestedGrant.delegability_ceiling, ceiling)) return false;

  return true;
}

module.exports = {
  SENSITIVE_CAPABILITIES,
  ROLE_BUNDLES,
  createSensitiveGrant,
  isGrantActive,
  isSensitiveCapabilityGranted,
  canDelegate,
};

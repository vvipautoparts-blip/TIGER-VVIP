'use strict';

const ALLOWED_INPUT_KEYS = new Set([
  'authenticated_principal',
  'action',
  'requested_scope',
  'policy_version',
  'authority_version',
]);

const SAFE_DENIAL_CODES = new Set([
  'PERSISTENT_GRANT_INACTIVE',
  'PERSISTENT_GRANT_REVOKED',
  'PERSISTENT_GRANT_EXPIRED',
  'PERSISTENT_GRANT_SCOPE_DENIED',
  'PERSISTENT_GRANT_POLICY_MISMATCH',
  'PERSISTENT_GRANT_AUTHORITY_VERSION_MISMATCH',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireBoundedString(value, field, maxLength = 256) {
  if (typeof value !== 'string') throw new TypeError(`${field} must be a bounded non-empty string`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new TypeError(`${field} must be a bounded non-empty string`);
  }
  return normalized;
}

function requireBoundedScopeArray(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 256) {
    throw new TypeError(`${field} must be a non-empty bounded array`);
  }

  const normalized = [];
  const seen = new Set();
  for (const item of value) {
    const token = requireBoundedString(item, field, 256);
    if (token === '*') throw new TypeError(`${field} wildcard scope is forbidden`);
    if (!seen.has(token)) {
      seen.add(token);
      normalized.push(token);
    }
  }
  return normalized;
}

function normalizeRequestedScope(value) {
  if (!isPlainObject(value)) throw new TypeError('requested_scope must be an object');
  const allowedScopeKeys = new Set([
    'resource_scope',
    'sector_scope',
    'entity_scope',
    'geo_policy_scope',
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedScopeKeys.has(key)) {
      throw new TypeError(`requested_scope field forbidden: ${key}`);
    }
  }

  if (!isPlainObject(value.resource_scope)) {
    throw new TypeError('requested_scope.resource_scope must be an object');
  }
  for (const key of Object.keys(value.resource_scope)) {
    if (key !== 'kind' && key !== 'ids') {
      throw new TypeError(`requested_scope.resource_scope field forbidden: ${key}`);
    }
  }

  const kind = requireBoundedString(value.resource_scope.kind, 'requested_scope.resource_scope.kind', 128);
  if (kind === '*' || kind === 'platform') {
    throw new TypeError('requested_scope.resource_scope must remain bounded');
  }

  return deepFreeze({
    resource_scope: {
      kind,
      ids: requireBoundedScopeArray(value.resource_scope.ids, 'requested_scope.resource_scope.ids'),
    },
    sector_scope: requireBoundedScopeArray(value.sector_scope, 'requested_scope.sector_scope'),
    entity_scope: requireBoundedScopeArray(value.entity_scope, 'requested_scope.entity_scope'),
    geo_policy_scope: requireBoundedScopeArray(value.geo_policy_scope, 'requested_scope.geo_policy_scope'),
  });
}

function normalizeEvaluationInput(input) {
  if (!isPlainObject(input)) throw new TypeError('sovereign proof input must be an object');

  for (const key of Object.keys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) {
      throw new TypeError(`forbidden client proof input field: ${key}`);
    }
  }

  return deepFreeze({
    principal: requireBoundedString(input.authenticated_principal, 'authenticated_principal'),
    action: requireBoundedString(input.action, 'action', 128),
    requested_scope: normalizeRequestedScope(input.requested_scope),
    policy_version: requireBoundedString(input.policy_version, 'policy_version', 128),
    authority_version: requireBoundedString(input.authority_version, 'authority_version', 128),
  });
}

function denied(reasonCode) {
  return deepFreeze({
    ok: false,
    proof_decision: 'DENIED',
    reason_code: reasonCode,
    execution_authority: false,
  });
}

function normalizeAuthorityDenial(response) {
  const code = response && typeof response.reason_code === 'string'
    ? response.reason_code
    : '';
  return denied(SAFE_DENIAL_CODES.has(code) ? code : 'PERSISTENT_GRANT_DENIED');
}

function authorityBindingMatches(response, request) {
  return response.principal === request.principal
    && response.action === request.action
    && response.policy_version === request.policy_version
    && response.authority_version === request.authority_version;
}

function createSovereignProofEvaluator({ resolvePersistentGrantAuthority } = {}) {
  if (typeof resolvePersistentGrantAuthority !== 'function') {
    throw new TypeError('persistent grant authority port is required');
  }

  return deepFreeze({
    async evaluatePreExecutionProofs(rawInput) {
      const request = normalizeEvaluationInput(rawInput);

      // This port is server-only authority. It must resolve persisted grant state
      // against the exact requested scope and current database-time policy state.
      let response;
      try {
        response = await resolvePersistentGrantAuthority(deepFreeze({
          principal: request.principal,
          action: request.action,
          requested_scope: request.requested_scope,
          policy_version: request.policy_version,
          authority_version: request.authority_version,
        }));
      } catch {
        return denied('PERSISTENT_GRANT_AUTHORITY_UNAVAILABLE');
      }

      if (!response || response.ok !== true) {
        return normalizeAuthorityDenial(response);
      }

      if (!authorityBindingMatches(response, request)) {
        return denied('PERSISTENT_GRANT_BINDING_MISMATCH');
      }

      if (response.reason_code !== 'PERSISTENT_GRANT_ACTIVE') {
        return denied('PERSISTENT_GRANT_DENIED');
      }

      let grantRef;
      try {
        grantRef = requireBoundedString(response.grant_ref, 'persistent grant_ref', 256);
      } catch {
        return denied('PERSISTENT_GRANT_DENIED');
      }

      return deepFreeze({
        ok: true,
        proof_decision: 'SATISFIED',
        reason_code: 'PERSISTENT_GRANT_RE_RESOLVED',
        grant_ref: grantRef,
        policy_version: request.policy_version,
        authority_version: request.authority_version,
        execution_authority: false,
      });
    },
  });
}

module.exports = Object.freeze({
  createSovereignProofEvaluator,
});

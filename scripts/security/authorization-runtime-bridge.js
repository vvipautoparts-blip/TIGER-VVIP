'use strict';

const crypto = require('node:crypto');

const MAX_SNAPSHOT_TTL_SECONDS = 60;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

const SURFACE_POLICIES = Object.freeze({
  PROFILE_MORE_MENU: Object.freeze({
    visible: Object.freeze(['VIEW_PERMISSION_STATE']),
    management: Object.freeze(['GRANT_PERMISSION']),
    management_requires: Object.freeze(['VIEW_PERMISSION_STATE']),
  }),
});

const SENSITIVE_ACTION_ISSUE_FAILURE_CODES = new Set([
  'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE',
  'SENSITIVE_PERMISSION_LEASE_SCOPE_DENIED',
  'SENSITIVE_PERMISSION_LEASE_POLICY_MISMATCH',
  'SENSITIVE_PERMISSION_LEASE_DENIED',
]);

const SENSITIVE_ACTION_CONSUME_FAILURE_CODES = new Set([
  'SENSITIVE_PERMISSION_LEASE_NOT_FOUND',
  'SENSITIVE_PERMISSION_LEASE_REPLAY_OR_CONFLICT',
  'SENSITIVE_PERMISSION_LEASE_BINDING_MISMATCH',
  'SENSITIVE_PERMISSION_LEASE_NOT_YET_VALID',
  'SENSITIVE_PERMISSION_LEASE_EXPIRED',
  'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE',
  'SENSITIVE_PERMISSION_LEASE_POLICY_MISMATCH',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function requireDigest(value, field) {
  requireString(value, field);
  if (!DIGEST_PATTERN.test(value)) {
    throw new TypeError(`${field} must be a 64-character lowercase hex digest`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(`${field} must be a valid timestamp`);
  }
  return timestamp;
}

function requireBoundedStringArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${field} must be a non-empty bounded array`);
  }
  for (const item of value) {
    requireString(item, field);
    if (item === '*') throw new TypeError(`${field} wildcard scope is forbidden`);
  }
  return [...new Set(value)];
}

function normalizeResourceScope(value, field) {
  const scope = requireObject(value, field);
  const kind = requireString(scope.kind, `${field}.kind`);
  if (kind === '*' || kind === 'platform') {
    throw new TypeError(`${field} must be bounded and cannot use wildcard/platform scope`);
  }
  return {
    kind,
    ids: requireBoundedStringArray(scope.ids, `${field}.ids`),
  };
}

function normalizeRequestedScope(value) {
  const scope = requireObject(value, 'requested_scope');
  return {
    resource_scope: normalizeResourceScope(scope.resource_scope, 'requested_scope.resource_scope'),
    sector_scope: requireBoundedStringArray(scope.sector_scope, 'requested_scope.sector_scope'),
    entity_scope: requireBoundedStringArray(scope.entity_scope, 'requested_scope.entity_scope'),
    geo_policy_scope: requireBoundedStringArray(scope.geo_policy_scope, 'requested_scope.geo_policy_scope'),
  };
}

function safeTimestamp(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isSubset(requested, allowed) {
  if (!Array.isArray(requested) || !Array.isArray(allowed)) return false;
  const allowedSet = new Set(allowed);
  return requested.every((item) => item !== '*' && allowedSet.has(item));
}

function resourceScopeContains(requested, allowed) {
  if (!requested || !allowed || typeof allowed !== 'object' || Array.isArray(allowed)) return false;
  if (requested.kind !== allowed.kind) return false;
  return isSubset(requested.ids, allowed.ids);
}

function grantCoversScope(grant, requestedScope) {
  return resourceScopeContains(requestedScope.resource_scope, grant.resource_scope)
    && isSubset(requestedScope.sector_scope, grant.sector_scope)
    && isSubset(requestedScope.entity_scope, grant.entity_scope)
    && isSubset(requestedScope.geo_policy_scope, grant.geo_policy_scope);
}

function grantIsActiveForRequest(grant, context) {
  if (!grant || typeof grant !== 'object' || Array.isArray(grant)) return false;
  if (grant.principal !== context.authenticatedPrincipal) return false;
  if (grant.policy_version !== context.policyVersion) return false;
  if (grant.status !== 'ACTIVE') return false;
  if (grant.revoked_at !== null && grant.revoked_at !== undefined) return false;

  const notBefore = safeTimestamp(grant.not_before);
  const expiresAt = safeTimestamp(grant.expires_at);
  if (notBefore === null || expiresAt === null) return false;
  if (context.serverNowMs < notBefore || context.serverNowMs >= expiresAt) return false;

  return grantCoversScope(grant, context.requestedScope);
}

function uniqueInPolicyOrder(policyActions, activeActions) {
  const activeSet = new Set(activeActions);
  return policyActions.filter((action) => activeSet.has(action));
}

function resolveEffectiveCapabilities(input) {
  requireObject(input, 'input');

  const authenticatedPrincipal = requireString(
    input.authenticated_principal,
    'authenticated_principal',
  );
  requireString(input.target_id, 'target_id');
  const surface = requireString(input.surface, 'surface');
  const policyVersion = requireString(input.policy_version, 'policy_version');
  requireString(input.authority_version, 'authority_version');
  const serverNowMs = parseTimestamp(input.server_now, 'server_now');
  const requestedScope = normalizeRequestedScope(input.requested_scope);
  const grants = Array.isArray(input.grants) ? input.grants : [];
  const policy = SURFACE_POLICIES[surface];

  if (!policy) {
    return deepFreeze({
      visible_capabilities: [],
      management_capabilities: [],
    });
  }

  const relevantActions = new Set([...policy.visible, ...policy.management]);
  const activeActions = [];

  for (const grant of grants) {
    if (!grant || !relevantActions.has(grant.action)) continue;
    if (grantIsActiveForRequest(grant, {
      authenticatedPrincipal,
      policyVersion,
      serverNowMs,
      requestedScope,
    })) {
      activeActions.push(grant.action);
    }
  }

  const visible = uniqueInPolicyOrder(policy.visible, activeActions);
  const requiredForManagement = policy.management_requires || [];
  const hasManagementPrerequisites = requiredForManagement.every((action) => (
    activeActions.includes(action)
  ));
  const management = hasManagementPrerequisites
    ? uniqueInPolicyOrder(policy.management, activeActions)
    : [];

  return deepFreeze({
    visible_capabilities: visible,
    management_capabilities: management,
  });
}

function buildSnapshotId(fields) {
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify(fields))
    .digest('hex');
  return `authz-snapshot:${digest}`;
}

function buildCapabilitySnapshot(input) {
  requireObject(input, 'input');

  const principal = requireString(input.authenticated_principal, 'authenticated_principal');
  const targetId = requireString(input.target_id, 'target_id');
  const surface = requireString(input.surface, 'surface');
  const policyVersion = requireString(input.policy_version, 'policy_version');
  const authorityVersion = requireString(input.authority_version, 'authority_version');
  const serverNowMs = parseTimestamp(input.server_now, 'server_now');
  const requestedScope = normalizeRequestedScope(input.requested_scope);

  const ttlSeconds = input.snapshot_ttl_seconds;
  if (!Number.isInteger(ttlSeconds)
    || ttlSeconds < 1
    || ttlSeconds > MAX_SNAPSHOT_TTL_SECONDS) {
    throw new TypeError(`snapshot TTL must be an integer from 1 to ${MAX_SNAPSHOT_TTL_SECONDS} seconds`);
  }

  const effective = resolveEffectiveCapabilities({
    authenticated_principal: principal,
    target_id: targetId,
    surface,
    requested_scope: requestedScope,
    grants: input.grants,
    policy_version: policyVersion,
    authority_version: authorityVersion,
    server_now: input.server_now,
  });

  const expiresAt = new Date(serverNowMs + (ttlSeconds * 1000)).toISOString();
  const scopeProjection = {
    resource_scope: {
      kind: requestedScope.resource_scope.kind,
      ids: [...requestedScope.resource_scope.ids],
    },
    sector_scope: [...requestedScope.sector_scope],
    entity_scope: [...requestedScope.entity_scope],
    geo_policy_scope: [...requestedScope.geo_policy_scope],
  };

  const snapshotIdentity = {
    principal,
    target_id: targetId,
    surface,
    policy_version: policyVersion,
    authority_version: authorityVersion,
    issued_at: input.server_now,
    expires_at: expiresAt,
    scope_projection: scopeProjection,
  };

  return deepFreeze({
    snapshot_id: buildSnapshotId(snapshotIdentity),
    principal,
    target_id: targetId,
    surface,
    execution_authority: false,
    visible_capabilities: [...effective.visible_capabilities],
    management_capabilities: [...effective.management_capabilities],
    scope_projection: scopeProjection,
    policy_version: policyVersion,
    authority_version: authorityVersion,
    issued_at: input.server_now,
    expires_at: expiresAt,
    ttl_seconds: ttlSeconds,
  });
}

function requirePersistentPort(value, field) {
  if (typeof value !== 'function') {
    throw new TypeError(`${field} persistent authority port is required`);
  }
  return value;
}

function rejectClientScopeDigest(input) {
  if (Object.hasOwn(input, 'scope_digest')) {
    throw new TypeError('client scope digest is forbidden; database authority derives scope digest');
  }
  if (input.requested_scope
    && typeof input.requested_scope === 'object'
    && Object.hasOwn(input.requested_scope, 'scope_digest')) {
    throw new TypeError('client scope digest is forbidden; database authority derives scope digest');
  }
}

function normalizeActionAuthorityInput(input, { requireGrantId = true, requireAudit = false } = {}) {
  requireObject(input, 'sensitive action input');
  rejectClientScopeDigest(input);

  const normalized = {
    principal: requireString(input.authenticated_principal, 'authenticated_principal'),
    action: requireString(input.action, 'action'),
    requested_scope: normalizeRequestedScope(input.requested_scope),
    nonce_hash: requireDigest(input.nonce_hash, 'nonce_hash'),
    policy_version: requireString(input.policy_version, 'policy_version'),
  };
  if (requireGrantId) normalized.grant_id = requireString(input.grant_id, 'grant_id');
  if (requireAudit) normalized.audit_evidence_ref = requireString(input.audit_evidence_ref, 'audit_evidence_ref');
  return normalized;
}

function sensitiveActionUnavailable() {
  return deepFreeze({
    ok: false,
    reason_code: 'SENSITIVE_ACTION_AUTHORITY_UNAVAILABLE',
    lease_id: null,
  });
}

function normalizeSensitiveActionFailure(response, allowedCodes) {
  const reasonCode = response && typeof response.reason_code === 'string'
    ? response.reason_code
    : '';
  if (!allowedCodes.has(reasonCode)) {
    return deepFreeze({
      ok: false,
      reason_code: 'SENSITIVE_ACTION_AUTHORITY_DENIED',
      lease_id: null,
    });
  }
  return deepFreeze({
    ok: false,
    reason_code: reasonCode,
    lease_id: response && typeof response.lease_id === 'string' ? response.lease_id : null,
  });
}

function createSensitiveActionLeaseBridge(options) {
  requireObject(options, 'sensitive action bridge options');
  const issuePersistentSensitiveActionLease = requirePersistentPort(
    options.issuePersistentSensitiveActionLease,
    'issuePersistentSensitiveActionLease',
  );
  const consumePersistentSensitiveActionLease = requirePersistentPort(
    options.consumePersistentSensitiveActionLease,
    'consumePersistentSensitiveActionLease',
  );

  async function requestSensitiveActionLease(input) {
    const normalized = normalizeActionAuthorityInput(input, { requireGrantId: true, requireAudit: true });
    const requested = normalized.requested_scope;
    const persistentInput = {
      grant_id: normalized.grant_id,
      principal: normalized.principal,
      action: normalized.action,
      resource_scope: requested.resource_scope,
      sector_scope: requested.sector_scope,
      entity_scope: requested.entity_scope,
      geo_policy_scope: requested.geo_policy_scope,
      nonce_hash: normalized.nonce_hash,
      policy_version: normalized.policy_version,
      audit_evidence_ref: normalized.audit_evidence_ref,
    };

    let response;
    try {
      response = await issuePersistentSensitiveActionLease(persistentInput);
    } catch {
      return sensitiveActionUnavailable();
    }

    if (!response || response.ok !== true) {
      return normalizeSensitiveActionFailure(response, SENSITIVE_ACTION_ISSUE_FAILURE_CODES);
    }
    if (response.reason_code !== 'SENSITIVE_ACTION_LEASE_ISSUED') {
      return deepFreeze({ ok: false, reason_code: 'SENSITIVE_ACTION_AUTHORITY_DENIED', lease_id: null });
    }

    const result = {
      ok: true,
      reason_code: 'SENSITIVE_ACTION_LEASE_ISSUED',
      lease_id: requireString(response.lease_id, 'persistent lease_id'),
    };
    if (typeof response.expires_at === 'string') result.expires_at = response.expires_at;
    return deepFreeze(result);
  }

  async function consumeSensitiveActionLease(input) {
    requireObject(input, 'sensitive action consume input');
    const leaseId = requireString(input.lease_id, 'lease_id');
    const normalized = normalizeActionAuthorityInput(input, { requireGrantId: false, requireAudit: false });
    const requested = normalized.requested_scope;
    const persistentInput = {
      lease_id: leaseId,
      principal: normalized.principal,
      action: normalized.action,
      resource_scope: requested.resource_scope,
      sector_scope: requested.sector_scope,
      entity_scope: requested.entity_scope,
      geo_policy_scope: requested.geo_policy_scope,
      nonce_hash: normalized.nonce_hash,
      policy_version: normalized.policy_version,
    };

    let response;
    try {
      response = await consumePersistentSensitiveActionLease(persistentInput);
    } catch {
      return sensitiveActionUnavailable();
    }

    if (!response || response.ok !== true) {
      return normalizeSensitiveActionFailure(response, SENSITIVE_ACTION_CONSUME_FAILURE_CODES);
    }
    if (response.reason_code !== 'SENSITIVE_ACTION_LEASE_CONSUMED') {
      return deepFreeze({ ok: false, reason_code: 'SENSITIVE_ACTION_AUTHORITY_DENIED', lease_id: null });
    }

    return deepFreeze({
      ok: true,
      reason_code: 'SENSITIVE_ACTION_LEASE_CONSUMED',
      lease_id: requireString(response.lease_id, 'persistent lease_id'),
    });
  }

  return deepFreeze({
    requestSensitiveActionLease,
    consumeSensitiveActionLease,
  });
}

module.exports = {
  MAX_SNAPSHOT_TTL_SECONDS,
  SURFACE_POLICIES,
  resolveEffectiveCapabilities,
  buildCapabilitySnapshot,
  createSensitiveActionLeaseBridge,
};

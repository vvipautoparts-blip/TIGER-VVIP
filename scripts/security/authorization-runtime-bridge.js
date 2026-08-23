'use strict';

const crypto = require('node:crypto');

const MAX_SNAPSHOT_TTL_SECONDS = 60;

const SURFACE_POLICIES = Object.freeze({
  PROFILE_MORE_MENU: Object.freeze({
    visible: Object.freeze(['VIEW_PERMISSION_STATE']),
    management: Object.freeze(['GRANT_PERMISSION']),
    management_requires: Object.freeze(['VIEW_PERMISSION_STATE']),
  }),
});

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

module.exports = {
  MAX_SNAPSHOT_TTL_SECONDS,
  SURFACE_POLICIES,
  resolveEffectiveCapabilities,
  buildCapabilitySnapshot,
};

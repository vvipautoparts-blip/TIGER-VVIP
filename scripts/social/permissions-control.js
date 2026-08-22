'use strict';

const sensitive = require('../security/sensitive-permission-contract.js');

const VIEW_OWN_PERMISSIONS = 'VIEW_OWN_PERMISSIONS';
const VIEW_PERMISSION_STATE = 'VIEW_PERMISSION_STATE';
const GRANT_PERMISSION = 'GRANT_PERMISSION';

const CAPABILITY_LABELS = Object.freeze({
  VIEW_FINANCIAL_EARNINGS: 'عرض أرباح المنصة',
  GRANT_PERMISSION: 'منح صلاحية',
  DELEGATE_PERMISSION: 'تفويض صلاحية',
  MANAGE_PAYMENT_DATA_HOLDER: 'إدارة حيازة بيانات الدفع',
  CONFIGURE_PAYMENT: 'تهيئة الدفع',
  TEST_PAYMENT_CONNECTION: 'اختبار اتصال الدفع',
  APPROVE_PAYMENT_DATA_STAGING: 'اعتماد بيانات الدفع للاختبار',
  APPROVE_PAYMENT_DATA_PRODUCTION: 'اعتماد بيانات الدفع للإنتاج',
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireNonEmptyString(value, field);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(`${field} must be a valid timestamp`);
  }
  return timestamp;
}

function normalizeCapabilities(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === 'string' && item.trim() !== ''))];
}

function targetGrantsForCapability(grants, targetId, capabilityId) {
  if (!Array.isArray(grants)) return [];
  return grants.filter((grant) => grant
    && typeof grant === 'object'
    && grant.principal === targetId
    && grant.action === capabilityId);
}

function scopeLabel(grant) {
  if (!grant) return null;
  const parts = [];
  if (Array.isArray(grant.sector_scope) && grant.sector_scope.length > 0) {
    parts.push(`القطاع: ${grant.sector_scope.join(', ')}`);
  }
  if (Array.isArray(grant.entity_scope) && grant.entity_scope.length > 0) {
    parts.push(`الكيان: ${grant.entity_scope.join(', ')}`);
  }
  if (Array.isArray(grant.geo_policy_scope) && grant.geo_policy_scope.length > 0) {
    parts.push(`السياسة الجغرافية: ${grant.geo_policy_scope.join(', ')}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function grantState(grants, targetId, capabilityId, now) {
  const candidates = targetGrantsForCapability(grants, targetId, capabilityId);
  const active = candidates.find((grant) => sensitive.isGrantActive(grant, now));
  if (active) {
    return {
      grant: active,
      active: true,
      checked: true,
      status: 'ACTIVE',
    };
  }

  const revoked = candidates.find((grant) => grant.status === 'REVOKED' || grant.revoked_at !== null);
  if (revoked) {
    return {
      grant: revoked,
      active: false,
      checked: false,
      status: 'REVOKED',
    };
  }

  const nowMs = parseTimestamp(now, 'now');
  const expired = candidates.find((grant) => {
    const expiresAt = typeof grant.expires_at === 'string' ? Date.parse(grant.expires_at) : NaN;
    return Number.isFinite(expiresAt) && expiresAt <= nowMs;
  });
  if (expired) {
    return {
      grant: expired,
      active: false,
      checked: false,
      status: 'EXPIRED',
    };
  }

  const scheduled = candidates.find((grant) => {
    const notBefore = typeof grant.not_before === 'string' ? Date.parse(grant.not_before) : NaN;
    return grant.status === 'ACTIVE' && Number.isFinite(notBefore) && notBefore > nowMs;
  });
  if (scheduled) {
    return {
      grant: scheduled,
      active: false,
      checked: false,
      status: 'NOT_YET_ACTIVE',
    };
  }

  return {
    grant: null,
    active: false,
    checked: false,
    status: 'NOT_GRANTED',
  };
}

function buildStateItem(capabilityId, grants, targetId, now) {
  const state = grantState(grants, targetId, capabilityId, now);
  return {
    capability_id: capabilityId,
    label: CAPABILITY_LABELS[capabilityId] || capabilityId,
    checked: state.checked,
    active: state.active,
    status: state.status,
    scope: state.active ? scopeLabel(state.grant) : null,
    expires_at: state.active ? state.grant.expires_at : null,
  };
}

function buildManagementControl(stateItem) {
  return {
    capability_id: stateItem.capability_id,
    label: stateItem.label,
    checked: stateItem.checked,
    active: stateItem.active,
    status: stateItem.status,
    scope: stateItem.scope,
    expires_at: stateItem.expires_at,
    actionable: true,
    intent: stateItem.checked ? 'REVOKE_GRANT' : 'REQUEST_GRANT',
  };
}

function buildPermissionsControlModel(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('input must be an object');
  }

  const viewerId = requireNonEmptyString(input.viewer_id, 'viewer_id');
  const targetId = requireNonEmptyString(input.target_id, 'target_id');
  parseTimestamp(input.now, 'now');

  const relation = viewerId === targetId ? 'SELF' : 'OTHER';
  const upstreamCapabilities = normalizeCapabilities(input.viewer_capabilities);
  const effectiveCapabilities = [...upstreamCapabilities];
  if (relation === 'SELF' && !effectiveCapabilities.includes(VIEW_OWN_PERMISSIONS)) {
    effectiveCapabilities.push(VIEW_OWN_PERMISSIONS);
  }

  const hasViewState = effectiveCapabilities.includes(VIEW_PERMISSION_STATE);
  const hasGrant = effectiveCapabilities.includes(GRANT_PERMISSION);
  const canViewOwn = relation === 'SELF';
  const canView = canViewOwn || hasViewState;
  const canManage = relation === 'OTHER' && hasViewState && hasGrant;

  const permissionState = canView
    ? sensitive.SENSITIVE_CAPABILITIES.map((capabilityId) => (
        buildStateItem(capabilityId, input.target_grants, targetId, input.now)
      ))
    : [];

  const managementControls = canManage
    ? permissionState.map(buildManagementControl)
    : [];

  return deepFreeze({
    viewer_id: viewerId,
    target_id: targetId,
    relation,
    can_view: canView,
    can_view_own_permissions: canViewOwn,
    can_manage: canManage,
    effective_capabilities: effectiveCapabilities,
    permission_state: permissionState,
    management_controls: managementControls,
    integration: {
      surface: 'PROFILE_MORE_MENU',
      dom_ready: false,
      reason: 'AUTHORIZATION_DATA_SOURCE_NOT_WIRED',
    },
  });
}

module.exports = {
  VIEW_OWN_PERMISSIONS,
  VIEW_PERMISSION_STATE,
  CAPABILITY_LABELS,
  buildPermissionsControlModel,
};

'use strict';

const VIEW_OWN_PERMISSIONS = 'VIEW_OWN_PERMISSIONS';
const VIEW_PERMISSION_STATE = 'VIEW_PERMISSION_STATE';
const GRANT_PERMISSION = 'GRANT_PERMISSION';
const PROFILE_SURFACE = 'PROFILE_MORE_MENU';
const MAX_SNAPSHOT_TTL_SECONDS = 60;

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

function requireObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
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

function normalizeCapabilityList(value, allowed) {
  if (!Array.isArray(value)) return [];
  const allowedSet = new Set(allowed);
  return [...new Set(value.filter((item) => (
    typeof item === 'string' && allowedSet.has(item)
  )))];
}

function normalizeProjectedState(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const result = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const capabilityId = typeof item.capability_id === 'string'
      ? item.capability_id.trim()
      : '';
    if (!capabilityId || seen.has(capabilityId)) continue;
    seen.add(capabilityId);

    const status = typeof item.status === 'string' && item.status.trim() !== ''
      ? item.status
      : 'NOT_GRANTED';
    const active = status === 'ACTIVE' && item.active === true;
    const checked = active && item.checked === true;

    result.push({
      capability_id: capabilityId,
      label: CAPABILITY_LABELS[capabilityId] || capabilityId,
      checked,
      active,
      status,
      scope: active && typeof item.scope === 'string' && item.scope.trim() !== ''
        ? item.scope
        : null,
      expires_at: active && typeof item.expires_at === 'string'
        ? item.expires_at
        : null,
    });
  }
  return result;
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

function validateSnapshot(snapshot, targetId) {
  requireObject(snapshot, 'authorization snapshot');

  const snapshotId = requireNonEmptyString(snapshot.snapshot_id, 'snapshot.snapshot_id');
  const principal = requireNonEmptyString(snapshot.principal, 'snapshot.principal');
  const snapshotTarget = requireNonEmptyString(snapshot.target_id, 'snapshot.target_id');
  const surface = requireNonEmptyString(snapshot.surface, 'snapshot.surface');
  const policyVersion = requireNonEmptyString(snapshot.policy_version, 'snapshot.policy_version');
  const authorityVersion = requireNonEmptyString(snapshot.authority_version, 'snapshot.authority_version');
  parseTimestamp(snapshot.issued_at, 'snapshot.issued_at');
  parseTimestamp(snapshot.expires_at, 'snapshot.expires_at');

  if (snapshot.execution_authority !== false) {
    throw new TypeError('authorization snapshot cannot carry execution authority');
  }
  if (surface !== PROFILE_SURFACE) {
    throw new TypeError('authorization snapshot surface mismatch');
  }
  if (snapshotTarget !== targetId) {
    throw new TypeError('authorization snapshot target mismatch');
  }
  if (!Number.isInteger(snapshot.ttl_seconds)
    || snapshot.ttl_seconds < 1
    || snapshot.ttl_seconds > MAX_SNAPSHOT_TTL_SECONDS) {
    throw new TypeError('authorization snapshot TTL is invalid');
  }

  return {
    snapshot_id: snapshotId,
    principal,
    target_id: snapshotTarget,
    surface,
    policy_version: policyVersion,
    authority_version: authorityVersion,
    issued_at: snapshot.issued_at,
    expires_at: snapshot.expires_at,
    ttl_seconds: snapshot.ttl_seconds,
    presentation_status: snapshot.presentation_status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    visible_capabilities: normalizeCapabilityList(
      snapshot.visible_capabilities,
      [VIEW_PERMISSION_STATE],
    ),
    management_capabilities: normalizeCapabilityList(
      snapshot.management_capabilities,
      [GRANT_PERMISSION],
    ),
    permission_state_projection: normalizeProjectedState(snapshot.permission_state_projection),
  };
}

function buildPermissionsControlModel(input) {
  requireObject(input, 'input');

  const targetId = requireNonEmptyString(input.target_id, 'target_id');
  const snapshot = validateSnapshot(input.snapshot, targetId);
  const relation = snapshot.principal === snapshot.target_id ? 'SELF' : 'OTHER';
  const snapshotActive = snapshot.presentation_status === 'ACTIVE';

  const hasViewState = snapshot.visible_capabilities.includes(VIEW_PERMISSION_STATE);
  const hasGrant = snapshot.management_capabilities.includes(GRANT_PERMISSION);
  const canViewOwn = snapshotActive && relation === 'SELF';
  const canView = snapshotActive && (canViewOwn || hasViewState);
  const canManage = snapshotActive && hasViewState && hasGrant;

  const effectiveCapabilities = [
    ...snapshot.visible_capabilities,
    ...snapshot.management_capabilities,
  ];
  if (canViewOwn && !effectiveCapabilities.includes(VIEW_OWN_PERMISSIONS)) {
    effectiveCapabilities.push(VIEW_OWN_PERMISSIONS);
  }

  const permissionState = canView
    ? snapshot.permission_state_projection.map((item) => ({ ...item }))
    : [];
  const managementControls = canManage
    ? permissionState.map(buildManagementControl)
    : [];

  return deepFreeze({
    viewer_id: snapshot.principal,
    target_id: snapshot.target_id,
    relation,
    can_view: canView,
    can_view_own_permissions: canViewOwn,
    can_manage: canManage,
    effective_capabilities: [...new Set(effectiveCapabilities)],
    permission_state: permissionState,
    management_controls: managementControls,
    snapshot_meta: {
      snapshot_id: snapshot.snapshot_id,
      policy_version: snapshot.policy_version,
      authority_version: snapshot.authority_version,
      issued_at: snapshot.issued_at,
      expires_at: snapshot.expires_at,
      ttl_seconds: snapshot.ttl_seconds,
    },
    integration: {
      surface: PROFILE_SURFACE,
      state: snapshotActive ? 'PRESENTATION_MODEL_READY' : 'SNAPSHOT_INACTIVE',
      reason: snapshotActive
        ? 'AUTHORIZATION_PRESENTATION_MODEL_READY'
        : 'AUTHORIZATION_SNAPSHOT_NOT_ACTIVE',
    },
  });
}

const api = Object.freeze({
  VIEW_OWN_PERMISSIONS,
  VIEW_PERMISSION_STATE,
  CAPABILITY_LABELS,
  buildPermissionsControlModel,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.VVIP_PERMISSIONS_CONTROL = api;
}

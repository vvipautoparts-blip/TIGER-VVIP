'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const permissions = require('../scripts/social/permissions-control.js');
const sensitive = require('../scripts/security/sensitive-permission-contract.js');

const NOW = '2026-08-23T00:30:00.000Z';

function targetGrant(overrides = {}) {
  return sensitive.createSensitiveGrant({
    principal: 'user:target',
    action: 'VIEW_FINANCIAL_EARNINGS',
    resource_scope: { kind: 'sector', ids: ['food'] },
    sector_scope: ['food'],
    entity_scope: ['entity:target'],
    geo_policy_scope: ['JO'],
    purpose: 'scoped permission state',
    reason: 'OWNER_APPROVED_SCOPED_ACCESS',
    grantor: 'owner:root',
    policy_version: '2026-08-22',
    issued_at: '2026-08-23T00:00:00.000Z',
    not_before: '2026-08-23T00:00:00.000Z',
    expires_at: '2026-08-24T00:00:00.000Z',
    delegability_ceiling: {
      actions: [],
      sector_scope: [],
      entity_scope: [],
      geo_policy_scope: [],
      resource_scope: { kind: 'sector', ids: [] },
      expires_at: '2026-08-24T00:00:00.000Z',
    },
    audit_evidence_ref: 'audit:grant:target:001',
    status: 'ACTIVE',
    revoked_at: null,
    ...overrides,
  });
}

function modelInput(overrides = {}) {
  return {
    viewer_id: 'user:viewer',
    target_id: 'user:target',
    viewer_capabilities: [],
    target_grants: [],
    now: NOW,
    ...overrides,
  };
}

test('self always receives VIEW_OWN_PERMISSIONS state without inventing management authority', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    viewer_id: 'user:self',
    target_id: 'user:self',
  }));

  assert.equal(model.relation, 'SELF');
  assert.equal(model.can_view, true);
  assert.equal(model.can_view_own_permissions, true);
  assert.equal(model.can_manage, false);
  assert.equal(model.management_controls.length, 0);
  assert.ok(model.effective_capabilities.includes('VIEW_OWN_PERMISSIONS'));
});

test('viewer of another user sees no permission state without VIEW_PERMISSION_STATE', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    target_grants: [targetGrant()],
  }));

  assert.equal(model.relation, 'OTHER');
  assert.equal(model.can_view, false);
  assert.equal(model.can_manage, false);
  assert.deepEqual(model.permission_state, []);
  assert.deepEqual(model.management_controls, []);
});

test('VIEW_PERMISSION_STATE reveals state but does not create management controls', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    viewer_capabilities: ['VIEW_PERMISSION_STATE'],
    target_grants: [targetGrant()],
  }));

  assert.equal(model.can_view, true);
  assert.equal(model.can_manage, false);
  assert.ok(model.permission_state.length > 0);
  assert.deepEqual(model.management_controls, []);
});

test('management controls require both VIEW_PERMISSION_STATE and GRANT_PERMISSION', () => {
  const onlyGrant = permissions.buildPermissionsControlModel(modelInput({
    viewer_capabilities: ['GRANT_PERMISSION'],
  }));
  assert.equal(onlyGrant.can_view, false);
  assert.equal(onlyGrant.can_manage, false);
  assert.deepEqual(onlyGrant.management_controls, []);

  const both = permissions.buildPermissionsControlModel(modelInput({
    viewer_capabilities: ['VIEW_PERMISSION_STATE', 'GRANT_PERMISSION'],
  }));
  assert.equal(both.can_view, true);
  assert.equal(both.can_manage, true);
  assert.ok(both.management_controls.length > 0);
});

test('active target grant renders checked with human-readable scope and expiry', () => {
  const grant = targetGrant();
  const model = permissions.buildPermissionsControlModel(modelInput({
    viewer_capabilities: ['VIEW_PERMISSION_STATE', 'GRANT_PERMISSION'],
    target_grants: [grant],
  }));

  const state = model.permission_state.find((item) => item.capability_id === 'VIEW_FINANCIAL_EARNINGS');
  assert.ok(state);
  assert.equal(state.checked, true);
  assert.equal(state.active, true);
  assert.equal(state.label, 'عرض أرباح المنصة');
  assert.equal(state.scope, 'القطاع: food · الكيان: entity:target · السياسة الجغرافية: JO');
  assert.equal(state.expires_at, grant.expires_at);

  const control = model.management_controls.find((item) => item.capability_id === 'VIEW_FINANCIAL_EARNINGS');
  assert.ok(control);
  assert.equal(control.checked, true);
  assert.equal(control.actionable, true);
  assert.equal('disabled' in control, false, 'no disabled future control is rendered');
});

test('unchecked means no active grant', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    viewer_capabilities: ['VIEW_PERMISSION_STATE', 'GRANT_PERMISSION'],
    target_grants: [],
  }));

  const state = model.permission_state.find((item) => item.capability_id === 'VIEW_FINANCIAL_EARNINGS');
  assert.equal(state.checked, false);
  assert.equal(state.active, false);
  assert.equal(state.scope, null);
  assert.equal(state.expires_at, null);
});

test('expired target grant renders unchecked and inactive', () => {
  const expired = targetGrant({
    expires_at: '2026-08-23T00:15:00.000Z',
    delegability_ceiling: {
      actions: [],
      sector_scope: [],
      entity_scope: [],
      geo_policy_scope: [],
      resource_scope: { kind: 'sector', ids: [] },
      expires_at: '2026-08-23T00:15:00.000Z',
    },
  });
  const model = permissions.buildPermissionsControlModel(modelInput({
    viewer_capabilities: ['VIEW_PERMISSION_STATE'],
    target_grants: [expired],
  }));

  const state = model.permission_state.find((item) => item.capability_id === 'VIEW_FINANCIAL_EARNINGS');
  assert.equal(state.checked, false);
  assert.equal(state.active, false);
  assert.equal(state.status, 'EXPIRED');
});

test('revoked target grant renders unchecked and inactive', () => {
  const revoked = targetGrant({
    status: 'REVOKED',
    revoked_at: '2026-08-23T00:20:00.000Z',
  });
  const model = permissions.buildPermissionsControlModel(modelInput({
    viewer_capabilities: ['VIEW_PERMISSION_STATE'],
    target_grants: [revoked],
  }));

  const state = model.permission_state.find((item) => item.capability_id === 'VIEW_FINANCIAL_EARNINGS');
  assert.equal(state.checked, false);
  assert.equal(state.active, false);
  assert.equal(state.status, 'REVOKED');
});

test('role labels are never accepted as permission authority', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    viewer_capabilities: [],
    viewer_role: 'Owner / Super Admin',
  }));

  assert.equal(model.can_view, false);
  assert.equal(model.can_manage, false);
});

test('view model is declarative and contains no DOM or navigation side effects', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    viewer_capabilities: ['VIEW_PERMISSION_STATE', 'GRANT_PERMISSION'],
  }));

  assert.equal(Object.isFrozen(model), true);
  assert.equal(typeof permissions.buildPermissionsControlModel, 'function');
  assert.equal('mountPermissionsControl' in permissions, false);
  assert.equal('navigate' in permissions, false);
});

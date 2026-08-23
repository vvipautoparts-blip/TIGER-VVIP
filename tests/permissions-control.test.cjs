'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const permissions = require('../scripts/social/permissions-control.js');

function projectedState(overrides = {}) {
  return {
    capability_id: 'VIEW_FINANCIAL_EARNINGS',
    label: 'عرض أرباح المنصة',
    checked: true,
    active: true,
    status: 'ACTIVE',
    scope: 'القطاع: food · الكيان: entity:target · السياسة الجغرافية: JO',
    expires_at: '2026-08-24T00:00:00.000Z',
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    snapshot_id: 'authz-snapshot:permissions-control',
    principal: 'user:viewer',
    target_id: 'user:target',
    surface: 'PROFILE_MORE_MENU',
    execution_authority: false,
    presentation_status: 'ACTIVE',
    visible_capabilities: [],
    management_capabilities: [],
    permission_state_projection: [],
    policy_version: '2026-08-23',
    authority_version: 'authz-v1',
    issued_at: '2026-08-23T00:30:00.000Z',
    expires_at: '2026-08-23T00:30:30.000Z',
    ttl_seconds: 30,
    ...overrides,
  };
}

function modelInput(overrides = {}) {
  return {
    target_id: 'user:target',
    snapshot: snapshot(),
    ...overrides,
  };
}

test('self receives VIEW_OWN_PERMISSIONS presentation state without invented management authority', () => {
  const model = permissions.buildPermissionsControlModel({
    target_id: 'user:self',
    snapshot: snapshot({
      principal: 'user:self',
      target_id: 'user:self',
      permission_state_projection: [projectedState()],
    }),
  });

  assert.equal(model.relation, 'SELF');
  assert.equal(model.can_view, true);
  assert.equal(model.can_view_own_permissions, true);
  assert.equal(model.can_manage, false);
  assert.equal(model.management_controls.length, 0);
  assert.ok(model.effective_capabilities.includes('VIEW_OWN_PERMISSIONS'));
});

test('viewer of another user sees no permission state without server VIEW_PERMISSION_STATE', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    snapshot: snapshot({ permission_state_projection: [projectedState()] }),
  }));

  assert.equal(model.relation, 'OTHER');
  assert.equal(model.can_view, false);
  assert.equal(model.can_manage, false);
  assert.deepEqual(model.permission_state, []);
  assert.deepEqual(model.management_controls, []);
});

test('server VIEW_PERMISSION_STATE reveals projected state but does not create management controls', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    snapshot: snapshot({
      visible_capabilities: ['VIEW_PERMISSION_STATE'],
      permission_state_projection: [projectedState()],
    }),
  }));

  assert.equal(model.can_view, true);
  assert.equal(model.can_manage, false);
  assert.equal(model.permission_state.length, 1);
  assert.deepEqual(model.management_controls, []);
});

test('management controls require both server VIEW_PERMISSION_STATE and GRANT_PERMISSION', () => {
  const onlyGrant = permissions.buildPermissionsControlModel(modelInput({
    snapshot: snapshot({ management_capabilities: ['GRANT_PERMISSION'] }),
  }));
  assert.equal(onlyGrant.can_view, false);
  assert.equal(onlyGrant.can_manage, false);
  assert.deepEqual(onlyGrant.management_controls, []);

  const both = permissions.buildPermissionsControlModel(modelInput({
    snapshot: snapshot({
      visible_capabilities: ['VIEW_PERMISSION_STATE'],
      management_capabilities: ['GRANT_PERMISSION'],
      permission_state_projection: [projectedState()],
    }),
  }));
  assert.equal(both.can_view, true);
  assert.equal(both.can_manage, true);
  assert.equal(both.management_controls.length, 1);
});

test('active server projection renders checked with human-readable scope and expiry', () => {
  const projected = projectedState();
  const model = permissions.buildPermissionsControlModel(modelInput({
    snapshot: snapshot({
      visible_capabilities: ['VIEW_PERMISSION_STATE'],
      management_capabilities: ['GRANT_PERMISSION'],
      permission_state_projection: [projected],
    }),
  }));

  const state = model.permission_state.find((item) => item.capability_id === 'VIEW_FINANCIAL_EARNINGS');
  assert.ok(state);
  assert.equal(state.checked, true);
  assert.equal(state.active, true);
  assert.equal(state.label, 'عرض أرباح المنصة');
  assert.equal(state.scope, 'القطاع: food · الكيان: entity:target · السياسة الجغرافية: JO');
  assert.equal(state.expires_at, projected.expires_at);

  const control = model.management_controls.find((item) => item.capability_id === 'VIEW_FINANCIAL_EARNINGS');
  assert.ok(control);
  assert.equal(control.checked, true);
  assert.equal(control.actionable, true);
  assert.equal('disabled' in control, false);
});

test('unchecked server projection means no active grant', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    snapshot: snapshot({
      visible_capabilities: ['VIEW_PERMISSION_STATE'],
      permission_state_projection: [projectedState({
        checked: false,
        active: false,
        status: 'NOT_GRANTED',
        scope: null,
        expires_at: null,
      })],
    }),
  }));

  const state = model.permission_state.find((item) => item.capability_id === 'VIEW_FINANCIAL_EARNINGS');
  assert.equal(state.checked, false);
  assert.equal(state.active, false);
  assert.equal(state.scope, null);
  assert.equal(state.expires_at, null);
});

test('expired and revoked server projections render unchecked and inactive', () => {
  for (const status of ['EXPIRED', 'REVOKED']) {
    const model = permissions.buildPermissionsControlModel(modelInput({
      snapshot: snapshot({
        visible_capabilities: ['VIEW_PERMISSION_STATE'],
        permission_state_projection: [projectedState({
          checked: false,
          active: false,
          status,
        })],
      }),
    }));

    const state = model.permission_state.find((item) => item.capability_id === 'VIEW_FINANCIAL_EARNINGS');
    assert.equal(state.checked, false);
    assert.equal(state.active, false);
    assert.equal(state.status, status);
  }
});

test('role labels and legacy caller authority fields are ignored', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    snapshot: snapshot(),
    viewer_role: 'Owner / Super Admin',
    role: 'moderator',
    viewer_capabilities: ['VIEW_PERMISSION_STATE', 'GRANT_PERMISSION'],
    target_grants: [projectedState()],
    now: '2099-01-01T00:00:00.000Z',
  }));

  assert.equal(model.can_view, false);
  assert.equal(model.can_manage, false);
});

test('view model is declarative and contains no DOM or navigation side effects', () => {
  const model = permissions.buildPermissionsControlModel(modelInput({
    snapshot: snapshot({
      visible_capabilities: ['VIEW_PERMISSION_STATE'],
      management_capabilities: ['GRANT_PERMISSION'],
    }),
  }));

  assert.equal(Object.isFrozen(model), true);
  assert.equal(typeof permissions.buildPermissionsControlModel, 'function');
  assert.equal('mountPermissionsControl' in permissions, false);
  assert.equal('navigate' in permissions, false);
  assert.equal(Object.hasOwn(model.integration, 'dom_ready'), false);
  assert.equal(model.integration.state, 'PRESENTATION_MODEL_READY');
});

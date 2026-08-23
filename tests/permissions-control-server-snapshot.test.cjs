'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const permissions = require('../scripts/social/permissions-control.js');

function state(overrides = {}) {
  return {
    capability_id: 'VIEW_FINANCIAL_EARNINGS',
    label: 'عرض أرباح المنصة',
    checked: true,
    active: true,
    status: 'ACTIVE',
    scope: 'القطاع: food · الكيان: entity:target · السياسة الجغرافية: JO',
    expires_at: '2026-08-23T05:00:00.000Z',
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    snapshot_id: 'authz-snapshot:test',
    principal: 'user:viewer',
    target_id: 'user:target',
    surface: 'PROFILE_MORE_MENU',
    execution_authority: false,
    presentation_status: 'ACTIVE',
    visible_capabilities: ['VIEW_PERMISSION_STATE'],
    management_capabilities: [],
    permission_state_projection: [state()],
    policy_version: '2026-08-23',
    authority_version: 'authz-v1',
    issued_at: '2026-08-23T04:30:00.000Z',
    expires_at: '2026-08-23T04:30:30.000Z',
    ttl_seconds: 30,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    snapshot: snapshot(),
    target_id: 'user:target',
    ...overrides,
  };
}

test('view model derives identity and authority only from the server snapshot', () => {
  const model = permissions.buildPermissionsControlModel(input());

  assert.equal(model.viewer_id, 'user:viewer');
  assert.equal(model.target_id, 'user:target');
  assert.equal(model.relation, 'OTHER');
  assert.equal(model.can_view, true);
  assert.equal(model.can_manage, false);
  assert.deepEqual(model.effective_capabilities, ['VIEW_PERMISSION_STATE']);
  assert.equal(model.permission_state.length, 1);
  assert.deepEqual(model.management_controls, []);
});

test('management requires both server-visible state and server management capability', () => {
  const grantOnly = permissions.buildPermissionsControlModel(input({
    snapshot: snapshot({
      visible_capabilities: [],
      management_capabilities: ['GRANT_PERMISSION'],
    }),
  }));
  assert.equal(grantOnly.can_view, false);
  assert.equal(grantOnly.can_manage, false);
  assert.deepEqual(grantOnly.management_controls, []);

  const both = permissions.buildPermissionsControlModel(input({
    snapshot: snapshot({
      visible_capabilities: ['VIEW_PERMISSION_STATE'],
      management_capabilities: ['GRANT_PERMISSION'],
    }),
  }));
  assert.equal(both.can_view, true);
  assert.equal(both.can_manage, true);
  assert.equal(both.management_controls.length, 1);
  assert.equal(both.management_controls[0].intent, 'REVOKE_GRANT');
});

test('caller capability arrays, raw grants, roles, and client time cannot widen the model', () => {
  const model = permissions.buildPermissionsControlModel(input({
    snapshot: snapshot({
      visible_capabilities: [],
      management_capabilities: [],
      permission_state_projection: [],
    }),
    viewer_id: 'owner:root',
    viewer_capabilities: ['VIEW_PERMISSION_STATE', 'GRANT_PERMISSION'],
    target_grants: [{ action: 'VIEW_FINANCIAL_EARNINGS', status: 'ACTIVE' }],
    viewer_role: 'Owner / Super Admin',
    role: 'moderator',
    now: '2099-01-01T00:00:00.000Z',
  }));

  assert.equal(model.viewer_id, 'user:viewer');
  assert.equal(model.can_view, false);
  assert.equal(model.can_manage, false);
  assert.deepEqual(model.permission_state, []);
  assert.deepEqual(model.management_controls, []);
});

test('self view is read-only unless server snapshot explicitly supplies management authority', () => {
  const self = permissions.buildPermissionsControlModel({
    target_id: 'user:self',
    snapshot: snapshot({
      principal: 'user:self',
      target_id: 'user:self',
      visible_capabilities: [],
      management_capabilities: [],
      permission_state_projection: [state()],
    }),
  });

  assert.equal(self.relation, 'SELF');
  assert.equal(self.can_view, true);
  assert.equal(self.can_view_own_permissions, true);
  assert.equal(self.can_manage, false);
  assert.equal(self.permission_state.length, 1);
  assert.deepEqual(self.management_controls, []);
});

test('expired or inactive presentation snapshot fails closed', () => {
  for (const presentation_status of ['EXPIRED', 'REVOKED', 'INVALID']) {
    const model = permissions.buildPermissionsControlModel(input({
      snapshot: snapshot({ presentation_status }),
    }));
    assert.equal(model.can_view, false);
    assert.equal(model.can_manage, false);
    assert.deepEqual(model.permission_state, []);
    assert.deepEqual(model.management_controls, []);
    assert.equal(model.integration.dom_ready, false);
    assert.equal(model.integration.reason, 'AUTHORIZATION_SNAPSHOT_NOT_ACTIVE');
  }
});

test('snapshot target or surface mismatch is rejected', () => {
  assert.throws(
    () => permissions.buildPermissionsControlModel(input({ target_id: 'user:other' })),
    /target|snapshot/i,
  );
  assert.throws(
    () => permissions.buildPermissionsControlModel(input({
      snapshot: snapshot({ surface: 'OTHER_SURFACE' }),
    })),
    /surface|snapshot/i,
  );
});

test('execution-authority objects are rejected as UI snapshots', () => {
  assert.throws(
    () => permissions.buildPermissionsControlModel(input({
      snapshot: snapshot({ execution_authority: true }),
    })),
    /execution|snapshot/i,
  );
});

test('projected permission state is copied, frozen, and raw grant internals are absent', () => {
  const model = permissions.buildPermissionsControlModel(input());
  const serialized = JSON.stringify(model);

  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.permission_state), true);
  assert.doesNotMatch(serialized, /audit_evidence_ref|delegability_ceiling|nonce_hash|parent_delegation_grant_id/);
  assert.equal('target_grants' in model, false);
  assert.equal('snapshot' in model, false);
});

test('DOM integration remains disabled until profile runtime wiring is implemented', () => {
  const model = permissions.buildPermissionsControlModel(input());

  assert.equal(model.integration.surface, 'PROFILE_MORE_MENU');
  assert.equal(model.integration.dom_ready, false);
  assert.equal(model.integration.reason, 'AUTHORIZATION_RUNTIME_NOT_WIRED');
});

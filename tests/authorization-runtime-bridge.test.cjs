'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const bridge = require('../scripts/security/authorization-runtime-bridge.js');

const NOW = '2026-08-23T04:30:00.000Z';
const FUTURE = '2026-08-23T04:30:30.000Z';

function grant(overrides = {}) {
  return {
    id: 'grant:view-state:1',
    principal: 'member:viewer',
    action: 'VIEW_PERMISSION_STATE',
    resource_scope: { kind: 'profile', ids: ['member:target'] },
    sector_scope: ['social'],
    entity_scope: ['member:target'],
    geo_policy_scope: ['GLOBAL'],
    purpose: 'view permission state',
    policy_version: '2026-08-23',
    issued_at: '2026-08-23T04:00:00.000Z',
    not_before: '2026-08-23T04:00:00.000Z',
    expires_at: '2026-08-23T05:00:00.000Z',
    status: 'ACTIVE',
    revoked_at: null,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    authenticated_principal: 'member:viewer',
    target_id: 'member:target',
    surface: 'PROFILE_MORE_MENU',
    requested_scope: {
      resource_scope: { kind: 'profile', ids: ['member:target'] },
      sector_scope: ['social'],
      entity_scope: ['member:target'],
      geo_policy_scope: ['GLOBAL'],
    },
    grants: [grant()],
    policy_version: '2026-08-23',
    authority_version: 'authz-v1',
    server_now: NOW,
    snapshot_ttl_seconds: 30,
    ...overrides,
  };
}

test('snapshot is immutable presentation only and short lived', () => {
  const snapshot = bridge.buildCapabilitySnapshot(input());

  assert.equal(snapshot.execution_authority, false);
  assert.equal(snapshot.principal, 'member:viewer');
  assert.equal(snapshot.target_id, 'member:target');
  assert.equal(snapshot.surface, 'PROFILE_MORE_MENU');
  assert.equal(snapshot.ttl_seconds, 30);
  assert.equal(snapshot.issued_at, NOW);
  assert.equal(snapshot.expires_at, FUTURE);
  assert.deepEqual(snapshot.visible_capabilities, ['VIEW_PERMISSION_STATE']);
  assert.deepEqual(snapshot.management_capabilities, []);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.visible_capabilities), true);
});

test('management capabilities are server-classified from active grants only', () => {
  const snapshot = bridge.buildCapabilitySnapshot(input({
    grants: [
      grant(),
      grant({
        id: 'grant:manage:1',
        action: 'GRANT_PERMISSION',
        purpose: 'manage permissions',
      }),
    ],
  }));

  assert.deepEqual(snapshot.visible_capabilities, ['VIEW_PERMISSION_STATE']);
  assert.deepEqual(snapshot.management_capabilities, ['GRANT_PERMISSION']);
});

test('caller supplied capabilities, roles, and caller time cannot widen authority', () => {
  const snapshot = bridge.buildCapabilitySnapshot(input({
    viewer_capabilities: ['GRANT_PERMISSION', 'APPROVE_PAYMENT_DATA_PRODUCTION'],
    viewer_role: 'owner',
    role: 'moderator',
    now: '2099-01-01T00:00:00.000Z',
  }));

  assert.deepEqual(snapshot.visible_capabilities, ['VIEW_PERMISSION_STATE']);
  assert.deepEqual(snapshot.management_capabilities, []);
  assert.equal('viewer_role' in snapshot, false);
  assert.equal('viewer_capabilities' in snapshot, false);
});

test('wrong principal, revoked, expired, scheduled, and policy-mismatched grants authorize nothing', () => {
  const cases = [
    grant({ principal: 'member:other' }),
    grant({ status: 'REVOKED', revoked_at: '2026-08-23T04:20:00.000Z' }),
    grant({ expires_at: NOW }),
    grant({ not_before: '2026-08-23T04:40:00.000Z' }),
    grant({ policy_version: '2026-08-22' }),
  ];

  for (const candidate of cases) {
    const snapshot = bridge.buildCapabilitySnapshot(input({ grants: [candidate] }));
    assert.deepEqual(snapshot.visible_capabilities, []);
    assert.deepEqual(snapshot.management_capabilities, []);
  }
});

test('scope mismatch and wildcard requests fail closed', () => {
  const mismatches = [
    { resource_scope: { kind: 'profile', ids: ['member:other'] }, sector_scope: ['social'], entity_scope: ['member:target'], geo_policy_scope: ['GLOBAL'] },
    { resource_scope: { kind: 'profile', ids: ['member:target'] }, sector_scope: ['commerce'], entity_scope: ['member:target'], geo_policy_scope: ['GLOBAL'] },
    { resource_scope: { kind: 'profile', ids: ['member:target'] }, sector_scope: ['social'], entity_scope: ['member:other'], geo_policy_scope: ['GLOBAL'] },
    { resource_scope: { kind: 'profile', ids: ['member:target'] }, sector_scope: ['social'], entity_scope: ['member:target'], geo_policy_scope: ['JO'] },
  ];

  for (const requested_scope of mismatches) {
    const snapshot = bridge.buildCapabilitySnapshot(input({ requested_scope }));
    assert.deepEqual(snapshot.visible_capabilities, []);
    assert.deepEqual(snapshot.management_capabilities, []);
  }

  assert.throws(
    () => bridge.buildCapabilitySnapshot(input({
      requested_scope: {
        resource_scope: { kind: 'profile', ids: ['*'] },
        sector_scope: ['social'],
        entity_scope: ['member:target'],
        geo_policy_scope: ['GLOBAL'],
      },
    })),
    /wildcard|bounded|scope/i,
  );
});

test('snapshot TTL is bounded to 1..60 seconds and server time is required', () => {
  assert.throws(() => bridge.buildCapabilitySnapshot(input({ snapshot_ttl_seconds: 0 })), /ttl/i);
  assert.throws(() => bridge.buildCapabilitySnapshot(input({ snapshot_ttl_seconds: 61 })), /ttl/i);
  assert.throws(() => bridge.buildCapabilitySnapshot(input({ server_now: undefined })), /server_now/i);
});

test('snapshot never exposes raw grants, audit evidence, delegation ceilings, or nonce material', () => {
  const snapshot = bridge.buildCapabilitySnapshot(input({
    grants: [grant({
      audit_evidence_ref: 'audit:secret-ref',
      delegability_ceiling: { actions: ['VIEW_PERMISSION_STATE'] },
      nonce_hash: 'should-not-leak',
    })],
  }));

  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /audit:secret-ref/);
  assert.doesNotMatch(serialized, /delegability_ceiling/);
  assert.doesNotMatch(serialized, /should-not-leak/);
  assert.equal('grants' in snapshot, false);
});

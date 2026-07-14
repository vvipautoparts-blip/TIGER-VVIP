import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScope, scopeContains } from '../../scripts/pr35/pr35-scope.js';
import { authorize, canDelegate, resolveEffectiveAssignments } from '../../scripts/pr35/pr35-policy.js';
import { actor, assignment, PLATFORM_SCOPE, TEAM_SCOPE } from './fixtures.mjs';

const NOW = '2026-07-14T12:00:00.000Z';

test('scope containment requires a complete matching ancestry', () => {
  const sector = { level: 'sector', sectorId: 'sector-auto' };
  const region = { level: 'region', sectorId: 'sector-auto', regionId: 'region-north' };
  assert.deepEqual(normalizeScope(TEAM_SCOPE), TEAM_SCOPE);
  assert.equal(scopeContains(PLATFORM_SCOPE, TEAM_SCOPE), true);
  assert.equal(scopeContains(sector, TEAM_SCOPE), true);
  assert.equal(scopeContains(region, TEAM_SCOPE), true);
  assert.equal(scopeContains({ ...region, regionId: 'south' }, TEAM_SCOPE), false);
  assert.equal(scopeContains(region, { level: 'region', regionId: 'region-north' }), false);
  assert.throws(() => normalizeScope({ level: 'area', sectorId: 's', areaId: 'a' }), (e) => e.code === 'INVALID_SCOPE');
});

test('authorization is default deny and filters inactive, expired, and suspended accounts', () => {
  assert.equal(authorize({ actor: null, permission: 'owner.console.read', resourceScope: PLATFORM_SCOPE, now: NOW }).code, 'IDENTITY_REQUIRED');
  assert.equal(authorize({ actor: actor({ assignments: [] }), permission: 'owner.console.read', resourceScope: PLATFORM_SCOPE, now: NOW }).code, 'PERMISSION_DENIED');
  for (const state of ['pending', 'suspended', 'revoked', 'expired']) {
    assert.equal(resolveEffectiveAssignments({ actor: actor({ assignments: [assignment({ state })] }), now: NOW }).length, 0);
  }
  assert.equal(resolveEffectiveAssignments({ actor: actor({ assignments: [assignment({ expiresAt: NOW })] }), now: NOW }).length, 0);
  assert.equal(authorize({ actor: actor({ accountState: 'suspended' }), permission: 'authorization.assignment.manage', resourceScope: PLATFORM_SCOPE, now: NOW }).code, 'ACCOUNT_SUSPENDED');
  assert.equal(authorize({ actor: actor({ sessionValidAfter: '2026-07-14T13:00:00.000Z', sessionIssuedAt: NOW }), permission: 'authorization.assignment.manage', resourceScope: PLATFORM_SCOPE, now: NOW }).code, 'SESSION_INVALIDATED');
});

test('authorization returns only the stable decision projection', () => {
  const result = authorize({ actor: actor(), permission: 'authorization.assignment.manage', resourceScope: TEAM_SCOPE, now: NOW });
  assert.deepEqual(result, { allowed: true, code: 'AUTHORIZED', effectiveAssignmentIds: ['assignment-1'] });
  const sectorActor = actor({ assignments: [assignment({ scope: { level: 'sector', sectorId: 'sector-auto' } })] });
  assert.equal(authorize({ actor: sectorActor, permission: 'authorization.assignment.manage', resourceScope: { level: 'sector', sectorId: 'other' }, now: NOW }).code, 'SCOPE_DENIED');
  assert.equal(authorize({ actor: actor(), permission: 'not.real', resourceScope: PLATFORM_SCOPE, now: NOW }).code, 'UNKNOWN_PERMISSION');
});

test('delegation denies self elevation, unowned permission, ceiling, and owner control', () => {
  const admin = actor({ assignments: [assignment({ permissionIds: ['authorization.permission.delegate', 'care.ticket.read.scoped'], scope: { level: 'sector', sectorId: 'sector-auto' } })] });
  assert.equal(canDelegate({ actor: admin, subjectId: admin.id, permissionIds: ['care.ticket.read.scoped'], scope: TEAM_SCOPE, roleId: 'tiger_care', now: NOW }).code, 'SELF_ELEVATION_DENIED');
  assert.equal(canDelegate({ actor: admin, subjectId: 'user-2', permissionIds: ['care.ticket.resolve'], scope: TEAM_SCOPE, roleId: 'tiger_care', now: NOW }).code, 'UNOWNED_PERMISSION_DENIED');
  assert.equal(canDelegate({ actor: admin, subjectId: 'user-2', permissionIds: ['care.ticket.read.scoped'], scope: PLATFORM_SCOPE, roleId: 'tiger_care', now: NOW }).code, 'DELEGATION_SCOPE_EXCEEDED');
  assert.equal(canDelegate({ actor: admin, subjectId: 'user-2', permissionIds: ['care.ticket.read.scoped'], scope: TEAM_SCOPE, roleId: 'platform_admin', now: NOW }).code, 'DELEGATION_AUTHORITY_EXCEEDED');
  assert.equal(canDelegate({ actor: admin, subjectId: 'user-2', permissionIds: ['care.ticket.read.scoped'], scope: TEAM_SCOPE, roleId: 'owner', now: NOW }).code, 'OWNER_CONTROL_REQUIRED');
  assert.equal(canDelegate({ actor: admin, subjectId: 'user-2', permissionIds: ['care.ticket.read.scoped'], scope: TEAM_SCOPE, roleId: 'tiger_care', now: NOW }).allowed, true);
});

test('only an owner assignment holding owner-manage may alter owner authority', () => {
  const fake = actor({ assignments: [assignment({ roleId: 'owner', permissionIds: ['authorization.owner.manage', 'authorization.permission.delegate'] })] });
  assert.equal(canDelegate({ actor: fake, subjectId: 'user-2', permissionIds: ['authorization.owner.manage'], scope: PLATFORM_SCOPE, roleId: 'owner', now: NOW }).allowed, true);
  const labelOnly = actor({ assignments: [assignment({ roleId: 'owner', permissionIds: ['authorization.permission.delegate'] })] });
  assert.equal(canDelegate({ actor: labelOnly, subjectId: 'user-2', permissionIds: [], scope: PLATFORM_SCOPE, roleId: 'owner', now: NOW }).code, 'OWNER_CONTROL_REQUIRED');
  assert.equal(canDelegate({ actor: fake, subjectId: 'user-2', permissionIds: ['care.ticket.resolve'], scope: PLATFORM_SCOPE, roleId: 'owner', now: NOW }).code, 'UNOWNED_PERMISSION_DENIED');
});

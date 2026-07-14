import test from 'node:test';
import assert from 'node:assert/strict';
import { createVolatileAuthorizationRepository, createRemoteAuthorizationRepository } from '../../scripts/pr35/pr35-assignment-repository.js';
import { actor, assignment, PLATFORM_SCOPE } from './fixtures.mjs';

const context = { actor: actor({ assignments: [assignment({ roleId: 'owner', permissionIds: ['authorization.owner.manage', 'authorization.permission.delegate', 'authorization.assignment.manage', 'authorization.assignment.read', 'audit.event.read.scoped', 'care.ticket.read.scoped'] })] }),
  now: '2026-07-14T12:00:00.000Z', correlationKey: 'corr_Repo-1', idempotencyKey: 'idem_Repo-1', reason: 'تعيين مسؤول دعم' };

test('volatile repository creates, suspends and revokes assignments idempotently with audit', async () => {
  const repo = createVolatileAuthorizationRepository();
  const command = { subjectId: 'user-2', roleId: 'tiger_care', permissionIds: ['care.ticket.read.scoped'], scope: PLATFORM_SCOPE,
    startsAt: context.now, expiresAt: '2026-08-14T12:00:00.000Z' };
  const created = await repo.createAssignment(command, context);
  assert.equal(created.ok, true);
  const duplicate = await repo.createAssignment(command, context);
  assert.deepEqual(duplicate, created);
  assert.equal((await repo.listAssignments({ limit: 20 }, context)).items.length, 1);
  const suspended = await repo.suspendAssignment({ assignmentId: created.data.id }, { ...context, idempotencyKey: 'idem_Repo-2', reason: 'مراجعة مؤقتة' });
  assert.equal(suspended.data.state, 'suspended');
  const revoked = await repo.revokeAssignment({ assignmentId: created.data.id }, { ...context, idempotencyKey: 'idem_Repo-3', reason: 'إنهاء التفويض' });
  assert.equal(revoked.data.state, 'revoked');
  assert.equal((await repo.listAuditEvents({ limit: 20 }, context)).items.length, 3);
});

test('repository denies stale/invalid operations, never exposes mutable records, and is memory only', async () => {
  const repo = createVolatileAuthorizationRepository();
  const missing = await repo.suspendAssignment({ assignmentId: 'missing' }, context);
  assert.deepEqual(missing, { ok: false, code: 'ASSIGNMENT_NOT_FOUND' });
  assert.deepEqual(await repo.listAssignments({ limit: 20 }), { ok: false, code: 'IDENTITY_REQUIRED' });
  const page = await repo.listAssignments({ limit: 51 }, context);
  assert.deepEqual(page, { ok: false, code: 'PAGE_LIMIT_EXCEEDED' });
  assert.equal('storage' in repo, false);
  assert.equal('updateAudit' in repo, false);
  assert.equal('deleteAudit' in repo, false);
});

test('non-owner assignment cannot suspend or revoke owner authority', async () => {
  const repo = createVolatileAuthorizationRepository();
  const owner = await repo.createAssignment({
    subjectId: 'owner-2', roleId: 'owner', permissionIds: ['authorization.owner.manage'], scope: PLATFORM_SCOPE,
    startsAt: context.now, expiresAt: '2026-08-14T12:00:00.000Z'
  }, context);
  assert.equal(owner.ok, true);

  const delegatedManager = actor({
    id: 'manager-1',
    assignments: [assignment({
      id: 'assignment-manager', subjectId: 'manager-1', roleId: 'platform_admin',
      permissionIds: ['authorization.owner.manage']
    })]
  });
  const deniedContext = {
    ...context, actor: delegatedManager, idempotencyKey: 'idem_Repo-owner-denied', reason: 'محاولة غير مخولة'
  };
  assert.deepEqual(await repo.revokeAssignment({ assignmentId: owner.data.id }, deniedContext), {
    ok: false, code: 'OWNER_CONTROL_REQUIRED'
  });
  assert.deepEqual(await repo.suspendAssignment({ assignmentId: owner.data.id }, {
    ...deniedContext, idempotencyKey: 'idem_Repo-owner-suspend-denied'
  }), { ok: false, code: 'OWNER_CONTROL_REQUIRED' });
});

test('lower authority cannot suspend or revoke a higher-ranked assignment', async () => {
  const repo = createVolatileAuthorizationRepository();
  const higher = await repo.createAssignment({
    subjectId: 'admin-2', roleId: 'platform_admin', permissionIds: ['authorization.assignment.manage'], scope: PLATFORM_SCOPE,
    startsAt: context.now, expiresAt: '2026-08-14T12:00:00.000Z'
  }, context);
  assert.equal(higher.ok, true);
  const lower = actor({ id: 'care-manager', assignments: [assignment({
    id: 'assignment-care-manager', subjectId: 'care-manager', roleId: 'tiger_care',
    permissionIds: ['authorization.assignment.manage', 'authorization.permission.delegate']
  })] });
  const lowerContext = { ...context, actor: lower, reason: 'محاولة تجاوز السقف' };
  assert.deepEqual(await repo.suspendAssignment({ assignmentId: higher.data.id }, {
    ...lowerContext, idempotencyKey: 'idem_Repo-rank-suspend'
  }), { ok: false, code: 'DELEGATION_AUTHORITY_EXCEEDED' });
  assert.deepEqual(await repo.revokeAssignment({ assignmentId: higher.data.id }, {
    ...lowerContext, idempotencyKey: 'idem_Repo-rank-revoke'
  }), { ok: false, code: 'DELEGATION_AUTHORITY_EXCEEDED' });
});

test('future remote interface fails closed without verified online enforcement', async () => {
  const unconfigured = createRemoteAuthorizationRepository();
  assert.deepEqual(await unconfigured.createAssignment({}, context), { ok: false, code: 'CONFIGURATION_REQUIRED' });
  const offline = createRemoteAuthorizationRepository({ transport: async () => ({ ok: true }), verified: true, online: () => false });
  assert.deepEqual(await offline.revokeAssignment({}, context), { ok: false, code: 'OFFLINE_PRIVILEGED_DENIED' });
});

test('future remote interface rejects malformed and unconfirmed write success', async () => {
  const malformed = createRemoteAuthorizationRepository({
    verified: true,
    transport: async () => ({ ok: true, code: 'ASSIGNMENT_CREATED' })
  });
  assert.deepEqual(await malformed.createAssignment({}, context), {
    ok: false,
    code: 'REMOTE_CONFIRMATION_REQUIRED'
  });

  const invalid = createRemoteAuthorizationRepository({
    verified: true,
    transport: async () => ({ ok: true })
  });
  assert.deepEqual(await invalid.listAssignments({}, context), {
    ok: false,
    code: 'REMOTE_ENFORCEMENT_FAILED'
  });

  const brokenProbe = createRemoteAuthorizationRepository({
    verified: true,
    online: () => { throw new Error('probe failed'); },
    transport: async () => ({ ok: true, code: 'OK' })
  });
  assert.deepEqual(await brokenProbe.listAssignments({}, context), {
    ok: false,
    code: 'REMOTE_ENFORCEMENT_FAILED'
  });
});

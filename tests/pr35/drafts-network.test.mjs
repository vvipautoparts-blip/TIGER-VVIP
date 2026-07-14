import test from 'node:test';
import assert from 'node:assert/strict';
import { withRequestPolicy, createDedupeRegistry } from '../../scripts/pr35/pr35-network.js';
import { createDraftStore, createUserSubmissionQueue } from '../../scripts/pr35/pr35-drafts.js';
import { createLocalCareAdapter } from '../../scripts/pr35/pr35-local-adapter.js';
import { createProductionCareAdapter } from '../../scripts/pr35/pr35-production-adapter.js';

function memoryStorage() { const data = new Map(); return { getItem: (k) => data.get(k) ?? null,
  setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), data }; }
const input = { requesterId: 'user-1', category: 'support', priority: 'normal', subject: 'مساعدة', description: 'وصف الطلب', sectorId: 'sector-auto' };
const context = { actor: { id: 'user-1', kind: 'user' }, idempotencyKey: 'idem_Care-0001', correlationKey: 'corr_Care-0001', now: '2026-07-14T12:00:00.000Z' };
const scopedStaff = (permission, scope = { level: 'sector', sectorId: 'sector-auto' }, overrides = {}) => ({
  id: 'staff-1', kind: 'staff', accountState: 'active', permissions: [permission],
  assignments: [{ id: `assignment-${permission}`, subjectId: 'staff-1', roleId: 'tiger_care',
    permissionIds: [permission], scope, state: 'active', startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z' }],
  ...overrides
});

test('request policy retries only retryable operations with bounded jitter', async () => {
  let calls = 0; const delays = [];
  const result = await withRequestPolicy(async () => { calls++; if (calls < 3) throw Object.assign(new Error('x'), { retryable: true }); return 'ok'; },
    { timeoutMs: 1000, maxAttempts: 3, baseDelayMs: 1000, random: () => 1, sleep: async (ms) => delays.push(ms), idempotent: true });
  assert.equal(result, 'ok'); assert.equal(calls, 3); assert.deepEqual(delays, [1000, 2000]);
  calls = 0;
  await assert.rejects(() => withRequestPolicy(async () => { calls++; throw Object.assign(new Error('no'), { retryable: true }); },
    { timeoutMs: 100, maxAttempts: 3, sleep: async () => {}, idempotent: false }), (e) => e.code === 'REQUEST_FAILED');
  assert.equal(calls, 1);
});

test('request policy supports timeout and external cancellation', async () => {
  await assert.rejects(() => withRequestPolicy((signal) => new Promise((_r, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
    { timeoutMs: 10, maxAttempts: 1 }), (e) => e.code === 'REQUEST_TIMEOUT');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => withRequestPolicy(async () => 'no', { signal: controller.signal }), (e) => e.code === 'REQUEST_CANCELLED');
  await assert.rejects(() => withRequestPolicy(() => new Promise(() => {}), { timeoutMs: 10, maxAttempts: 1 }), (e) => e.code === 'REQUEST_TIMEOUT');
});

test('dedupe collapses concurrent calls and rejects key replay with changed payload', async () => {
  const dedupe = createDedupeRegistry(); let calls = 0;
  const a = dedupe.run('idem_same', { value: 1 }, async () => { calls++; return { ok: true }; });
  const b = dedupe.run('idem_same', { value: 1 }, async () => { calls++; return { ok: true }; });
  assert.equal(a, b); await a; assert.equal(calls, 1);
  await assert.rejects(() => dedupe.run('idem_same', { value: 2 }, async () => ({ ok: true })), (e) => e.code === 'IDEMPOTENCY_CONFLICT');
});

test('drafts and queue are session-scoped, bounded, sanitized and user-only', async () => {
  const storage = memoryStorage(); const drafts = createDraftStore(storage, 'session-a');
  assert.equal(drafts.save(input, { actorId: 'user-1' }).ok, true);
  assert.equal(drafts.load({ actorId: 'user-2' }).code, 'DRAFT_NOT_FOUND');
  assert.equal(drafts.save({ ...input, description: '<script>alert(1)</script>' }, { actorId: 'user-1' }).code, 'UNSAFE_CONTENT');
  const queue = createUserSubmissionQueue(storage, 'session-a');
  assert.equal(queue.enqueue(input, context).state, 'pending');
  assert.equal(queue.enqueue(input, context).code, 'DUPLICATE_SUBMISSION');
  assert.equal(queue.enqueue({ commandType: 'internal_note', ...input }, context).code, 'OFFLINE_PRIVILEGED_DENIED');
  assert.equal(queue.enqueue(input, { ...context, actor: { id: 'staff-1', kind: 'staff' }, idempotencyKey: 'idem_staff-01' }).code, 'OFFLINE_PRIVILEGED_DENIED');
  const flushed = await queue.flush(async () => ({ ok: false, code: 'NETWORK_UNAVAILABLE' }), context);
  assert.equal(flushed.items[0].state, 'failed');
});

test('successful queue entries are terminal and never resent by later flushes', async () => {
  const queue = createUserSubmissionQueue(memoryStorage(), 'session-success');
  assert.equal(queue.enqueue(input, context).ok, true);
  let sends = 0;
  const send = async () => { sends++; return { ok: true, code: 'REMOTE_CONFIRMED' }; };
  const first = await queue.flush(send, context);
  const second = await queue.flush(send, context);
  assert.equal(sends, 1);
  assert.equal(first.items[0].state, 'sent');
  assert.deepEqual(second.items, first.items);
});

test('local adapter isolates identity, messages/notes and idempotent operations', async () => {
  const adapter = createLocalCareAdapter({ clock: () => context.now });
  const created = await adapter.submitUserRequest(input, context);
  assert.equal(created.ok, true); assert.equal(created.receipt.email.status, 'not_configured');
  assert.equal((await adapter.submitUserRequest(input, context)).data.id, created.data.id);
  assert.equal((await adapter.submitUserRequest({ ...input, subject: 'changed' }, context)).code, 'IDEMPOTENCY_CONFLICT');
  assert.equal((await adapter.submitUserRequest({ ...input, requesterId: 'user-2' }, { ...context, idempotencyKey: 'idem_Forge-001' })).code, 'FORGED_IDENTITY');
  assert.equal((await adapter.getTicket(created.data.id, { ...context, actor: { id: 'user-2', kind: 'user' } })).code, 'TICKET_NOT_FOUND');
  const forged = await adapter.addUserMessage(created.data.id, { body: 'مرحبا', authorId: 'staff-1' }, context);
  assert.equal(forged.code, 'FORGED_IDENTITY');
  const message = await adapter.addUserMessage(created.data.id, { body: 'مرحبا' }, { ...context, idempotencyKey: 'idem_Message-1' });
  assert.equal(message.ok, true);
  const note = await adapter.addInternalNote(created.data.id, { body: 'ملاحظة داخلية' }, { ...context, actor: scopedStaff('care.internal_note.create'), idempotencyKey: 'idem_Note-001', reason: 'للمتابعة' });
  assert.equal(note.ok, true);
  const requesterView = await adapter.getTicket(created.data.id, context);
  assert.equal('internalNotes' in requesterView.data, false);
});

test('escalation is idempotent, audited and offline privileged writes fail closed', async () => {
  const adapter = createLocalCareAdapter({ clock: () => context.now, online: () => true });
  const created = await adapter.submitUserRequest(input, context);
  const transitionActor = scopedStaff('care.ticket.transition');
  await adapter.transitionTicket(created.data.id, { toStatus: 'acknowledged' }, { ...context, actor: transitionActor, idempotencyKey: 'idem_Ack-00001', reason: 'استلام الطلب' });
  const staff = { ...context, actor: scopedStaff('care.ticket.escalate'), idempotencyKey: 'idem_Escalate1', reason: 'تجاوز مستوى الدعم' };
  const escalated = await adapter.escalateTicket(created.data.id, { toTeamId: 'team-level-2' }, staff);
  assert.equal(escalated.ok, true); assert.equal(escalated.data.escalationHistory.length, 1);
  assert.deepEqual(await adapter.escalateTicket(created.data.id, { toTeamId: 'team-level-2' }, staff), escalated);
  const offline = createLocalCareAdapter({ online: () => false });
  assert.equal((await offline.addInternalNote('x', { body: 'x' }, staff)).code, 'OFFLINE_PRIVILEGED_DENIED');
  assert.equal((await offline.escalateTicket('x', {}, staff)).code, 'OFFLINE_PRIVILEGED_DENIED');
});

test('local staff access is denied outside the effective assignment scope', async () => {
  const adapter = createLocalCareAdapter({ clock: () => context.now });
  const scopedInput = { ...input, regionId: 'region-north', areaId: 'area-a', teamId: 'team-care' };
  const created = await adapter.submitUserRequest(scopedInput, context);
  const outsideScope = { level: 'team', sectorId: 'sector-auto', regionId: 'region-north', areaId: 'area-a', teamId: 'team-other' };
  const insideScope = { ...outsideScope, teamId: 'team-care' };
  const outside = scopedStaff('care.ticket.read.scoped', outsideScope);
  assert.equal((await adapter.getTicket(created.data.id, { ...context, actor: outside })).code, 'TICKET_NOT_FOUND');
  const outsideWriter = scopedStaff('care.message.create.scoped', outsideScope);
  assert.equal((await adapter.addStaffMessage(created.data.id, { body: 'محاولة عابرة' }, {
    ...context, actor: outsideWriter, idempotencyKey: 'idem_Scope-denied'
  })).code, 'SCOPE_DENIED');
  const inside = scopedStaff('care.ticket.read.scoped', insideScope);
  assert.equal((await adapter.getTicket(created.data.id, { ...context, actor: inside })).ok, true);
});

test('production and notification boundaries fail closed when unconfigured', async () => {
  let calls = 0;
  const prod = createProductionCareAdapter({ transport: async () => { calls++; return { ok: true }; } });
  for (const invoke of [
    () => prod.listTickets({ limit: 20 }, context),
    () => prod.submitUserRequest(input, context),
    () => prod.mutateTicket({ ticketId: 'x' }, context),
    () => prod.mutateAuthorization({ assignmentId: 'x' }, context),
    () => prod.appendAudit({ action: 'test' }, context)
  ]) assert.equal((await invoke()).code, 'CONFIGURATION_REQUIRED');
  assert.equal(calls, 0, 'an unverified transport must never be invoked');
  const verified = createProductionCareAdapter({ verified: true,
    transport: async () => { calls++; return { ok: true, code: 'REMOTE_CONFIRMED', receipt: { confirmed: true } }; } });
  assert.equal((await verified.submitUserRequest(input, { ...context, actor: { id: null, kind: 'user' } })).code, 'IDENTITY_REQUIRED');
  assert.equal(calls, 0, 'a verified transport must not receive an unauthenticated request');
  const local = createLocalCareAdapter({ notifier: { configured: false, send: async () => ({ ok: true }) } });
  const result = await local.submitUserRequest(input, context);
  assert.equal(result.receipt.email.status, 'not_configured');
  assert.equal(result.receipt.notification.status, 'not_configured');
});

test('production adapter rejects offline privileged writes and unconfirmed remote success', async () => {
  let calls = 0;
  const offline = createProductionCareAdapter({ verified: true, online: () => false,
    transport: async () => { calls++; return { ok: true, code: 'SAVED' }; } });
  assert.equal((await offline.mutateTicket({ ticketId: 'care-1' }, context)).code, 'OFFLINE_PRIVILEGED_DENIED');
  assert.equal((await offline.mutateAuthorization({ assignmentId: 'assignment-1' }, context)).code, 'OFFLINE_PRIVILEGED_DENIED');
  assert.equal((await offline.appendAudit({ action: 'ticket.update' }, context)).code, 'OFFLINE_PRIVILEGED_DENIED');
  assert.equal(calls, 0);

  const malformed = createProductionCareAdapter({ verified: true,
    transport: async () => ({ ok: true, code: 'SAVED' }) });
  assert.equal((await malformed.submitUserRequest(input, context)).code, 'REMOTE_CONFIRMATION_REQUIRED');

  const confirmed = createProductionCareAdapter({ verified: true,
    transport: async ({ operation }) => ({ ok: true, code: 'REMOTE_CONFIRMED', receipt: { confirmed: true, operation } }) });
  assert.equal((await confirmed.submitUserRequest(input, context)).ok, true);

  const brokenProbe = createProductionCareAdapter({ verified: true,
    online: () => { throw new Error('probe failed'); },
    transport: async () => ({ ok: true, code: 'OK' }) });
  assert.equal((await brokenProbe.listTickets({ limit: 20 }, context)).code, 'REMOTE_ENFORCEMENT_FAILED');
});

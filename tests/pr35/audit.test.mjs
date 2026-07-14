import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuditEvent, verifyAuditChain, rejectAuditMutation } from '../../scripts/pr35/pr35-audit.js';
import { PLATFORM_SCOPE } from './fixtures.mjs';

const base = { previousHash: null, actorId: 'owner-1', action: 'assignment.create', target: { type: 'assignment', id: 'a-1' },
  scope: PLATFORM_SCOPE, reason: 'حاجة تشغيلية موثقة', at: '2026-07-14T12:00:00.000Z',
  correlationKey: 'corr_Audit-1', idempotencyKey: 'idem_Audit-1', metadata: { roleId: 'tiger_care' } };

test('audit events are sanitized, frozen, deterministic, and hash chained', async () => {
  const first = await createAuditEvent({ previousHash: null, ...base });
  const again = await createAuditEvent({ previousHash: null, ...base });
  assert.equal(first.hash, again.hash);
  assert.ok(Object.isFrozen(first.event));
  assert.ok(Object.isFrozen(first.event.metadata));
  assert.equal(Object.getPrototypeOf(first.event.metadata), null);
  const second = await createAuditEvent({ ...base, previousHash: first.hash, action: 'assignment.suspend', at: '2026-07-14T12:01:00.000Z', idempotencyKey: 'idem_Audit-2' });
  assert.deepEqual(await verifyAuditChain([first, second]), { ok: true, code: 'AUDIT_CHAIN_VALID' });
  assert.deepEqual(await verifyAuditChain([first, { ...second, event: { ...second.event, previousHash: '0'.repeat(64) } }]), { ok: false, code: 'AUDIT_CHAIN_INVALID', index: 1 });
});

test('sensitive actions require reason and audit rejects secrets and unbounded metadata', async () => {
  await assert.rejects(createAuditEvent({ ...base, reason: '' }), (e) => e.code === 'REASON_REQUIRED');
  await assert.rejects(createAuditEvent({ ...base, metadata: { token: 'secret' } }), (e) => e.code === 'AUDIT_SECRET_FIELD');
  for (const key of ['access_token', 'refreshToken', 'api-key', 'session_id', 'set_cookie']) {
    await assert.rejects(createAuditEvent({ ...base, metadata: { [key]: 'sensitive' } }), (e) => e.code === 'AUDIT_SECRET_FIELD');
  }
  await assert.rejects(createAuditEvent({ ...base, metadata: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, i])) }), (e) => e.code === 'LIST_LIMIT_EXCEEDED');
  const polluted = JSON.parse('{"__proto__":{"admin":true}}');
  await assert.rejects(createAuditEvent({ ...base, metadata: polluted }), (e) => e.code === 'UNSAFE_KEY');
});

test('audit interface is append-only', () => {
  assert.deepEqual(rejectAuditMutation('update'), { ok: false, code: 'AUDIT_APPEND_ONLY' });
  assert.deepEqual(rejectAuditMutation('delete'), { ok: false, code: 'AUDIT_APPEND_ONLY' });
});

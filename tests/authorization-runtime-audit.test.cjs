'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const audit = require('../scripts/security/authorization-runtime-audit.js');

const D64_A = 'a'.repeat(64);
const D64_B = 'b'.repeat(64);

function baseEvent(overrides = {}) {
  return {
    correlation_id: 'corr-authz-0001',
    actor: 'partner:alpha',
    target: 'profile:target',
    action: 'GRANT_PERMISSION',
    decision: 'DENY',
    reason_code: 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE',
    authority_refs: ['grant:2222', 'lease:1111'],
    scope_digest: D64_A,
    policy_version: '2026-08-23',
    environment: 'REPOSITORY',
    release_digest: D64_B,
    previous_hash: null,
    extra_metadata: { surface: 'PROFILE_MORE_MENU' },
    ...overrides,
  };
}

function makeAdapter(overrides = {}) {
  return audit.createAuthorizationAuditAdapter({
    appendAuditChainEvent: async (input) => ({
      ok: true,
      reason_code: 'AUDIT_APPENDED',
      sequence_no: 42,
      event_hash: input.event_hash,
    }),
    ...overrides,
  });
}

test('audit adapter requires the existing audit-chain append port', () => {
  assert.throws(() => audit.createAuthorizationAuditAdapter({}), /audit.*chain|append.*port|existing/i);
});

test('structured authorization audit emits only bounded non-secret fields to the existing chain', async () => {
  let received = null;
  const adapter = makeAdapter({
    appendAuditChainEvent: async (input) => {
      received = input;
      return { ok: true, reason_code: 'AUDIT_APPENDED', sequence_no: 7 };
    },
  });

  const result = await adapter.appendAuthorizationDecision(baseEvent());
  assert.deepEqual(result, {
    ok: true,
    reason_code: 'AUDIT_APPENDED',
    sequence_no: 7,
  });

  assert.equal(received.stream_key, 'authorization:profile:target');
  assert.equal(received.previous_hash, null);
  assert.match(received.event_hash, /^[0-9a-f]{64}$/);
  assert.equal(received.release_digest, D64_B);
  assert.equal(received.correlation_id, 'corr-authz-0001');
  assert.equal(received.actor_subject, 'partner:alpha');
  assert.equal(received.agent_id, 'unified-authorization-runtime-bridge');
  assert.equal(received.decision, 'DENY');
  assert.equal(received.reason_code, 'SENSITIVE_PERMISSION_LEASE_GRANT_INACTIVE');
  assert.deepEqual(received.metadata, {
    target: 'profile:target',
    action: 'GRANT_PERMISSION',
    authority_refs: ['grant:2222', 'lease:1111'],
    scope_digest: D64_A,
    policy_version: '2026-08-23',
    environment: 'REPOSITORY',
    surface: 'PROFILE_MORE_MENU',
  });
});

test('event hash is deterministic over canonical non-secret authorization evidence', async () => {
  const hashes = [];
  const adapter = makeAdapter({
    appendAuditChainEvent: async (input) => {
      hashes.push(input.event_hash);
      return { ok: true, reason_code: 'AUDIT_APPENDED', sequence_no: hashes.length };
    },
  });

  await adapter.appendAuthorizationDecision(baseEvent());
  await adapter.appendAuthorizationDecision(baseEvent());
  assert.equal(hashes.length, 2);
  assert.equal(hashes[0], hashes[1]);

  await adapter.appendAuthorizationDecision(baseEvent({ reason_code: 'DIFFERENT_REASON' }));
  assert.notEqual(hashes[1], hashes[2]);
});

test('raw secret-bearing keys are rejected recursively before the audit chain port is called', async () => {
  let calls = 0;
  const adapter = makeAdapter({
    appendAuditChainEvent: async () => {
      calls += 1;
      return { ok: true, reason_code: 'AUDIT_APPENDED', sequence_no: 1 };
    },
  });

  const forbidden = [
    { extra_metadata: { otp: '123456' } },
    { extra_metadata: { nested: { password: 'secret' } } },
    { extra_metadata: { authorization_header: 'Bearer secret' } },
    { extra_metadata: { bearer_token: 'secret' } },
    { extra_metadata: { approval_code: '123456' } },
    { extra_metadata: { raw_prompt: 'private prompt' } },
    { extra_metadata: { rawPrompt: 'private prompt' } },
    { authority_refs: [{ secret: 'nope' }] },
  ];

  for (const patch of forbidden) {
    await assert.rejects(
      adapter.appendAuthorizationDecision(baseEvent(patch)),
      /secret|credential|raw|forbidden|sensitive/i,
    );
  }
  assert.equal(calls, 0);
});

test('audit metadata rejects client/browser authority-shaped fields rather than recording them', async () => {
  const adapter = makeAdapter();
  for (const key of ['role', 'roles', 'viewer_capabilities', 'grants', 'owner_step_up_evidence']) {
    await assert.rejects(
      adapter.appendAuthorizationDecision(baseEvent({ extra_metadata: { [key]: ['fake'] } })),
      /authority|client|browser|forbidden/i,
    );
  }
});

test('previous hash and release/scope digests are strictly validated', async () => {
  const adapter = makeAdapter();
  await assert.rejects(adapter.appendAuthorizationDecision(baseEvent({ release_digest: 'bad' })), /digest/i);
  await assert.rejects(adapter.appendAuthorizationDecision(baseEvent({ scope_digest: 'bad' })), /digest/i);
  await assert.rejects(adapter.appendAuthorizationDecision(baseEvent({ previous_hash: 'bad' })), /hash|digest/i);
});

test('unknown audit-chain response and transport failure are bounded fail-closed outcomes', async () => {
  const unknown = makeAdapter({
    appendAuditChainEvent: async () => ({ ok: false, reason_code: 'INTERNAL_DB_DETAIL' }),
  });
  const unavailable = makeAdapter({
    appendAuditChainEvent: async () => { throw new Error('database internals'); },
  });

  assert.deepEqual(await unknown.appendAuthorizationDecision(baseEvent()), {
    ok: false,
    reason_code: 'AUTHORIZATION_AUDIT_REJECTED',
    sequence_no: null,
  });
  assert.deepEqual(await unavailable.appendAuthorizationDecision(baseEvent()), {
    ok: false,
    reason_code: 'AUTHORIZATION_AUDIT_UNAVAILABLE',
    sequence_no: null,
  });
});

test('existing audit-chain reason codes are preserved without exposing internal payloads', async () => {
  const adapter = makeAdapter({
    appendAuditChainEvent: async () => ({
      ok: false,
      reason_code: 'AUDIT_PREVIOUS_HASH_MISMATCH',
      sequence_no: null,
      internal_detail: 'do not expose',
    }),
  });

  assert.deepEqual(await adapter.appendAuthorizationDecision(baseEvent()), {
    ok: false,
    reason_code: 'AUDIT_PREVIOUS_HASH_MISMATCH',
    sequence_no: null,
  });
});

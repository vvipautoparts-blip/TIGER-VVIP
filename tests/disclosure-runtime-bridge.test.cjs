'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const disclosure = require('../scripts/security/owner-sealed-disclosure.js');
const runtime = require('../scripts/security/disclosure-runtime-bridge.js');

const D64_A = 'a'.repeat(64);
const D64_B = 'b'.repeat(64);
const D64_C = 'c'.repeat(64);

function requestInput(overrides = {}) {
  return {
    id: 'disclosure-request:runtime-001',
    requester: 'user:alpha',
    artifact_id: 'artifact:owner-financial:001',
    classification: 'OWNER_ONLY',
    artifact_scope_digest: D64_A,
    purpose: 'view owner-sealed artifact',
    nonce_digest: D64_B,
    challenge_digest: D64_C,
    issued_at: '2026-08-23T00:00:00.000Z',
    expires_at: '2026-08-23T00:10:00.000Z',
    ...overrides,
  };
}

function ownerEvidence(overrides = {}) {
  return {
    authorization_id: '11111111-1111-4111-8111-111111111111',
    owner_subject: 'owner:root',
    action: 'APPROVE_DISCLOSURE',
    assurance: 'PHISHING_RESISTANT',
    challenge_digest: D64_C,
    scope_digest: D64_A,
    nonce_digest: D64_B,
    ...overrides,
  };
}

function makeBridge(overrides = {}) {
  return runtime.createDisclosureRuntimeBridge({
    issuePersistentDisclosureLease: async () => ({
      ok: true,
      reason_code: 'DISCLOSURE_LEASE_ISSUED',
      lease_id: '22222222-2222-4222-8222-222222222222',
      request_id: 'disclosure-request:runtime-001',
      expires_at: '2026-08-23T00:05:00.000Z',
    }),
    consumePersistentDisclosureLease: async () => ({
      ok: true,
      reason_code: 'DISCLOSURE_LEASE_CONSUMED',
      lease_id: '22222222-2222-4222-8222-222222222222',
    }),
    ...overrides,
  });
}

test('runtime bridge requires persistent issue and consume authority ports', () => {
  assert.throws(() => runtime.createDisclosureRuntimeBridge({}), /persistent|issue|consume|authority/i);
  assert.throws(
    () => runtime.createDisclosureRuntimeBridge({ issuePersistentDisclosureLease() {} }),
    /persistent|consume|authority/i,
  );
});

test('issue validates the canonical request but never treats JavaScript as the authority state machine', async () => {
  let received = null;
  const bridge = makeBridge({
    issuePersistentDisclosureLease: async (input) => {
      received = input;
      return {
        ok: true,
        reason_code: 'DISCLOSURE_LEASE_ISSUED',
        lease_id: '22222222-2222-4222-8222-222222222222',
        request_id: input.request_id,
        expires_at: '2026-08-23T00:05:00.000Z',
      };
    },
  });

  const request = disclosure.createDisclosureRequest(requestInput());
  const result = await bridge.issueDisclosureLease({
    request,
    owner_step_up_evidence: ownerEvidence(),
    audit_evidence_ref: 'audit:disclosure:001',
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason_code, 'DISCLOSURE_LEASE_ISSUED');
  assert.equal(result.lease_id, '22222222-2222-4222-8222-222222222222');
  assert.equal(Object.isFrozen(result), true);

  assert.deepEqual(received, {
    request_id: request.id,
    requester: request.requester,
    artifact_id: request.artifact_id,
    classification: request.classification,
    artifact_scope_digest: request.artifact_scope_digest,
    purpose: request.purpose,
    nonce_digest: request.nonce_digest,
    challenge_digest: request.challenge_digest,
    owner_authorization_id: ownerEvidence().authorization_id,
    request_expires_at: request.expires_at,
    audit_evidence_ref: 'audit:disclosure:001',
  });

  assert.equal(Object.hasOwn(result, 'status'), false);
  assert.equal(Object.hasOwn(result, 'owner_step_up_evidence'), false);
});

test('raw reusable secrets are rejected before the persistent authority is called', async () => {
  let calls = 0;
  const bridge = makeBridge({
    issuePersistentDisclosureLease: async () => {
      calls += 1;
      return { ok: true, reason_code: 'DISCLOSURE_LEASE_ISSUED', lease_id: 'x' };
    },
  });

  for (const evidence of [
    ownerEvidence({ owner_approval_code: '123456' }),
    ownerEvidence({ otp: '123456' }),
    ownerEvidence({ password: 'secret' }),
    ownerEvidence({ authorization_header: 'Bearer secret' }),
    ownerEvidence({ bearer_token: 'secret' }),
  ]) {
    await assert.rejects(
      bridge.issueDisclosureLease({
        request: disclosure.createDisclosureRequest(requestInput()),
        owner_step_up_evidence: evidence,
        audit_evidence_ref: 'audit:disclosure:001',
      }),
      /raw|secret|approval|token|credential/i,
    );
  }

  assert.equal(calls, 0);
});

test('one owner authorization cannot be locally resurrected after persistent authority rejects reuse', async () => {
  let issueCalls = 0;
  const bridge = makeBridge({
    issuePersistentDisclosureLease: async (input) => {
      issueCalls += 1;
      if (issueCalls === 1) {
        return {
          ok: true,
          reason_code: 'DISCLOSURE_LEASE_ISSUED',
          lease_id: '22222222-2222-4222-8222-222222222222',
          request_id: input.request_id,
          expires_at: '2026-08-23T00:05:00.000Z',
        };
      }
      return {
        ok: false,
        reason_code: 'DISCLOSURE_OWNER_AUTHORIZATION_REPLAY_OR_CONFLICT',
      };
    },
  });

  const evidence = ownerEvidence();
  const first = await bridge.issueDisclosureLease({
    request: disclosure.createDisclosureRequest(requestInput()),
    owner_step_up_evidence: evidence,
    audit_evidence_ref: 'audit:disclosure:001',
  });
  assert.equal(first.ok, true);

  const second = await bridge.issueDisclosureLease({
    request: disclosure.createDisclosureRequest(requestInput({
      id: 'disclosure-request:runtime-002',
      artifact_id: 'artifact:different',
    })),
    owner_step_up_evidence: evidence,
    audit_evidence_ref: 'audit:disclosure:002',
  });

  assert.equal(second.ok, false);
  assert.equal(second.reason_code, 'DISCLOSURE_OWNER_AUTHORIZATION_REPLAY_OR_CONFLICT');
});

test('replaying an old JavaScript ISSUED object cannot resurrect a persistently consumed lease', async () => {
  let consumeCalls = 0;
  const bridge = makeBridge({
    consumePersistentDisclosureLease: async () => {
      consumeCalls += 1;
      if (consumeCalls === 1) {
        return {
          ok: true,
          reason_code: 'DISCLOSURE_LEASE_CONSUMED',
          lease_id: '22222222-2222-4222-8222-222222222222',
        };
      }
      return {
        ok: false,
        reason_code: 'DISCLOSURE_LEASE_REPLAY_OR_CONFLICT',
        lease_id: '22222222-2222-4222-8222-222222222222',
      };
    },
  });

  const request = disclosure.createDisclosureRequest(requestInput());
  const staleIssuedObject = Object.freeze({
    id: '22222222-2222-4222-8222-222222222222',
    status: 'ISSUED',
    request_id: request.id,
  });

  const first = await bridge.consumeDisclosureLease({ lease: staleIssuedObject, request });
  assert.equal(first.ok, true);
  assert.equal(first.reason_code, 'DISCLOSURE_LEASE_CONSUMED');

  const replay = await bridge.consumeDisclosureLease({ lease: staleIssuedObject, request });
  assert.equal(replay.ok, false);
  assert.equal(replay.reason_code, 'DISCLOSURE_LEASE_REPLAY_OR_CONFLICT');
});

test('consume sends exact request bindings and only the lease identifier, not client authority state', async () => {
  let received = null;
  const bridge = makeBridge({
    consumePersistentDisclosureLease: async (input) => {
      received = input;
      return {
        ok: true,
        reason_code: 'DISCLOSURE_LEASE_CONSUMED',
        lease_id: input.lease_id,
      };
    },
  });

  const request = disclosure.createDisclosureRequest(requestInput());
  const result = await bridge.consumeDisclosureLease({
    lease: Object.freeze({
      id: '22222222-2222-4222-8222-222222222222',
      status: 'REVOKED',
      request_id: 'tampered-local-state',
      raw_secret: 'must-not-be-sent',
    }),
    request,
  });

  assert.equal(result.ok, true, 'persistent authority result is canonical, not the stale local status');
  assert.deepEqual(received, {
    lease_id: '22222222-2222-4222-8222-222222222222',
    request_id: request.id,
    requester: request.requester,
    artifact_id: request.artifact_id,
    classification: request.classification,
    artifact_scope_digest: request.artifact_scope_digest,
    purpose: request.purpose,
    nonce_digest: request.nonce_digest,
    challenge_digest: request.challenge_digest,
  });
});

test('unknown database reason codes and transport failures map fail closed', async () => {
  const unknown = makeBridge({
    consumePersistentDisclosureLease: async () => ({ ok: false, reason_code: 'SOMETHING_UNEXPECTED' }),
  });
  const unavailable = makeBridge({
    consumePersistentDisclosureLease: async () => {
      throw new Error('database unavailable and internal details must not leak');
    },
  });
  const request = disclosure.createDisclosureRequest(requestInput());
  const lease = { id: '22222222-2222-4222-8222-222222222222' };

  const unknownResult = await unknown.consumeDisclosureLease({ lease, request });
  assert.deepEqual(unknownResult, {
    ok: false,
    reason_code: 'DISCLOSURE_AUTHORITY_DENIED',
    lease_id: null,
  });

  const unavailableResult = await unavailable.consumeDisclosureLease({ lease, request });
  assert.deepEqual(unavailableResult, {
    ok: false,
    reason_code: 'DISCLOSURE_AUTHORITY_UNAVAILABLE',
    lease_id: null,
  });
});

test('legacy in-memory issue/consume APIs cannot claim persistent authority', () => {
  const request = disclosure.createDisclosureRequest(requestInput());

  assert.throws(
    () => disclosure.approveDisclosure(request, ownerEvidence(), '2026-08-23T00:02:00.000Z'),
    /persistent|authority|runtime/i,
  );
  assert.throws(
    () => disclosure.consumeDisclosureLease({ status: 'ISSUED' }, request, '2026-08-23T00:03:00.000Z'),
    /persistent|authority|runtime/i,
  );
});

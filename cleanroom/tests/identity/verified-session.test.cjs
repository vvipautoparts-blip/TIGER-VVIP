'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeVerifiedSession } = require('../../domain/identity/verified-session.cjs');

test('accepts only an already-verified external identity mapping', () => {
  const result = normalizeVerifiedSession({
    userId: 'usr_001',
    externalProvider: 'provider-neutral-example',
    externalSubject: 'sub_001',
    sessionId: 'sess_001',
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.userId, 'usr_001');
});

test('rejects local password material fail-closed', () => {
  for (const forbidden of ['password', 'passwordHash', 'encrypted_password', 'credential']) {
    const result = normalizeVerifiedSession({
      userId: 'usr_001', externalProvider: 'x', externalSubject: 'sub', sessionId: 'sess',
      [forbidden]: 'secret',
    });
    assert.deepEqual(result, { ok: false, code: 'LOCAL_CREDENTIAL_MATERIAL_FORBIDDEN' });
  }
});

test('rejects incomplete unverified identity state', () => {
  assert.deepEqual(
    normalizeVerifiedSession({ userId: 'usr_001' }),
    { ok: false, code: 'VERIFIED_EXTERNAL_SESSION_REQUIRED' }
  );
});

test('returns a minimal identity object and drops untrusted extra claims', () => {
  const result = normalizeVerifiedSession({
    userId: ' usr_001 ',
    externalProvider: ' oidc-provider ',
    externalSubject: ' sub_001 ',
    sessionId: ' sess_001 ',
    role: 'OWNER',
    isAdmin: true,
  });
  assert.deepEqual(result, {
    ok: true,
    value: {
      userId: 'usr_001',
      externalProvider: 'oidc-provider',
      externalSubject: 'sub_001',
      sessionId: 'sess_001',
    },
  });
});

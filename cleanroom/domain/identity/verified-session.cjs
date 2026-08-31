'use strict';

const FORBIDDEN = Object.freeze([
  'password',
  'passwordHash',
  'encrypted_password',
  'credential',
]);

function failure(code) {
  return Object.freeze({ ok: false, code });
}

function normalizeVerifiedSession(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return failure('VERIFIED_EXTERNAL_SESSION_REQUIRED');
  }

  if (FORBIDDEN.some((key) => Object.hasOwn(input, key))) {
    return failure('LOCAL_CREDENTIAL_MATERIAL_FORBIDDEN');
  }

  const required = ['userId', 'externalProvider', 'externalSubject', 'sessionId'];
  if (required.some((key) => typeof input[key] !== 'string' || input[key].trim() === '')) {
    return failure('VERIFIED_EXTERNAL_SESSION_REQUIRED');
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      userId: input.userId.trim(),
      externalProvider: input.externalProvider.trim(),
      externalSubject: input.externalSubject.trim(),
      sessionId: input.sessionId.trim(),
    }),
  });
}

module.exports = Object.freeze({ normalizeVerifiedSession });

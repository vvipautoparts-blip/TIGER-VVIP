'use strict';

const OWNER_SUBJECT = /^[A-Za-z0-9_-]{1,128}$/;

function fail(cause) {
  const error = new Error('media_authentication_unavailable');
  error.code = 'media_authentication_unavailable';
  if (cause) error.cause = cause;
  throw error;
}

function normalizeAuthorizedParties(values) {
  if (!Array.isArray(values) || values.length === 0) fail();
  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    if (typeof value !== 'string' || value === '*' || value.includes('*')) fail();
    let url;
    try {
      url = new URL(value);
    } catch (cause) {
      fail(cause);
    }
    if (
      url.protocol !== 'https:'
      || !url.hostname
      || url.username
      || url.password
      || url.pathname !== '/'
      || url.search
      || url.hash
    ) fail();

    const origin = url.origin;
    if (seen.has(origin)) fail();
    seen.add(origin);
    normalized.push(origin);
  }

  return Object.freeze(normalized);
}

function createClerkRequestAuthenticator(options) {
  const client = options && options.client;
  if (!client || typeof client.authenticateRequest !== 'function') fail();
  const authorizedParties = normalizeAuthorizedParties(options.authorizedParties);

  return async function authenticate(request) {
    if (!request || typeof request !== 'object') fail();

    let state;
    try {
      state = await client.authenticateRequest(request, {
        acceptsToken: 'session_token',
        authorizedParties: [...authorizedParties],
      });
    } catch (cause) {
      fail(cause);
    }

    if (!state || typeof state !== 'object' || typeof state.isAuthenticated !== 'boolean') fail();
    if (state.isAuthenticated === false) return Object.freeze({ authenticated: false });
    if (typeof state.toAuth !== 'function') fail();

    let auth;
    try {
      auth = state.toAuth();
    } catch (cause) {
      fail(cause);
    }
    if (!auth || typeof auth !== 'object' || !OWNER_SUBJECT.test(auth.userId || '')) fail();

    return Object.freeze({ authenticated: true, clerkUserId: auth.userId });
  };
}

exports.createClerkRequestAuthenticator = createClerkRequestAuthenticator;
Object.freeze(module.exports);

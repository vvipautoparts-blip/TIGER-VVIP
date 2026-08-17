'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  createClerkRequestAuthenticator,
} = require('../scripts/media/server/aws/f05-clerk-request-auth.js');

const ORIGINS = ['https://www.example.com', 'https://staging.example.com'];

function fakeClient(stateOrFactory) {
  const calls = [];
  return {
    calls,
    client: {
      async authenticateRequest(request, options) {
        calls.push({ request, options });
        if (typeof stateOrFactory === 'function') return stateOrFactory(request, options);
        return stateOrFactory;
      },
    },
  };
}

function signedIn(userId = 'user_2abcDEF_123') {
  return {
    isAuthenticated: true,
    toAuth() { return { userId, sessionId: 'sess_private', orgId: 'org_private' }; },
  };
}

function signedOut() {
  return {
    isAuthenticated: false,
    toAuth() { throw new Error('must not call toAuth for signed-out state'); },
  };
}

test('authenticated Clerk request yields only the minimal F05 actor and exact Clerk options', async () => {
  const fake = fakeClient(signedIn());
  const authenticate = createClerkRequestAuthenticator({
    client: fake.client,
    authorizedParties: ['https://www.example.com/', 'https://staging.example.com'],
  });
  const request = new Request('https://api.example.com/media', { method: 'POST' });

  const actor = await authenticate(request);

  assert.deepEqual(actor, { authenticated: true, clerkUserId: 'user_2abcDEF_123' });
  assert.equal(Object.isFrozen(actor), true);
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].request, request);
  assert.deepEqual(fake.calls[0].options, {
    acceptsToken: 'session_token',
    authorizedParties: ORIGINS,
  });
  assert.equal('sessionId' in actor, false);
  assert.equal('orgId' in actor, false);
});

test('unauthenticated Clerk state returns only a frozen denial actor', async () => {
  const fake = fakeClient(signedOut());
  const authenticate = createClerkRequestAuthenticator({ client: fake.client, authorizedParties: ORIGINS });
  const actor = await authenticate(new Request('https://api.example.com/media'));
  assert.deepEqual(actor, { authenticated: false });
  assert.equal(Object.isFrozen(actor), true);
});

test('constructor rejects invalid authorized parties and dependencies before Clerk is called', () => {
  const validClient = { authenticateRequest() {} };
  const invalidLists = [
    undefined,
    [],
    ['*'],
    ['http://example.com'],
    ['https://example.com/path'],
    ['https://example.com?x=1'],
    ['https://example.com#fragment'],
    ['https://user:pass@example.com'],
    ['https://example.com', 'https://EXAMPLE.com/'],
  ];
  assert.throws(() => createClerkRequestAuthenticator(), /media_authentication_unavailable/);
  assert.throws(
    () => createClerkRequestAuthenticator({ client: {}, authorizedParties: ORIGINS }),
    /media_authentication_unavailable/
  );
  for (const authorizedParties of invalidLists) {
    assert.throws(
      () => createClerkRequestAuthenticator({ client: validClient, authorizedParties }),
      /media_authentication_unavailable/
    );
  }
});

test('malformed authenticated states and Clerk failures fail closed', async () => {
  for (const state of [
    null,
    {},
    { isAuthenticated: true },
    { isAuthenticated: true, toAuth: () => ({}) },
    signedIn('bad user!'),
  ]) {
    const fake = fakeClient(state);
    const authenticate = createClerkRequestAuthenticator({ client: fake.client, authorizedParties: ORIGINS });
    await assert.rejects(
      authenticate(new Request('https://api.example.com/media')),
      /media_authentication_unavailable/
    );
  }

  const thrown = fakeClient(() => { throw new Error('clerk unavailable'); });
  const authenticate = createClerkRequestAuthenticator({ client: thrown.client, authorizedParties: ORIGINS });
  await assert.rejects(
    authenticate(new Request('https://api.example.com/media')),
    /media_authentication_unavailable/
  );
});

test('source contract forbids secrets, env access, manual JWT handling, and alternate token types', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'media', 'server', 'aws', 'f05-clerk-request-auth.js'),
    'utf8'
  );
  assert.doesNotMatch(source, /process\.env|CLERK_(SECRET|PUBLISHABLE|JWT)_KEY/i);
  assert.doesNotMatch(source, /jsonwebtoken|jwt-decode|verifyToken|decodeJwt|jose/i);
  assert.doesNotMatch(source, /api_key|oauth_token|m2m_token|acceptsToken\s*:\s*['"]any['"]/i);
  assert.match(source, /acceptsToken\s*:\s*['"]session_token['"]/);
  assert.doesNotMatch(source, /console\.|authorization|cookie/i);
});

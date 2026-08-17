# F05 Clerk Request Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert an incoming Fetch-compatible request into the minimal trusted F05 actor using Clerk `authenticateRequest()` without introducing a second identity authority or exposing credentials.

**Architecture:** Add one CommonJS adapter under `scripts/media/server/aws/` that receives an injected Clerk-compatible client and an exact HTTPS `authorizedParties` allowlist. The adapter authenticates exactly once with `acceptsToken: 'session_token'`, returns only `{ authenticated: false }` or `{ authenticated: true, clerkUserId }`, and fails closed on malformed Clerk protocol/dependency states. Existing listing ownership and media authorization remain unchanged.

**Tech Stack:** Node.js CommonJS, built-in `URL`, Node `node:test` + `node:assert/strict`, injected Clerk backend client contract.

## Global Constraints

- Clerk remains the only identity authority.
- Use injected `client.authenticateRequest(request, options)`; do not import a second authentication SDK into this adapter.
- `acceptsToken` must be exactly `'session_token'`.
- `authorizedParties` must be a non-empty list of unique exact HTTPS origins; wildcard entries are forbidden.
- The adapter must not access `process.env` or contain Clerk secret/public/JWT key names.
- No manual JWT decode/verify logic, cookie parser, session store, API-key, OAuth-token, or M2M-token fallback.
- No AWS, Supabase, DNS, Amplify, Clerk Dashboard, credential, or Production mutation.
- PR #268 remains stacked on `feat/f05-aws-production-media-runtime-20260817`; never retarget this work to `main`.

---

### Task 1: Define the Clerk request-authentication contract with a failing test

**Files:**
- Create: `tests/f05-clerk-request-auth.test.cjs`
- Verify absent before implementation: `scripts/media/server/aws/f05-clerk-request-auth.js`

**Interfaces:**
- Consumes: none beyond Node built-ins and the planned module path.
- Produces: executable contract for `createClerkRequestAuthenticator({ client, authorizedParties })` and returned `authenticate(request)`.

- [ ] **Step 1: Write the RED contract test**

Create `tests/f05-clerk-request-auth.test.cjs` with the following contract:

```js
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
  for (const state of [null, {}, { isAuthenticated: true }, { isAuthenticated: true, toAuth: () => ({}) }, signedIn('bad user!')]) {
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
```

- [ ] **Step 2: Commit the RED test without the implementation module**

Commit only the test file. The module path must remain absent so the contract fails with `MODULE_NOT_FOUND`.

```bash
git add tests/f05-clerk-request-auth.test.cjs
git commit -m "test(f05): define Clerk request authentication contract"
```

- [ ] **Step 3: Verify RED through the repository gate**

Expected result: VVIP Quality Gate fails because `scripts/media/server/aws/f05-clerk-request-auth.js` is intentionally absent. CleanGuard / Zero-Residue / Project Control may remain green; the RED evidence must be tied to the exact test-only SHA.

---

### Task 2: Implement the minimal fail-closed Clerk adapter

**Files:**
- Create: `scripts/media/server/aws/f05-clerk-request-auth.js`
- Test: `tests/f05-clerk-request-auth.test.cjs`

**Interfaces:**
- Consumes: injected object with `authenticateRequest(request, { acceptsToken, authorizedParties })`.
- Produces: `createClerkRequestAuthenticator(options) -> async authenticate(request)`.
- Success output: frozen `{ authenticated: true, clerkUserId: string }`.
- Denial output: frozen `{ authenticated: false }`.
- Infrastructure/protocol error: throws error code `media_authentication_unavailable`.

- [ ] **Step 1: Implement exact origin normalization and dependency validation**

Create `scripts/media/server/aws/f05-clerk-request-auth.js`:

```js
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
```

- [ ] **Step 2: Implement one-call request authentication and minimal actor projection**

Append the factory:

```js
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
```

- [ ] **Step 3: Commit the implementation**

```bash
git add scripts/media/server/aws/f05-clerk-request-auth.js
git commit -m "feat(f05): authenticate Clerk requests before media authorization"
```

- [ ] **Step 4: Verify focused tests become GREEN**

Run/observe the repository Quality Gate and confirm `tests/f05-clerk-request-auth.test.cjs` passes while existing F05 ownership and production-binding tests remain green.

---

### Task 3: Record exact verification evidence and prepare independent review

**Files:**
- Modify: `docs/superpowers/plans/2026-08-17-f05-clerk-request-auth.md`
- Modify PR #268 body only after final gate results are known.

**Interfaces:**
- Consumes: exact final implementation SHA and GitHub Actions conclusions.
- Produces: reviewable evidence that the same final SHA passed all required gates.

- [ ] **Step 1: Verify all required protected checks on the exact final SHA**

Required conclusions on one SHA:

```text
VVIP Quality Gate: success
TIGER CleanGuard: success
Zero-Residue Full History: success
Project Control Integrity: success
```

Do not claim completion while any run is queued, in progress, skipped unexpectedly, or failed.

- [ ] **Step 2: Verify scope and source invariants before review**

Confirm the PR diff contains only the design, plan, focused test, and focused adapter. Confirm no `process.env`, Clerk credentials, AWS/Supabase mutation, deployment workflow, DNS, or `main` retargeting was introduced.

- [ ] **Step 3: Update PR #268 evidence and make it Ready for independent review**

The PR description must identify the RED SHA, final GREEN SHA, four gate conclusions, and explicitly state that this PR does not configure Clerk Dashboard/Production or deploy anything.

- [ ] **Step 4: Request independent review from `nzuodezuode-byte`**

Do not merge until the independent approval is present and the exact final SHA remains unchanged after approval.

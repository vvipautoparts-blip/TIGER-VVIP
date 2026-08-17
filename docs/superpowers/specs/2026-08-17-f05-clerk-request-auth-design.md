# F05 Clerk Request Authentication Design

## Purpose

Close the F05 server-side authentication gap without creating a second authentication authority, without parsing Clerk JWTs manually, and without coupling the AWS media boundary to Next.js runtime helpers.

## Existing context

The repository already uses Clerk server-side primitives through `@clerk/nextjs/server`, while the F05 AWS binding currently accepts a pre-built actor shaped like `{ authenticated, clerkUserId }` and then checks listing ownership. The missing boundary is the conversion of an incoming HTTP `Request` into that trusted actor.

Clerk's current backend API provides `authenticateRequest(request, options)` for request authentication. Clerk recommends explicitly configuring `authorizedParties` to constrain accepted frontend origins, and `acceptsToken` can be restricted to `session_token`.

## Authority decision

Clerk remains the only identity authority. F05 must not implement its own JWT parser, signature verification code, cookie parser, session store, or alternate user identity mapping.

The adapter will consume an injected Clerk-compatible client exposing `authenticateRequest()`. Secret keys, publishable keys, JWT public keys, and environment-variable loading remain the responsibility of the deployment composition root, not this adapter.

## Architecture

Add one small CommonJS server-side adapter under the existing F05 AWS boundary:

- factory: `createClerkRequestAuthenticator({ client, authorizedParties })`;
- dependency: injected `client.authenticateRequest(request, options)`;
- input: a Fetch-compatible `Request`;
- output on valid signed-in session: frozen `{ authenticated: true, clerkUserId }`;
- output on legitimate unauthenticated/invalid session: frozen `{ authenticated: false }`;
- dependency/protocol failure: throw stable `media_authentication_unavailable`;
- no access to listing data, image bytes, AWS services, Supabase, or deployment configuration.

The resulting actor is intentionally compatible with the existing `createAwsProductionBindings().authorizeAdMedia(actor, scope)` contract, so the ownership check remains unchanged.

## Request-authentication contract

For every request the adapter will call Clerk exactly once with:

- `acceptsToken: 'session_token'`;
- the exact validated `authorizedParties` allowlist supplied at construction;
- no permissive wildcard;
- no fallback token type.

After Clerk returns:

1. If the request state is not authenticated, return `{ authenticated: false }`.
2. If authenticated, call `toAuth()` and require a bounded opaque Clerk `userId`.
3. Return only `{ authenticated: true, clerkUserId: userId }`.
4. Never expose session IDs, tokens, claims, authorization headers, cookies, or Clerk debug material to downstream F05 code.

## `authorizedParties` validation

Construction fails closed unless `authorizedParties` is a non-empty array of unique exact HTTPS origins.

Each entry must:

- parse as an absolute URL;
- use `https:`;
- contain a hostname;
- have no username/password;
- have no path other than `/`;
- have no query or fragment;
- be normalized to `URL.origin`;
- not be `*` or otherwise wildcarded.

This keeps production/staging origins explicit and avoids hidden origin broadening. Local insecure development is outside this production adapter's scope.

## Error handling

The adapter distinguishes authentication denial from authentication infrastructure failure:

- Clerk says unauthenticated / invalid session -> `{ authenticated: false }`;
- authenticated state lacks a valid user ID -> `media_authentication_unavailable`;
- Clerk client throws, returns malformed state, or violates the expected contract -> `media_authentication_unavailable`.

All such outcomes fail closed before listing ownership or media processing can succeed.

## Security invariants

- No `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_JWT_KEY`, token, cookie, or credential is embedded or loaded by the adapter.
- No `process.env` access in the adapter.
- No manual JWT decoding or verification.
- No acceptance of API keys, OAuth tokens, or machine-to-machine tokens.
- No wildcard `authorizedParties`.
- No trust in caller-supplied `actor` data once this request boundary is integrated.
- No authentication data is written to logs/audit by this module.
- No AWS, Supabase, DNS, Amplify, Clerk Dashboard, or Production mutation is part of this change.

## Testing strategy

Use TDD with an injected fake Clerk client only; tests perform no Clerk network requests.

Required contract tests:

1. RED: implementation module intentionally absent.
2. Valid authenticated Clerk state yields exactly `{ authenticated: true, clerkUserId }`.
3. Clerk receives `acceptsToken: 'session_token'` and exact normalized `authorizedParties`.
4. Unauthenticated state yields only `{ authenticated: false }`.
5. Invalid/missing `userId` after an authenticated response fails closed.
6. Thrown Clerk errors and malformed response states fail closed.
7. Invalid, empty, duplicate, wildcard, HTTP, path-bearing, query-bearing, or fragment-bearing authorized parties fail at construction.
8. Source-level assertions forbid `process.env`, Clerk secret names, manual JWT parsing/verification, and alternate token types.
9. Existing F05 authorization tests remain green without weakening ownership checks.
10. Repository Quality Gate, CleanGuard, Zero-Residue, and Project Control must all pass on one exact final SHA.

## Integration sequence

This PR will add only the authenticator adapter and its focused tests. Wiring it into a deployed AWS ingress/composition root will be a later scoped change after the deployment configuration can inject the Clerk client and exact production/staging origins securely.

This separation avoids prematurely adding Clerk secrets, runtime configuration, or infrastructure mutation to a source-only authentication contract PR.

## Non-goals

This change does not:

- deploy AWS infrastructure;
- configure Clerk Dashboard settings or production keys;
- read or create secrets;
- change Supabase Production;
- implement the trusted JPEG/WebP engine;
- implement durable AWS sinks;
- alter DNS or Amplify;
- merge PR #264 to `main`;
- claim F05 or Global Launch readiness.

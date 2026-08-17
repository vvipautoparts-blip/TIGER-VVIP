# F05 Clerk Request Authentication Implementation Plan

**Goal:** Convert an incoming Fetch-compatible request into the minimal trusted F05 actor using Clerk `authenticateRequest()` without introducing a second identity authority or exposing credentials.

**Architecture:** One CommonJS adapter under `scripts/media/server/aws/` receives an injected Clerk-compatible client and an exact HTTPS `authorizedParties` allowlist. It authenticates exactly once with `acceptsToken: 'session_token'`, returns only `{ authenticated: false }` or `{ authenticated: true, clerkUserId }`, and fails closed on malformed Clerk protocol/dependency states. Existing listing ownership and media authorization remain unchanged.

## Constraints

- Clerk remains the only identity authority.
- No manual JWT parsing or verification.
- No `process.env` or embedded Clerk credentials in the adapter.
- No wildcard `authorizedParties`; exact HTTPS origins only.
- No API-key, OAuth-token, or M2M-token fallback.
- No AWS, Supabase, DNS, Amplify, Clerk Dashboard, credential, or Production mutation.
- PR #268 remains stacked on `feat/f05-aws-production-media-runtime-20260817`; never targets `main`.

## Task 1 — RED contract

- [x] Added `tests/f05-clerk-request-auth.test.cjs` before implementation.
- [x] RED SHA: `84a15889f037f872f2a3d4658205f1fe9ce6a4f0`.
- [x] VVIP Quality Gate #1311 failed for the intended reason only: `MODULE_NOT_FOUND` for `scripts/media/server/aws/f05-clerk-request-auth.js`.
- [x] CleanGuard, Zero-Residue Full History, and Project Control Integrity remained green on the RED SHA.

## Task 2 — Minimal fail-closed adapter

- [x] Added `scripts/media/server/aws/f05-clerk-request-auth.js`.
- [x] Validates a non-empty list of unique exact HTTPS origins.
- [x] Calls injected `client.authenticateRequest()` exactly once with `acceptsToken: 'session_token'` and normalized `authorizedParties`.
- [x] Signed-out state returns frozen `{ authenticated: false }`.
- [x] Signed-in state returns only frozen `{ authenticated: true, clerkUserId }`.
- [x] Malformed Clerk protocol/dependency states throw stable `media_authentication_unavailable`.
- [x] Focused source assertions forbid env/credential access, manual JWT helpers, alternate token types, and auth-data logging primitives.

## Task 3 — Verification evidence

- [x] Implementation GREEN SHA: `c14b4f687ebd85bd85126eb4f9c003f14f8d4327` passed Quality Gate #1314, CleanGuard #840, Zero-Residue #66, and Project Control #1516.
- [x] Evidence-only documentation commit produced final review SHA `c6b0cdc50f5d7fe70b4f41e8070c6ab677a4916b`.
- [x] Final review SHA gates: VVIP Quality Gate #1315 PASS; TIGER CleanGuard #841 PASS; Zero-Residue Full History #67 PASS; Project Control Integrity #1517 PASS.
- [x] Final PR diff scope is limited to the design, this plan, the focused Clerk test, and the focused Clerk adapter.
- [x] No deploy workflow, secret, Production mutation, DNS, AWS permission, Supabase change, Clerk Dashboard change, or `main` retargeting was introduced.

## Review gate

The final review head is `c6b0cdc50f5d7fe70b4f41e8070c6ab677a4916b`. Request independent review from `nzuodezuode-byte`. Do not merge until that independent approval is present and the reviewed head remains unchanged.

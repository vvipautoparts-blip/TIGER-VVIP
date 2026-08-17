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

Implementation GREEN SHA before this evidence-only commit: `c14b4f687ebd85bd85126eb4f9c003f14f8d4327`.

Fresh protected checks on that implementation SHA:

- [x] VVIP Quality Gate #1314 — PASS
- [x] TIGER CleanGuard #840 — PASS
- [x] Zero-Residue Full History #66 — PASS
- [x] Project Control Integrity #1516 — PASS

PR diff scope at the verified implementation SHA consisted only of:

- `docs/superpowers/specs/2026-08-17-f05-clerk-request-auth-design.md`
- `docs/superpowers/plans/2026-08-17-f05-clerk-request-auth.md`
- `tests/f05-clerk-request-auth.test.cjs`
- `scripts/media/server/aws/f05-clerk-request-auth.js`

## Final-review rule

This evidence update is documentation-only and therefore creates a new PR head SHA. The four protected checks must pass again on that exact final head before the PR is made Ready for independent review. Do not merge until independent approval is present and the approved head SHA remains unchanged.

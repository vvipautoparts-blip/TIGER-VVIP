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

## Task 3 — Verification method

- [x] Implementation SHA `c14b4f687ebd85bd85126eb4f9c003f14f8d4327` passed VVIP Quality Gate #1314, TIGER CleanGuard #840, Zero-Residue Full History #66, and Project Control Integrity #1516.
- [x] A later documentation-only head `c6b0cdc50f5d7fe70b4f41e8070c6ab677a4916b` independently re-passed VVIP Quality Gate #1315, TIGER CleanGuard #841, Zero-Residue Full History #67, and Project Control Integrity #1517.
- [x] PR diff scope is limited to the design, this plan, the focused Clerk test, and the focused Clerk adapter.
- [x] No deploy workflow, secret, Production mutation, DNS, AWS permission, Supabase change, Clerk Dashboard change, or `main` retargeting was introduced.

## Final review rule

This document intentionally does not hard-code the eventual final review SHA because committing such a value would itself create another SHA. After this document is committed, make no further source or documentation changes. Verify VVIP Quality Gate, TIGER CleanGuard, Zero-Residue Full History, and Project Control Integrity on that exact final PR head, then record the exact head SHA and gate run numbers in PR #268 metadata/body only. PR metadata updates do not change the reviewed commit. Request independent review from `nzuodezuode-byte` only after those four gates are green. Do not merge until the independent approval is present and the reviewed head remains unchanged.

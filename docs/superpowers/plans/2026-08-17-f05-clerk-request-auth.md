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

## RED evidence

- RED SHA: `84a15889f037f872f2a3d4658205f1fe9ce6a4f0`.
- VVIP Quality Gate #1311 failed for the intended reason only: `MODULE_NOT_FOUND` for `scripts/media/server/aws/f05-clerk-request-auth.js`.
- CleanGuard, Zero-Residue Full History, and Project Control Integrity remained green on that RED SHA.

## Implementation

- Added `tests/f05-clerk-request-auth.test.cjs` before implementation.
- Added `scripts/media/server/aws/f05-clerk-request-auth.js` only after RED was proven.
- Exact HTTPS `authorizedParties` validation; no wildcard.
- Exactly one injected Clerk `authenticateRequest()` call with `acceptsToken: 'session_token'`.
- Signed-out -> frozen `{ authenticated: false }`.
- Signed-in -> only frozen `{ authenticated: true, clerkUserId }`.
- Malformed Clerk protocol/dependency states -> stable `media_authentication_unavailable`.
- Source assertions forbid env/credential access, manual JWT helpers, alternate token types, and auth-data logging primitives.

## Verification method

Implementation SHA `c14b4f687ebd85bd85126eb4f9c003f14f8d4327` passed VVIP Quality Gate #1314, TIGER CleanGuard #840, Zero-Residue Full History #66, and Project Control Integrity #1516.

Subsequent documentation-only heads were also re-verified. The exact final review SHA and its four gate run numbers are intentionally maintained in PR #268 metadata/body, not here, so recording them does not create another commit SHA.

## Scope

The PR diff is limited to:

- `docs/superpowers/specs/2026-08-17-f05-clerk-request-auth-design.md`
- `docs/superpowers/plans/2026-08-17-f05-clerk-request-auth.md`
- `tests/f05-clerk-request-auth.test.cjs`
- `scripts/media/server/aws/f05-clerk-request-auth.js`

No deploy workflow, secret, Production mutation, DNS, AWS permission, Supabase change, Clerk Dashboard change, or `main` retargeting is introduced.

## Final review rule

After this document commit, make no further source or documentation changes. Verify VVIP Quality Gate, TIGER CleanGuard, Zero-Residue Full History, and Project Control Integrity on the exact final PR head; record that SHA and run numbers in PR #268 metadata/body only. Request independent review from `nzuodezuode-byte` only after all four gates are green. Do not merge until the independent approval is present and the reviewed head remains unchanged.

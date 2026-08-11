# VVIP TIGER Guest-First Access Design

**Date:** 2026-08-11  
**Status:** Owner-approved for implementation  
**Scope:** P0 authentication resilience and guest browsing only. Marketplace creation/checkout convergence remains isolated in PR #189.

## Problem statement

The current production shell treats authentication as a global gate. `auth-clerk-index.js` calls `showGate()` for every unsigned visitor, while `scripts/vvip-production-marketplace.js` refuses to execute `refresh()` unless `Clerk.isSignedIn` is true. This makes Clerk availability and sign-in completion a single point of failure for the whole marketplace even though the Supabase schema explicitly grants `anon` read access to ACTIVE listings and ACTIVE listing media.

The owner-provided authentication requirements call for a different model: visitors may browse public marketplace content without signing in; authentication is requested only when an operation requires identity, such as adding an item, favorites, messaging, or account access. Errors must be shown in the UI, repeated clicks must be guarded, and successful authentication must resume the action the visitor was trying to perform.

## Architectural decision

Adopt **Guest-First + Step-Up Authentication**.

1. Public marketplace browsing is never hidden behind the sign-in component.
2. Clerk remains the identity authority. Supabase remains the data/RLS/storage layer and consumes Clerk session tokens when a user is signed in.
3. Protected actions call a small auth orchestrator instead of assuming authentication.
4. The orchestrator opens a VVIP access sheet/modal, mounts Clerk's maintained `<SignIn />` UI, and records a bounded pending intent.
5. After Clerk reports a valid signed-in session, the sheet closes and the pending action is resumed once.
6. If Clerk fails to load, public browsing continues. Only the protected operation fails, with a visible recovery message and retry control.
7. VVIP-owned UI does not implement or store passwords. Clerk renders only the authentication strategies enabled for the production instance. Provider enablement, OAuth secrets, and password-policy changes are production identity configuration and are not mutated by this code change.

This preserves the existing production JWT/RLS trust boundary and avoids a second identity system. Moving authentication to Supabase Auth is explicitly rejected for this phase because it would create duplicate identities, require RLS/token migration, and add unnecessary launch risk.

## User experience

### Public state

The home shell, search, sector filters, listing cards, listing details, and externally safe public information render immediately for visitors. The header account control communicates a guest state rather than forcing a full-screen login page.

### Protected action state

When an unsigned visitor selects a protected action, the application opens a premium access sheet containing:

- VVIP TIGER identity and concise security copy.
- Clerk authentication component for the production strategies already enabled.
- A visible **متابعة كزائر** action that closes the sheet without losing the current public page.
- Privacy Policy and Terms links.
- An inline live-region error area.
- Loading/busy semantics that prevent duplicate authentication launches.

The application keeps the callback itself in memory. To survive an OAuth full-page redirect, it may persist only an allowlisted, non-sensitive intent descriptor in `sessionStorage` (for example `OPEN_ACCOUNT` or `TOGGLE_FAVORITE` plus a validated listing UUID). Tokens, OAuth responses, passwords, arbitrary URLs, free-form payloads, and provider error objects are never persisted.

### Resume behavior

Protected actions are represented by an allowlist such as:

- `CREATE_LISTING`
- `TOGGLE_FAVORITE`
- `OPEN_ACCOUNT`
- `CONTACT_SELLER_INTERNAL`

On successful sign-in, the orchestrator consumes and clears the pending descriptor before executing its callback. This gives at-most-once resume behavior and prevents repeated side effects if Clerk emits multiple listener updates. If a full-page OAuth redirect destroyed the original callback, the marketplace layer may reconstruct only a known action from the validated descriptor; unknown or malformed descriptors are discarded.

## Authentication UI strategy

Use Clerk's maintained prebuilt `<SignIn />` component rather than a hand-written OAuth implementation in P0. The current Clerk JavaScript SDK supports hash routing, `oauthFlow`, social strategies, and passkeys according to the production instance settings. This choice minimizes protocol and callback risk while still allowing VVIP visual framing around the auth experience.

The owner requirement for Google, Apple, Facebook, and Passkey is treated as an authentication capability target, not as permission to fabricate provider buttons. A provider is displayed only when correctly enabled in Clerk production. Passkey must likewise be enabled in Clerk and supported by the browser/device. A later identity-configuration gate will verify which strategies are actually active before declaring the passwordless target complete.

## Failure containment

Authentication failure must never replace the public marketplace with a blank or blocked screen.

- Runtime boot success + unsigned user: public home remains visible.
- Clerk mount failure: public home remains visible; protected action shows `AUTH_GATE_UNAVAILABLE` recovery UI.
- OAuth cancellation/failure: access sheet remains/returns with a readable message; no duplicate action is executed.
- Session becomes signed in: pending action resumes once.
- Session becomes signed out: public browsing remains available; protected operations require step-up again.

Console logging must remain privacy-safe and must not print tokens, OAuth payloads, client secrets, or raw provider error objects.

## Data and security boundaries

- No DNS, Clerk production settings, OAuth credentials, Supabase production data, country activation, owner seeding, or secrets are changed in P0.
- `anon` public reads are allowed only through existing RLS policies for ACTIVE listings in active/sealed countries.
- Favorites, account data, listing writes, and other authenticated mutations remain protected by Clerk JWT + Supabase RLS.
- Authentication intent persistence is limited to an allowlisted action name and bounded identifiers in `sessionStorage`; no sensitive authentication material is stored.
- Public browsing does not imply anonymous account creation.

## Files and responsibilities

- `auth-clerk-index.js`: guest-first auth orchestrator, access-sheet lifecycle, bounded intent/resume behavior, redirect-safe intent descriptor, safe Clerk mounting and recovery.
- `scripts/vvip-production-marketplace.js`: public read behavior, protected-action calls, and reconstruction of allowlisted post-auth actions.
- `index.html`: semantic access-sheet host and guest/account affordance.
- `styles/vvip-production-marketplace.css`: VVIP access-sheet visual system and interaction states.
- `tests/auth-clerk-index.test.cjs`: orchestrator state/intent/auth recovery tests.
- `tests/vvip-production-marketplace.test.cjs`: public-read and protected-action contracts.
- `tests/test_vvip_public_release.py`: production artifact contract ensuring the guest-first auth assets are shipped and no test Clerk configuration leaks.

## Acceptance criteria

P0 is complete only when all of the following are true:

1. An unsigned visitor can see the marketplace shell and trigger public listing reads.
2. Public detail/search/filter functions do not require `Clerk.isSignedIn`.
3. Account, favorite, and authenticated mutation entry points require step-up authentication.
4. The auth sheet exposes a guest continuation and legal links.
5. Clerk load/mount failure does not hide or break the public marketplace.
6. A successful sign-in resumes a pending protected intent at most once.
7. Repeated auth button clicks cannot create duplicate Clerk mounts/actions.
8. Redirect-surviving intent state is allowlisted, bounded, non-sensitive, and cleared before execution.
9. No VVIP-owned password input or password storage is introduced.
10. No auth token/provider error payload is logged.
11. Existing RLS/authenticated mutation controls remain unchanged.
12. Focused auth/marketplace tests and the full repository quality gate pass on one head SHA.
13. Production is not deployed from this branch until protected review/approval gates are satisfied.

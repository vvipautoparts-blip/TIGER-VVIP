# VVIP TIGER Guest-First Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove authentication as a global availability gate, preserve public marketplace browsing for guests, and require Clerk step-up authentication only for protected actions with safe intent resume.

**Architecture:** Keep Clerk as the identity authority and Supabase as the RLS/data layer. Add a small browser auth orchestrator that owns the VVIP access sheet, bounded intent persistence, Clerk mounting, error containment, and at-most-once resume; the marketplace calls that orchestrator for protected operations while public reads run for both `anon` and authenticated sessions.

**Tech Stack:** Static HTML/CSS/JavaScript, Clerk JavaScript SDK v6 runtime already loaded by `vvip-runtime-loader.js`, Supabase JS v2, Node 22 `node:test`, Python `unittest`, GitHub Pages release builder.

## Global Constraints

- Do not change DNS, Clerk production settings, OAuth credentials, Supabase production data, country activation, owner seeding, or secrets in this PR.
- Do not introduce a second authentication authority or Supabase Auth session.
- Do not introduce VVIP-owned password inputs or store passwords/tokens/OAuth payloads.
- Guest access is read-only and remains limited by existing Supabase RLS to ACTIVE listings/media in active sealed countries.
- Protected mutations remain Clerk JWT + Supabase RLS guarded.
- Persist only an allowlisted non-sensitive action descriptor in `sessionStorage`; clear it before resume execution.
- Keep this branch isolated from PR #189 and do not deploy it to Production before protected review/approval gates.

---

### Task 1: Guest-first auth orchestrator

**Files:**
- Modify: `tests/auth-clerk-index.test.cjs`
- Modify: `auth-clerk-index.js`

**Interfaces:**
- Produces browser global `window.VVIP_AUTH`.
- Produces `VVIP_AUTH.start(): Promise<void>`.
- Produces `VVIP_AUTH.requireAuth(descriptor, resume): Promise<boolean>` where `descriptor` is `{ name: string, listingId?: string }` and `resume` is a function.
- Produces `VVIP_AUTH.continueAsGuest(): void`.
- Produces `VVIP_AUTH.normalizeIntentDescriptor(input): Readonly<object>` and `VVIP_AUTH.consumeStoredIntent(): object|null` for deterministic testing.
- Dispatches `vvip:auth-resume` with a validated descriptor when a redirect destroyed the in-memory callback.

- [ ] **Step 1: Extend the auth tests to define the failing guest-first contract.** Add tests that assert: unsigned `start()` calls `showHome()` and does not mount Clerk; `requireAuth()` mounts once and persists a safe descriptor; malformed/external intent data is rejected; `continueAsGuest()` clears the descriptor; signed-in listener consumes/resumes once; recovery never hides public home and never logs raw error details.
- [ ] **Step 2: Run `node --test tests/auth-clerk-index.test.cjs`.** Expected: FAIL because `requireAuth`, `continueAsGuest`, descriptor helpers, and guest-first behavior do not exist.
- [ ] **Step 3: Implement the minimal orchestrator in `auth-clerk-index.js`.** In the browser wrapper assign `root.VVIP_AUTH = api`; add an allowlist `CREATE_LISTING`, `TOGGLE_FAVORITE`, `OPEN_ACCOUNT`, `CONTACT_SELLER_INTERNAL`; validate listing UUIDs only for listing-scoped intents; store JSON under `vvip.auth.intent.v1`; make `start()` call `showHome()` before awaiting runtime; register one Clerk listener; do not mount sign-in during ordinary page load; mount Clerk only from `requireAuth()` using `routing: "hash"`, `oauthFlow: "auto"`, current-page redirect URLs, and existing sign-up redirects; use a `mounted` flag to prevent duplicate mounts; consume and clear intent before invoking a callback or dispatching `vvip:auth-resume`.
- [ ] **Step 4: Re-run `node --test tests/auth-clerk-index.test.cjs`.** Expected: PASS.
- [ ] **Step 5: Commit the auth orchestrator and tests** with message `fix(auth): make access guest-first and resumable`.

### Task 2: Premium VVIP access surface

**Files:**
- Create: `tests/guest-first-auth-surface.test.cjs`
- Modify: `index.html`
- Modify: `styles/vvip-production-marketplace.css`

**Interfaces:**
- Consumes `VVIP_AUTH.continueAsGuest()` through `[data-auth-continue-guest]`.
- Produces `[data-vvip-auth-gate]`, `[data-auth-close]`, `[data-auth-continue-guest]`, `[data-auth-error]`, `#clerk-sign-in`, legal links, and a non-blocking overlay that leaves the public app mounted beneath it.

- [ ] **Step 1: Create the failing source-contract test.** Read `index.html` and `styles/vvip-production-marketplace.css`; assert a dialog role, guest continuation button, privacy/terms links, auth error live region, Clerk host, premium access-sheet selectors, `prefers-reduced-motion`, and no VVIP-owned `type="password"` input.
- [ ] **Step 2: Run `node --test tests/guest-first-auth-surface.test.cjs`.** Expected: FAIL because the new surface contract is absent.
- [ ] **Step 3: Replace the blocking auth copy in `index.html` with the access sheet.** Keep `data-vvip-auth-gate` and `#clerk-sign-in` for compatibility; add close/guest controls, security copy, inline error region, privacy and terms links, and ARIA dialog semantics. Change the account control copy to a neutral `حسابي` state that can be handled by the marketplace layer.
- [ ] **Step 4: Add production CSS overrides in `styles/vvip-production-marketplace.css`.** Make the auth layer fixed and non-destructive to the underlying app; use a restrained VVIP glass/metal depth system, responsive dialog sizing, 44px minimum targets, focus-visible states, busy/error states, and reduced-motion fallbacks. Do not depend on color alone for state.
- [ ] **Step 5: Re-run `node --test tests/guest-first-auth-surface.test.cjs`.** Expected: PASS.
- [ ] **Step 6: Commit the surface and test** with message `feat(auth): add VVIP step-up access sheet`.

### Task 3: Public marketplace reads + protected action step-up

**Files:**
- Modify: `tests/vvip-production-marketplace.test.cjs`
- Create: `tests/guest-first-marketplace-contract.test.cjs`
- Modify: `scripts/vvip-production-marketplace.js`

**Interfaces:**
- Consumes `window.VVIP_AUTH.requireAuth()`.
- Consumes `vvip:auth-resume` descriptors.
- Produces public `refresh()` behavior that calls `repository.listPublic()` without requiring sign-in.
- Protects `CREATE_LISTING`, `TOGGLE_FAVORITE`, and `OPEN_ACCOUNT` before any authenticated repository mutation/read.

- [ ] **Step 1: Add failing marketplace contract tests.** Assert the production source no longer contains the current public-read guard `!root.Clerk.isSignedIn`; assert calls to `VVIP_AUTH.requireAuth` exist for create/favorite/account; assert a `vvip:auth-resume` listener exists; keep existing money/media tests unchanged.
- [ ] **Step 2: Run `node --test tests/vvip-production-marketplace.test.cjs tests/guest-first-marketplace-contract.test.cjs`.** Expected: FAIL on the new guest/protected-action contract.
- [ ] **Step 3: Change `refresh()` to require only repository readiness.** Public RLS is already authoritative; keep country/search/sector filters unchanged.
- [ ] **Step 4: Add a single `runProtected(descriptor, action)` helper.** If `VVIP_AUTH.requireAuth` is unavailable, report `AUTH_GATE_UNAVAILABLE`; otherwise await `requireAuth`. Route create listing, favorite mutation, and account/my-listings through this helper. Public details/search/filter remain unguarded.
- [ ] **Step 5: Add `vvip:auth-resume` handling.** Reconstruct only `CREATE_LISTING`, `OPEN_ACCOUNT`, or `TOGGLE_FAVORITE` with a validated listing UUID; ignore all other descriptors. The auth orchestrator clears storage before dispatch, so resume is at-most-once.
- [ ] **Step 6: Change initial runtime completion behavior.** Always `setView(true)` after runtime readiness, then call `refresh()` whether signed in or not. Keep sign-out compatible with continued public browsing.
- [ ] **Step 7: Re-run the focused marketplace tests.** Expected: PASS.
- [ ] **Step 8: Commit marketplace integration** with message `fix(marketplace): decouple public reads from sign-in`.

### Task 4: Production release contract

**Files:**
- Modify: `tests/test_vvip_public_release.py`
- Modify: `tests/pages-production-artifact-isolation.test.cjs` only if the existing assertions require an explicit guest-first marker.

**Interfaces:**
- Consumes transformed production `index.html`, `auth-clerk-index.js`, and production marketplace CSS/JS.
- Produces a release test that proves the shipped artifact keeps the guest-first access sheet while still excluding `pk_test_` and `.clerk.accounts.dev` runtime configuration.

- [ ] **Step 1: Add failing release assertions.** Build a candidate/production fixture and assert the output includes `data-auth-continue-guest`, `vvip:auth-resume`, and `window.VVIP_AUTH`, while retaining existing forbidden-test-Clerk checks.
- [ ] **Step 2: Run `python -m unittest -v tests/test_vvip_public_release.py` and the Pages artifact isolation test.** Expected: RED until source changes are included by the current allowlist/transform.
- [ ] **Step 3: Update the release builder only if required.** `index.html`, `auth-clerk-index.js`, `scripts/vvip-production-marketplace.js`, and `styles/vvip-production-marketplace.css` are already allowlisted, so no builder expansion is expected; if tests pass without builder modification, do not change it.
- [ ] **Step 4: Re-run the release tests.** Expected: PASS.
- [ ] **Step 5: Commit only test/builder changes actually required** with message `test(release): enforce guest-first auth surface`.

### Task 5: Same-SHA verification and PR handoff

**Files:**
- Update: `docs/superpowers/plans/2026-08-11-vvip-guest-first-auth.md` checkbox state only if used by repository convention.

**Interfaces:**
- Produces a Draft PR from `fix/auth-guest-first-20260811` to `main` with no Production deployment.

- [ ] **Step 1: Run focused syntax/tests**: `node --check auth-clerk-index.js`, `node --check scripts/vvip-production-marketplace.js`, all auth/marketplace node tests, and `python -m unittest -v tests/test_vvip_public_release.py`.
- [ ] **Step 2: Run the repository quality gate on the branch head** through existing GitHub Actions/PR checks.
- [ ] **Step 3: Verify CodeQL/security/dependency/project-control checks on the same head SHA.** No success claim is permitted if a required check is pending or failed.
- [ ] **Step 4: Inspect the diff for forbidden scope.** Require zero DNS, Clerk settings/credentials, Supabase production data, country activation, owner-seeding, or secret changes.
- [ ] **Step 5: Open/maintain a Draft PR with root-cause evidence and acceptance criteria.** Do not merge or deploy automatically.

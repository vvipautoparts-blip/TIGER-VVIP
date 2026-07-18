# P08 Clerk Gate Root-Cause Evidence

- Date: 2026-07-18
- Base SHA: `5661b584ad6d28dc14a8ea2603665a784dce92af`
- Branch: `fix/p08-clerk-gate-root-cause-20260718`
- Production deployment: none
- Clerk Dashboard change: none
- Supabase or SQL change: none

## Proven root cause

A direct browser call to `Clerk.load()` succeeded, while
`mountSignIn()` failed with:

`Clerk was not loaded with UI components`

The unified entry page loaded Clerk JS without Clerk UI and did not
pass `window.__internal_ClerkUICtor` into `Clerk.load()`.

## Minimal repair

- Load `@clerk/ui@1/dist/ui.browser.js` before Clerk JS.
- Require the Clerk UI constructor.
- Pass the constructor into `Clerk.load()`.
- Add a focused regression test.

## Validation

- Focused tests: 2
- Focused passed: 2
- Focused failed: 0
- General tests: 36
- General passed: 36
- General failed: 0
- Runtime: `P08_CLERK_RUNTIME_VERIFIED`

The historical PR38 scope test was excluded because it only permits
the original PR38 file list in any active Git diff. It was not changed.

## Security

- No Clerk secret.
- No Supabase service-role key.
- No token, cookie, session, authorization header, or personal data logged.
- No authentication bypass.
- No SQL, migration, dashboard, or production change.

## Changed files

- `index.html`
- `auth-clerk-index.js`
- `tests/p08-clerk-gate-runtime.test.cjs`
- `docs/launch/p08/P08_CLERK_GATE_ROOT_CAUSE_EVIDENCE.md`

## Rollback

Revert the single repair commit.

## Separate issue

The private Codespaces manifest CORS warning is separate from Clerk
and remains outside this repair.

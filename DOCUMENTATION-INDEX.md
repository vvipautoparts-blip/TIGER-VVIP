# Documentation Index

Source-of-truth index for current repository state.

## Start Here

1. `README.md` - project overview and architecture.
2. `SETUP-GUIDE.md` - local setup and runtime configuration.
3. `AGENTS.md` - working conventions and code map.

## Core Runtime Files

- `index.html` - auth entry page.
- `public-profile.html` - public feed page.
- `private-profile.html` - private profile page.
- `auth.js` - Firebase auth/session snapshot logic.
- `social-ui.js` - feed/profile UI behavior + i18n + optional Supabase sync.
- `styles.css` - shared styles.
- `reset-password.html` / `reset-password.js` - password reset flow.

## Backend-Related Assets

- `supabase/migrations/20260702_feed_posts_table.sql` - feed posts table + policies.
- `supabase/functions/phone-verification/index.ts` - phone verification edge function.
- `supabase-schema.sql` - broader schema SQL history.

## Testing And Validation

- `scripts/qa-smoke.sh` - smoke checks for current structure.
- `FINAL-VERIFICATION.md` - verification checklist (review for legacy references).

## Operational Docs

- `SUPABASE-EDGE-OTP-GUIDE.md` - phone verification setup.
- `ADMIN-SETUP-GUIDE.md` - admin bootstrap steps.
- `TEST-ACCOUNTS-GUIDE.md` and `TEST-USERS.md` - test users and setup references.
- `PRODUCT-REQUIREMENTS-ADDENDUM.md` - expanded social-platform scope and future product requirements.

## PWA

- `sw.js` - service worker.
- `manifest.webmanifest` - app manifest.

## Notes About Legacy Docs

Some older docs still reference removed assets from the prior architecture (monolithic JS/bootstrap era).

When docs conflict, prioritize:

1. `AGENTS.md`
2. `README.md`
3. `SETUP-GUIDE.md`

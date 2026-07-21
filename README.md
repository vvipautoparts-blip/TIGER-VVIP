# TIGER VVIP - AutoParts JO

Static bilingual web app (Arabic/English) for authentication and social-style profile/feed experience.

## Current Architecture

This repository is now a multi-page static app (not SPA):

- `index.html`: authentication entry page (Google/Facebook) and navigation to app pages.
- `public-profile.html`: public feed page (page 3).
- `private-profile.html`: private profile page (page 4).
- `auth.js`: Firebase authentication, local user snapshot, role bootstrap.
- `social-ui.js`: feed/profile interactions, language switching, optional Supabase sync with local fallback.
- `styles.css`: shared visual system.
- `reset-password.html` + `reset-password.js`: email reset flow.

## Key Behavior

- Bilingual UI with RTL/LTR switching.
- Optional Supabase runtime integration for feed persistence:
  - `TIGER_SUPABASE_URL`
  - `TIGER_SUPABASE_ANON_KEY`
- Automatic fallback to local mode when Supabase config is unavailable.
- Role-aware create/publish behavior via local user role state.

## Quick Start

1. Run local preview:

```bash
python -m http.server 800
```

2. Open:

- `http://localhost:800/index.html`

3. Run smoke checks:

```bash
./scripts/qa-smoke.sh
```

## Firebase Authentication

`index.html` and `reset-password.html` embed `window.FIREBASE_CONFIG` and load Firebase compat SDKs.

If you rotate projects/keys, update the `FIREBASE_CONFIG` object in both pages.

## Supabase Feed Sync (Optional)

`social-ui.js` reads runtime keys from browser localStorage:

- `TIGER_SUPABASE_URL`
- `TIGER_SUPABASE_ANON_KEY`

When missing/invalid, feed actions still work in local mode.

## Database Assets

- `supabase/migrations/20260702_feed_posts_table.sql`: feed posts table + policies.
- `supabase/functions/phone-verification/index.ts`: edge function for phone verification delivery.
- `supabase-schema.sql`: broader schema history and compatibility SQL.

## PWA

- `manifest.webmanifest`
- `sw.js`

Service worker uses cache-first for static assets and has versioned cache key.

## Project Status

- ✅ UI and interaction flow fully implemented.
- ✅ Core smoke checks pass.
- ✅ Multi-step auth flow removed (replaced with simple email/password + OAuth).
- ✅ Dead code cleaned (21 documentation files, 2 unused JS files, demo data removed).
- ✅ Repository optimized for production.
- Expanded future product scope tracked in [PRODUCT-REQUIREMENTS-ADDENDUM.md](PRODUCT-REQUIREMENTS-ADDENDUM.md).

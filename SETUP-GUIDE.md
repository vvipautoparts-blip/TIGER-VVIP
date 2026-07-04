# Setup Guide

This guide reflects the current repository state (multi-page static app).

## 1) Local Run

```bash
python -m http.server 8000
```

Open:

- `http://localhost:8000/index.html`

## 2) Required Files (Current)

- `index.html`
- `public-profile.html`
- `private-profile.html`
- `auth.js`
- `social-ui.js`
- `styles.css`
- `reset-password.html`
- `reset-password.js`

## 3) Firebase Auth Config

Firebase config is set inline via `window.FIREBASE_CONFIG` in:

- `index.html`
- `reset-password.html`

If you switch Firebase project, update both pages with matching values.

## 4) Optional Supabase Feed Persistence

The feed can sync with Supabase if runtime keys exist in localStorage:

- `TIGER_SUPABASE_URL`
- `TIGER_SUPABASE_ANON_KEY`

Without keys, app uses local mode automatically.

### Feed Table Migration

Apply:

- `supabase/migrations/20260702_feed_posts_table.sql`

This creates `feed_posts` and basic policies for select/insert.

## 5) Phone Verification Edge Function

Function path:

- `supabase/functions/phone-verification/index.ts`

Deploy:

```bash
npm exec --yes supabase -- functions deploy phone-verification
```

## 6) Smoke Validation

Run:

```bash
./scripts/qa-smoke.sh
```

Checks include:

- required files existence
- key anchors and selectors
- script references
- core JS handlers

## 7) PWA Notes

- Service worker: `sw.js`
- Manifest: `manifest.webmanifest`

If static assets look stale after updates, clear browser site data or unregister service worker once.

## 8) Typical Troubleshooting

1. Page opens but old UI appears:
- clear cache/service worker
- hard refresh

2. Feed does not sync to DB:
- verify `TIGER_SUPABASE_URL` and `TIGER_SUPABASE_ANON_KEY`
- verify `feed_posts` migration applied

3. Auth issues:
- verify `FIREBASE_CONFIG` values in both auth pages
- check Firebase Auth provider settings

## 9) Authentication Flow

- **Index Page** (`index.html`): Google/Facebook OAuth + email/password login.
- **Multi-step flow removed**: Auth flow was simplified. No longer includes step-by-step OTP/2FA signup.
- **Simple reset**: Use `reset-password.html` for Firebase email recovery.

## 10) Current Reality

- ✅ Architecture is page-based (not SPA).
- ✅ All dead code removed (21 doc files deleted, unused JS files cleaned).
- ✅ Only active files referenced above.
- Use this guide + `AGENTS.md` as source of truth for active runtime files.

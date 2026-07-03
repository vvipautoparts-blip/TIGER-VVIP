# AGENTS.md

## Project Scope

- This repository is a static multi-page web app for TIGER VVIP built with plain HTML, CSS, and JavaScript.
- Do not introduce a framework, bundler, or package-based build step unless the user explicitly asks for it.
- Prefer small edits that preserve the current Facebook-style UI and bilingual Arabic/English behavior.

## Working Commands

- Local preview: `python -m http.server 800`
- App URL during local preview: `http://localhost:800`
- Supabase Edge Function deploy: `npm exec --yes supabase -- functions deploy phone-verification`
- Smoke checks: `./scripts/qa-smoke.sh`
- There is no established automated test suite in this repo. After UI or logic changes, validate with a focused manual smoke check in the browser.

## Code Map

- [index.html](./index.html): authentication entry page (Google/Facebook) and routing buttons to public/private pages.
- [styles.css](./styles.css): visual system and responsive styling.
- [auth.js](./auth.js): Firebase auth flow, user snapshot persistence, and role bootstrap.
- [public-profile.html](./public-profile.html): public feed page (page 3) with composer, feed list, and comments sheet.
- [private-profile.html](./private-profile.html): private profile page (page 4) with profile tabs and posts list.
- [social-ui.js](./social-ui.js): feed/profile interactions, optional Supabase sync, bilingual UI dictionary, and language toggle logic.
- [reset-password.html](./reset-password.html) and [reset-password.js](./reset-password.js): email password reset flow via Firebase.
- [supabase/functions/phone-verification/index.ts](./supabase/functions/phone-verification/index.ts): Deno Edge Function for internal phone verification delivery.
- [supabase/migrations/20260702_feed_posts_table.sql](./supabase/migrations/20260702_feed_posts_table.sql): feed posts table and policies used by the social feed sync.
- [sw.js](./sw.js) and [manifest.webmanifest](./manifest.webmanifest): PWA behavior.

## Project Conventions

- Keep the app static and page-based (`index.html`, `public-profile.html`, `private-profile.html`) unless the user asks for a different structure.
- Preserve bilingual content patterns. UI text commonly uses `data-i18n-ar`, `data-i18n-en`, and the `currentLang` state in [social-ui.js](./social-ui.js).
- Preserve RTL behavior for Arabic views.
- Match the existing visual language in [styles.css](./styles.css); this project intentionally follows a Facebook-style layout and palette.
- When changing auth or registration, trace both DOM changes in [index.html](./index.html) and behavior in [auth.js](./auth.js).

## Supabase Notes

- Social feed sync in [social-ui.js](./social-ui.js) reads optional runtime keys from browser storage:
	- `TIGER_SUPABASE_URL`
	- `TIGER_SUPABASE_ANON_KEY`
- If runtime keys are missing or Supabase is unavailable, the feed intentionally falls back to local mode.
- Phone verification depends on the deployed edge function in [supabase/functions/phone-verification/index.ts](./supabase/functions/phone-verification/index.ts).
- Meta-specific env vars such as `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are now optional and used only when `WHATSAPP_PROVIDER=meta`.

## Session And Access Rules

- Auth state is managed by Firebase in [auth.js](./auth.js).
- Lightweight role and user snapshot state is stored in browser localStorage keys such as `autoparts_role` and `autoparts_user_snapshot`.
- Preserve role-based gating for creation and profile features implemented in [social-ui.js](./social-ui.js).

## Data And Seed Files

- Use [ADMIN-SETUP.sql](./ADMIN-SETUP.sql) for admin bootstrap.
- Use [TEST-ACCOUNTS-SETUP.sql](./TEST-ACCOUNTS-SETUP.sql) and [TEST-USERS.md](./TEST-USERS.md) for test account setup.
- Use [DEMO-PAYROLL-SEED.sql](./DEMO-PAYROLL-SEED.sql) and [DEMO-PAYROLL-RESET.sql](./DEMO-PAYROLL-RESET.sql) only for demo payroll scenarios.
- Avoid changing seed SQL unless the task explicitly involves onboarding or demo data.

## Documentation To Link Instead Of Repeating

- [README.md](./README.md): quick project overview.
- [SETUP-GUIDE.md](./SETUP-GUIDE.md): main setup flow.
- [SUPABASE-EDGE-OTP-GUIDE.md](./SUPABASE-EDGE-OTP-GUIDE.md): phone verification edge function setup.
- [ADMIN-SETUP-GUIDE.md](./ADMIN-SETUP-GUIDE.md): admin bootstrap steps.
- [TEST-ACCOUNTS-GUIDE.md](./TEST-ACCOUNTS-GUIDE.md): test accounts.
- [FINAL-VERIFICATION.md](./FINAL-VERIFICATION.md): current verification checklist.

## Agent Guidance

- Prefer root-cause fixes in [social-ui.js](./social-ui.js) and [auth.js](./auth.js) over patching text or markup symptoms only.
- Before editing broad UI sections, search for the corresponding IDs in both page markup and related script files:
	- auth flow: [index.html](./index.html) + [auth.js](./auth.js)
	- feed/profile flow: [public-profile.html](./public-profile.html), [private-profile.html](./private-profile.html) + [social-ui.js](./social-ui.js)
- If the change touches auth, OTP, sessions, roles, service worker caching, or hosting routing, mention manual verification steps in the final response because there is no automated suite covering them.
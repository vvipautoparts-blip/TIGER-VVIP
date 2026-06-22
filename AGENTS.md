# AGENTS.md

## Project Scope

- This repository is a static single-page web app for TIGER VVIP built with plain HTML, CSS, and JavaScript plus Supabase.
- Do not introduce a framework, bundler, or package-based build step unless the user explicitly asks for it.
- Prefer small edits that preserve the current Facebook-style UI and bilingual Arabic/English behavior.

## Working Commands

- Local preview: `python -m http.server 800`
- App URL during local preview: `http://localhost:800`
- Supabase Edge Function deploy: `npm exec --yes supabase -- functions deploy send-otp`
- There is no established automated test suite in this repo. After UI or logic changes, validate with a focused manual smoke check in the browser.

## Code Map

- [index.html](./index.html): main SPA markup and section structure.
- [styles.css](./styles.css): visual system and responsive styling.
- [script.js](./script.js): primary client-side behavior, auth flow, profile flow, order flow, role gating, and UI state.
- [supabase-local.js](./supabase-local.js): local Supabase and WhatsApp OTP configuration used by runtime checks.
- [supabase-config.js](./supabase-config.js): Supabase client bootstrap.
- [supabase-schema.sql](./supabase-schema.sql): schema for profiles, orders, commissions, suppliers, and user sessions.
- [supabase/functions/send-otp/index.ts](./supabase/functions/send-otp/index.ts): Deno Edge Function for WhatsApp OTP delivery.
- [sw.js](./sw.js) and [manifest.webmanifest](./manifest.webmanifest): PWA behavior.

## Project Conventions

- Keep the app as a single-page flow unless the user asks to split files.
- Preserve bilingual content patterns. UI text commonly uses `data-ar`, `data-en`, and the `currentLang` state in [script.js](./script.js).
- Preserve RTL behavior for Arabic views.
- Match the existing visual language in [styles.css](./styles.css); this project intentionally follows a Facebook-style layout and palette.
- When changing auth or registration, trace both DOM changes in [index.html](./index.html) and behavior in [script.js](./script.js).

## Supabase Notes

- Runtime checks in [script.js](./script.js) expect real values in [supabase-local.js](./supabase-local.js). If config is missing, the app intentionally shows setup messages instead of behaving like production.
- OTP delivery depends on `WHATSAPP_OTP_ENDPOINT` in [supabase-local.js](./supabase-local.js) and the deployed edge function in [supabase/functions/send-otp/index.ts](./supabase/functions/send-otp/index.ts).
- The edge function expects WhatsApp env vars such as `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.

## Session And Access Rules

- Regular users are limited to 3 devices; admin and super_admin users are exempt.
- Session tracking depends on `SESSION_DEVICE_KEY` and the `user_sessions` table logic in [script.js](./script.js).
- When modifying device-limit logic, make sure the current device session is checked before counting active sessions so the same device is not blocked incorrectly.
- Preserve role-based gating for admin, approvals, and representative surfaces.

## Data And Seed Files

- Use [ADMIN-SETUP.sql](./ADMIN-SETUP.sql) for admin bootstrap.
- Use [TEST-ACCOUNTS-SETUP.sql](./TEST-ACCOUNTS-SETUP.sql) and [TEST-USERS.md](./TEST-USERS.md) for test account setup.
- Use [DEMO-PAYROLL-SEED.sql](./DEMO-PAYROLL-SEED.sql) and [DEMO-PAYROLL-RESET.sql](./DEMO-PAYROLL-RESET.sql) only for demo payroll scenarios.
- Avoid changing seed SQL unless the task explicitly involves onboarding or demo data.

## Documentation To Link Instead Of Repeating

- [README.md](./README.md): quick project overview.
- [SETUP-GUIDE.md](./SETUP-GUIDE.md): main setup flow.
- [SUPABASE-EDGE-OTP-GUIDE.md](./SUPABASE-EDGE-OTP-GUIDE.md): WhatsApp OTP setup.
- [ADMIN-SETUP-GUIDE.md](./ADMIN-SETUP-GUIDE.md): admin bootstrap steps.
- [TEST-ACCOUNTS-GUIDE.md](./TEST-ACCOUNTS-GUIDE.md): test accounts.
- [FINAL-VERIFICATION.md](./FINAL-VERIFICATION.md): current verification checklist.

## Agent Guidance

- Prefer root-cause fixes in [script.js](./script.js) over patching text or markup symptoms only.
- Before editing broad UI sections, search for the corresponding IDs in both [index.html](./index.html) and [script.js](./script.js).
- If the change touches auth, OTP, sessions, or roles, mention manual verification steps in the final response because there is no automated suite covering them.
# TIGER VVIP - Unified Platform Status (Single Source of Truth)

Last updated: 2026-06-26
Project: TIGER-VVIP
Product name: TIGER VVIP AutoParts

## 1) What this project is
Static single-page web app (HTML/CSS/JS) with Supabase backend integration for:
- Auth and registration
- Role-based access (buyer, supplier/admin flows)
- Orders and profile management
- OTP/email-related integrations
- PWA support

Core runtime files:
- index.html
- styles.css
- script.js
- supabase-config.js
- supabase-local.js
- supabase-schema.sql
- sw.js
- manifest.webmanifest

## 2) Current repository reality (now)
- Git HEAD is currently detached because an interactive rebase is in progress.
- Remote default branch latest commit: f591cac
- You have staged changes/additions waiting inside the ongoing rebase state.
- Extra local extracted media exists under tmp/ (frames/seconds).

## 3) Work completed recently (yesterday/today snapshot)
Recent top commits on origin/main:
1. f591cac refactor: simplify profile page by removing quick/action/stat sections
2. 62b6546 fix: unify circular avatar image source across UI
3. af1afe1 style: unify button styling across app
4. 15a8113 style: polish premium mobile profile layout
5. a091276 feat: add VVIP dark/light profile theme toggle
6. b706ac3 feat: add facebook-style follow UX and floating profile shortcut
7. d94abc4 fix: bypass Google verification in demo and ensure continue flow works
8. ceafeb2 feat: activate Google button with runtime Supabase setup wizard

## 4) Where the full documentation lives
Primary map: DOCUMENTATION-INDEX.md
Most-used docs:
- README.md
- SETUP-GUIDE.md
- ADMIN-SETUP-GUIDE.md
- TEST-ACCOUNTS-GUIDE.md
- SUPABASE-EDGE-OTP-GUIDE.md
- FINAL-VERIFICATION.md

## 5) Why you may be seeing an old screen now
Most likely one or more of these:
- Browser cache or service worker serving old assets
- You are viewing a different local server/session than current workspace state
- Rebase state not completed yet, so intended local update flow is not finalized

## 6) Immediate fix steps (safe)
1. Hard reload the browser page.
2. Unregister service worker and clear site cache.
3. Confirm local server is running from this workspace path.
4. Complete or abort/restart rebase intentionally, then verify page again.

## 7) Decision point to finalize your latest work
Choose one path clearly:
- Path A: Keep your current staged rebase changes and continue rebase.
- Path B: Stop current rebase and re-sync from origin/main, then re-apply only wanted edits.

## 8) Acceptance checklist
- Correct branch/rebase state confirmed
- Latest intended files visible in git status
- Browser shows updated UI (not stale)
- Key flows smoke-tested: registration, profile, orders, role-specific paths

This file is intended to be the single reference document for current project status and next actions.

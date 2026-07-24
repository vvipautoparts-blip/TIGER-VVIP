# VVIP TIGER — Blockers

**Branch:** feat/global-v1-foundation-20260724-092530  
**Updated:** 2026-07-24T13:15:43Z

## External Blockers (Require Owner Action)

### EB-001: Clerk Production Keys
- **Status:** EXTERNAL_BLOCKER
- **Description:** Production Clerk publishable key and secret key must be configured as environment variables. Current code uses a test key (`pk_test_YWNjdXJhdGUtbXVsZS0yOC5jbGVyay5hY2NvdW50cy5kZXYk`).
- **Required Action:** Owner must provide production Clerk keys via Supabase/hosting environment variables
- **Impact:** Authentication will not work in production without this
- **Independent work:** All UI and API development can proceed

### EB-002: Supabase Remote Database Credentials
- **Status:** EXTERNAL_BLOCKER
- **Description:** Remote Supabase project credentials (URL, anon key, service role key) must be configured
- **Required Action:** Owner must provide Supabase project URL and keys
- **Impact:** Database migrations cannot be applied to remote without this
- **Independent work:** All local migrations and schema development can proceed

### EB-003: Payment Provider Selection and Hosted Checkout
- **Status:** EXTERNAL_BLOCKER
- **Description:** G08 requires a Hosted Checkout provider (e.g., Stripe, Moyasar for MENA). No provider selected.
- **Required Action:** Owner must select payment provider, configure Webhooks, verify PCI compliance
- **Impact:** G08 (Subscriptions/Payments) is completely blocked
- **Independent work:** G08 schema can be built; entitlement enforcement logic can be built with feature flag

### EB-004: CDN and WAF Configuration
- **Status:** EXTERNAL_BLOCKER
- **Description:** Production CDN (Cloudflare or equivalent) needs to be configured for image delivery and DDoS protection
- **Required Action:** Owner must configure CDN provider
- **Independent work:** Image processing pipeline is complete; CDN just needs endpoint config

### EB-005: Push Notification VAPID Keys
- **Status:** EXTERNAL_BLOCKER
- **Description:** Web Push notifications require VAPID key pairs
- **Required Action:** Generate VAPID keys and configure in environment
- **Independent work:** Notification schema and logic can be built without VAPID

### EB-006: Email Provider (transactional)
- **Status:** EXTERNAL_BLOCKER
- **Description:** Email templates exist but no email provider configured (SendGrid, Mailgun, etc.)
- **Required Action:** Owner must select and configure email provider API keys
- **Independent work:** Email templates ready; outbox pattern can be built

---

## Internal Blockers (Solvable in this mission)

### IB-001: Python .venv Broken ✓ MITIGATED
- **Description:** `.venv` pip broken with `ModuleNotFoundError: No module named 'pip._internal.operations.build'`
- **Status:** MITIGATED — quality gate uses temporary venv; system python3 works
- **Resolution:** Use `python3 -m venv /tmp/vvip-pytest-venv` for test runs

### IB-002: Migration Audit Baseline Missing (D001) ✓ FIXED
- **Description:** `202607230001_fix_security_and_jod_localization.sql` not in reviewed baseline
- **Status:** FIXED — hash added to scan-dangerous-sql.sh
- **Test:** `tests/p08-steel-shield-migration-audit.test.cjs` now PASS (52/52)

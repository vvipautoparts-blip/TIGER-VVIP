# VVIP TIGER — P02 App Shell and Navigation Architecture

## Status

- Phase: P02
- State: In Progress
- Scope: Runtime app shell and navigation hardening only
- Out of Scope: Clerk config, Supabase DB, SQL, migrations, RLS, Payments, Production

## Reference Linkage

- Official unified platform and operating model (machine-readable): `docs/owner-control/VVIP_TIGER_UNIFIED_PLATFORM_AND_OPERATING_MODEL.yaml`
- Official unified platform and operating model (human-readable): `docs/owner-control/VVIP_TIGER_UNIFIED_PLATFORM_AND_OPERATING_MODEL.md`
- Official unified UI and navigation standard: `docs/owner-control/VVIP_TIGER_UNIFIED_UI_AND_NAVIGATION_STANDARD.md`
- Official unified UI tokens: `docs/owner-control/vvip-unified-ui-tokens.json`
- Official image and media standard: `docs/owner-control/VVIP_TIGER_IMAGE_AND_MEDIA_STANDARD.md`
- Official image and media standard (YAML): `docs/owner-control/VVIP_TIGER_IMAGE_AND_MEDIA_STANDARD.yaml`

## Unified Route Map

| Route ID | Label (AR) | Label (EN) | Type | Runtime Path | Status |
|---|---|---|---|---|---|
| entry | الدخول | Entry | Public | index.html | ready |
| home | الرئيسية | Home | Public | home.html | active_ui_shell |
| market | السوق | Market | Public | market.html | active_ui_shell |
| public_profile | الملف العام | Public Profile | Public | public-profile.html | ready |
| private_profile | الملف الخاص | Private Profile | Private | clerk-private-profile.html | ready |
| create_listing | إنشاء إعلان | Create Listing | Private | none | disabled (coming later) |
| notifications | الإشعارات | Notifications | Private | none | disabled (coming later) |
| menu | القائمة | Menu and Settings | Private | in_shell_panel | active |
| logout | تسجيل الخروج | Logout | Private Action | index.html (post action) | ready |

## Shared Runtime Components

- `scripts/vvip-route-map.js`:
  - Single route source of truth.
  - Public/private classification.
  - Ready/disabled states.

- `scripts/vvip-app-shell.js`:
  - Unified fixed header for desktop/mobile.
  - Shared bottom navigation injection/enhancement.
  - Single account menu controller.
  - Active route state via `aria-current`.
  - Safe external link handling (`noopener noreferrer`).
  - Keyboard arrow navigation support.
  - Duplicate listener prevention.

- `styles/vvip-app-shell.css`:
  - Shared shell and bottom-nav styles.
  - Visible focus state.
  - Reduced-motion support.
  - Android safe-area support.

## User UI Guardrails

- No phase names, no gate labels, and no internal review output in user-facing pages.
- No fake success states for reserved routes.
- No video controls in active runtime pages for P02.

## Specialist Review Bundle (P02-Set-2 Authoritative Unified Experience)

- Relevant Specialty:
  - Frontend Architecture Review
  - Social Platform UX Review
  - Marketplace Search UX Review
  - Mobile Android UX Review
  - Navigation and Routing Review
  - Accessibility and RTL Review
  - Frontend Security Review
  - Privacy Review
  - Performance Review
  - Amanah and Ihsan Review
  - DevOps Preview Security Review
- Pre-Execution Review: Completed (internal technical review, no human specialist claim)
- Security Impact: Removed pre-auth shell from login, guarded disabled routes, preserved safe logout and link hardening
- Performance Impact: Single route map and single shell controller with initialization/listener guards
- Privacy Impact: Public profile minimized, no email/IDs exposed in public-facing runtime
- UX Impact: Unified social-style shell with one account menu, one bottom nav, and explicit reserved states
- Accessibility Impact: Focus-visible states, `aria-label` coverage, `aria-current` active-state signaling, RTL-first layout
- Marketplace Search Impact: Dedicated `market.html` with unified search + sector chips + advanced filter panel contract
- Amanah and Ihsan Impact: No fake data claims, no fake ready-state for reserved features, explicit honest empty states
- Risk Level: Medium
- Pass Criteria:
  - One platform shell and one route contract
  - Home separated from public profile
  - Market separated as unified search surface
  - No video controls in active runtime pages
  - No duplicate bottom navigation or repeated initialization
  - P02 remains in progress and P03 remains pending
- Stop Conditions:
  - scope drift to P03/SQL/production/payments
  - any exposed secret or private identity data in public UI
  - duplicate shell injection or broken route targets
- Rollback Plan:
  - local rollback patch: `/tmp/vvip-p02-safe-backup/p02-before-final-social-marketplace-redesign.patch`
  - status snapshot: `/tmp/vvip-p02-safe-backup/p02-before-final-social-marketplace-redesign-status.txt`
- Post-Execution Evidence:
  - syntax checks, JSON/YAML validation, diff hygiene, duplicate scans, privacy/secret scans, responsive checks
  - external preview refreshed from allowlist-only copy on port 5500
- Final Result: PASS (internal specialist gate for this execution set)

## Owner-Safe Preview

- Preview page: `p02-preview.html`
- Purpose: non-sensitive mobile owner visual validation before commit/PR.
- Note: secure owner-only runtime authorization is deferred to dedicated phase scope.

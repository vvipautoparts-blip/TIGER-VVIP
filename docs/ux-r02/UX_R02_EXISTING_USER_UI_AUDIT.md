# UX-R02 Existing User UI Audit

## Existing Interfaces

- `index.html` provides the current unified-home direction, marketplace filters, a listing detail sheet, and existing Clerk-linked entry behavior.
- `private-profile-p03.html`, `public-profile-p05.html`, and `account-settings-p05.html` are the current profile/account surfaces.
- `scripts/vvip-pr29-home-marketplace.js`, `scripts/vvip-pr31-create-listing-shell.js`, and `scripts/media/` contain current home, draft, and media implementation paths.
- `scripts/pr35/` contains existing Tiger Care terminology and a separate owner-control flow.
- `scripts/vvip-p03-private-share.js` is the existing private-share surface.

## Approved, Legacy, And Experimental Surfaces

- The current index and P03/P05 pages are existing product surfaces and are not modified by UX-R02.
- Historical snapshots were removed from the active tree after canonical-file proof and remain recoverable from Git history.
- Older `private-profile.html`, `public-profile.html`, Clerk bridge files, SQL, migrations, Supabase assets, and authentication scripts are out of scope.

## Reusable Concepts

- Arabic-first RTL, page-based presentation, light cards, bottom navigation, responsive sheets, skip links, and polite live regions.
- Unified home and sector filters are product vocabulary only; UX-R02 imports no existing code or runtime.

## Gaps And Safe Path

The repository has no single, mock-only journey joining entry, unified browsing, in-place listing details, profiles, listing/media flow, private communication, Tiger Care, notifications, and account lifecycle states. UX-R02 supplies that gap through an isolated static preview in `user-journey-preview/`.

## Protected Files And Local Boundary

- Existing runtime pages, `auth*`, `scripts/`, `styles/`, `supabase/`, SQL, migrations, service worker, and phase status are not changed.
- Protected PR77, Legal, and UX-R01 worktrees are not accessed or changed.
- CLIENT-SIDE USER JOURNEY PREVIEW IS NOT A PRODUCTION APPLICATION. AUTHENTICATION, AUTHORIZATION, DATA STORAGE, LIMITS AND SECURITY MUST BE ENFORCED BY AUTHORIZED BACKEND PHASES.

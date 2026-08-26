# No-Visitor / No-Tiger-Image / Zero-Residue Cleanup Design

Date: 2026-08-21
Branch: `feat/tiger-no-visitor-mode-20260821`
PR: #306
Status: owner-approved design

## Purpose

Apply the owner's platform-wide cleanup directive without touching `main` or production: remove visitor/guest/anonymous platform mode, remove every tiger image from the active platform UI and assets, remove dead/obsolete executable residue and fallbacks, and keep the implementation modern, low-cost, user-first, and verifiable.

## Priority order

1. User safety, privacy, clarity, accessibility, and performance.
2. Platform integrity, maintainability, security, and cost efficiency.
3. Owner and operating partners.

## Non-negotiable behavior

### Authentication boundary

- There is no Visitor, Guest, anonymous browsing, guest-first, or public platform-content mode.
- An unauthenticated user sees only the authentication gate and must not receive/render platform feed, profile catalogue, marketplace, social content, or protected application surfaces.
- The application shell remains inaccessible until authenticated state is established.
- Copy must not imply that sign-in is needed only for selected protected actions.
- No visitor fallback, mock-content fallback, or anonymous data fallback may preserve the retired behavior.
- After authentication, authorization remains least-privilege and surface-specific.

### Tiger image removal

- No tiger photo, mascot, illustration, SVG, hero image, CSS background, poster, remotely loaded tiger image, or JavaScript-injected tiger visual may remain in the active UI.
- Remove the underlying tiger-image asset when it has no remaining legitimate use.
- The textual brand `VVIP TIGER` is not removed by this directive; image removal is the target.
- Broken references are not acceptable after asset deletion.

### Dead-code and residue cleanup

- Remove obsolete executable visitor/guest branches, fallbacks, unused handlers, orphaned assets, duplicate tests, and dead files discovered in the touched flow when non-use is proven.
- Do not preserve dead code merely as a fallback.
- Do not weaken security scanners, tests, or CI to obtain a green result.
- Historical database migration files are not rewritten merely to erase old `anon` text; current database state is hardened through append-only migrations. Historical audit evidence may remain where immutability matters, but it must not act as a current contract or executable fallback.

## Database and security

- Current platform-data access for PostgreSQL/Supabase `anon` must be revoked/blocked where the no-visitor contract requires it.
- RLS remains least-privilege.
- New hardening is implemented through forward migrations.
- Authentication and authorization failures must fail closed.
- No production credentials, secrets, or unsafe bypasses are introduced.

## UI/UX and 2026 technology direction

- Prefer a single authenticated application surface rather than parallel guest/member surfaces.
- Keep mobile-first responsive behavior, RTL support, accessibility semantics, fast first render, and minimal dependency/cost footprint.
- Prefer native platform/browser capabilities and existing project primitives over adding paid services or unnecessary dependencies.
- Remove visual clutter and obsolete large decorative imagery when it does not serve user tasks.
- Intent-driven behavior may personalize authenticated actions, but intent inference must never bypass authentication, authorization, or explicit user-control boundaries.

## Implementation scope

Audit and update, as needed:

- root/auth entry surfaces, especially `index.html` and authentication bootstrap code;
- active social/feed/profile/marketplace runtime controllers that may bootstrap content before auth;
- PR39 profile visitor remnants;
- current no-visitor Supabase hardening migration and contract tests;
- active CSS/HTML/JS image references and image assets;
- obsolete guest-first/current normative docs that conflict with the new contract;
- dead tests/files directly superseded by the no-visitor implementation.

## Verification contract

Before declaring completion:

1. Search the active tree for visitor/guest/anonymous platform-mode identifiers and classify any remaining matches.
2. Search active UI code/assets for tiger-image references and prove there is no tiger image in the active platform.
3. Verify unauthenticated runtime cannot reveal or bootstrap platform content.
4. Verify authenticated profile/member flows continue to work under authorization.
5. Verify database contracts prevent anonymous platform-data access.
6. Run relevant unit/contract/runtime tests.
7. Run/fetch required GitHub Actions gates on the exact final HEAD SHA.
8. Keep PR #306 draft and do not merge or modify `main`/production.
9. Report exact changed/deleted paths, final HEAD SHA, and any unresolved blocker truthfully.

## Failure handling

- If one issue is complex or externally blocked, isolate it and continue independent cleanup/verification work.
- Never replace a real failure with a simulated success, disabled check, weakened assertion, or undocumented fallback.
- Completion means evidence on the exact final SHA, not visual appearance alone.

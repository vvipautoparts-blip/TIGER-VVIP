# VVIP TIGER FUSION 2026 — Single Surface Runtime Integration Design

**Status:** OWNER-DIRECTED DESIGN — PRE-IMPLEMENTATION

**Date:** 2026-08-15

**Implementation baseline:** `feat/f05-hybrid-heic-local-media-isolated-20260814@606353ba2be1cf9c51ba3043fd12f39d2e056563`

**Working branch:** `feat/fusion-single-surface-integration-20260815`

## 1. Purpose

Close the gap between the isolated FUSION 2026 Single Surface implementation and the actual authenticated product entrypoint. The current `index.html` still presents the older marketplace shell while `fusion-home-f02.html` contains the newer FUSION feed/composer/search shell. This phase makes the FUSION Single Surface the real Staging product surface without weakening authentication, search, media security, marketplace boundaries, or branch/Production governance.

This is an integration phase between F05 and later F06 work. It does not redefine the F00–F16 roadmap and does not rename F06, which remains Global Money Fabric.

## 2. Binding product and security authorities

The integration must preserve all active owner decisions, with later explicit decisions superseding older generic text where they conflict.

### Product surface

- Global-first, one product surface across Web/PWA/Android/iOS.
- Facebook muscle memory + TIGER identity; no Facebook branding, copied proprietary assets, or product cloning.
- Final surface hierarchy: `Home -> Search -> Listing/Post -> Profile -> Settings`.
- Desktop feed target approximately 680–720 px; mobile cards near full width with a small consistent gutter.
- Progressive Commercial Composer prompt: `ماذا تريد أن تعرض؟` / `What would you like to offer?`.
- Dynamic Sector Registry; no permanent hard-coded three-sector or seven-sector product model.
- Actions remain concise: `حفظ | تواصل | مشاركة` / `Save | Contact | Share`.

### Marketplace boundary

VVIP TIGER remains an advertising, discovery, commercial-presentation, and direct-contact platform only. This integration must not add marketplace checkout, escrow, delivery/shipping operation, marketplace transaction settlement, transaction commission/payout, warranty execution, compensation execution, or platform-run buyer/seller or service disputes.

Platform-owned advertising billing, moderation, identity, security, media safety, technical operations, analytics, and legally required compliance remain in scope.

### Authentication and sovereign authority

- Clerk authentication remains the current browser identity gate.
- The approved login visual remains isolated from marketplace theme changes.
- Browser state, legacy `admin`, or `super_admin` must not imply sovereign OWNER.
- Privileged controls appear inside the same product surface only from server-confirmed capability data.
- Missing, stale, malformed, or unverifiable capability state fails closed.

### F05 HEIC/HEIF owner decision

The active rule is `Privacy on Client + Authority on Server`.

- Original HEIC/HEIF bytes remain local for normal conversion.
- No hidden or failure-path server HEIC conversion fallback.
- Browser emits only a sanitized JPEG/WebP candidate derivative.
- Server independently validates and safely rewrites the derivative before publication.
- Only the server-rewritten canonical object may become publishable media.
- PR36 remains the canonical seven-photo crop/encode/session contract.
- No video/sequence expansion under F05.

## 3. Approaches considered

### A. Direct hard replacement of `index.html`

Replace the old entrypoint with the isolated F02 HTML immediately.

**Benefit:** fastest visual change.

**Rejected as primary strategy:** the isolated page still contains disabled composer controls and does not by itself preserve all current auth, listing creation, PR36/F05 media, profile, resilience, and runtime wiring. A visual replacement would create a misleading Preview that looks modern while losing behavior.

### B. Redirect `index.html` to `fusion-home-f02.html`

Keep both pages and redirect authenticated users to the isolated FUSION page.

**Benefit:** low code churn and easy rollback.

**Rejected as final architecture:** preserves two competing product entrypoints, duplicates navigation/auth behavior, increases cache/service-worker complexity, and leaves a migration page pretending to be the final application.

### C. Strangler integration into one authoritative `index.html` — **selected**

Use the current FUSION Single Surface as the presentation target while adapting proven existing runtime controllers behind explicit interfaces. Legacy pages remain migration bridges only until F15 Runtime Vacuum.

**Why selected:** it produces one real product surface while preserving tested auth, search, media, resilience, and listing behaviors. It also supports incremental TDD and exact-head rollback without a big-bang rewrite.

## 4. Target runtime architecture

### 4.1 Authoritative entrypoint

`index.html` becomes the only normal authenticated Web/PWA entrypoint for Home/Feed.

It contains:

1. isolated Clerk auth gate using its existing token scope;
2. FUSION application shell;
3. global header with brand, search affordance, capability/account entry, and composer entry;
4. central feed surface;
5. responsive mobile navigation;
6. sheet/dialog hosts for listing details, composer, account/profile/settings, and server-confirmed capability actions;
7. status hosts for network state, search rescue, media progress/errors, and toasts.

`fusion-home-f02.html` remains a temporary migration/verification page during this phase and is marked non-authoritative. It is not deleted until F15 evidence authorizes removal.

### 4.2 Presentation modules

Keep UI modules small and independently testable:

- **Fusion Shell:** layout, navigation, responsive states, accessibility landmarks.
- **Feed Presenter:** renders normalized listing/post view models only; does not own authorization or persistence.
- **Composer Presenter:** progressive fields and validation states; delegates media to PR36/F05 and persistence to the listing service boundary.
- **Search Presenter:** delegates query interpretation/ranking to F04 Search Fabric; it must not reintroduce substring authority.
- **Profile/Settings Presenter:** same design language and surface; no final-state separate admin/owner skin.
- **Capability Presenter:** renders only immutable, server-confirmed capability entries.

### 4.3 Runtime service adapters

Presentation code may not directly reach arbitrary globals. Introduce bounded adapters for:

- authenticated session identity;
- listing read/create/update draft operations;
- F04 search;
- PR36/F05 media pipeline;
- server capability snapshot;
- local draft/offline state;
- network/resilience status.

Adapters normalize legacy/current runtime APIs and provide one stable contract to the new surface. Missing dependencies fail closed with a user-safe state rather than silently switching to legacy behavior.

## 5. Primary user journeys

### 5.1 Entry and authentication

1. Load HTTPS entrypoint.
2. Initialize only the auth gate and minimal shell prerequisites.
3. If unauthenticated, show the approved login experience; marketplace shell remains inaccessible.
4. After authenticated identity is established, initialize the Single Surface.
5. Load capability snapshot independently; ordinary user functionality must not depend on privileged capability availability.

No blue marketplace-theme leakage into the login scope.

### 5.2 Feed and discovery

1. Render skeletons immediately.
2. Fetch/normalize eligible listing data for the active market.
3. Feed card order: header -> text -> media -> commercial facts -> Save/Contact/Share.
4. Apply dynamic sector controls from trusted registry/config, not hard-coded sector buttons.
5. Empty states explain no results without suggesting unavailable/forbidden data.

### 5.3 Search

1. User input is debounced using the existing bounded UI timing.
2. F04 performs normalization, intent extraction, eligibility filtering, ranking, and rescue.
3. The presenter receives safe result/rescue view models.
4. Semantic assist can never resurrect policy-ineligible content.
5. Search errors degrade to a clear retry/neutral state; no fallback to unsafe raw substring ranking.

### 5.4 Progressive Commercial Composer

Initial composer displays only:

- photos;
- title;
- sector/category;
- price type/price;
- location.

Sector-specific fields are revealed progressively from the active sector contract.

Media flow:

`Select -> bounded validation -> PR36/F05 local processing -> sanitized candidate -> authoritative server derivative gate -> canonical media identity -> draft/listing binding`.

HEIC/HEIF original bytes must never be uploaded for server conversion. Timeout, OOM, decoder crash, offline state, or malformed media must fail locally without an original-file server fallback.

The composer must support up to seven still images under PR36 limits and expose understandable progress/cancel/retry states.

### 5.5 Profile, settings, and capabilities

Profile/settings use the same shell and semantic tokens. Owner/partner/employee functionality is exposed only as capability entries within the same product UX. Capability absence means control absence; the UI does not infer privilege from client state.

## 6. Data and state rules

- No synthetic/demo item may be presented as live truth outside explicit Preview/testing contexts.
- Local drafts are device-local convenience state and are not authoritative publication state.
- Publication success must come from a server-confirmed result.
- Search eligibility and capability authority are server/policy boundaries, not presentation decisions.
- Listing/media identifiers shown publicly must not expose original filenames or raw cross-user hashes.
- No secrets, service-role credentials, owner recovery material, or private security data are embedded in browser code.

## 7. Error handling and resilience

Every async subsystem exposes explicit `idle | loading | ready | empty | degraded | error` presentation states where applicable.

### Auth

Initialization failure fails closed and does not reveal authenticated content.

### Search

F04 failure yields a bounded retry state; no authority-changing fallback algorithm.

### Media

Worker timeout/OOM/runtime trap terminates and resets the worker. No original HEIC upload fallback. JPEG/WebP candidate/server gate failures remain unpublished and explain retry/remove options safely.

### Network

Offline/intermittent mode may preserve local drafts and cached safe read-only data but never displays privileged/publication operations as successful until confirmed by the server.

### Capability service

Failure hides privileged controls and records a safe operational event; ordinary authorized user functionality remains available if independent dependencies are healthy.

## 8. Accessibility and internationalization

This integration must not create Arabic-only hard-coded runtime logic.

- Arabic and English share one data model and component structure.
- RTL/LTR layouts must both be testable.
- Keyboard navigation, focus trapping/restoration for sheets/dialogs, screen-reader labels, reduced motion, visible focus, and contrast are mandatory for critical journeys.
- Critical Web/PWA journeys target WCAG 2.2 AA closure in F10; this phase must not introduce known blockers that defer basic accessibility unnecessarily.

## 9. Performance constraints

- Avoid a framework migration solely for this integration; preserve the existing Web/PWA stack unless measured evidence later justifies a platform change.
- Lazy-initialize heavy media code until the composer/media path needs it.
- Keep Worker/WASM decoding off the main thread.
- Avoid duplicate runtime initialization when migration pages/controllers coexist.
- Measure first/repeat visit, cache hit/miss, feed render, search responsiveness, media interaction, and weak-network behavior before performance claims.

## 10. Security boundaries

The integration is rejected if it introduces any of the following:

- direct `main` write or Production mutation;
- authentication bypass or hidden anonymous access to protected flows;
- client-authoritative OWNER/admin capability;
- original HEIC/HEIF server conversion fallback;
- unsafe media publication before server rewrite/inspection;
- hard-coded service-role or secret material;
- policy-bypassing search fallback;
- marketplace transaction intermediation;
- disabling branch protection or exact-head release gates.

## 11. TDD and verification strategy

Implementation follows RED -> GREEN -> exact-head verification.

### Contract families

1. **Entrypoint authority tests**
   - `index.html` loads FUSION shell and required adapters.
   - old fixed-sector presentation is absent from authoritative entrypoint.
   - legacy migration page is explicitly non-authoritative.

2. **Auth isolation tests**
   - approved auth gate remains required;
   - marketplace token changes cannot restyle login unexpectedly;
   - authenticated shell cannot appear from a spoofed browser flag.

3. **Single Surface tests**
   - desktop/mobile geometry contracts;
   - composer/search/profile/capability hosts exist;
   - Save/Contact/Share action contract;
   - no separate privileged final-state skin.

4. **F04 integration tests**
   - presenter delegates to F04;
   - no raw substring fallback authority;
   - zero-result rescue remains bounded and policy-safe.

5. **F05/PR36 integration tests**
   - seven-photo limit and cancellation/resource ownership preserved;
   - HEIC local-only conversion invariant;
   - worker timeout/OOM/crash recovery;
   - sanitized JPEG/WebP candidate only;
   - server derivative authority remains mandatory.

6. **Dynamic sector tests**
   - no fixed three-sector button contract;
   - controls derive from a registry contract;
   - disabled sectors cannot appear active.

7. **Accessibility/i18n smoke contracts**
   - Arabic/English direction and labels;
   - dialog focus behavior;
   - reduced-motion hooks.

8. **Repository-wide gates**
   - Quality Gate;
   - Release Candidate exact-source verification;
   - CodeQL;
   - Dependency Review;
   - TIGER CleanGuard;
   - Project Control Integrity and any applicable media/supply-chain gates.

## 12. Staging rollout

1. Implement only on the isolated integration branch.
2. Obtain exact-head automated green evidence.
3. Point a password-protected Amplify DEVELOPMENT Preview to the exact integration head.
4. Validate the authoritative `/` route, not only a hidden migration URL.
5. Run Desktop/Android/iPhone browser evidence, including real HEIC where required.
6. Compare against the owner constitution and record visual/runtime gaps.
7. Do not merge to `main` until required review/approval gates pass.
8. Do not call the application globally launch-ready from this integration phase alone.

## 13. Acceptance criteria for this integration phase

The phase is complete only when all are true on one immutable exact source SHA:

- `/` is the authenticated FUSION Single Surface rather than the old marketplace shell;
- the approved login gate remains intact;
- feed follows the TIGER Single Surface card/action contract;
- progressive composer is operational rather than disabled;
- dynamic sectors replace fixed three-sector UI;
- F04 Search Fabric is the authoritative search path;
- PR36 + F05 media are integrated without original HEIC server fallback;
- profile/settings/capabilities use the same product surface;
- ordinary and privileged states fail closed correctly;
- Arabic/English and responsive baseline contracts pass;
- applicable automated gates pass on the exact head;
- password-protected HTTPS Staging evidence passes on Desktop and required real mobile devices;
- no `main` or Production mutation occurred during evidence collection.

## 14. Relationship to global launch

This phase fixes the immediate runtime/UI integration gap but **does not by itself satisfy the Global Launch Passport**.

After this integration closes, the approved roadmap continues through the remaining required work, including F06 Global Money Fabric, F07 TIGER Pulse, F08 25K Synthetic Showcase, F09 bounded AI, F10 i18n/accessibility closure, F11 Android/iOS certification, F12 five Red-Team campaigns, F13 both mandatory 4M Digital Twin programs, F14 DR/failover/restore, F15 Runtime Vacuum, and F16 Launch Passport.

`GLOBAL_LAUNCH_ELIGIBLE = TRUE` remains forbidden until every mandatory F16 evidence gate is satisfied. No assistant, CI result, or Preview deployment may weaken that rule.

## 15. Design decision summary

Adopt **Approach C: Strangler integration into one authoritative `index.html`**. Preserve proven controllers through bounded adapters, make FUSION the real product surface, retire duplicate legacy runtime only after evidence, and keep all Production/global-launch claims behind exact-head, device, security, load, legal, country, and owner authorization gates.

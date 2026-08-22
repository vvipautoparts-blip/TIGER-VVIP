# TIGER Social Responsive / Accessibility Audit

Date: 2026-08-22
Branch: `feat/gemini-final-convergence-lane-20260822`
Scope: Social-only shell, feed, search, friends, and composer surfaces.

## Contract matrix

| Dimension | Contract | Evidence |
| --- | --- | --- |
| 320px mobile | Social shell uses full-width layout at max 900px; Search tightens at max 720px; controls retain minimum touch sizes. | `styles/tiger-social/core-shell.css`, `styles/tiger-social/search.css`, responsive contract test. |
| Common mobile | Feed/friends cards remove side borders and stack actions; horizontal reaction picker remains scrollable. | Core Social CSS mobile media block. |
| Tablet | Shell remains fluid with bounded Social content width and logical inline spacing. | `width: min(...)`, `margin-inline`, `padding-inline`. |
| Desktop | Social content stays bounded while Marketplace remains a separate module surface. | Core shell and Marketplace boundary in `index.html`. |
| RTL | Authoritative entrypoint is `lang="ar" dir="rtl"`; Social layout uses logical inline/block properties where direction matters. | `index.html` and CSS contracts. |
| LTR | No Social behavior depends on a physical left/right control position; logical spacing and flex/grid alignment remain direction-agnostic. | CSS audit; no LTR-specific override is required for the Social-only controls. |
| Keyboard | Nav, post trigger, feed actions, reactions, comments, friends actions, Search Enter, and retry are button/link controls with focus-visible styling. | Core CSS focus selectors, Search controller Enter handling, controller tests. |
| Tab order | Unfinished Video/Reels and Stories are hidden; disabled post menu/share controls are removed from active keyboard interaction. | G4 media decision test and G3 dead-control test. |
| Focus continuity | Post Composer focuses the draft on open and returns focus to the originating trigger on close; Search focuses input on entry and retry on reconnect. | `scripts/social/core-shell.js`, `scripts/social/search-controller.js`, responsive/accessibility contract test. |
| Screen-reader semantics | Navigation landmarks, labels, `aria-current`, `aria-live`, `role=status`, `aria-busy`, dialog labels, and hidden-state attributes are present on Social surfaces. | `index.html`, Social controllers, existing Social contract tests. |
| Reduced motion | Social reactions, feed, and Search surfaces disable or minimize transitions/animation under `prefers-reduced-motion: reduce`. | Both Social stylesheets and the responsive/accessibility contract test. |
| Loading | Feed, Friends, Search, reactions, comments, and composer expose bounded loading/pending status. | Existing controller tests and `role=status` surfaces. |
| Empty | Feed, Friends, Search, and comments render explicit empty states without raw provider content. | Existing controller tests and safe state renderers. |
| Error | Social reads/mutations map to bounded opaque user messages; raw transport/provider details are not rendered. | Existing feed, comments, Search, and runtime adapter tests. |
| Offline | Search fails closed without an RPC, exposes `SOCIAL_SEARCH_OFFLINE`, and provides explicit reconnect retry/focus. | `tests/tiger-social-search-edge.test.cjs` and Search controller. |

## G5 changes

- Normalized Social touch targets to at least 44px for circle actions, post trigger/actions, reactions, friend actions, and Search retry.
- Added keyboard focus return from the Social Post Composer to the originating trigger.
- Preserved existing reduced-motion, loading, empty, error, offline, stale, and partial-failure contracts.
- No ONE FIELD-owned path or discovery contract was changed.

## Verification

The exact-head test is `tests/tiger-social-responsive-accessibility.test.cjs`. It asserts the responsive breakpoints, RTL entrypoint, direction-agnostic logical spacing, reduced-motion contract, 44px targets, visible focus contract, and Post Composer focus return.

This is a Social-only contract audit; it is not a browser/device certification, Gate 6 proof, Production readiness claim, or platform-wide 100% claim.

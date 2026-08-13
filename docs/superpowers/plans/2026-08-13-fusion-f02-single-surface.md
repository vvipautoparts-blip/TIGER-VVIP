# FUSION F02 Single Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development task-by-task. Use RED→GREEN contracts before behavior changes.

**Goal:** Establish the first user-visible FUSION 2026 surface: one familiar central feed, TIGER-owned semantic design tokens, a progressively disclosed composer, three primary post actions, global PWA copy, and a dormant capability-menu shell ready for F03.

**Architecture:** Preserve the current safe runtime/release boundary while changing only presentation grammar and non-privileged UX. Authentication authority, SOA/SCG authorization, Search Fabric, HEIC backend, finance, and Production activation remain outside F02. Login keeps its approved existing geometry but receives an independent non-marketplace token scope; F02 does not invent privileged login behavior.

**Tech Stack:** HTML/CSS, current production marketplace JavaScript, `manifest.webmanifest`, existing Python public-release builder, Node `node:test` contracts.

## Fixed F02 decisions

- `--fb-blue` and `--fb-blue-hover` are removed from current product CSS; use semantic TIGER-owned names.
- Marketplace/feed may retain a familiar primary blue under `--brand-primary`; code must not encode Facebook ownership in token names.
- Login outer geometry stays the existing approved shape. Login color scope is independent from marketplace tokens and must not inherit marketplace blue by default.
- Home feed is one central column, approximately 680–720px desktop and near-full-width mobile.
- Primary listing/post action row is exactly `حفظ | تواصل | مشاركة` / `Save | Contact | Share`. Details open from media/card context; WhatsApp may remain a later/contact-detail capability but not a fourth primary card action.
- Initial composer prompt is `ماذا تريد أن تعرض؟`; initial visible commercial fields are media, title, sector/category, price/currency, and location. Optional description/contact controls use progressive disclosure.
- `manifest.webmanifest` is global and must not describe the platform as a fixed three-sector product.
- F02 may add a hidden `⋮` capability-trigger shell, but it must expose no privileged action until F03 server-confirmed SCG.
- F02 does not activate HEIC, Dynamic Sector Registry backend, payments, owner capabilities, or Production deployment.

## Task 1 — RED Single Surface contract

Create `tests/fusion-f02-single-surface.test.cjs` asserting:

1. `styles/vvip-fusion-tokens.css` exists and defines marketplace semantic tokens plus separate login tokens.
2. current marketplace CSS contains no `--fb-blue` token name.
3. feed width has a `720px` bound and no desktop `repeat(2|3, ...)` listing-grid rule.
4. PWA description contains no legacy fixed-sector enumeration.
5. source `index.html` loads FUSION tokens before marketplace CSS and includes a hidden capability gateway trigger.
6. production card source contains the three canonical action labels and no primary-card WhatsApp fourth action.
7. production composer contains `ماذا تريد أن تعرض؟` and a progressive-details container.

Run Quality Gate and verify RED before implementation.

## Task 2 — FUSION semantic tokens and login isolation

Create `styles/vvip-fusion-tokens.css` with semantic scopes:

- `--brand-primary`, `--brand-primary-hover`;
- surface/text/border/focus variables;
- `--login-surface`, `--login-surface-elevated`, `--login-text`, `--login-muted`, `--login-accent`, `--login-border`, `--login-shadow`.

Login accent must be independent from `--brand-primary`; outer login card uses login tokens only.

Update `index.html` to load FUSION tokens before `vvip-pr29-home-marketplace.css`.

## Task 3 — Facebook-muscle-memory central feed

Modify `styles/vvip-pr29-home-marketplace.css`:

- consume semantic tokens;
- remove legacy token names;
- `.marketplace` maximum width 720px;
- `.listing-grid` remains one column on all breakpoints;
- cards retain 4:3 cover geometry and familiar white-surface hierarchy;
- primary action row is three equal columns at suitable widths and remains accessible on small screens.

No Facebook logo/assets/trademark copy.

## Task 4 — three-action card grammar

Modify both prototype and Production card renderers so the primary row is exactly:

1. Save;
2. Contact;
3. Share.

Opening media/title/context handles details. No fourth WhatsApp button on the primary card. Existing direct contact capability may be reused behind Contact/details according to current safe runtime rules.

## Task 5 — Progressive Commercial Composer shell

Modify Production composer markup only enough to establish F02 grammar:

- heading `ماذا تريد أن تعرض؟`;
- media and core commercial fields visible first;
- summary/contact/optional messaging controls inside a native accessible `<details>` progressive section;
- preserve current validation and downstream steps until their owning F05/F06/F07 phases replace them.

Do not claim HEIC support in this phase.

## Task 6 — global PWA copy and dormant capability gateway

Update `manifest.webmanifest` description to a sector-neutral global marketplace/social-commercial description.

Add a hidden `⋮` trigger in the common header with clear accessibility label and `data-vvip-capability-trigger`. It remains hidden and behaviorless in F02; F03 owns server-confirmed reveal and SCG content.

## Task 7 — verification

- focused F02 tests PASS;
- public-release tests PASS;
- exact-head Quality/V14/CodeQL/Dependency/CleanGuard/Project Control PASS;
- compare to F01 shows only F02 plan/tests/tokens/HTML/CSS/manifest/card/composer changes;
- no auth authority, SQL, RLS, Production, payment, country, or secret changes;
- keep Draft and stacked on F01 after evidence.
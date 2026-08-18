# VVIP TIGER FUSION 2026 — OWNER REQUIREMENTS TRACEABILITY MASTER

**Status:** CURRENT OWNER EXECUTION TRACEABILITY — no approved requirement may disappear silently.

**Parent authority:** `docs/fusion/FUSION_CURRENT_AUTHORITY.md`

## Operating rule

Every owner-approved requirement must have:

1. a stable requirement ID;
2. an owning FUSION phase;
3. an implementation path;
4. a verification/evidence path;
5. a status;
6. an explicit supersession record if it is ever changed.

No requirement is considered implemented because it was mentioned in chat or documentation alone.

Statuses:

`APPROVED | PLANNED | RED | IMPLEMENTING | GREEN | CI_PASS | STAGING_PASS | LAUNCH_PASS | SUPERSEDED`

No silent deletion, no silent replacement, no hidden scope reduction.

---

## A. Product identity and no-clutter rules

### REQ-A001 — GLOBAL_FIRST
- Requirement: VVIP TIGER is global-first; Jordan-first/Arab-first is superseded.
- Phase: F00.
- Verification: authority/current-reference tests.
- Status: APPROVED.

### REQ-A002 — SINGLE_SURFACE
- Requirement: one product surface for user/employee/partner/owner; no separate final admin skin.
- Phase: F02/F03.
- Verification: route/UI contract + capability visibility tests.
- Status: APPROVED.

### REQ-A003 — NO_CLUTTER
- Requirement: no duplicate buttons/screens/dashboards; progressive disclosure only.
- Phase: F01/F02/F15.
- Verification: Runtime Vacuum inventory + UX regression checklist.
- Status: APPROVED.

### REQ-A004 — FACEBOOK_MUSCLE_MEMORY_TIGER_IDENTITY
- Requirement: familiar feed/post interaction and geometry without copying Facebook branding.
- Phase: F02.
- Verification: visual contract, responsive tests, accessibility, screenshot review.
- Status: APPROVED.

### REQ-A005 — LOGIN_FREEZE
- Requirement: unapproved blue login screen must not be introduced; recover/use the previously owner-approved login visual.
- Phase: F00/F02.
- Verification: design-token separation + visual approval evidence.
- Status: APPROVED.

---

## B. Post/listing creation and feed

### REQ-B001 — FEED_GEOMETRY
- Mobile near-full width with small gutter; desktop central feed approx. 680–720px responsive.
- Phase: F02.
- Status: APPROVED.

### REQ-B002 — POST_STRUCTURE
- Header: avatar/name/verified/location-sector/time/⋮.
- Text: concise copy + See more when needed.
- Media: swipe + 1/7 + placeholder.
- Commercial facts: price/location/high-value attributes.
- Actions: Save | Contact | Share only as primary actions.
- Phase: F02.
- Status: APPROVED.

### REQ-B003 — PROGRESSIVE_COMMERCIAL_COMPOSER
- Start with Photo(s) + Title + Sector/Category + Price Type/Price + Location; reveal sector fields progressively.
- Phase: F02.
- Status: APPROVED.

### REQ-B004 — NO_FIXED_FOUR_POSTS
- Fixed four-posts-per-week rule is removed; abuse control is adaptive/server-side.
- Phase: F00/F03.
- Status: APPROVED.

### REQ-B005 — NO_UNIVERSAL_120_DAY_LIFE
- Listing lifecycle is policy-driven; only Synthetic Showcase has explicit 90-day life.
- Phase: F00/F08.
- Status: APPROVED.

---

## C. Search

### REQ-C001 — TIGER_SEARCH_FABRIC
- OpenSooq-grade commercial usability with structured + lexical + semantic-assist retrieval.
- Phase: F04.
- Status: APPROVED.

### REQ-C002 — AR_EN_SEARCH
- Arabic normalization, English variants, transliteration, typos, brand/model/location aliases.
- Phase: F04/F10.
- Status: APPROVED.

### REQ-C003 — ZERO_RESULT_RESCUE
- Typo correction, nearby location, filter relaxation, adjacent category, bilingual aliases.
- Phase: F04.
- Status: APPROVED.

---

## D. Media / HEIC

### REQ-D001 — PR36_IOS04_HYBRID
- Preserve PR36 safety and add secure HEIC/HEIF ingestion.
- Phase: F05.
- Status: APPROVED.

### REQ-D002 — MEDIA_PIPELINE
- Decode -> Validate -> Malware/Polyglot Check -> Color Management -> Metadata Sanitization -> Content-Adaptive Encoding -> Derivatives -> Storage Commit.
- Phase: F05.
- Status: APPROVED.

### REQ-D003 — PRIVATE_QUARANTINE
- Originals never go directly to public CDN.
- Phase: F05.
- Status: APPROVED.

### REQ-D004 — ASPECT_RATIO_POLICY
- Cover/Card = 4:3; Detail/Master preserves original aspect ratio within limits.
- Phase: F05.
- Status: APPROVED.

### REQ-D005 — CONTENT_ADAPTIVE_ENCODING
- No fixed AVIF/WebP superiority claim; choose output by bounded quality/cost/latency evidence.
- Phase: F05.
- Status: APPROVED.

### REQ-D006 — PRIVATE_DEDUP
- Internal keyed/salted content identity; no existence oracle to clients.
- Phase: F05.
- Status: APPROVED.

### REQ-D007 — LATENCY_SEPARATION
- Measure Perceived UI / Upload / Processing / Delivery independently.
- Phase: F05/F13.
- Status: APPROVED.

---

## E. Weak network / performance

### REQ-E001 — ADAPTIVE_SIMPLICITY_ENGINE
- Adapt media/motion/prefetch based on safe device/network/data-saver signals.
- Phase: F02/F05/F11/F13.
- Status: APPROVED.

### REQ-E002 — WEAK_NET_FIRST
- Text/shell/placeholders first; reduced motion; no fake privileged success; resumable transfer.
- Phase: F02/F05/F11.
- Status: APPROVED.

### REQ-E003 — EVIDENCE_FIRST_PERFORMANCE
- No universal 2G/300ms/microsecond claims without exact test evidence.
- Phase: F13/F16.
- Status: APPROVED.

---

## F. Languages and accessibility

### REQ-F001 — FULL_I18N_AR_EN
- Arabic/English are first-class, same app/data model, full RTL/LTR.
- Phase: F10.
- Status: APPROVED.

### REQ-F002 — WCAG22_AA
- Critical web journeys target WCAG 2.2 AA with native accessibility parity.
- Phase: F10/F11.
- Status: APPROVED.

---

## G. Money / profitability

### REQ-G001 — GLOBAL_MONEY_FABRIC
- Listing/display/billing/ledger currencies + FX snapshot separation.
- Phase: F06.
- Status: APPROVED.

### REQ-G002 — DECIMAL_SAFE_MONEY
- No binary floating-point authority for money.
- Phase: F06.
- Status: APPROVED.

### REQ-G003 — NO_KNOWN_NEGATIVE_MARGIN_SALE
- Missing/unverified cost, FX, tax/fees, risk reserve, capacity, or margin blocks sale.
- Phase: F06/F07.
- Status: APPROVED.

### REQ-G004 — SHADOW_LEDGER_ZERO
- Launch certificate requires Shadow Ledger = 0 for certified scope.
- Phase: F06/F16.
- Status: APPROVED.

---

## H. Authority / owner / partners / employees

### REQ-H001 — SOA_PRESERVED
- Public Owner Profile, Private Vault, passkey-first, TOTP+backup codes, L1–L4, kill switch, recovery hold, RLS, audit.
- Phase: F03.
- Status: APPROVED.

### REQ-H002 — SCG
- Sovereign Capability Graph replaces simplistic browser roles for privileged delegation.
- Phase: F03.
- Status: APPROVED.

### REQ-H003 — DELEGATION_INVARIANT
- No delegate can delegate more authority than they possess.
- Phase: F03.
- Status: APPROVED.

### REQ-H004 — THREE_DOT_GATEWAY
- `⋮` exposes server-confirmed capabilities on the same user surface.
- Phase: F02/F03.
- Status: APPROVED.

---

## I. TIGER Pulse campaigns / brochures

### REQ-I001 — HERO_DYNAMIC_AD_RIBBON
- Premium upper micro-ribbon, low clutter, sponsored labeling.
- Phase: F07.
- Status: APPROVED.

### REQ-I002 — BROCHURE_LIGHTBOX
- Full-screen/sheet multi-page interactive brochure with on-demand HD.
- Phase: F07.
- Status: APPROVED.

### REQ-I003 — CAMPAIGN_TARGETING
- Country/region/city, sector/context, language, account type, coarse interests, global/cross-sector under privacy policy.
- Phase: F07.
- Status: APPROVED.

### REQ-I004 — WEIGHTED_FAIR_DELIVERY
- No crude priority domination; delivery constrained by entitlement, budget, frequency, inventory, V13 economics and fraud rules.
- Phase: F07.
- Status: APPROVED.

### REQ-I005 — CAMPAIGN_SCOPED_SCG
- Owner/partners manage campaigns only through granted SCG scope in same surface.
- Phase: F03/F07.
- Status: APPROVED.

### REQ-I006 — CAMPAIGN_FINANCIAL_TRUTH
- V13 qualified impression truth, Global Money Fabric, ledger/idempotency, no-known-negative-margin sale.
- Phase: F06/F07.
- Status: APPROVED.

### REQ-I007 — CAMPAIGN_OWNER_REFERENCE
- Canonical owner reference: `docs/fusion/OWNER_REFERENCE_F07_TIGER_PULSE.md`.
- Phase: F00/F07.
- Status: GREEN documentation.

---

## J. AI / Private Core / reverse engineering

### REQ-J001 — SIMPLE_SURFACE_PRIVATE_CORE
- Simple UI; sensitive authority/finance/security stays in Private Core.
- Phase: cross-cutting.
- Status: APPROVED.

### REQ-J002 — MINIMUM_TRUTH
- Client receives only bounded data needed for current action.
- Phase: F03/F06/F07/F09.
- Status: APPROVED.

### REQ-J003 — SERVER_SIDE_SOVEREIGN_EXECUTION
- Client never authoritative for OWNER, SCG, money, campaign billing, country activation, kill switch, L4 approvals.
- Phase: F03/F06/F07/F09.
- Status: APPROVED.

### REQ-J004 — RUST_WASM_NOT_AUTH_BOUNDARY
- Rust/Wasm/obfuscation may add performance/IP friction but never replace server authorization.
- Phase: F05/F09/F11.
- Status: APPROVED.

### REQ-J005 — TAMPER_EVIDENT_AUDIT
- Sensitive actions require append-only/tamper-evident evidence appropriate to subsystem.
- Phase: F03/F06/F07/F09/F16.
- Status: APPROVED.

### REQ-J006 — AI_REVERSE_ENGINEERING_OWNER_REFERENCE
- Canonical owner reference: `docs/fusion/OWNER_REFERENCE_AI_REVERSE_ENGINEERING_SHIELD_2026.md`.
- Phase: F00/cross-cutting.
- Status: GREEN documentation.

---

## K. Showcase / demo data

### REQ-K001 — 25K_SYNTHETIC_SHOWCASE
- 25,000 synthetic educational/demo ads/campaign pieces across sectors/countries.
- Phase: F08.
- Status: APPROVED.

### REQ-K002 — SHOWCASE_90_DAY_LIFE
- Synthetic showcase items expire after 90 days.
- Phase: F08.
- Status: APPROVED.

### REQ-K003 — SHOWCASE_TRANSPARENCY
- Synthetic/demo content must be distinguishable internally and must not impersonate real businesses/people.
- Phase: F08.
- Status: APPROVED.

---

## L. Mobile

### REQ-L001 — SINGLE_PRODUCT_SURFACE_THIN_NATIVE_SHELL
- Web/PWA/Android/iOS share design/business contracts; native bridges only for device capability.
- Phase: F11.
- Status: APPROVED.

### REQ-L002 — ANDROID_20_20
- Android requires 20/20 critical-journey certification.
- Phase: F11/F16.
- Status: APPROVED.

### REQ-L003 — IOS_20_20
- iOS requires 20/20 critical-journey certification.
- Phase: F11/F16.
- Status: APPROVED.

---

## M. Red-Team and Digital Twin

### REQ-M001 — FIVE_RED_TEAM_CAMPAIGNS
- Owner takeover, delegation escape, financial tampering, media weaponization, release/supply-chain.
- Phase: F12.
- Status: APPROVED.

### REQ-M002 — 4M_UNIQUE_ACTORS
- 4,000,000 unique reproducible behavioral actors PASS.
- Phase: F13/F16.
- Status: APPROVED.

### REQ-M003 — 4M_SIMULTANEOUS
- 4,000,000 simultaneous active virtual users PASS.
- Phase: F13/F16.
- Status: APPROVED.

### REQ-M004 — BEHAVIOR_SEED_REPLAY
- Any synthetic actor failure can be replayed deterministically by seed.
- Phase: F13.
- Status: APPROVED.

---

## N. Runtime Vacuum / removal of old clutter

### REQ-N001 — RUNTIME_VACUUM
- Classify every runtime-relevant path: ACTIVE | MIGRATION_BRIDGE | TEST_ONLY | HISTORICAL_DOC | ORPHANED | DELETE_CANDIDATE.
- Phase: F01/F15.
- Status: APPROVED.

### REQ-N002 — REMOVE_OBSOLETE_RUNTIME
- Final Production bundle excludes duplicate screens/CSS, dead JS, old admin skins, fake-live demos, abandoned routes, obsolete previews, duplicate assets, stale experiments, contradictory copy.
- Phase: F15.
- Status: APPROVED.

### REQ-N003 — PRESERVE_EVIDENCE_NOT_CLUTTER
- Historical security/audit/rollback evidence remains outside runtime and current owner operational index.
- Phase: F00/F15.
- Status: APPROVED.

---

## O. Reliability / sovereignty / launch

### REQ-O001 — SOVEREIGN_PORTABILITY
- No single-provider/single-jurisdiction technical capture; portable contracts, backups, provider adapters, granular country suspension.
- Phase: F14/cross-cutting.
- Status: APPROVED.

### REQ-O002 — RESTORE_FAILOVER
- Measured RTO/RPO, restore rehearsal, failover rehearsal, safe degraded modes.
- Phase: F14.
- Status: APPROVED.

### REQ-O003 — LAUNCH_PASSPORT
- Exact SHA/artifact evidence gates all global launch claims.
- Phase: F16.
- Status: APPROVED.

### REQ-O004 — GLOBAL_LAUNCH_PHRASE
- `نحن جاهزون للانطلاق العالمي.` only when `GLOBAL_LAUNCH_ELIGIBLE = TRUE`.
- Phase: F16.
- Status: APPROVED.

---

## Anti-omission gate

Before closing any FUSION phase:

1. review all requirement IDs owned by that phase;
2. ensure each has an implementation artifact or explicit `SUPERSEDED` owner decision;
3. ensure tests/evidence exist;
4. ensure no required item remains only as prose;
5. ensure no new duplicate screen/control/runtime path was introduced;
6. update statuses in this traceability master.

Before F16, every requirement in this document must be either:

- `LAUNCH_PASS`, or
- explicitly `SUPERSEDED` by a later owner-approved versioned decision.

Anything else blocks `GLOBAL_LAUNCH_ELIGIBLE = TRUE`.

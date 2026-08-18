# VVIP TIGER FUSION 2026 — FINAL Owner Constitution

**Status:** SELF-REVIEWED FINAL DESIGN FOR OWNER REVIEW — NO RUNTIME/PRODUCTION AUTHORIZATION IMPLIED

**Date:** 2026-08-13

**Baseline:** `main@78fe36e33cb8eeb1f1b44e12eac53db166c272a2`

**Authority intent:** after owner review and F00 reconciliation, this file becomes the highest current product-design reference for VVIP TIGER FUSION 2026.

---

## 1. Legacy decisions permanently superseded

The following are rejected as active product rules and must not remain in Production behavior, current owner reference, runtime copy, design tokens, launch criteria, or active implementation instructions:

- `Jordan-first` / `Arab-first` governing identity;
- fixed three-sector model;
- fixed four-posts-per-week rule;
- universal fixed 120-day listing life;
- Tiger Care old support-center experience;
- old fixed sector ownership/management assignments;
- `admin/super_admin` implying sovereign OWNER;
- separate visual platforms for owner/partner/employee/admin;
- unapproved blue login-screen design;
- obsolete fixed package price/lifetime/impression decisions superseded by V13;
- hard-coded demo/local-preview behavior that can be mistaken for live truth;
- documentation that treats design-only completion as Production proof.

Historical files may remain only as audit/rollback/provenance evidence. After F00 they are marked `SUPERSEDED / HISTORICAL ONLY`, excluded from Production runtime, and removed from the current owner-operational reference/index.

---

## 2. Global product identity

VVIP TIGER FUSION 2026 is global-first and uses one product surface across Web/PWA/Android/iOS.

Core surface:

`Home -> Search -> Listing/Post -> Profile -> Settings`

Privileged capability appears inside the same surface only after server confirmation. No separate admin skin or owner platform is a final-state UX.

The product is for discovery, advertising, commercial presentation, and direct contact. It does not silently become a shipping, escrow, delivery, customer-service intermediary, or checkout processor without a separately approved legal/product constitution.

---

## 3. Visual identity and feed

Use **Facebook muscle memory + TIGER identity**, not Facebook branding or proprietary assets.

Legacy `--fb-blue` naming is removed from final product code and replaced by semantic VVIP TIGER tokens such as `--brand-primary`.

**Mobile:** near-full-width cards with a small consistent gutter.

**Desktop:** central feed approximately `680–720px`, responsive to zoom and viewport constraints.

Post/listing order:

1. Header — avatar, name, verified badge if present, location/sector, time, `⋮`.
2. Text — concise title/copy and `عرض المزيد / See more` only when needed.
3. Media — main image, swipe, `1/7`, ThumbHash/blur placeholder.
4. Commercial facts — price/price type, location, highest-value structured facts.
5. Actions — `حفظ | تواصل | مشاركة` / `Save | Contact | Share`.

No button clutter.

### Login freeze

The previously owner-approved login visual remains authoritative. The unapproved blue login version is rejected. Login uses a separate token scope from the marketplace so marketplace blue cannot silently restyle login.

---

## 4. Progressive Commercial Composer

Creation should feel as simple as a familiar social composer.

Arabic prompt: **`ماذا تريد أن تعرض؟`**

English prompt: **`What would you like to offer?`**

First view shows only:

`Photos + Title + Sector/Category + Price Type/Price + Location`

Sector-specific fields appear progressively. No long wizard unless a genuine legal flow requires it.

There is no universal four-post weekly rule. Abuse controls are server-enforced and risk/capacity/policy based.

There is no universal 120-day listing life. Lifecycle is policy-driven by listing type, country, category, package, advertiser state, and law. The Synthetic Showcase is separately fixed at 90 days.

---

## 5. Dynamic Sector Registry

Sector count is not hard-coded to three, seven, or any permanent number.

Each sector contract defines schema, category tree, search filters, price types, media rules, country licensing/compliance, moderation, lifecycle, and campaign eligibility.

A new sector remains disabled until legal, financial, search, data, UI, and test contracts are complete.

---

## 6. TIGER Search Fabric 2026

Replace simple substring search with:

`Query -> Language/Script Normalization -> Intent -> Structured Filters -> Lexical Retrieval -> Semantic Assist -> Commercial Ranking -> Safety/Policy Filter -> Results`

Support Arabic/English normalization, spelling variants, transliteration, typo tolerance, bilingual locations, brand/model aliases, category synonyms, and structured intent extraction.

Example:

`مرسيدس 2020 عمان`

may resolve to:

`make=Mercedes, year=2020, location=Amman`

Typeahead remains bounded and clean. Zero-result rescue suggests spelling corrections, nearby locations, relaxed filters, adjacent categories, or bilingual aliases.

Semantic/vector retrieval is assistive and can never bypass authorization, visibility, country, sector, or safety rules.

---

## 7. PR36 + IOS-04 Hybrid Media Fabric

Preserve PR36 resource ownership, concurrency limits, abort/cancel behavior, stale-result suppression, cleanup, validation, and fallback design.

Add secure JPEG/PNG/WebP/HEIC/HEIF intake for up to seven still images.

### Client

`Select -> Validate -> Local Preview/Orientation -> ThumbHash -> Cover/Crop -> Signed Resumable Upload`

Adaptive concurrency depends on device/network state. Safe background/resumable transfer is used where native capability supports it.

### Server

Originals enter **Private Quarantine**, never public CDN directly:

`Decode -> Validate -> Malware/Polyglot Check -> Color Management -> Metadata Sanitization -> Content-Adaptive Encoding -> Derivatives -> Storage Commit -> Publish-safe CDN`

### Privacy/color

Remove unnecessary EXIF/GPS/device metadata, normalize orientation, and apply explicit Display-P3/sRGB color management. Do not claim 0% CPU; require bounded measured processing that does not block interactive UI.

### Aspect ratio

`Cover/Card = 4:3`

`Detail/Master = preserve original aspect ratio within security/size limits`

### Encoding

Do not assume AVIF always wins. Choose approved derivative codec/settings by quality, byte size, latency, compatibility, and cost budgets.

### Private deduplication

Do not expose raw global content hashes. Conceptual internal identity:

`HMAC(storage_secret, content_hash + isolation_scope)`

No client existence-oracle API.

Raw source retention is short and policy-bound after derivative integrity is confirmed.

---

## 8. Adaptive Simplicity Engine

Measure separately:

- Perceived UI Latency;
- Upload Latency;
- Processing Latency;
- Delivery Latency.

No misleading single end-to-end timing claim for seven photos.

**Strong network:** high-quality derivative and selective prefetch.

**Medium:** card derivative and conservative prefetch.

**Weak/data saver:** text first, tiny placeholder, no nonessential prefetch, reduced motion.

**Offline/intermittent:** safe cache/local drafts with explicit connectivity state; no fake success for privileged actions.

Performance claims require first/repeat visit, cache hit/miss, p50/p75/p95/p99, poor-network, bundle, image, scroll/render, and server saturation evidence.

---

## 9. Arabic/English i18n

Arabic and English are native launch languages using one app and one data model.

Requirements include versioned message catalogs, locale-aware date/number/currency, RTL/LTR, language-aware search, bilingual content fields where needed, no hard-coded business-logic copy, and no Arabic/English app forks.

Critical Web/PWA journeys target WCAG 2.2 AA, with equivalent native accessibility quality.

---

## 10. Global Money Fabric

Separate:

- `listing_currency`;
- `display_currency`;
- `billing_currency`;
- `ledger_currency`;
- `fx_reference_snapshot`.

Use decimal/integer-safe money semantics, never binary floating-point as authoritative money.

Extensible price types include `FIXED`, `FROM`, `NEGOTIABLE`, `PER_HOUR`, `PER_DAY`, `PER_M2`, `PER_UNIT`, `CONTACT`.

### Platform-loss protection

Absolute zero business loss cannot be guaranteed under every external event. The enforceable technical rule is:

**NO KNOWN NEGATIVE-MARGIN SALE.**

Campaign/package selling is blocked when required cost, tax/fee, reserve, FX, margin, capacity, or country configuration is unverified.

Fail-closed examples:

`PACKAGE_NOT_SELLABLE`

`COUNTRY_PRICING_BLOCKED`

`FX_REFERENCE_UNAVAILABLE`

`COST_MODEL_UNVERIFIED`

V13 DIDE remains authoritative for impression commitment/margin protection.

Double-entry append-only ledger, idempotency, no browser money authority, no AI autonomous money movement, and `Shadow Ledger = 0` are launch invariants.

---

## 11. Sovereign Capability Graph (SCG)

`OWNER` remains the sovereign root under SOA, not an editable role.

The owner may grant partner capability sets. Partners can delegate only lower/equal authority within their exact granted scope and only if delegation is explicitly permitted.

**Invariant:** `No delegate can delegate more authority than they possess.`

Every grant binds capability, country scope, sector scope, resource scope, validity, delegation flag, maximum depth, reason, granting authority, policy version, and audit/evidence ID.

### `⋮` menu

Ordinary user: own capabilities.

Employee: own capabilities + assigned tasks.

Partner: scoped staff/delegation controls.

Owner: grouped Countries, Users, Partners, Employees, Capabilities, Security, Finance, Policies, Decision/Audit history.

All are protected panels/sheets in the same surface.

### Preserve SOA

Keep Public Owner Profile, Private Owner Vault, Passkey-first, TOTP + backup codes, server-confirmed owner binding, L1/L2/L3/L4, single-use short L4 leases, recovery hold, kill switch, RLS/default deny, and append-only audit.

SCG never replaces SOA.

---

## 12. TIGER Pulse — Hero Dynamic Ad Ribbon Engine

Accept the top campaign ribbon with refinements that protect UX, accessibility, privacy, and profitability.

### Ribbon

A clearly labeled sponsored surface near the top of the unified experience. Default is a quiet single campaign with controlled rotation rather than a distracting infinite ticker.

Target design family: roughly 60–80px height subject to accessibility text scaling, touch swipe, pause on interaction, reduced-motion support, static ultra-light weak-network mode, and no animation competing with feed reading.

### Brochure

Tap opens a polished full-screen/sheet brochure. High-resolution assets load on demand. Multi-page creative is allowed.

Uploaded PDF is quarantined/scanned and preferably rendered into sanitized brochure pages rather than trusted as active arbitrary client content.

Possible actions: Contact, Call/WhatsApp where policy permits, validated external site, Save/Share, sanitized brochure download.

`Buy now / Order now` is outbound/contact unless a separately approved checkout/payment product is activated.

### Any company, inside or outside platform sectors

Campaign taxonomy is independent of the listing Sector Registry. A sponsor may belong to one sector, many sectors, or no marketplace sector.

### Targeting

Allowed dimensions may include active-market country/region/city, current sector/category, language, account/business type, coarse interest/context with privacy controls, and global/cross-sector scope.

No sensitive-personal-attribute targeting without explicit future legal/privacy approval.

### Delivery

Use **Weighted Fair Delivery** under budget, frequency cap, eligibility, inventory, capacity, cost, user-experience, country, and profitability rules.

V13 qualified-impression truth remains authoritative. Analytics distinguish opportunity, qualified impression, brochure open, page engagement, CTA, and external navigation. Never claim all traffic is “100% real”; report invalid-traffic controls and evidence.

---

## 13. Synthetic Showcase Dataset — exactly 25,000

Create exactly `25,000` synthetic demo/education items, suggested as approximately 20,000 listings/posts plus 5,000 campaign/brochure/education creatives.

Every item carries `synthetic_demo=true` and, when public, a subtle `مثال توضيحي / Demo example` indicator.

No real personal contacts or unlicensed assets are invented/copied. Maintain asset provenance.

Lifecycle:

`expires_at = created_at + 90 days`

Demo items never count as real advertiser revenue or real organic supply.

---

## 14. Smart Platform AI Assistant

AI features are user-invoked and advisory for writing, rewriting, spelling/grammar, structure, keyword/tag, sector/category suggestion, translation, image-quality suggestions, and semantic search assist.

User confirmation is required before publication.

AI can never autonomously move money, grant OWNER, expand privilege, bypass country gates, disable core security, perform destructive deletion, or create binding legal/financial commitments without required authority.

Use current OWASP AI/AISVS/LLM security verification guidance in addition to ASVS and the existing sovereign AI security kernel.

---

## 15. Automated Platform Controller & Supervisor

Four monitoring domains:

1. Financial — ledger reconciliation, anomaly/replay detection, cost/margin guard.
2. Administrative — capability drift, expired grants, country-policy state.
3. Technical — SLOs, latency, errors, saturation, security/media events.
4. Creative/content — quality, policy, duplicate/spam, brochure checks.

Automation levels:

- `L0 Observe`;
- `L1 Recommend`;
- `L2 Safe Auto-Action` only when pre-authorized, bounded, reversible, idempotent;
- `L3 Sensitive` requires human/partner step-up;
- `L4 Sovereign/Financial/Security` follows SOA policy and explicit approval.

High-risk financial timeout means HOLD/FREEZE, never automatic approval. Delegation never expands authority.

---

## 16. Unified Reports & Evidence Center

Reports live inside the same surface and are SCG-scoped.

Families: finance/revenue/campaigns, country/sector, users/trust, technical capacity/SLO, security/audit, advertising, test evidence, launch readiness.

Outputs: interactive screen, PDF, CSV/JSON, and spreadsheet where appropriate. Field-level authorization/privacy applies to exports.

Every report declares consistency: live, bounded-lag replica, or point-in-time snapshot, with timestamp/scope/filter/source/integrity metadata where required.

---

## 17. Sovereign Portability

Do not claim the platform is outside national law. Target **No Single-Jurisdiction / No Single-Provider Technical Capture**.

Use four-layer geography, country activation gates, portable contracts, infrastructure as code, encrypted independent backups, multiple failure domains, controlled DNS/registrar ownership, signed build-once artifacts, provider adapters, country-scoped suspension, no ordinary administrator able to seize OWNER, and documented provider exit/restore plans.

---

## 18. Security Constitution 2026

No “impossible to hack” or “AI-proof” marketing claims.

Security target: layered prevention, containment, detection, verifiable authorization, recovery, and release integrity under modern automated/AI-assisted attackers.

Baselines include OWASP ASVS 5.0.0, current OWASP AI security guidance for AI components, WCAG 2.2 AA critical UX, platform-native signing/security, and existing SOA/RLS/release security.

Layers include identity/passkeys/MFA, SCG, SOA L4, RLS/server authorization, edge controls, input/output safety, media quarantine, ledger/idempotency, KMS/secrets, supply-chain provenance, rate/abuse defense, audit, monitoring, incident response, backup/restore.

### Five Red-Team Certification campaigns

Run only on explicitly authorized isolated environments:

1. Owner Takeover.
2. Delegation Escape / BOLA-IDOR scope abuse.
3. Financial Tampering / replay / concurrency.
4. Media Weaponization including malformed HEIC/polyglot/bomb cases.
5. Release/Supply-Chain tampering.

Global launch requires no unresolved Critical/High finding and retest evidence after remediation.

---

## 19. Native mobile — same surface, thin shell

Web/PWA/Android/iOS share design tokens, information architecture, feed, search, composer, capability UX, business contracts, and i18n keys.

Native bridges are limited to device-value capabilities: photos/camera, push, background transfer, passkeys/biometrics, share sheet, deep/universal links, secure local APIs.

### Android — mandatory 20-test certification

Cold launch; warm launch; login; passkey/MFA; recovery; Arabic RTL; English LTR; long feed scroll; search/typeahead; filters; listing/deep link; create listing; seven-photo/media path; background/resume; weak network/offline; low-memory/process restart; push/deep link; permissions; accessibility; update/reinstall regression.

Performance proof uses physical devices and Macrobenchmark/Baseline Profiles where applicable.

### iOS — mandatory 20-test certification

The same twenty critical journeys, with iOS-specific evidence for HEIC, background URLSession transfer, suspend/terminate/relaunch, VoiceOver, universal links, passkeys, and XCTest/XCUITest launch/CPU/memory/UI-hitch performance where applicable.

---

## 20. TIGER Digital Twin — both 4M programs are mandatory

### Program A — 4,000,000 unique behavioral actors

Four million reproducible synthetic actors with distinct `behavior_seed` values vary by country, language, sector, device, network, session length, think time, scroll rate, typo/query behavior, filters, listing actions, media count, campaign interaction, and account mode.

Failures must be replayable by seed.

### Program B — 4,000,000 simultaneous active virtual users

Separate distributed capacity campaign in an isolated authorized environment with explicit cost ceilings and stop conditions.

Progressive ramp example:

`10K -> 100K -> 500K -> 1M -> 2M -> 4M`

A stage advances only when reliability, p95/p99 latency, error rate, saturation, cost, and downstream constraints remain inside approved thresholds.

Do not blast third-party identity/payment/search providers outside contractual limits; use controlled test issuers/emulators where required and run smaller real-provider certification separately.

**Global-launch requirement:** Program B must reach **4,000,000 simultaneous active virtual users and PASS**. A lower capacity result permits only a limited capacity/launch claim and cannot set `GLOBAL_LAUNCH_ELIGIBLE = TRUE`.

Metrics include p50/p75/p95/p99, error rate, throughput, queues, DB/cache/search saturation, CDN, media throughput, auth capacity, cost per 1,000 key operations, financial invariants, failover, and recovery.

---

## 21. Runtime Vacuum

Classify every runtime-relevant path:

`ACTIVE | MIGRATION_BRIDGE | TEST_ONLY | HISTORICAL_DOC | ORPHANED | DELETE_CANDIDATE`

Final Production bundle removes duplicate screens/CSS, dead JS, old admin skins, fake-live demo runtime, abandoned routes, obsolete preview code, duplicate assets, old adapters, outdated config, stale experiments, contradictory copy, and role-specific surfaces replaced by Single Surface.

Historical Git/security/rollback evidence is preserved outside runtime and outside the current owner-operational index.

No deletion happens by filename guess. Require dependency/reference scan, runtime reachability, route/asset manifest comparison, test coverage, build comparison, and rollback evidence.

Real secret in history requires `rotate + revoke + history remediation`.

---

## 22. Reliability / failover / recovery

Use measurable RTO/RPO rather than “never down” slogans.

Require multi-failure-domain design appropriate to criticality, backups/retention, PITR where supported, restore rehearsal, failover rehearsal, dependency degradation, circuit breakers/timeouts/retries with idempotency, safe degraded/read-only modes, and fail-closed privileged actions under uncertainty.

---

## 23. Launch Passport — only path to global-launch statement

Mandatory exact-release evidence:

- Release SHA;
- Artifact Digest;
- supply-chain/provenance PASS;
- security verification PASS;
- five Red-Team campaigns PASS;
- Program A 4,000,000 behavioral actors PASS;
- Program B 4,000,000 simultaneous active virtual users PASS;
- Android 20/20;
- iOS 20/20;
- Arabic PASS;
- English PASS;
- Search PASS;
- Hybrid Media/HEIC PASS;
- accessibility PASS;
- Restore PASS;
- Failover PASS;
- Shadow Ledger = 0;
- Country Gates PASS for every launch country;
- Pricing/Profitability Certificate PASS;
- 25K Showcase validation PASS;
- Runtime Vacuum PASS;
- zero unresolved Critical/High security findings;
- human review PASS;
- owner exact-SHA/artifact authorization.

Only when all mandatory criteria are satisfied:

`GLOBAL_LAUNCH_ELIGIBLE = TRUE`

Only then may the project state say:

**نحن جاهزون للانطلاق العالمي.**

---

## 24. Execution order

**F00 Constitution Reconciliation** — make this constitution highest current reference, machine-readable decision catalog, mark/remove old current references, freeze global-first and rejected blue login.

**F01 Runtime Vacuum Inventory** — classify paths and dependencies; no blind deletion.

**F02 Single Surface Design System** — TIGER tokens, familiar feed, composer, profile, `⋮`, Arabic/English.

**F03 SOA + SCG** — server-confirmed capability graph inside Single Surface.

**F04 Search Fabric** — bilingual structured/semantic search, zero-result rescue, golden queries.

**F05 Hybrid Media** — secure HEIC/HEIF, PR36 safety, quarantine, adaptive encoding, background upload.

**F06 Global Money Fabric** — currencies, FX, price types, sellability/profitability gates, ledger.

**F07 TIGER Pulse Campaign Engine** — sponsored ribbon, brochures, targeting, fair delivery, V13 impression truth.

**F08 25K Synthetic Showcase** — provenance, labeling, 90-day lifecycle.

**F09 AI Assistant + Controller** — advisory AI and bounded automation.

**F10 Arabic/English + Accessibility** — i18n and WCAG/native accessibility closure.

**F11 Android/iOS Thin Shells** — same surface and 20/20 certification.

**F12 Five Red-Team campaigns** — remediation/retest.

**F13 Digital Twin** — 4M unique + 4M simultaneous PASS.

**F14 DR/Failover/Restore** — RTO/RPO and rehearsal evidence.

**F15 Final Runtime Vacuum** — remove approved obsolete Production runtime; preserve evidence outside current operational surface.

**F16 Launch Passport** — exact SHA/artifact, human review, owner exact-SHA approval.

---

## 25. Non-negotiable truth and governance rules

1. No impossible-to-hack claim.
2. No zero-CPU claim.
3. No universal network timing detached from network/payload reality.
4. No 100%-real-traffic claim; use qualified evidence.
5. Design-only is not Production-complete.
6. AI never becomes sovereign/financial authority by recommendation alone.
7. Client role never becomes OWNER.
8. Missing cost/FX/country evidence blocks sale.
9. Both 4M programs require distributed proof.
10. Android/iOS are not certified before their 20-test gates.
11. Old decisions cannot silently override FUSION after F00.
12. Obsolete runtime cannot remain merely for convenience.
13. A general “all permissions” statement does not bypass protected branch review, exact-SHA approval, legal/country gates, Production change controls, safety checks, or unknown external spending.

---

## 26. Owner reference summary

**Keep and strengthen:** SOA, RLS, release security, financial ledger, country gates, audit, recovery, PR36 resource safety, Strangler architecture.

**Add:** Single Surface, Facebook muscle memory + TIGER identity, Progressive Commercial Composer, TIGER Search Fabric, HEIC Hybrid Media, Adaptive Simplicity Engine, full Arabic/English i18n, Global Money Fabric, Dynamic Sector Registry, Sovereign Capability Graph, TIGER Pulse, 25K Synthetic Showcase, AI Assistant, bounded Controller, Reports/Evidence Center, Sovereign Portability, Android/iOS certification, five Red-Team campaigns, both 4M Digital Twin programs, Runtime Vacuum, Launch Passport.

**Remove/supersede:** Jordan-first, fixed three sectors, four-post weekly limit, fixed 120-day listing life, old Tiger Care, unapproved blue login, separate admin/owner skins, obsolete runtime/demo paths, and any other contradictory legacy decision discovered in F00.

This is the self-reviewed FINAL design reference proposed for **VVIP TIGER FUSION 2026**.
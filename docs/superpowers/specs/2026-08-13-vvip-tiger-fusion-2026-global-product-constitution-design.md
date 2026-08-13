# VVIP TIGER FUSION 2026 — Global Product Constitution & Owner Reference

**Status:** OWNER-APPROVED DESIGN INPUT — WRITTEN CONSTITUTION FOR OWNER REVIEW BEFORE IMPLEMENTATION PLAN

**Date:** 2026-08-13

**Branch:** `design/vvip-tiger-fusion-2026-constitution-20260813`

**Baseline:** `main@78fe36e33cb8eeb1f1b44e12eac53db166c272a2`

**Purpose:** establish one global, implementation-ready product constitution for VVIP TIGER FUSION 2026, supersede contradictory legacy product decisions, preserve the strongest existing security/finance/release foundations, and define the exact path to global launch evidence.

---

## 0. Normative authority and supersession

This document is intended to become the highest product-design authority after owner review and implementation of the reconciliation step.

The following legacy decisions are explicitly **SUPERSEDED** and must not remain active product behavior, active runtime copy, active design tokens, current implementation instructions, or launch criteria:

1. `Jordan-first` / `Arab-first` as the governing product identity.
2. Any fixed assumption that the platform has only three primary sectors.
3. The fixed user rule of four posts per week.
4. A universal fixed listing lifetime of 120 days.
5. Tiger Care as the old dedicated support-center experience.
6. Any fixed old sector ownership/management rule that conflicts with the new Sovereign Capability Graph.
7. Any legacy role model in which `admin` or `super_admin` implicitly equals sovereign OWNER authority.
8. Any old design rule that requires a separate visual platform for owners, partners, employees, or administrators.
9. Any old blue login-screen decision that was not owner-approved.
10. Any fixed price, fixed impression count, fixed country assumption, or fixed package lifetime already superseded by V13 economics and country configuration.
11. Any runtime demo data or local-preview behavior that can be mistaken for Production truth.
12. Any document that describes a completed design-only phase as if it were proven Production capability.

Legacy documents remain historical evidence only when needed for audit, rollback, provenance, or migration mapping. They must be excluded from the final Production runtime and clearly marked `SUPERSEDED / HISTORICAL ONLY` during reconciliation.

**Conflict rule:** if a legacy document conflicts with this constitution, the conflict is resolved in favor of this constitution once owner review is complete and the reconciliation implementation is merged.

---

## 1. Product identity: Global-first, one surface, no clutter

VVIP TIGER FUSION 2026 is a **global marketplace/social-commercial discovery platform** with one coherent product surface across Web/PWA/Android/iOS.

The public experience combines:

- familiar Facebook-style interaction muscle memory;
- marketplace-grade commercial search and discovery comparable in usability depth to leading classifieds products;
- an original VVIP TIGER visual identity;
- no platform clutter, duplicate dashboards, or role-specific visual skins;
- Arabic and English as first-class launch languages;
- dynamic countries, currencies, sectors, categories, and policies;
- strong owner sovereignty and capability delegation behind the same user surface.

The product remains a platform for discovery, advertising, and direct contact. It does not silently become a shipping, escrow, delivery, or transaction-intermediary business unless a separately approved product and legal constitution activates such a capability.

### 1.1 Single Product Surface

All people use the same core surface:

`Home -> Search -> Listing/Post -> Profile -> Settings`

There is no separate visual “admin platform.” Privileged capabilities appear only when the server confirms that the current identity possesses them.

The existing standalone `owner-control.html` may exist temporarily as a migration bridge, but the final target is for owner/partner/employee controls to appear inside the same platform via protected sheets/panels launched from the user menu.

### 1.2 No-clutter principle

The surface follows `Progressive Disclosure`:

- show the next useful action, not every possible action;
- hide complexity until context requires it;
- no duplicate buttons that perform the same action;
- no 20-control dashboard where 3 grouped entries are sufficient;
- privileged complexity belongs in the server/security core, not in the user's visual path.

---

## 2. Visual system: Facebook muscle memory + TIGER identity

The interaction grammar may feel familiar to users of Facebook-style feeds, but the platform must not copy Facebook brand identity, trademarks, or proprietary assets.

### 2.1 Design token rule

Rename legacy identity-coupled tokens such as `--fb-blue` to product-owned semantic tokens such as:

- `--brand-primary`
- `--brand-primary-hover`
- `--surface-primary`
- `--surface-muted`
- `--text-primary`
- `--text-secondary`
- `--border-subtle`
- `--status-success`
- `--status-warning`
- `--status-danger`

The final selected primary blue may remain visually familiar, but it is **TIGER Blue** and must be governed by VVIP TIGER design tokens.

### 2.2 Feed geometry

**Mobile:** near-full-width posts with a small consistent outer gutter.

**Desktop:** a central feed approximately `680–720px` wide, responsive to accessibility zoom and viewport constraints.

Every post/listing card follows this sequence:

1. **Header** — avatar, display name, verified badge if applicable, location/sector context, time, `⋮`.
2. **Text** — concise title/copy, expandable `عرض المزيد / See more` only when needed.
3. **Media** — main image, swipe/carousel, `1/7` counter, instant ThumbHash/blur placeholder.
4. **Commercial facts** — price/price-type, location, the few highest-value structured attributes.
5. **Action bar** — `حفظ | تواصل | مشاركة` / `Save | Contact | Share`.

No unnecessary fourth/fifth/sixth interaction button is added to the primary card surface.

### 2.3 Login screen freeze

The previously owner-approved login shape remains authoritative. The unapproved blue login-screen variant is explicitly rejected.

Login styling must use a separate `Login Design Token` scope from Marketplace/Feed tokens so a marketplace color decision cannot silently restyle login.

Implementation must recover or identify the exact approved visual artifact before replacing login markup. No new blue login treatment is authorized by this constitution.

---

## 3. Progressive Commercial Composer — simple post/listing creation

The creation experience must feel as immediate as writing a familiar social post while collecting enough structured commercial data for search and finance.

Initial prompt:

**Arabic:** `ماذا تريد أن تعرض؟`

**English:** `What would you like to offer?`

A subtle VVIP TIGER identity marker may accompany the composer without adding visual noise.

The first view exposes only:

`Photo(s) + Title + Sector/Category + Price Type/Price + Location`

Additional sector-specific fields appear progressively after the sector/category is known.

No eleven-screen wizard is allowed unless a legally required process genuinely requires it.

### 3.1 Post/listing types

The data model must support extensible commercial types without hard-coding sector count:

- standard listing;
- professional/service post;
- campaign/sponsored post;
- showcase/demo item;
- future types through versioned contracts.

### 3.2 Posting limits

No universal “four posts per week” product rule.

Abuse prevention uses server-enforced adaptive controls such as:

- risk-based rate limits;
- spam/duplicate detection;
- account trust state;
- country/legal policy;
- campaign/package entitlement;
- platform safety capacity.

Rate controls must not be presented as arbitrary fixed product limits when the underlying risk policy is dynamic.

### 3.3 Listing lifetime

No universal 120-day lifetime.

Regular item lifecycle is policy-driven by listing type, country, category, package, advertiser state, legal requirement, and explicit owner-approved policy.

The **Synthetic Showcase Dataset** is a separate case and has an explicit 90-day lifetime.

---

## 4. TIGER Search Fabric 2026 — OpenSooq-grade and beyond

The current simple substring search is not a launch-grade search architecture. FUSION replaces it with a dedicated Search Fabric behind an adapter.

### 4.1 Query pipeline

`Query -> Language/Script Normalization -> Intent Extraction -> Structured Filter Extraction -> Lexical Retrieval -> Semantic Assist -> Commercial Ranking -> Safety/Policy Filter -> Results`

### 4.2 Arabic/English normalization

The engine supports:

- Arabic diacritic normalization;
- Arabic letter variants;
- transliteration and Arabic/Latin brand aliases;
- English spelling variants;
- typo tolerance;
- singular/plural and common marketplace synonyms;
- bilingual location aliases;
- brand/model canonicalization;
- sector/category synonyms.

Example:

`مرسيدس 2020 عمان`

may resolve to structured intent:

`make=Mercedes, year=2020, location=Amman`

rather than a literal substring-only query.

### 4.3 Search ranking

Ranking combines:

- structured exact matches;
- title/category relevance;
- location relevance;
- listing freshness when policy permits;
- quality/completeness;
- trust/safety state;
- advertiser package rules without violating fairness or financial contracts;
- semantic similarity as an assistive signal, never the sole authoritative filter.

### 4.4 Typeahead and zero-result rescue

Typeahead is concise and useful, not noisy. It may suggest up to a small bounded set of:

- queries;
- categories;
- locations;
- brands/entities;
- relevant filters.

Zero-result behavior must propose recovery paths such as typo correction, nearby location, relaxed filter, adjacent category, or bilingual alias.

### 4.5 Search safety

- server-side authorization and visibility filtering;
- no private/owner-vault data indexed;
- no direct arbitrary query DSL from untrusted clients;
- bounded pagination and anti-scraping controls;
- search telemetry minimizes personal data;
- personalized ranking is explainable enough to disable/reset and does not use sensitive attributes without explicit legal/privacy basis.

---

## 5. PR36 + IOS-04 Hybrid Media Fabric

FUSION preserves the strongest PR36 resource-safety design and adds secure HEIC/HEIF ingestion, resumable upload, quarantine, and server derivatives.

### 5.1 Supported source formats

Launch target:

- JPEG;
- PNG;
- WebP;
- HEIC/HEIF through a hardened ingestion path.

Video remains disabled unless a future constitution explicitly activates it.

### 5.2 Client pipeline

For up to seven still images:

1. source selection;
2. bounded header/type validation where possible;
3. local orientation/preview preparation;
4. local ThumbHash/blur placeholder generation;
5. cover/crop UI;
6. resumable/background upload through signed upload authority;
7. adaptive concurrency based on device/network state;
8. cancellation, stale-result suppression, resource cleanup, and retry only for safe resumable network failures.

On iOS native shell, background transfer may use system-managed background URLSession upload capabilities. The implementation must measure actual transfer behavior rather than promise an invariant end-to-end upload duration.

### 5.3 Server pipeline

Uploaded originals enter **Private Quarantine**, never the public CDN directly.

Canonical processing:

`Decode -> Validate -> Malware/Polyglot Check -> Color Management -> Metadata Sanitization -> Content-Adaptive Encoding -> Derivatives -> Storage Commit -> Publish-safe CDN`

### 5.4 Color and privacy

- normalize orientation;
- preserve correct color appearance with explicit color-management policy (including Display P3 handling);
- remove GPS, device identifiers, camera metadata, and other unnecessary EXIF/private metadata;
- never claim metadata stripping costs 0% CPU;
- the performance requirement is “bounded and measured; does not block the interactive UI thread.”

### 5.5 Derivatives and aspect ratio

`Cover/Card`: canonical 4:3 derivative for consistent feed geometry.

`Detail/Master`: preserve original aspect ratio within security/size limits so vehicles, real estate, equipment, plans, and product detail are not needlessly cropped.

Example derivative families:

- micro/thumb;
- card;
- detail/hd;
- bounded master.

Exact byte-size claims are **targets measured by content class**, not universal guarantees.

### 5.6 Content-Adaptive Encoding

Do not hard-code “AVIF is always 35% smaller” or “one codec always wins.”

The encoder chooses among approved outputs/settings using bounded quality metrics and latency/cost budgets. Delivery negotiation may choose AVIF/WebP according to support and measured benefit.

### 5.7 Private deduplication

Raw SHA-256 is not exposed as a global user-visible deduplication oracle.

Conceptual internal identity:

`HMAC(storage_secret, content_hash + isolation_scope)`

No client API may reveal whether another user has uploaded the same content.

### 5.8 Raw-source retention

Original/quarantine source retention is short and policy-bound. After derivatives are committed and integrity evidence is complete, raw originals are deleted or retained only if an explicit legal/product rule requires otherwise.

---

## 6. Adaptive Simplicity Engine — speed under weak networks

The platform separates four latency classes:

- **Perceived UI Latency**;
- **Upload Latency**;
- **Processing Latency**;
- **Delivery Latency**.

No engineering document may combine them into a misleading single “450ms for seven photos” claim.

### 6.1 Adaptive delivery signals

The client may consider safe capability signals such as:

- connection state/quality when available;
- device memory/performance class;
- viewport;
- data-saver preference;
- cached state;
- image visibility and scroll intent.

### 6.2 Delivery modes

**Strong connection:** high-quality derivative, selective next-item prefetch.

**Medium connection:** feed/card derivative, conservative prefetch.

**Weak/data-saver:** text first, tiny placeholder/thumb, no nonessential prefetch, reduced motion.

**Offline/intermittent:** safe cached shell/content where permitted, local draft continuity, explicit network state, no fake privileged action success.

### 6.3 Performance targets

Performance targets are budgets to prove, not claims to advertise before measurement.

Launch candidate budgets include:

- web Core Web Vitals targets stricter than minimum good thresholds where feasible;
- per-route JavaScript/CSS/image budgets;
- no unbounded list rendering;
- virtualization/incremental feed loading;
- CDN edge delivery;
- read-model/cache strategy;
- server-side p95/p99 latency budgets;
- explicit poor-network test profiles.

Evidence must distinguish first visit, repeat visit, cache hit, and cache miss.

---

## 7. Full i18n: Arabic and English as native product languages

Arabic and English are launch languages with one data model and one product surface.

### 7.1 i18n architecture

- no hard-coded UI strings in business logic;
- versioned message catalog;
- locale-aware number/date/currency formatting;
- RTL/LTR layout mirroring where appropriate;
- language-aware search analyzers;
- bilingual content fields where needed;
- locale-aware error codes mapped to user copy;
- no separate Arabic/English app forks.

### 7.2 Accessibility

Critical journeys target WCAG 2.2 AA for Web/PWA, with equivalent native accessibility quality on Android/iOS.

Focus visibility, target sizing, accessible authentication, reduced motion, screen-reader semantics, logical RTL keyboard order, contrast, and status announcements are launch gates.

---

## 8. Global Money Fabric — currencies, ads, and no-known-negative-margin sale

The money model is global and sector-independent.

### 8.1 Monetary dimensions

- `listing_currency` — advertiser's commercial listing price;
- `display_currency` — user's chosen/derived viewing currency;
- `billing_currency` — campaign/ad purchase currency;
- `ledger_currency` — authoritative journal currency per entry/account design;
- `fx_reference_snapshot` — versioned conversion evidence when conversion is used.

All monetary calculations use decimal/integer-safe semantics appropriate to currency precision; binary floating-point is not authoritative for money.

### 8.2 Price types

Extensible types include:

`FIXED, FROM, NEGOTIABLE, PER_HOUR, PER_DAY, PER_M2, PER_UNIT, CONTACT`

New sectors do not require a new finance engine.

### 8.3 Platform-loss protection

The platform cannot honestly guarantee that business operations can never experience any economic loss under every real-world event. The enforceable technical objective is:

**NO KNOWN NEGATIVE-MARGIN SALE.**

A package/campaign is not sellable unless the system has verified the relevant cost, statutory tax/fee, risk reserve, FX assumptions, margin rule, capacity, and country configuration.

Fail-closed outcomes include:

`PACKAGE_NOT_SELLABLE`

`COUNTRY_PRICING_BLOCKED`

`FX_REFERENCE_UNAVAILABLE`

`COST_MODEL_UNVERIFIED`

V13 DIDE/economic delivery logic remains authoritative for impression commitment and margin protection.

### 8.4 Ledger invariants

- double-entry append-only ledger;
- idempotency for financial mutations;
- money movement never authorized by browser roles;
- AI cannot autonomously move money;
- shadow-ledger divergence launch target = `0`;
- revenue recognition follows qualified delivery policy, not mere purchase receipt.

---

## 9. Dynamic Sector Registry — no fixed sector count

Sectors and categories are data-driven/versioned, not hard-coded to three or seven forever.

Each sector contract defines:

- schema and required/optional fields;
- category tree;
- search/filter configuration;
- allowed price types;
- media rules;
- licensing/compliance requirements by country;
- moderation policy;
- listing lifecycle policy;
- campaign eligibility.

A new sector remains disabled until its contract, tests, search mapping, legal gate, and financial configuration are complete.

---

## 10. Sovereign Capability Graph (SCG) — `⋮` as the smart capability gateway

Every user uses the same interface. The `⋮` menu exposes only server-confirmed capabilities.

### 10.1 Authority root

`OWNER` is the sovereign root and remains governed by SOA, not by an editable profile role.

The owner may grant `PARTNER` capability sets.

A partner may delegate lower capabilities only within the exact authority the partner possesses and only when delegation is explicitly permitted.

**Invariant:** `No delegate can delegate more authority than they possess.`

### 10.2 Capability grant shape

Each grant binds:

- capability code;
- country scope;
- sector scope;
- resource scope;
- validity period;
- delegation allowed flag;
- maximum delegation depth;
- grant reason;
- granted-by authority;
- policy version;
- audit/evidence ID.

### 10.3 Menu behavior

**Ordinary user** may see `صلاحياتي / My permissions` for normal account capabilities.

**Employee** additionally sees assigned tasks/capabilities.

**Partner** may see delegated staff/capability management within scope.

**Owner** may see grouped sovereign entries such as:

- Countries;
- Users;
- Partners;
- Employees;
- Capabilities;
- Security;
- Finance;
- Policies;
- Decision/Audit history.

These appear as organized sheets/panels inside the same product surface, not as a separate visual platform.

### 10.4 SOA preservation

The existing Sovereign Owner Access design remains a protected security foundation:

- Public Owner Profile;
- Private Owner Vault;
- Passkey-first authentication;
- TOTP + backup codes;
- server-confirmed owner authority;
- L1/L2/L3/L4;
- short-lived single-use L4 leases;
- recovery hold;
- kill switch;
- RLS/default deny;
- append-only audit.

SCG is an authorization/delegation layer **under** SOA; it never replaces SOA.

---

## 11. TIGER Pulse — Hero Dynamic Ad Ribbon Engine

The proposed Hero Dynamic Ad Ribbon is accepted with the following 2026 refinements to protect user experience, accessibility, performance, privacy, and profitability.

### 11.1 Product placement

A slim sponsored campaign surface may appear near the top of the unified experience.

It is visibly labeled as sponsored/promotional content and must never masquerade as an organic post.

### 11.2 Quiet Dynamic Ribbon, not distracting ticker

Default behavior favors a **quiet single-campaign ribbon/card with controlled rotation** rather than an endless moving ticker.

Rules:

- bounded height roughly in the 60–80px design family, responsive to accessibility text scaling;
- manual swipe/tap navigation on touch;
- auto-rotation only under accessibility/performance policy;
- pause on hover/focus/touch interaction;
- `prefers-reduced-motion` disables nonessential animation;
- weak-network/data-saver mode shows a static ultra-light creative;
- no animation that competes continuously with feed reading.

### 11.3 Expanded brochure experience

Tap opens a polished full-screen/sheet brochure viewer.

Supported campaign assets may include multi-page creative, but uploaded PDFs are not trusted as active client documents by default. PDFs pass quarantine/scanning and may be rendered to sanitized page images/structured brochure pages for the interactive viewer.

The high-resolution asset loads only on demand.

Possible actions:

- Contact;
- Call/WhatsApp where country/privacy policy allows;
- Visit validated external website;
- Save/share;
- Download sanitized brochure where authorized.

`Buy now / Order now` must not silently introduce platform checkout. It may be an outbound/contact CTA unless a separately approved commerce/payment capability is active.

### 11.4 Campaign universality

Campaign sponsors may belong to:

- an existing platform sector;
- multiple sectors;
- a sponsor category not represented as a listing sector.

Advertising taxonomy is therefore independent of the Sector Registry.

### 11.5 Targeting

Allowed targeting dimensions include policy-approved:

- active market country/region/city;
- current sector/category context;
- language;
- account/business type;
- coarse interest/context signals with privacy controls;
- global/cross-sector campaign.

Sensitive-personal-attribute targeting is forbidden unless a later legal/privacy constitution explicitly permits a narrowly defined use.

IP is a risk/geo signal, not the sole identity-country source of truth.

### 11.6 Delivery fairness and profitability

Priority weights are implemented as **Weighted Fair Delivery** under budget, frequency-cap, eligibility, inventory, cost, and country rules.

A high-paying campaign may receive more eligible delivery, but priority cannot bypass:

- country activation;
- content/safety policy;
- frequency caps;
- capacity;
- profitability guard;
- advertiser budget;
- user-experience limits.

### 11.7 Impression truth

V13 qualified-impression rules remain authoritative for billable delivery, including visibility-time threshold, duplicate suppression, bot/invalid-traffic exclusion, and append-only financial evidence.

Analytics distinguish:

- eligible opportunity;
- qualified impression;
- brochure open;
- page engagement;
- CTA action;
- external-navigation event.

No fabricated “100% real” claim is made; invalid-traffic detection and measurement confidence are reported scientifically.

---

## 12. Synthetic Showcase Dataset — 25,000 launch education items

Create exactly `25,000` synthetic, legally safe, clearly non-real showcase items for education, search, load testing, and demonstrating the platform.

Suggested composition:

- approximately 20,000 synthetic listings/posts;
- approximately 5,000 synthetic campaign/brochure/educational creatives.

Exact distribution is configurable by country/sector test design.

### 12.1 Safety and truth

Every synthetic item carries internal metadata:

`synthetic_demo=true`

and a visible, unobtrusive user-facing indicator such as `مثال توضيحي / Demo example` when exposed publicly.

No real person's phone, email, identity, address, or trademark-infringing asset is invented or copied without permission.

Images are licensed, platform-owned, or generated for the dataset with provenance tracking.

### 12.2 Lifecycle

`expires_at = created_at + 90 days`

Synthetic items are automatically removed from active discovery after the 90-day demonstration window unless a new owner-approved showcase run is created.

They are not counted as real advertiser revenue or real organic marketplace supply.

---

## 13. Smart Platform AI Assistant — advisory intelligence, not sovereign authority

AI is integrated into the same surface but remains subordinate to explicit authorization boundaries.

### 13.1 AI Content Composer

User-invoked capabilities may include:

- rewrite/polish;
- spelling/grammar improvement;
- title/description structuring;
- keyword/tag suggestions;
- category/sector suggestions;
- bilingual translation assistance;
- image-quality suggestions without silently altering evidentiary content.

AI output is a proposal. The user confirms before publishing.

### 13.2 Semantic Search Assist

Semantic/vector retrieval may improve recall and intent understanding, but it is combined with lexical/structured search and policy filters.

Semantic search never bypasses authorization, visibility, country, sector, or legal constraints.

### 13.3 AI security baseline

AI-enabled systems use current OWASP AI/LLM security verification guidance in addition to ASVS and the existing sovereign AI security kernel.

### 13.4 Permanent high-risk boundaries

AI must not autonomously:

- move money;
- grant/revoke OWNER authority;
- expand a user's privileges;
- bypass country gates;
- disable core security controls;
- execute destructive data deletion;
- publish legal/financial commitments without the required human/owner authority.

---

## 14. Automated Platform Controller & Supervisor — bounded automation

The “digital manager” concept is accepted, but its execution model is evidence-based and risk-tiered rather than “AI approves everything automatically.”

### 14.1 Four monitoring domains

1. **Financial Controller** — ledger reconciliation, anomaly detection, duplicate/replay detection, pricing/cost guard, margin alerts.
2. **Administrative Controller** — capability drift, suspended/expired grants, country-policy state, operational queues.
3. **Technical Controller** — SLOs, errors, latency, saturation, media failures, queue depth, security events.
4. **Creative/Content Controller** — media quality, policy flags, brochure quality, duplicate/spam signals.

### 14.2 Automation levels

**L0 Observe:** metrics only.

**L1 Recommend:** AI/system recommendation, no mutation.

**L2 Safe Auto-Action:** pre-authorized, bounded, reversible, idempotent operational action.

**L3 Sensitive:** human/partner step-up required.

**L4 Sovereign/Financial/Security:** owner SOA authorization lease and explicit approval where policy requires.

No “microsecond escalation” guarantee is claimed. The requirement is measured event-to-notification latency with defined SLOs.

### 14.3 Fail-safe delegation

If a high-risk financial request times out, default action is **hold/freeze**, not automatic approval.

For pre-approved operational safety actions, delegation may route to a scoped alternate authority under SCG.

Delegation never expands the original authority scope.

---

## 15. Unified Reports & Evidence Center

Reporting is available to owner/partners according to SCG scope inside the same product surface.

### 15.1 Report families

- finance/revenue/campaign delivery;
- country/sector activity;
- users/accounts/trust;
- technical SLO/error/capacity;
- security/audit;
- advertising performance;
- synthetic/load-test evidence;
- launch readiness.

### 15.2 Output formats

- on-screen interactive report;
- PDF for official/print use;
- CSV/JSON for authorized data analysis;
- spreadsheet export where appropriate.

Exports must enforce field-level authorization and privacy classification.

### 15.3 Consistency

“Heavy report is real-time” is not an unconditional promise. Each report states its consistency mode:

- live operational read;
- bounded-lag read replica;
- point-in-time snapshot.

Official reports include generation timestamp, scope, filter set, source version, and integrity/provenance metadata where required.

---

## 16. Sovereign Portability — realistic global technical sovereignty

The platform does not claim to be outside all national law. Instead it targets **No Single-Jurisdiction / No Single-Provider Technical Capture**.

Architecture principles:

- four-layer geography: identity, active market, legal entity, data residency;
- country-by-country activation gates;
- portable data/service contracts;
- infrastructure as code;
- encrypted independent backups;
- multiple failure domains;
- controlled DNS/registrar/security ownership;
- signed build-once release artifacts;
- provider adapters to reduce lock-in;
- country-scoped suspension that does not unnecessarily disable the globe;
- no single ordinary administrator can seize sovereign owner authority;
- documented exit/restore plan for critical providers.

Legal obligations remain country-specific and are enforced through activation policy rather than pretending they do not exist.

---

## 17. Security constitution 2026

Security language must remain scientifically honest. The platform is not described as “impossible to hack” or “stronger than every AI.”

Target: defense in depth, containment, detection, recovery, verifiable authorization, and provable release integrity under the assumption that attackers use modern automation and AI.

### 17.1 Baselines

- OWASP ASVS 5.0.0 as application security verification baseline;
- OWASP AI/AISVS/LLM verification guidance for AI-enabled components;
- WCAG 2.2 AA accessibility as a critical UX baseline;
- platform-specific Android/iOS security and signing requirements;
- existing SOA/RLS/release-supply-chain controls preserved.

### 17.2 Layers

- identity/passkeys/MFA;
- SCG authorization;
- SOA L4 leases;
- RLS and server authorization;
- network/edge controls;
- input validation/output encoding;
- media quarantine;
- financial ledger/idempotency;
- secrets management/KMS;
- supply-chain provenance;
- rate limits/abuse defenses;
- immutable/append-only evidence where required;
- monitoring/incident response;
- backup/restore/recovery.

### 17.3 Five Red-Team Certification campaigns

Run only on explicitly authorized isolated environments.

1. **Owner Takeover Campaign** — replay, stale session, fake role, MFA/recovery downgrade, stolen-session simulation.
2. **Delegation Escape Campaign** — partner/staff scope escalation, BOLA/IDOR, country/sector boundary crossing.
3. **Financial Tampering Campaign** — duplicate/replayed financial events, concurrency, altered pricing, double debit/credit attempts.
4. **Media Weaponization Campaign** — malformed HEIC, MIME mismatch, polyglots, decompression bombs, oversized dimensions, metadata payloads.
5. **Release/Supply-Chain Campaign** — wrong SHA, tampered artifact, dependency compromise simulation, expired approval, manifest/provenance mismatch.

Launch requires zero unresolved Critical/High finding and evidence of remediation/retest for every material finding.

---

## 18. Native mobile: Single Product Surface + Thin Native Shell

Web/PWA/Android/iOS share:

- design tokens;
- information architecture;
- feed/card geometry;
- search behavior;
- composer grammar;
- capability UX;
- business contracts;
- i18n copy keys.

Native bridges are used only where the platform benefits from true device integration:

- camera/photos;
- push notifications;
- background/resumable transfer;
- passkeys/biometrics;
- share sheet;
- deep/universal links;
- secure local capabilities.

### 18.1 Android 20-test certification

1. cold launch;
2. warm launch;
3. login;
4. passkey/MFA;
5. recovery;
6. Arabic RTL;
7. English LTR;
8. long feed scroll;
9. search/typeahead;
10. filters/category/location;
11. listing details/deep link;
12. create listing;
13. seven-photo/HEIC path where device supports source format;
14. background/resumable upload;
15. weak network/offline;
16. low-memory/process restart;
17. push/deep link;
18. permissions/camera/photos;
19. accessibility;
20. update/reinstall/release regression.

Performance measurement uses physical-device evidence and Android Macrobenchmark/Baseline Profile techniques where applicable.

### 18.2 iOS 20-test certification

Same critical journeys, with iOS-specific proof for:

- HEIC input;
- background `URLSession` transfer behavior;
- app suspend/terminate/relaunch continuity;
- VoiceOver;
- universal links;
- passkey/Keychain-integrated platform behavior;
- XCTest/XCUITest performance metrics including launch, CPU, memory, and UI hitch evidence where applicable.

---

## 19. TIGER Digital Twin — two 4M test programs

The owner requirement is interpreted as **both** test modes, not one or the other:

### Program A — 4,000,000 unique behavioral actors

A campaign executes four million deterministic but behaviorally varied synthetic actors across countries, sectors, languages, devices, network profiles, sessions, queries, post/listing actions, images, campaign interactions, and permissions.

Each actor receives a reproducible `behavior_seed`, enabling any failure to be replayed exactly.

### Program B — peak-concurrency campaign targeting 4,000,000 simultaneous active virtual users

This is a separate distributed capacity campaign, executed only in an isolated authorized environment with explicit cost ceilings and stop conditions.

It must ramp progressively, for example:

`10K -> 100K -> 500K -> 1M -> 2M -> 4M`

Each stage advances only if reliability, latency, error rate, saturation, cost, and downstream-provider limits remain within approved thresholds.

No 4M blast test is run against third-party identity/payment/search providers outside contractual/authorized limits. Provider-facing components use controlled emulators/test issuers where required, with smaller separate real-provider tests.

### 19.1 Behavioral variation

Actors vary by:

- country/region;
- Arabic/English;
- sector/category;
- device class;
- network class;
- session duration;
- think time;
- scroll rate;
- typo/query style;
- search/filter pattern;
- listing-open/save/contact/share probability;
- advertiser/user role;
- media count;
- campaign interaction;
- return/new-user state.

### 19.2 Metrics

- p50/p75/p95/p99 latency;
- error rate;
- throughput;
- queue depth;
- DB/cache/search saturation;
- CDN bandwidth/cache hit;
- media processing throughput;
- auth capacity;
- cost per 1,000 feed views/searches/listing creates/media jobs;
- financial invariant status;
- recovery/failover behavior.

A test does not PASS because one average latency looks good.

---

## 20. Runtime Vacuum — remove obsolete runtime completely and safely

“No old clutter” is a formal release requirement.

Every runtime-relevant file is classified:

- `ACTIVE`
- `MIGRATION_BRIDGE`
- `TEST_ONLY`
- `HISTORICAL_DOC`
- `ORPHANED`
- `DELETE_CANDIDATE`

### 20.1 Remove from final Production bundle

- duplicate screens;
- duplicate CSS;
- dead JS;
- old admin visual skins;
- hard-coded demo runtime pretending to be live data;
- abandoned routes;
- obsolete local-preview functionality;
- duplicate media assets;
- old API adapters;
- outdated runtime config;
- stale experiments;
- legacy copy that contradicts this constitution;
- role-specific surfaces replaced by Single Surface.

### 20.2 Preserve evidence, not runtime clutter

Git history, security evidence, audit records, rollback artifacts, and migration provenance are not deleted merely because they are old. They are excluded from Production runtime and marked historical where appropriate.

If a real secret is found in history, remediation is `rotate + revoke + history remediation`, not cosmetic deletion.

### 20.3 Deletion gate

No file is deleted simply because its name looks old. Required evidence:

- dependency/reference scan;
- runtime reachability analysis;
- route/asset manifest comparison;
- test coverage;
- build artifact comparison;
- rollback path.

---

## 21. Reliability, failover, backup, and recovery

The platform does not promise “zero downtime under every event.” It targets measurable resilience with documented RTO/RPO and tested failover.

Requirements:

- multi-failure-domain architecture appropriate to service criticality;
- backup schedules and retention policy;
- point-in-time recovery where supported;
- restore rehearsal;
- failover rehearsal;
- dependency degradation strategy;
- circuit breakers/timeouts/retries with idempotency;
- read-only/degraded modes where safer than total failure;
- privileged actions fail closed during uncertainty.

Reports and audit evidence must remain available according to recovery policy without exposing secret material.

---

## 22. Launch Passport — the only path to “global launch ready”

Every final global release candidate receives an immutable Launch Passport bound to the exact release.

Required evidence:

- `Release SHA`;
- `Artifact Digest`;
- supply-chain/provenance result;
- security verification result;
- five Red-Team campaign result;
- Program A 4M behavioral-load result;
- Program B peak-concurrency result at the highest owner-approved/technically achieved stage, with 4M target explicitly recorded;
- Android `20/20`;
- iOS `20/20`;
- Arabic PASS;
- English PASS;
- Search PASS;
- Hybrid Media/HEIC PASS;
- accessibility PASS;
- Restore PASS;
- Failover PASS;
- `Shadow Ledger = 0`;
- Country Gates PASS for every activated launch country;
- Pricing/Profitability Certificate PASS;
- Synthetic Showcase validation PASS;
- Runtime Vacuum PASS;
- no unresolved Critical/High security finding;
- human review PASS;
- exact owner authorization bound to final SHA/artifact.

Only when all mandatory launch criteria for the intended launch scope are satisfied:

`GLOBAL_LAUNCH_ELIGIBLE = TRUE`

Only then may the project state use the sentence:

**نحن جاهزون للانطلاق العالمي.**

---

## 23. Execution sequence before Production

### Phase F00 — Constitution Reconciliation

- establish this constitution as highest current product authority;
- mark conflicting legacy references `SUPERSEDED / HISTORICAL ONLY`;
- create machine-readable decision catalog;
- freeze the rejected blue login-screen decision;
- freeze Global-first identity.

### Phase F01 — Runtime Vacuum Inventory

- classify all runtime paths;
- generate dependency/reachability map;
- identify duplicate/obsolete routes, CSS, JS, previews, demo data;
- no deletion until evidence is complete.

### Phase F02 — Single Surface Design System

- TIGER tokens;
- unified navigation;
- Facebook-muscle-memory feed geometry;
- composer;
- profile;
- `⋮` capability gateway;
- Arabic/English responsive states.

### Phase F03 — SOA + SCG Integration

- preserve SOA security foundation;
- move owner/partner/employee capability UX into Single Surface;
- server-confirmed capability graph;
- delegation-depth and scope enforcement.

### Phase F04 — Search Fabric

- schema/index contracts;
- bilingual analyzers;
- structured filters;
- semantic assist;
- zero-result rescue;
- golden queries and load tests.

### Phase F05 — Hybrid Media Fabric

- HEIC/HEIF secure intake;
- PR36 resource safety;
- quarantine/scanning;
- content-adaptive derivatives;
- iOS background upload;
- privacy/dedup protections.

### Phase F06 — Global Money Fabric

- currency dimensions;
- FX snapshots;
- price types;
- profitability/sellability gates;
- ledger reconciliation.

### Phase F07 — TIGER Pulse Campaign Engine

- sponsored ribbon;
- brochure viewer;
- targeting;
- weighted fair delivery;
- V13 impression truth;
- privacy-safe analytics;
- partner/owner scoped campaign management through SCG.

### Phase F08 — 25K Synthetic Showcase

- generation contracts;
- provenance;
- 90-day lifecycle;
- demo labeling;
- search/campaign/media coverage.

### Phase F09 — AI Assistant + Automated Controller

- advisory content/search AI;
- bounded automation levels;
- permanent sovereign/financial denials;
- AI security tests.

### Phase F10 — Arabic/English + Accessibility Closure

- complete i18n;
- RTL/LTR;
- WCAG 2.2 AA critical journeys;
- native accessibility.

### Phase F11 — Android/iOS Native Shells

- thin native integrations;
- same product surface;
- 20-test certification each.

### Phase F12 — Red-Team Certification

- five campaigns;
- remediation and exact-head retest.

### Phase F13 — Digital Twin 4M Programs

- four-million unique behavioral actors;
- progressive peak-concurrency campaign targeting four million simultaneous active virtual users;
- cost/performance/finance evidence.

### Phase F14 — DR/Failover/Restore

- restore proof;
- failover proof;
- RTO/RPO evidence;
- degraded-mode validation.

### Phase F15 — Final Runtime Vacuum

- remove all approved obsolete Production paths;
- verify bundle contains only current product runtime;
- preserve historical evidence outside runtime.

### Phase F16 — Launch Passport

- bind all evidence to exact release SHA/artifact;
- human review;
- owner exact-SHA authorization;
- no global-launch claim before eligibility is TRUE.

---

## 24. Non-negotiable truth rules

1. No “impossible to hack” claim.
2. No “zero CPU” processing claim.
3. No universal network-latency promise detached from payload/network conditions.
4. No “100% genuine impression” claim; use qualified-impression evidence and invalid-traffic controls.
5. No Production capability is considered complete because a design document exists.
6. No AI recommendation becomes financial/sovereign authority.
7. No client role becomes OWNER authority.
8. No missing price/cost/FX/country evidence results in a sellable campaign.
9. No 4M test is declared passed until distributed evidence exists.
10. No mobile app is declared certified until its 20 critical tests pass on supported real-device matrices.
11. No historical decision may silently override this constitution after reconciliation.
12. No obsolete runtime remains in the final Production bundle merely because deletion is inconvenient.

---

## 25. Owner-reference summary

**Keep and strengthen:** SOA, RLS, release security, financial ledger, country gates, audit, recovery, PR36 resource safety, Strangler migration architecture.

**Add:** Single Surface, Facebook muscle memory + TIGER identity, Progressive Commercial Composer, TIGER Search Fabric, HEIC Hybrid Media Fabric, Adaptive Simplicity Engine, full Arabic/English i18n, Global Money Fabric, Dynamic Sector Registry, Sovereign Capability Graph, TIGER Pulse ad ribbon/brochures, 25K Synthetic Showcase, AI Assistant, bounded Automated Controller, reports/evidence center, Sovereign Portability, Android/iOS certification, five Red-Team campaigns, two 4M Digital Twin programs, Runtime Vacuum, Launch Passport.

**Remove/supersede:** Jordan-first, fixed three sectors, fixed four weekly posts, fixed 120-day listing life, Tiger Care old experience, unapproved blue login, separate admin/owner visual platforms, obsolete runtime/demo paths, and any other contradictory legacy product decision discovered during reconciliation.

This is the intended future owner reference for **VVIP TIGER FUSION 2026**.
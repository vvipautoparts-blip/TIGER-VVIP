# F07 — TIGER Pulse / Hero Dynamic Ad Ribbon Engine

**Status:** OWNER-APPROVED FUSION SUBSYSTEM DESIGN

**Parent authority:** `VVIP TIGER FUSION 2026 — FINAL Owner Constitution`

**Owner reference:** `docs/fusion/OWNER_REFERENCE_F07_TIGER_PULSE.md`

## 1. Objective

Create a premium in-platform campaign network embedded in the upper area of the same VVIP TIGER Single Surface. The system must be visually elegant, low-noise, privacy-aware, financially fail-closed, fast on weak networks, globally targetable, and governed by SOA/SCG rather than a separate admin surface.

Canonical user journey:

`Micro Ribbon -> Open Brochure -> Interact/Contact -> Close -> Return to same context`

## 2. Micro-Ribbon surface

Preferred placement is directly below the main header or within the route Hero region without layout shift.

Target height family: approximately `60–80px`, responsive to text scaling, safe-area insets, and viewport.

The micro state contains only:

- sponsored label;
- sponsor logo/mark;
- concise campaign headline;
- optional country/sector/global badge;
- one concise CTA such as `شاهد التفاصيل / View details`;
- optional bounded progress indicator for controlled rotation.

No dense control cluster, no autoplay audio/video, and no endless attention-stealing marquee.

## 3. Motion model

Supported states:

- `STATIC`;
- `MANUAL_CAROUSEL`;
- `CONTROLLED_AUTO_ROTATION`;
- `DATA_SAVER_STATIC`.

Rules:

- pause on hover, focus, touch/drag, or brochure-open state;
- honor `prefers-reduced-motion`;
- no automatic keyboard focus stealing;
- use transform/opacity-based motion to avoid layout thrash;
- weak-network/data-saver mode disables nonessential motion;
- user interaction always outranks automatic rotation.

## 4. Progressive delivery

Separate and measure:

- campaign metadata latency;
- micro-creative delivery latency;
- perceived UI latency;
- brochure HD delivery latency;
- CTA interaction latency.

Micro creatives use content-adaptive AVIF/WebP derivatives. `15–30 KiB` is a design target for typical creatives, not a universal guarantee.

High-resolution brochure assets are on-demand only. No unconditional 1–3MB prefetch.

## 5. Brochure Lightbox

Open as a full-screen or large responsive sheet without losing page context.

Capabilities:

- origin focus preservation/restoration;
- skeleton/placeholder during HD load;
- optional shared-element/zoom transition when motion policy permits;
- single-page and multi-page brochures;
- swipe/next/previous;
- bounded zoom;
- page counter;
- optional thumbnail navigator;
- RTL/LTR support;
- screen-reader page announcements;
- accessible close control.

Uploaded PDFs must enter quarantine/scanning and must not be embedded as blindly trusted active content. Preferred interactive representation is sanitized rendered page imagery plus structured metadata.

## 6. CTA policy

Policy-governed CTAs may include:

- Contact;
- Call;
- WhatsApp where permitted;
- validated external website;
- Save;
- Share;
- sanitized brochure download;
- Order/Book/Buy only as outbound/contact behavior unless a separate approved commerce/payment capability is activated.

TIGER Pulse does not silently make the platform an escrow, shipping, delivery, or checkout intermediary.

## 7. Campaign taxonomy

Advertising taxonomy is independent of listing-sector taxonomy.

A sponsor may be:

- inside one current sector;
- cross-sector;
- outside all listing sectors;
- a global brand/corporation;
- an institutional campaign when separately policy-approved.

Campaign categories are versioned data and not hard-coded UI branches.

## 8. Targeting engine

Eligibility is server-computed.

Approved dimensions may include:

- active market country;
- region/city;
- current sector/category context;
- language;
- B2B/B2C/account-type classification;
- coarse contextual interest signals subject to privacy controls;
- global/cross-sector campaign eligibility;
- schedule/daypart;
- frequency cap;
- sponsor/campaign compliance state.

IP may contribute coarse geography/risk context but is not authoritative identity country.

Sensitive-personal-attribute targeting is forbidden unless a future legal/privacy constitution explicitly authorizes a narrowly defined use.

## 9. Weighted Fair Delivery

Replace crude `Priority 1–5` domination with weighted fair delivery constrained by:

- campaign eligibility;
- purchased entitlement;
- remaining budget/delivery commitment;
- frequency cap;
- inventory availability;
- campaign status;
- country/sector policy;
- capacity;
- V13 DIDE economics;
- anti-fraud rules.

No advertiser may consume inventory outside its purchased/authorized entitlement merely because a priority number is high.

## 10. Impression truth

V13 qualified-impression rules remain authoritative.

Billable impression logic must bind to the approved visibility-duration rule, bot/invalid-traffic filtering, deduplication policy, and campaign eligibility at the time of delivery.

The ribbon may collect non-billable interaction telemetry separately, but analytics must never silently redefine what constitutes billable delivery.

## 11. Campaign financial invariants

- no binary floating-point authority for money;
- billing through Global Money Fabric;
- double-entry ledger for authoritative financial recognition;
- idempotent financial/campaign mutations;
- no AI autonomous money movement;
- no sellability when cost/FX/tax/fee/capacity/margin evidence is missing;
- V13 fail-closed states such as `PACKAGE_NOT_SELLABLE` and `COUNTRY_PRICING_BLOCKED` remain authoritative;
- revenue recognition follows qualified delivered value, not merely campaign purchase.

## 12. SCG permissions

Campaign administration is available through the same `⋮` capability gateway.

Capability examples:

- `CAMPAIGN_VIEW`;
- `CAMPAIGN_CREATE`;
- `CAMPAIGN_EDIT`;
- `CAMPAIGN_PAUSE`;
- `CAMPAIGN_CREATIVE_MANAGE`;
- `CAMPAIGN_TARGETING_MANAGE`;
- `CAMPAIGN_ANALYTICS_VIEW`;
- `CAMPAIGN_FINANCIAL_VIEW`;
- `CAMPAIGN_GLOBAL_SCOPE`.

Each grant is bound to country/sector/resource/time/delegation scope under Sovereign Capability Graph rules.

Partners cannot delegate or operate beyond the exact authority granted by OWNER.

## 13. Campaign state machine

Suggested server-owned lifecycle:

`DRAFT -> REVIEW_REQUIRED -> APPROVED -> SCHEDULED -> ACTIVE -> PAUSED -> EXHAUSTED -> ENDED -> ARCHIVED`

Additional failure states:

- `REJECTED`;
- `SUSPENDED_POLICY`;
- `SUSPENDED_SECURITY`;
- `SUSPENDED_FINANCE`.

Unauthorized state transitions are rejected and audited.

## 14. Creative/media security

Campaign creative uses the F05 Hybrid Media security principles:

`Quarantine -> Type/Signature Validation -> Malware/Polyglot Check -> Metadata Sanitization -> Content-Adaptive Encoding -> Derivatives -> Publish-safe Storage`

No raw uploaded PDF/image becomes public before processing succeeds.

No client-controlled HTML/JS brochure payload is executed.

Outbound URLs are normalized, validated, scheme-restricted, and policy checked.

## 15. Analytics

Core metrics:

- qualified impressions;
- unique qualified viewers under privacy-safe counting policy;
- brochure opens;
- brochure open rate;
- page views within brochure;
- dwell-time buckets rather than unnecessary fine-grained surveillance;
- CTA clicks by type;
- save/share events;
- campaign pacing;
- remaining delivery commitment;
- invalid/fraud-filtered traffic;
- cost and recognized revenue.

Analytics minimize personal data and use aggregation thresholds where required.

## 16. Weak-network behavior

Under weak network or data saver:

- static creative only;
- smallest acceptable derivative;
- no auto-rotation;
- no HD prefetch;
- text/CTA remains usable before HD creative;
- brochure HD pages load progressively;
- failure shows a calm retry/fallback without blocking the main platform.

## 17. Accessibility

- WCAG 2.2 AA target for web critical paths;
- logical focus order;
- keyboard-operable carousel/viewer;
- pause/stop controls where motion exists;
- reduced-motion support;
- readable sponsored labeling;
- touch targets sized appropriately;
- screen-reader campaign title and page position;
- Arabic RTL and English LTR parity.

## 18. Abuse/fraud controls

Protect against:

- bot impression inflation;
- click farms;
- rapid replay;
- hidden/offscreen rendering;
- background-tab counting where disallowed;
- self-click abuse;
- campaign owner attempting to bypass delivery limits;
- manipulated client targeting claims;
- duplicate financial callbacks;
- creative substitution after approval.

Approved creative version/digest is bound to campaign release state.

## 19. Owner/partner management UX

Same Single Surface; no separate visual admin product.

From `⋮ -> إدارة المنصة / Platform management -> الحملات / Campaigns` an authorized person sees grouped panels:

- campaigns;
- creatives/brochures;
- targeting;
- schedule;
- budget/delivery;
- countries/regions;
- sectors/cross-sector/global reach;
- analytics;
- audit/evidence.

Progressive disclosure prevents clutter.

## 20. Testing

Required F07 test families:

1. eligibility/targeting contract tests;
2. SCG authorization and delegation tests;
3. impression qualification tests;
4. weighted fair delivery/pacing tests;
5. pricing/sellability/ledger tests;
6. creative quarantine/security tests;
7. weak-network/data-saver tests;
8. Arabic/English accessibility tests;
9. mobile interaction tests;
10. fraud/replay tests;
11. 25K Showcase compatibility tests;
12. 4M Digital Twin campaign-load tests;
13. Red-Team integration tests;
14. exact-release Launch Passport evidence.

## 21. Launch gate

F07 cannot be called launch-ready unless the exact release passes security, finance, performance, accessibility, Arabic/English, mobile, Red-Team, Digital Twin, and human/owner approval gates required by the FUSION Launch Passport.

No claim of microsecond network delivery, perfect targeting, zero fraud, zero downtime, or impossible-to-hack behavior is permitted.

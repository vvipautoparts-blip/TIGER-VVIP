# VVIP TIGER — OWNER BINDING DECISIONS — 2026-08-15

**Authority:** Platform Owner  
**Status:** BINDING / OWNER-CANONICAL / LATEST  
**Effective date:** 2026-08-15  
**Relationship:** This decision layer supersedes every conflicting earlier owner requirement, design note, test expectation, schema review, mockup, chat summary, or implementation assumption. Earlier decisions remain valid only where they do not conflict with this file.

## 1. Latest-decision-wins constitution

The platform uses one deterministic decision rule:

> **The newest explicit owner decision is authoritative. A conflicting older decision becomes SUPERSEDED / NON-OPERATIVE immediately.**

Consequences:

- active runtime, UI, API, schema, configuration, tests, CI and release gates must enforce the latest decision;
- an old test is never a reason to restore an obsolete product rule;
- historical evidence may remain only when clearly classified as historical/non-operative and must not be reachable as active functionality;
- when a decision changes, implementation must remove or neutralize the conflicting active behavior rather than carrying two competing truths;
- no placeholder, dead control, fake route, fake integration, duplicate shell or silent no-op may be presented as a live product capability.

## 2. FUSION 2026 — one calm authoritative surface

FUSION 2026 is the current product direction.

- One authoritative user surface; no parallel user-facing legacy shells or duplicate products for the same task.
- Facebook-like familiarity is an interaction reference only: familiar hierarchy, feed/card rhythm, composer, profile/navigation and mobile interaction patterns without copying Facebook branding or proprietary assets.
- VVIP TIGER retains its own premium identity and progressive disclosure: powerful internals, minimal visible clutter.
- Sector/category complexity belongs in search/filter/context, not in duplicated home products.
- Fixed legacy three-sector UI assumptions are superseded by the current configurable multi-sector model.

## 3. Marketplace discovery and search

Marketplace discovery remains listing-centered and uses the approved OpenSooq-style search philosophy adapted to VVIP TIGER:

- direct search and relevant filters;
- sector/category/location context only when useful;
- typo/zero-result recovery and sensible suggestions;
- results remain relevance-first and policy-governed;
- TIGER PULSE may add bounded paid visibility but may not buy truth, bypass eligibility, or turn search into a cluttered ad wall.

## 4. Platform role — connection, not transaction party

VVIP TIGER is an advertising/discovery/connection platform.

It may publish listings, support search/discovery, provide visibility products and facilitate direct communication. It is **not a party** to the underlying buyer/seller or service-provider/beneficiary transaction and does not become the seller, buyer, delivery company, guarantor, escrow party, warranty provider, dispute arbitrator or service performer merely because the parties met through the platform.

Only platform operation, advertising/visibility products, security, abuse prevention, legal compliance and other explicitly approved platform functions are in platform scope.

## 5. Listing media — current owner rule

- Current listing media allowance is **maximum 7 images**.
- Video is not part of the current ordinary listing-media product.
- Media processing/privacy/security rules remain mandatory; original HEIC conversion remains client-side under the approved F05 architecture and no server HEIC-conversion fallback may be introduced.
- The image allowance is part of the current listing/card entitlement model and must not be expanded by an obsolete legacy rule.

## 6. Activation cards, prices and TIGER PULSE entitlement

The activation card is a **visibility entitlement**, not a legacy listing-age timer.

- Listing/content is completed first; activation/paid visibility follows contextually.
- The active card/package determines the paid visibility entitlement, including its configured Pulse/impression budget and activation period.
- When the paid activation entitlement ends, paid Pulse delivery stops or requires reactivation according to current policy; this does **not** revive a fixed 120-day listing-deletion rule.
- Organic listing availability is governed separately by current eligibility/status/archive/delete policy.
- Card/package pricing and impression entitlement are policy/configuration driven, market-aware and owner-governed rather than scattered hard-coded constants.
- The approved commercial floor remains no purchasable package below the equivalent of **1 JOD**, with no sub-unit/fils-style user pricing; localized configuration must preserve the platform no-loss control.
- Dynamic impression entitlement may vary by market economics and policy. Internal formulas are not exposed as UI clutter.

## 7. Fixed 120-day listing lifetime — CANCELLED

The former universal **120-day listing lifetime** is cancelled across the active platform.

Therefore:

- no active runtime may automatically expire a listing solely because `published_at + 120 days` elapsed;
- no active schema contract, migration, configuration or service rule may treat 120 days as the current universal listing lifetime;
- no active test may require the old 120-day rule;
- no user-facing copy may promise or impose the obsolete 120-day lifetime;
- historical P07/design evidence may preserve the former wording only when explicitly marked **SUPERSEDED / HISTORICAL ONLY**;
- activation-card lifetime and paid Pulse/impression entitlement are distinct from organic listing lifetime.

## 8. Anti-legacy / anti-clutter release rule

A release is blocked if it contains any of the following without a current, verified purpose:

- duplicate implementation for an already-converged capability;
- obsolete workflow/stage names controlling current CI;
- dead or decorative buttons presented as functional;
- placeholder routes presented as live;
- fake integrations or links that are not actually reachable/verified;
- historical product rules enforced by active tests;
- disabled trash copies kept beside the authoritative implementation;
- conflicting active owner requirements.

Deletion remains evidence-driven: prove non-use/replacement first, then remove the active trash completely while preserving only legitimate historical/audit evidence.

## 9. Implementation truth and launch discipline

This file records owner decision truth; repository exact-head evidence records implementation truth. A decision is not considered Production-complete merely because it is documented.

Required path remains:

`OWNER DECISION -> RED CONTRACT -> IMPLEMENT -> GREEN EXACT-HEAD CI -> REVIEW -> PROTECTED MERGE -> STAGING/DEVICE EVIDENCE WHERE REQUIRED -> PRODUCTION VERIFICATION`

Protected `main`, Production, security and legal/manual gates must never be bypassed to make progress appear faster.

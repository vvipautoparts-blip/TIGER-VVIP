# TIGER NEXUS™ 2026 — Owner-Approved Design

**Status:** OWNER APPROVED / IMPLEMENTATION AUTHORITY INPUT
**Date:** 2026-08-29
**Branch:** `feat/tiger-nexus-2026-20260829`

## 0. Product definition

VVIP TIGER is a global sector-specialized social network with a familiar social interaction model, but an independent TIGER identity and original product architecture.

The product must feel immediately learnable to a user familiar with modern social networks: feed, profile, search, messages, notifications, reactions, comments, sharing, saved items, stories/short media, and a persistent menu. It must not copy Facebook branding, protected visual identity, wording, logos, or exact layouts.

The defining difference is scope: TIGER does not host general-purpose social chatter. Every publishable content object must belong to an activated TIGER sector and carry a valid sector purpose such as offer, need, service, opportunity, or another approved sector intent.

Ordinary eligible sector publication remains free. There is no paid posting gate. Paid visibility is optional and uses the current TIGER PULSE authority.

## 1. Core product invariant — ONE FEED / ONE OBJECT / ONE PULSE

TIGER NEXUS is not a social app plus a marketplace plus an ads manager. It is one product surface.

A user creates one **Living Sector Object**. The same object can appear in the feed, sector discovery, search, profile, related recommendations, saved items, direct-message context, and paid visibility delivery.

No duplicate creation path is required to convert an eligible object into a promoted object. Promotion is an optional state attached to the same object.

## 2. Living Sector Object

A Living Sector Object carries, at minimum:

- object identity;
- owner identity;
- activated sector identity;
- intent class (`OFFER`, `NEED`, `SERVICE`, `OPPORTUNITY`, or another owner-approved class);
- geography/scope where relevant;
- human-facing content/media;
- structured sector attributes where relevant;
- trust/policy eligibility state;
- organic social interaction state;
- optional Pulse allocation state.

General-purpose content with no approved sector and no approved sector intent is not publishable.

## 3. Creation experience — ONE-TAP CREATE

The primary composer is a single social entry surface, not a multi-page form.

Canonical entry copy:

> **ماذا تعرض أو تحتاج؟**

The user may start with photo/media, voice/speech when available, or text.

The system progressively derives structured fields and asks only for missing information required by the selected sector, policy, geography, or legal contract. The user sees a live representation of the final object while creating it.

The product must not expose an exam-like sequence of every possible field up front.

## 4. Social shell

The primary experience is the social feed, not Marketplace.

Persistent top-level destinations:

- Home/feed;
- Search/discovery;
- Messages;
- Notifications;
- Profile;
- sector/market discovery where appropriate;
- persistent `☰` TIGER Command menu.

The shell must be compact, responsive, mobile-first, visually original, and interaction-rich. Controls must be actionable, not decorative placeholders.

## 5. TIGER Command and contextual capabilities

The `☰` menu is a universal command surface.

Every user can see ordinary account functions such as account/profile, objects/listings, saved items, activity, Pulse Vault, privacy/settings, and help when implemented.

Users who work with TIGER receive additional capabilities in the same product surface. There is no separate admin application as the primary model.

Capability principle:

> **Same World — Different Authority.**

A privileged actor sees only actions confirmed by current server-authoritative capability state and valid scope.

`صلاحياتي` is a first-class human-readable capability passport. It must show the actor's operational role/scope/status and permitted actions, rather than raw permission identifiers.

Frontend visibility is not an authorization boundary. Server/RLS/capability enforcement remains authoritative.

## 6. TIGER PULSE VAULT

The current paid visibility family remains TIGER PULSE with the owner-authorized global reference levels:

- `PULSE_2` — 2 JOD;
- `PULSE_10` — 10 JOD;
- `PULSE_25` — 25 JOD;
- `PULSE_45` — 45 JOD.

A purchase grants a server-authoritative quantity of verified eligible visibility. The exact quote is shown before payment.

Purchased visibility has **no product-time expiry**. It does not expire because days, weeks, or months pass.

NEXUS introduces a user-facing **Pulse Vault**: purchased visibility can remain unassigned until the user chooses an eligible Living Sector Object and activates or allocates the visibility to it.

Pulse is a platform service entitlement, not money, not a transferable wallet, and not buyer/seller settlement value.

## 7. Allocation and pause semantics

Subject to current country/sector/payment policy, available Pulse visibility may be allocated from the user's Vault to eligible objects.

An allocation may be paused without losing unconsumed visibility. No product-time timer runs while paused.

Only unconsumed visibility may ever return to available Vault balance; already verified/consumed delivery never returns. All allocation/reassignment operations are server-authoritative, audited, idempotent, and policy-bound.

## 8. NEXUS AUTOPILOT

Canonical delivery modes:

- `NOW` — consume eligible opportunities as they become available;
- `SMART` — default; balance opportunity quality and consumption pace;
- `PRECISE` — prefer higher relevance/intent confidence and accept slower consumption.

Mode changes delivery strategy, not the purchased visibility quantity and not eligibility rules.

Money never buys irrelevance. Paid delivery is considered only after sector, policy, relevance, quality, trust, geography, and inventory eligibility.

## 9. Opportunity Radar and auto-protection

NEXUS may expose safe descriptors of current opportunity strength to help the user choose whether to activate Pulse.

When qualified demand/opportunity is insufficient, the platform may auto-pause new paid delivery and preserve unconsumed visibility.

User-facing principle:

> **رصيدك محفوظ — لا نحرق الظهور عندما لا توجد فرصة مؤهلة.**

No guarantee of sale, lead, contact, first position, or completion date is permitted.

## 10. PROOFVIEW / ZERO-BURN verified delivery

Pulse consumption follows:

`RESERVE → SERVE → VERIFY → CONSUME`

A unit is consumed only when server-verifiable eligible visibility evidence qualifies under the current versioned policy.

The default current qualification direction remains:

- at least 50% viewport coverage;
- at least 2,000 ms continuous qualifying presence;
- foreground-active page/app;
- valid eligible placement/object;
- bot/invalid-traffic rejection;
- duplicate suppression;
- valid reservation;
- idempotent server consumption.

Fast scroll, hidden/background exposure, rejected automation/bots, invalid placements, duplicate/replay abuse, failed reservations, and policy-ineligible content consume zero purchased visibility.

Attention/engagement signals may improve future opportunity selection but must not silently multiply billing units.

## 11. Intent-first relevance

NEXUS prioritizes **current sector intent** over permanent inferred identity.

The platform may derive short-lived, purpose-bounded intent signals from current search, viewing, saving, object interaction, and explicit user statements, subject to privacy and legal policy.

## 12. Fair exposure

Additional Pulse purchases add available visibility fuel, not unlimited instantaneous rank power.

No stacking may create an effective delivery class above the platform's current maximum allowed intensity. Paid content does not gain a visually larger card merely because more was paid.

Frequency/fatigue controls should avoid wasting verified visibility on repeated low-value exposures to the same viewer/session.

## 13. Explainability and trust

Promoted delivery must be transparently labeled where required.

A safe `Why am I seeing this?` explanation may use sector, geography, explicit/current intent, and context when policy permits.

Trust indicators must not imply guarantees the platform does not legally or operationally provide.

## 14. Country architecture

NEXUS is one global product core with country-specific contracts/configuration for activated sectors, localization, currency/payment rails, legal/policy constraints, geographic registry, tax/payment requirements, and advertising/visibility rules.

Do not fork the primary product into a different application per country.

## 15. Latest-only deletion rule — mandatory

The owner's latest approved rule is the only current authority within its scope.

When NEXUS or another newer owner-approved authority conflicts with older material, the conflicting older material must be **deleted from the current project tree and active product**, not hidden, renamed, parked, archived, trashed, disabled behind a fallback, or retained as a compatibility path.

Removal scope includes, when affected:

- Runtime code;
- UI and routes;
- API/RPC contracts;
- active schema/configuration;
- tests and fixtures;
- CI/launch gates;
- current documentation;
- generated/current artifacts.

No `legacy/`, `archive/`, `trash/`, hidden compatibility layer, fallback branch/path, or current-tree historical copy may preserve conflicting behavior.

Already-applied immutable database migration history is not rewritten to fake history. Obsolete database effects are neutralized by forward migrations. **Git history is the sole provenance mechanism for deleted conflicting source material.**

Deletion requires evidence: identify the conflict, prove the replacement/current authority, remove the obsolete current-tree material, run exact-head verification, and only then merge through protected workflow.

## 16. Initial implementation slice

The first production-quality NEXUS slice must:

1. make the social feed the unambiguous primary surface;
2. replace generic composer language with `ماذا تعرض أو تحتاج؟`;
3. introduce Living Sector Object/intent contracts without breaking eligible current social objects;
4. make `☰` a persistent TIGER Command trigger;
5. mount `صلاحياتي` from real validated capability state instead of a null-only initial view;
6. expose role/scope in a human-readable capability passport;
7. introduce Pulse Vault read model and non-expiring balance semantics aligned to current Pulse authority;
8. add Pulse activation/delivery mode UI (`NOW`, `SMART`, `PRECISE`) without changing purchased quantity;
9. preserve verified-delivery/zero-burn semantics;
10. ensure mobile/desktop responsive behavior and remove visible dead controls from the primary shell;
11. identify and delete current-tree material that conflicts with the above, with no fallback/archive/trash preservation.

## 17. Non-goals

The first slice does not create a transferable money wallet, buyer/seller checkout, escrow, guaranteed sales/leads, or a mandatory external AI dependency.

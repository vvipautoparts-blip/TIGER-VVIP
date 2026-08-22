# OWNER FOUNDATIONAL INVARIANTS — 2026-08-22

**Status:** ACTIVE — OWNER AUTHORITY
**Effective:** 2026-08-22
**Scope:** entire TIGER platform, all current and future additive sectors, Social, ONE FIELD, Discovery, Profiles/Personas, Advertising, Owner/Partner controls, security, finance for platform-owned services, and future interfaces.
**Design horizon:** 2026 → 2096+
**Relationship to existing authority:** extends the current `OWNER_AUTHORITY_REGISTRY.md`, zero-brokerage constitution, Three-Lane interaction model, 6D→9D Universal Rendezvous design, and current-only/zero-residue governance. Where older active documentation or runtime behavior conflicts on the subjects below, this document is the current owner decision. Historical Git evidence may remain for audit, but conflicting runtime authority, current docs, UI, APIs, schemas and tests must be migrated or retired.

## 0. Governing method

Implementation strategy is:

`PRESERVE CORRECT → EXTEND → TEST → MIGRATE → SWITCH AUTHORITY → RETIRE CONFLICTS`

No big-bang rewrite. No duplicate current core. No legacy fallback that revives superseded semantics.

The repository must not claim that a security property is absolute when the client platform cannot technically guarantee it. Where perfect prevention is impossible, TIGER uses layered deterrence, server-side enforcement, attestation, audit and visible owner truth.

---

## 1. Automotive scope is auto parts only

The automotive domain is **parts/accessories/consumables/maintenance-related discovery only**.

Allowed examples include:
- parts;
- supplies;
- tires;
- oils/fluids;
- batteries;
- maintenance tools;
- maintenance/service related to parts;
- electrical/hybrid parts;
- roadside part/service support.

Explicitly prohibited inside the automotive sector:
- complete vehicle listings;
- whole-car sale/rental inventory;
- whole vehicle marketplace flows;
- vehicle models/miniatures represented as automotive vehicles.

If collectible/toy/model products are ever supported, they belong to an independently appropriate sector/category and never become whole-vehicle automotive inventory.

This is a semantic invariant, not a UI label rule.

---

## 2. Food sector is full-scope food

The food domain is not limited to packaged groceries. Its sector manifest must support, through category contracts, at least:
- meat;
- poultry;
- fish/seafood;
- dairy;
- eggs;
- grains/cereals;
- bakery;
- fruit;
- vegetables;
- fresh produce;
- frozen food;
- packaged food;
- beverages where legally/platform-policy allowed;
- other future food categories.

Food-specific safety/provenance attributes may vary by category and jurisdiction, but the shared core remains the same.

---

## 3. Universal provenance for materials and goods

Materials and product-like entities must support a common provenance vocabulary rather than one-off fields per screen.

Canonical attributes include, where applicable:
- `origin_classification = local | imported | mixed | unknown`;
- `country_of_origin`;
- `brand`;
- `manufacturer`;
- `producer`;
- `importer`;
- `distributor`;
- `supplier`;
- `batch_or_lot`;
- `certification_refs`;
- `condition = new | used | refurbished` where category-appropriate;
- source/evidence/freshness/verification state.

These are semantic contracts. Sector manifests decide which are required, optional or forbidden.

---

## 4. Global and jurisdiction-portable architecture

TIGER is globally architected and **must not hard-code one country as the platform's architectural master**.

Separate concepts must exist for:
- incorporation/legal entity jurisdiction;
- infrastructure/deployment region;
- user location;
- entity/business location;
- market/offer geography;
- data-residency policy;
- currency/settlement context;
- applicable country/sector policy.

The platform may be incorporated, operated, hosted or launched from different lawful jurisdictions without rebuilding the core.

**Reality constraint:** architecture cannot make TIGER exempt from applicable law. A country is not allowed to become a hard-coded technical master of the core, but applicable laws, sanctions, licensing, privacy, tax, consumer-protection, content and other legal obligations must still be represented through versioned policy adapters when they lawfully apply.

No feature may silently infer that registration in one country authorizes operation everywhere.

---

## 5. Brand/name abstraction is permanent

`TIGER`, `TIGER 9D`, Innovation names, sector display names and advertising labels are mutable working/display names unless explicitly frozen by a later owner decision.

Stable internal identity uses immutable IDs/contracts, not brand strings.

Required separation:
- `brand_uid` / semantic IDs = stable;
- public display name = mutable;
- logo/theme/domain = replaceable;
- sector labels = mutable;
- campaign/ad display names = mutable within policy;
- analytics/data joins must never depend on mutable public names.

A rebrand must not require data migration of canonical IDs or a rebuild of the platform core.

---

## 6. Four-interest decision envelope

When failures, uncertain states or trade-offs occur, TIGER evaluates decisions using a visible, auditable envelope:

1. protect people, privacy, security, legal rights and platform constitutional invariants;
2. protect the user's legitimate goal and prevent deceptive or harmful behavior;
3. protect platform continuity, integrity and reputation;
4. respect owner authority and legitimate partner interests inside delegated scope.

No owner/partner commercial interest may silently override user safety, privacy, organic relevance, security or the zero-brokerage constitution.

Every high-impact automated decision should expose a reason code and audit reference.

---

## 7. Universal Permissions surface

A familiar **`الصلاحيات / Permissions`** action becomes part of the contextual `••• = CONTROL` model.

Rules:
- every user can inspect their own sensitive-permission state;
- on another person's/entity's surface, `Permissions` appears only to a viewer who has a real capability to view/grant/revoke that scope;
- owner and authorized partners see richer management actions from the same permission surface, not a separate conflicting authorization product;
- no visible disabled/future permission control without runtime capability.

The user-facing interaction remains simple and Facebook-familiar: a concise list/bottom sheet, human labels, checkbox/switch state, short explanation, scope and expiry when relevant.

---

## 8. Sovereign Capability Fabric — sensitive permissions only

Ordinary platform features available to normal users remain ordinary default capabilities. The permissions system primarily governs **sensitive/work/administrative capabilities**.

Sensitive permissions default to **NOT GRANTED** for every ordinary account, partner and manager.

Owner identity is root authority to create/revoke policy, but even the owner does not carry an unlimited permanent sensitive-action token. High-risk actions require fresh step-up verification and short-lived action-bound authorization.

Internally use fine-grained actions; the UI may group them into understandable bundles.

A grant binds at minimum:
- subject/principal;
- action/capability;
- resource or resource class;
- sector scope;
- entity scope;
- geographic/policy scope where applicable;
- purpose/reason;
- grantor;
- policy version;
- issued time;
- start time;
- expiry/renewal rule;
- delegability ceiling;
- audit/evidence reference.

No role label such as `General Manager` is itself authority. A role is a display/bundle over explicit capabilities.

---

## 9. Delegation law

The owner decides who is a partner and which capabilities that partner receives.

A partner can grant permissions to users only if the partner itself has an explicit `DELEGATE_PERMISSION` capability for that exact family/scope.

Mandatory subset rule:
- a grantor cannot delegate a capability they do not hold;
- cannot widen resource/sector/geographic scope beyond their delegation ceiling;
- cannot extend lifetime beyond their delegation ceiling;
- cannot delegate owner-root identity;
- cannot create a permission that bypasses step-up, audit or zero-brokerage invariants.

Revocation must propagate immediately to future authorization checks; cached authorization must be bounded and fail closed for sensitive actions.

---

## 10. Permission UI semantics

For sensitive permissions the familiar visual model is:

`[✓] enabled/granted`
`[ ] not granted`

But the checkbox is **not** the security boundary. Server/database/policy authorization is authoritative.

For high-risk capabilities, changing the checkbox opens a compact confirmation sheet showing:
- who receives it;
- exact capability;
- exact scope;
- expiry;
- delegation right if any;
- reason;
- fresh owner/authorized-grantor step-up requirement.

The control remains easy to understand without exposing Cedar/OpenFGA/policy jargon to normal users.

---

## 11. Owner dashboard is the same capability model

The owner does not operate a separate authorization universe.

The existing Owner Control Center evolves into the highest-scope projection of the same capability system:
- users/partners;
- grants;
- requests;
- expiries;
- revocations;
- audit;
- earnings cycles;
- disclosure requests;
- security posture;
- incidents;
- staged sensitive actions.

Authorized partners see only the subset allowed by policy.

---

## 12. Fourteen-day Platform Earnings Cycles

Any `commission/earnings` shown in the permissions/work dashboard is strictly **platform-owned revenue sharing/operational earnings** from approved TIGER services such as advertising, campaigns, ad credits/packages, paid visibility or other explicitly approved platform-owned services.

It must never be calculated from the value, success or completion of an external buyer/seller/service-provider deal.

Use immutable ledger semantics:
- events/balance entries are append-only;
- corrections create new reversing/adjusting entries, never rewrite history;
- each person's current earning meter belongs to a 14-day cycle;
- at cycle close the visible current-cycle meter resets to zero for the new cycle;
- the closed cycle is sealed and remains queryable/auditable forever according to retention policy;
- `reset` never means deleting accounting history.

Cycle state:

`OPEN → LOCKED → RECONCILED → STATEMENT_READY → CLOSED`

A payout/conversion request is a separate capability and is not automatically implied by having earned an amount.

---

## 13. Currency and financial statement model

Currency uses ISO 4217 codes and immutable money entries with explicit minor-unit/precision handling.

For every conversion or settlement-related statement record, retain where applicable:
- source amount/currency;
- destination/requested currency;
- quoted/actual exchange rate;
- rate source/provider;
- quote timestamp;
- expiry;
- fees;
- resulting amount;
- provider/reference ID;
- status;
- reconciliation evidence.

A user/partner who is eligible for payout/conversion may request a **Financial Conversion Statement**. Conversion or payout occurs only through an approved provider/country configuration and required identity/tax/banking controls; the platform must not invent a rate or hide fees.

---

## 14. Owner-Sealed Disclosure Gate

Internal platform source code, owner constitutions, confidential operational instructions, secrets, sensitive security material and designated owner-only artifacts use a classification model:

`PUBLIC | USER_OWN | INTERNAL | CONFIDENTIAL | OWNER_ONLY`

For `CONFIDENTIAL`/`OWNER_ONLY` disclosure:
1. requester creates a disclosure request;
2. system creates a one-time challenge bound to requester, artifact/scope, purpose and expiry;
3. owner receives the approval challenge/code through an owner-controlled out-of-band channel;
4. owner verifies with phishing-resistant step-up where available;
5. system mints a short-lived disclosure lease;
6. requester receives only the authorized scope for the authorized time;
7. access is audited and revocable.

The one-time approval code/challenge is not sent to the requester as a bypass secret.

When the owner requests protected information, the owner still performs fresh step-up verification before release.

**Important:** this mechanism cannot retroactively protect data already copied to an external repository/account with broader permissions. Repository/IAM access must be aligned to the same least-privilege policy.

---

## 15. Screen-capture protection — truthful maximum protection

Goal: prevent ordinary digital screen capture of TIGER content, especially sensitive owner/permission/financial/internal screens, and make unauthorized capture attributable where prevention is impossible.

Native Android sensitive surfaces:
- use `FLAG_SECURE` / secure surfaces where compatible;
- use Play Integrity app/device verdicts for sensitive server actions;
- where available use app-access-risk signals for known/unknown capturing, controlling and overlay apps;
- background/app-switcher redaction;
- disable export/clipboard/print on designated protected surfaces where appropriate.

Apple platforms:
- detect active capture/mirroring state and react by redacting/pausing protected content where supported;
- detect screenshots after capture for incident/audit UX where appropriate;
- use App Attest for critical server requests.

Web:
- never pretend JavaScript can make source/display uncapturable;
- keep sensitive logic/server secrets off the client;
- use short-lived protected views, dynamic forensic watermarking, redaction on blur/background, strict download/export policy and authorization.

Universal protected-view enhancement:
- per-session forensic watermark containing non-sensitive trace ID/time;
- screenshot/capture events and integrity signals can raise risk and revoke the protected-view lease.

**Hard reality:** no software can stop a separate physical camera from photographing a display. TIGER therefore promises maximum digital prevention + attribution/deterrence, never a false 100% physical-capture guarantee.

---

## 16. Anti-tamper / anti-reverse-engineering architecture

TIGER must be difficult to tamper with and must keep sensitive authority server-side.

Required defense-in-depth:
- signed official builds;
- app/device attestation on high-risk actions;
- obfuscation/anti-debugging/anti-tamper/RASP where threat-model appropriate;
- no durable production secrets in web/mobile clients;
- server-side authorization and sensitive business rules;
- nonce/request binding and replay prevention;
- short-lived tokens/leases;
- dependency pinning/scanning;
- SBOM/provenance where supported;
- build provenance/attestation (SLSA/in-toto style principles);
- integrity-checked updates;
- rate/risk controls;
- audit and rapid revocation.

**Hard reality:** software delivered to an attacker's device can be studied. Web client code is inspectable by design. The security goal is therefore: reverse engineering must not reveal credentials or confer server authority, and tampered clients must not be trusted for sensitive operations.

---

## 17. Engineering quality and web-research rule

Production code must be real, current, minimal and tested. No fake navigation, fake success, dead UI, placeholder runtime, stale fallback, duplicate engines or unnecessary legacy residue.

When an implementation problem or unfamiliar/current technology question materially affects correctness, security or compatibility, engineers/agents must consult current authoritative documentation/research before selecting a fix.

Research never overrides repository truth or owner authority; it informs the safest implementation.

---

## 18. Current-only / zero-residue enforcement

If an older active artifact conflicts with these decisions:
- identify every consumer/import/reference first;
- write a regression/authority test;
- migrate data/behavior if needed;
- switch current authority;
- delete the conflicting active runtime/current-doc path;
- keep historical evidence only where audit/provenance genuinely requires it and mark it non-authoritative.

Do not rewrite Git history as ordinary cleanup. Historical commits are evidence, not active platform state.

---

## 19. UX law — familiar outside, advanced inside

The ordinary experience remains simple and Facebook-familiar in interaction grammar, while visual identity remains original.

Rules:
- stable global shell and navigation;
- one primary action per task where possible;
- `•••` is contextual control;
- `Permissions` lives inside familiar control surfaces instead of a complex policy editor for normal users;
- use bottom sheets/drawers on mobile for secondary controls;
- human language first;
- advanced policy detail only when requested;
- accessible focus, keyboard, touch targets and reduced-motion behavior;
- no disabled future controls presented as product capability.

Internally permissions are fine-grained and future-proof; externally they are grouped into understandable labels.

---

## 20. Speed / accuracy / continuity objectives

Architecture optimizes for:
- deterministic path first when sufficient;
- minimum network round-trips;
- bounded authorization evaluation;
- cache only where revocation semantics remain safe;
- progressive/lazy UI;
- low-end/weak-network graceful behavior;
- explicit uncertainty rather than invented certainty;
- one current authority per responsibility;
- replaceable providers/models/databases/cryptography over the 70-year horizon.

No performance number may be claimed without measurement on the relevant environment.

---

## 21. Research-informed architecture choices adopted

The 2026 research/standards review supports these choices:
- fine-grained authorization internally with aggregated/simple UI;
- relationship/attribute/context-aware permission checks;
- short-lived/step-up sensitive authorization rather than broad standing privilege;
- immutable financial balance/ledger entries with reconciliation;
- ISO 4217 currency identifiers;
- Android secure-display and app-access-risk signals for sensitive views;
- Apple capture detection/response and App Attest for server trust;
- anti-tamper/obfuscation as defense-in-depth, never a substitute for server security;
- build provenance/attestation for supply-chain integrity;
- WCAG 2.2 accessibility as a baseline target.

Technology names are replaceable implementation choices. The semantic contracts above are the durable authority.

---

## 22. Non-negotiable invariants

```text
AUTOMOTIVE_WHOLE_VEHICLES_ALLOWED=false
AUTOMOTIVE_PARTS_ONLY=true
FOOD_FULL_SCOPE=true
BRAND_DISPLAY_NAME_MUTABLE=true
PLATFORM_SINGLE_COUNTRY_MASTER=false
SENSITIVE_PERMISSIONS_DEFAULT_GRANTED=false
SENSITIVE_AUTHORIZATION_SERVER_SIDE=true
OWNER_HIGH_RISK_REQUIRES_STEP_UP=true
PARTNER_DELEGATION_REQUIRES_EXPLICIT_CAPABILITY=true
DELEGATION_CANNOT_EXCEED_GRANTOR_SCOPE=true
PLATFORM_EARNINGS_CYCLE_DAYS=14
EARNINGS_RESET_DELETES_HISTORY=false
EXTERNAL_DEAL_COMMISSION_ALLOWED=false
CONTACT_HANDOFF_IS_TERMINAL=true
OWNER_ONLY_DISCLOSURE_REQUIRES_FRESH_AUTH=true
ABSOLUTE_PHYSICAL_SCREEN_CAPTURE_PREVENTION_CLAIM=false
CLIENT_TAMPER_CONFERS_SERVER_AUTHORITY=false
BIG_BANG_REWRITE=false
CURRENT_RUNTIME_AUTHORITIES_PER_RESPONSIBILITY=1
```

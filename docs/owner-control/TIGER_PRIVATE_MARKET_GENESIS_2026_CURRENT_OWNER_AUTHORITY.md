# TIGER PRIVATE MARKET GENESIS 2026 — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / BINDING OWNER AUTHORITY`

**Effective date:** 2026-08-23

**Domain:** Marketplace discovery, commercial advertisement objects, sector rules, intent-compiled market views, direct contact, and handoff.

**Owner entrypoint:** `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`

**Parent authorities:**

- `docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md`
- `docs/owner-control/TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md`
- `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`
- `docs/superpowers/specs/2026-08-18-tiger-synapse-temporal-intent-system-design.md`

## 1. Binding product thesis

The current owner-approved marketplace architecture is:

> **TIGER PRIVATE MARKET GENESIS**
>
> **The marketplace does not wait for the user to search it. The market is compiled around the user’s private intent.**

Marketplace remains a module inside the social-network-first TIGER product. Private Market Genesis extends the approved TIGER SYNAPSE intent architecture for commercial discovery; it does not create a second product identity, a second intent engine, or a parallel marketplace authority.

## 2. Two non-negotiable laws

### 2.1 Automotive law

> **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**

The automotive commercial domain may publish, discover, advertise, rank, and contact around eligible vehicle parts, components, consumables, and explicitly approved accessories only.

A listing, ad, offer, or intent whose commercial object is a complete road vehicle is ineligible for Marketplace publication and paid placement. The rejection must occur before ranking or sponsored-placement admission. No price, premium placement, wording trick, category alias, image-only submission, or advertiser status may bypass this rule.

This law governs the commercial object. A part may reference make, model, year, trim, engine, chassis family, fitment, or compatible vehicle data solely to establish part compatibility; those references do not authorize an advertisement for the vehicle itself.

### 2.2 Platform-role law

> **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**

TIGER may:

- understand and normalize a user-authorized intent;
- compile an eligible private market view around that intent;
- present organic and properly labeled sponsored commercial objects;
- explain safe relevance reasons;
- enable direct contact between eligible parties;
- hand the interaction off to those parties.

TIGER must not become the transaction system for the underlying goods, property, parts, or services. Marketplace runtime must not introduce:

- cart or marketplace checkout;
- order formation or order acceptance on behalf of a party;
- escrow;
- custody of buyer/seller funds;
- item/service payment processing;
- platform settlement between the parties;
- transaction commission or seller payout from the underlying deal;
- platform-executed delivery or shipping;
- ownership transfer;
- warranty execution;
- platform guarantee of the deal;
- platform adjudication, compensation, or enforcement of the parties’ transaction.

The parties communicate, negotiate, agree, pay, deliver, transfer, and perform directly on their own responsibility outside TIGER transaction authority.

Platform-owned advertising and verified-visibility billing remain separately governed by the current TIGER Pulse / country-payment authority. Paying TIGER for advertising does not convert TIGER into a party to the advertised transaction.

## 3. Supersession rule

The earlier **Living Classified Fabric** proposal is superseded for this domain.

Its status is:

`SUPERSEDED / RETIRED_FROM_CURRENT_PLATFORM / HISTORICAL_ONLY`

Private Market Genesis replaces it rather than stacking above it. No fallback, compatibility flag, alternate route, current test expectation, active documentation, generated configuration, or runtime selector may restore Living Classified Fabric as a co-equal current authority.

If historical evidence of the old proposal exists, it may remain only as non-runtime provenance or audit history and must not appear in the current owner authority index or public product surface.

## 4. Required architecture before Lens implementation

Implementation must begin from three versioned contracts, in this order:

1. **Market Genesis Contract** — defines the authoritative inputs, policy context, deterministic eligibility boundary, compiled result, explanation envelope, privacy boundary, and handoff capability.
2. **Ad Genome** — defines the canonical commercial advertisement object used for eligibility, indexing, relevance, paid-placement admission, provenance, freshness, contact, and audit.
3. **Sector Physics Registry** — defines sector-specific allowed objects, forbidden objects, required dimensions, validation laws, ranking semantics, freshness, evidence, geography, contact modes, and policy constraints without hard-coding sector logic into the core compiler.

The core must consume versioned sector physics. It must not grow sector-specific `if/else` behavior as the long-term architecture.

## 5. Reference Lenses

After the three contracts are fixed, the first two reference Lenses are:

### 5.1 Real Estate Lens

Used to prove that the architecture can express location-heavy, area-heavy, property-type, sale/rent, availability, price, and evidence semantics without changing the Market Genesis core.

### 5.2 Auto Parts Lens

Used to prove compatibility-heavy discovery across make, model, year, trim, engine, part taxonomy, OEM/aftermarket identifiers, condition, fitment confidence, geography, availability, and seller contact while enforcing the whole-vehicle prohibition at admission time.

The Lenses are sector projections of one core architecture. They are not separate marketplace engines.

## 6. Private-intent boundary

The user’s raw private intent, exact private constraints, contact fields, and precise location are not advertising inventory.

Advertisers must not receive the raw Intent Envelope merely because their ad was eligible or displayed. Sponsored eligibility may use only policy-approved, purpose-bound derived features. Any explanation shown to an advertiser or user must avoid leaking private constraints, hidden safety signals, precise location, or another person’s sensitive information.

No advertising payment may purchase access to private intent data.

## 7. Deterministic authority boundary

AI may assist with drafting, normalization, translation, attribute extraction, and user-facing explanation, but an AI output may not directly grant:

- publication eligibility;
- sector eligibility;
- whole-vehicle exception;
- moderation clearance;
- contact authorization;
- paid-placement admission;
- identity authority;
- transaction authority.

Those decisions remain server-authoritative, policy-versioned, auditable, and deterministic at the admission boundary.

## 8. Discovery and sponsored-placement law

Organic and sponsored candidates must first pass the same applicable safety, sector, freshness, visibility, and policy eligibility gates.

Payment may affect eligible advertising delivery only after eligibility and minimum relevance are satisfied. Payment cannot repair an unsafe, forbidden, expired, blocked, irrelevant, or whole-vehicle object.

Sponsored objects must remain visibly labeled, frequency-bounded, and independently auditable from organic relevance.

## 9. Contact and handoff boundary

A successful Market Genesis result may expose only an authorized contact action consistent with the object, user policy, country policy, and reveal/consent rules.

The handoff is the terminal Marketplace responsibility boundary for the underlying transaction. After handoff, TIGER may continue to provide ordinary social messaging or user safety controls where separately authorized, but it must not silently transform that communication into order, payment, settlement, delivery, ownership-transfer, or dispute infrastructure.

## 10. Migration and anti-duplication rule

For this domain, implementation must:

1. identify every current Marketplace path that conflicts with Private Market Genesis;
2. migrate it to the new contracts or disconnect it;
3. preserve compatible SYNAPSE, Social Core, privacy, security, RLS, moderation, Pulse, and release protections;
4. remove conflicting active tests/configuration/current docs;
5. prove that no Living Classified Fabric fallback or second market compiler remains;
6. prove the automotive whole-vehicle rejection at publication and sponsored-admission boundaries;
7. prove the no-transaction law by negative tests for checkout/order/payment/escrow/settlement capabilities;
8. pass exact-head repository and database/release gates before any implementation is called verified.

## 11. Current implementation truth

Approval of this authority is not proof that Market Genesis runtime exists.

Until its versioned contracts, reference Lenses, adapters, tests, and exact-head evidence are implemented and verified, the correct state is:

`OWNER-APPROVED / DESIGN-TO-BE-SPECIFIED / NOT IMPLEMENTED`

Existing compatible Social Core and SYNAPSE behavior remains runtime truth. No UI mockup, document, stale Preview, or old implementation may be represented as Market Genesis implementation evidence.

## 12. Owner acceptance statement

The binding owner instruction for this domain is:

> **Adopt TIGER PRIVATE MARKET GENESIS as the only current Marketplace genesis architecture. Compile the market around the user’s private intent. Enforce AUTO PARTS ONLY with whole vehicle ads forbidden. Enforce DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF with NO TRANSACTION. Supersede Living Classified Fabric without fallback. Define Market Genesis Contract, Ad Genome, and Sector Physics Registry before implementing Real Estate and Auto Parts as the first reference Lenses. Preserve all compatible stricter security, privacy, Social Core, SYNAPSE, Pulse, and exact-head release protections.**

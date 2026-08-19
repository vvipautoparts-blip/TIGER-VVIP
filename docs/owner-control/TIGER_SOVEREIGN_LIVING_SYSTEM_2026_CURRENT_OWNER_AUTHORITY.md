# TIGER Sovereign Living System 2026 — Current Owner Authority

**Status:** `CURRENT_ONLY / OWNER APPROVED`

**Effective date:** 2026-08-19, Asia/Amman

## Binding owner decision

The owner adopts **TIGER Sovereign Living System 2026 (TSLS)** as the current release/runtime assurance architecture for VVIP TIGER.

TSLS does not replace the current Social Core product identity, TIGER SYNAPSE v2, or TIGER VERITY FABRIC. It governs how those systems are proven, previewed, promoted, isolated, recovered, and presented to the owner.

## Binding invariant

`Intent -> Policy -> Execution -> Verification -> Evidence`

No sensitive user-visible success state, release readiness claim, privacy claim, realtime claim, mobile-readiness claim, or financial posting claim is authoritative without matching trusted evidence.

## Mandatory architecture

1. Proof-native operations with trusted server/data confirmation.
2. Zero-trust social authorization; authentication alone is insufficient.
3. Multi-layer TIGER Privacy Firewall across RLS/API/Realtime/Storage/Cache.
4. Deterministic synthetic Digital Twin Lab before manual device acceptance.
5. Temporal policy/evidence truth for sensitive historical events.
6. Verified realtime lifecycle with idempotent reconnect and deduplication.
7. Graceful degraded networking without weakening privacy or identity.
8. Mobile chaos acceptance on real Android/iPhone conditions before mobile-readiness claims.
9. Ordered Sovereign Release Rings `R0_CODE` through `R6_PRODUCTION`.
10. Atomic Feature Cells with bounded safe kill switches.
11. Self-healing only toward pre-approved less-capable safe modes.
12. Strict financial domain isolation for TIGER-owned financial scope only.
13. No-Silent-Money Rule for every platform-owned ledger posting.
14. Owner Sovereign Cockpit with `SAFE / DEGRADED / BLOCKED` derived from evidence.
15. Exact-source TIGER Release Passport.
16. Elegant restrained motion and adaptive low-resource/network behavior.
17. Trust Halo only when backend evidence exists for the exact action/object.
18. Explainable, traceable, reproducible sensitive decisions; AI never bypasses deterministic policy authority.

## Exact-SHA Preview rule

A valid Preview must be isolated from Production and `main`, built from the intended exact SHA, visibly labeled as non-Production, backed by staging/sandbox services and synthetic/sanitized data, and verifiable from deployed build identity.

No historical Pages address or unrelated deployment may be reused as proof for a new PR head.

## Zero-downtime rule

Existing active Production references and routes remain untouched while a new Preview or candidate is being proved. A new environment replaces an old active reference only after its own required ring/gate evidence is green.

## Privacy proof rule

For an unauthorized user, protected content such as `only_me` must produce all of the following:

- zero authorized database rows;
- zero realtime delivery;
- zero private-media access;
- zero recoverable private cache residue attributable to that user.

A UI that merely hides a row is not privacy evidence.

## Realtime truth rule

Optimistic UI is never final truth. Sensitive realtime behavior must distinguish local optimistic presentation from trusted server acceptance/persistence and cross-device propagation.

## Financial boundary

The Marketplace transaction between seller/buyer or provider/beneficiary remains outside TIGER financial scope. TSLS financial controls apply only to TIGER-owned services and accounting, including approved advertising billing, recognized platform revenue, refunds/reconciliation, and owner-approved commission policy.

The Social/Marketplace browser surface cannot directly post ledger entries.

## No-Silent-Money minimum evidence

Every TIGER-owned financial posting requires a typed event/evidence id, purpose, applicable policy/version, scope/country when relevant, currency, integer minor units, source event, idempotency key, timezone-qualified timestamp, and ledger version. Missing mandatory provenance fails closed.

## Release rings

- `R0_CODE` — code/build/security proof.
- `R1_DATA` — migration/RLS/database rehearsal proof.
- `R2_TWIN` — synthetic two-way user proof.
- `R3_DEVICE` — Android/iPhone and degraded-network proof.
- `R4_OWNER_PREVIEW` — isolated exact-SHA owner preview.
- `R5_CANDIDATE` — release-candidate/canary proof.
- `R6_PRODUCTION` — exact sealed production promotion.

No later ring overrides a failed earlier fail-closed ring.

## First implementation cursor

`Authority/Proof Plane -> Exact-SHA Preview Guard -> Privacy Proof -> Media Boundary -> Messaging/Realtime -> Pagination/Resilience -> Device Chaos -> Ledger Sandbox Boundary -> Owner Passport -> Candidate Ring`

## Current truth at adoption

Adoption of this architecture is `APPROVED`. Runtime features become `IMPLEMENTED` only when their repository bytes exist, and `VERIFIED` only when matching exact-head evidence is green.

No live Preview URL is implied by this decision.

## Engineering specification

`docs/superpowers/specs/2026-08-19-tiger-sovereign-living-system-design.md`

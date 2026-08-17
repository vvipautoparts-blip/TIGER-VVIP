# P07 Supersession Notice

**Status:** SUPERSEDED / HISTORICAL ONLY
**Effective supersession:** 2026-08-15
**Current authority:** `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-15.md`

P07 is preserved as architecture/audit evidence. It is **not** a current product-policy source when it conflicts with a later owner decision.

Machine-readable supersession token:

`FIXED_LISTING_LIFETIME_CANCELLED`

The former universal 120-day listing lifetime recorded in P07 is cancelled. P07 text, diagrams, data-dictionary expressions and coverage rows that describe that historical lifetime must never be used to restore a fixed listing age in runtime, schema migrations, UI copy, tests, CI or release decisions.

Current rule: organic listing availability is governed independently by current eligibility/status/archive/delete policy. Activation-card duration and TIGER PULSE/impression entitlement are separate paid-visibility concepts and must not be converted into a universal organic listing deletion timer.

Other P07 security and data-integrity evidence remains useful where it does not conflict with later owner decisions, including Clerk identity boundaries, append-only audit intent, media sanitization/storage boundaries, canonical conversation pairing and executable cover-image integrity.

Do not edit historical artifacts merely to make them look current. New implementation and active tests must consume the latest owner authority and treat this directory as provenance unless a specific still-valid invariant is explicitly carried forward.

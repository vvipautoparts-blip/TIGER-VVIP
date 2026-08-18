# TIGER ONE 2026 — CURRENT OWNER AUTHORITY & SUPERSESSION RULE

**Status:** CURRENT_ONLY — BINDING OWNER AUTHORITY

**Effective date:** 2026-08-18

**Applies to:** VVIP TIGER product design, interaction architecture, information architecture, visual system, user journeys, campaign surfaces, Pulse visibility/payment experience, profile/contact experience, responsive behavior, accessibility presentation, and any implementation derived from those domains.

**Current monetization authority:** `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`

## 1. Binding owner rule

The OWNER has approved TIGER ONE 2026 as the current direction.

Whenever an earlier decision, specification, implementation instruction, visual rule, route pattern, copy pattern, layout, workflow, component contract, or test expectation conflicts with the current TIGER ONE 2026 authority, the **current TIGER ONE 2026 rule wins**.

The conflicting earlier rule is immediately classified:

`SUPERSEDED / HISTORICAL ONLY`

It must no longer be treated as CURRENT authority.

## 2. What supersession means operationally

A superseded rule must be excluded from all of the following when the affected area is migrated:

- Production/current runtime behavior;
- current owner operational reference/index;
- current implementation plans;
- active UI/design tokens;
- active route/interaction authority;
- current test expectations;
- current launch criteria;
- current generated copy/configuration;
- active product documentation.

Historical files may remain only for audit, rollback reasoning, provenance, security investigation, or decision history. Historical retention does **not** grant runtime or design authority.

## 3. Conflict resolution

Conflict is resolved by meaning, not filename age.

Examples:

- legacy large authenticated Home hero vs TIGER ONE compact living Home → legacy hero is superseded;
- fixed three-sector UI authority vs Dynamic Sector Registry → fixed authority is superseded;
- numbered `1/2/3/4` listing wizard vs Progressive Composer + Publish Passport → numbered default wizard is superseded;
- separate admin/owner skin vs one Living Surface with capability-gated controls → separate final-state skin is superseded;
- generic Cairo-only typography authority vs TIGER Optical Type System → Cairo-only product identity is superseded;
- oversized generic button system vs semantic action hierarchy → old button grammar is superseded;
- banner-like campaign placement vs TIGER Pulse experience → old conflicting campaign presentation is superseded;
- paid publishing subscription/cards vs free compliant publishing + Pulse Ring verified visibility → publishing-subscription authority is superseded;
- any 45/120 JOD Pulse tier vs the 3/10/20 JOD Pulse Ring cap → high-price Pulse authority is superseded.

If an older document contains both compatible and conflicting clauses, only the conflicting clauses are superseded unless the newer authority explicitly retires the entire document.

## 4. Authority hierarchy

For the domains covered by this decision, precedence is:

1. latest explicit OWNER decision recorded as CURRENT_ONLY;
2. latest OWNER-approved current domain specification;
3. current FUSION owner constitution where compatible;
4. current implementation plan derived from the above;
5. current code/tests that conform to the above;
6. historical/superseded material — evidence only, no authority.

For monetization, paid visibility, publishing-access monetization, Pulse pricing/delivery/payment, and impression accounting, `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md` is the current domain authority.

A lower layer may never resurrect a superseded rule.

## 5. Safety-preserving replacement rule

TIGER ONE 2026 does not silently weaken security, privacy, financial integrity, legal compliance, authorization, RLS, SOA/SCG, Clerk, F05/Media Fortress, immutable-release, ledger, or platform-role boundaries.

If a new OWNER decision explicitly replaces one of those domain rules, the replacement must be written explicitly in the corresponding current authority and receive the required domain review. Until then, the stricter compatible protection remains in force.

This prevents an aesthetic, UX, or monetization migration from accidentally removing a security or legal invariant.

## 6. Platform-role invariant remains current

VVIP TIGER remains an advertising, discovery, commercial-presentation, and direct-contact platform. It is not a party to the buyer/seller or provider/beneficiary transaction after contact and does not silently introduce marketplace checkout, escrow, delivery, settlement, warranty execution, compensation, or platform-run transaction dispute resolution.

Platform-owned billing is limited by the latest current monetization authority. Under TIGER Pulse Ring, ordinary publishing is not a paid subscription product; platform billing is for approved Pulse visibility/advertising services and any later separately approved platform-owned service that does not conflict with the current 20 JOD charge cap.

## 7. Migration rule

Supersession is not satisfied by adding new CSS over old behavior.

For each migrated area the implementation must:

1. identify the old authority;
2. identify the new current authority;
3. remove or disconnect the conflicting runtime path;
4. remove conflicting current tests/configuration;
5. preserve only necessary historical evidence;
6. prove no dual-authority path remains;
7. pass exact-head verification before the area is considered converged.

## 8. No duplicate authority

There must be one current authority per decision domain.

The project must not keep two contradictory “active” specs, two active design systems, two active composer models, two active campaign UX models, or two active monetization models and choose between them at runtime.

Migration adapters may exist temporarily only when explicitly bounded, observable, and scheduled for retirement. They are not equal product authorities.

## 9. Owner acceptance statement

The binding owner instruction is:

> **If TIGER ONE 2026 conflicts or collides with prior product/UI/UX/IA/design authority, adopt TIGER ONE 2026, fully retire the conflicting prior authority from CURRENT use, and retain old material only as historical evidence. Do not let old authority re-enter the product through code, tests, documentation, configuration, or launch criteria. For monetization and paid visibility, TIGER Pulse Ring is the current authority: free compliant publishing, only 3/10/20 JOD Pulse purchases, no fourth tier, no time-expiring Pulse fuel, and no publishing-subscription model.**

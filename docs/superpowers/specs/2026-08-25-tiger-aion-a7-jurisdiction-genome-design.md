# TIGER AION ∞ — A7 Jurisdiction Genome Design

**Status:** IMPLEMENTATION SPEC / A7

**Authority:** `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

## Goal

Represent country/jurisdiction operating requirements as versioned, testable, evidence-bound machine policy without allowing an LLM, Agent, legal-text parser, or unapproved draft to become runtime authority. A7 implements the mandatory chain:

`Law/Regulation Change → Legal Interpretation → Human Legal Approval → Machine Policy → Tests → Jurisdiction Twin → Controlled Enforcement Candidate`

The final artifact is only a candidate for later controlled enforcement. A7 does not mutate Production.

## Mandatory domains

Every Jurisdiction Genome foundation policy explicitly evaluates these five domains:

- `ADVERTISING`
- `PRIVACY`
- `DATA`
- `IDENTITY`
- `PAYMENTS`

This does not mean every jurisdiction has identical law. It means no activation candidate may silently omit a protected TIGER operating domain.

## Policy draft

A draft is immutable and sealed. Minimum fields:

- policy id and positive version;
- ISO-like two-letter jurisdiction code;
- legal source reference and source publication timestamp;
- legal interpretation reference;
- effective timestamp;
- five mandatory domains;
- machine rule records, each bound to one declared domain;
- test references;
- migration reference;
- rollback reference;
- exact source SHA;
- TIGER protected-boundary assertions.

Draft state is always:

- `PENDING_LEGAL_APPROVAL`;
- `human_legal_approval = false`;
- `runtime_enforcement = false`.

## Protected TIGER boundaries

No jurisdiction policy may weaken or override these current product boundaries:

- `marketplace_intermediation = FORBIDDEN`;
- `product_service_payment_processing = FORBIDDEN`;
- `tiger_owned_advertising_only = true`;
- `payment_scope = TIGER_AD_CREDITS_ONLY`.

If a jurisdiction requires behavior incompatible with a protected owner boundary, the machine result is not to rewrite the boundary. It must hold/fail closed for owner/legal review.

## Human legal approval

A draft becomes `LEGAL_APPROVED` only through an explicit approval record containing:

- `approver_type = HUMAN_LEGAL`;
- stable approver reference;
- `decision = APPROVED`;
- approval timestamp;
- exact draft digest;
- exact legal source reference;
- legal approval evidence references.

`LLM`, `AGENT`, `MODEL`, `AUTO`, or any other non-human approver type fails closed. Approval does not enable runtime enforcement.

## Jurisdiction Twin

Only a legally approved policy can enter the Jurisdiction Twin. Twin evidence is:

- `fact_class = SIMULATION`;
- bound to the exact approved policy digest;
- evaluated across all five domains exactly once;
- each domain result is `PASS`, `FAIL`, or `HOLD` with evidence references;
- `production_fact = false`;
- `runtime_enforcement = false`.

Overall outcome:

- all five `PASS` → `PASS`;
- any `FAIL` → `REJECTED`;
- otherwise any `HOLD` → `HOLD`.

## Controlled enforcement candidate

A7 may create a sealed `ELIGIBLE_FOR_CONTROLLED_ENFORCEMENT` candidate only when:

1. policy integrity is valid and status is `LEGAL_APPROVED`;
2. human legal approval is present and correctly bound;
3. the Jurisdiction Twin result is exact-policy-bound and overall `PASS`;
4. current injected time is at or after the policy effective timestamp;
5. migration and rollback references are present;
6. protected TIGER boundaries remain unchanged.

The candidate must state:

- `execution_performed = false`;
- `runtime_enforcement = false`;
- `production_mutation_authorized = false`;
- `unrestricted_production_mutation = false`.

Actual rollout belongs to later bounded delivery/authorization stages, not A7.

## Failure behavior

- missing/invalid source identity → deny;
- legal approval by non-human actor → deny;
- legal uncertainty → Twin `HOLD`, no candidate;
- failed jurisdiction dimension → Twin `REJECTED`, no candidate;
- missing domain → deny;
- policy/twin digest mismatch → deny;
- effective date not reached → deny;
- tampering → deny;
- attempted protected-boundary override → deny;
- stale or malformed exact source SHA → deny.

## Acceptance criteria

A7 is `VERIFIED` only when tests prove all of the above and the full same-SHA gate set is GREEN: Project Control Integrity, VVIP Quality Gate, Zero-Residue, CleanGuard, Documentation, LC03, LC04, LC05, LC06, and TIGER Social DB Rehearsal. `main` and Production remain untouched.

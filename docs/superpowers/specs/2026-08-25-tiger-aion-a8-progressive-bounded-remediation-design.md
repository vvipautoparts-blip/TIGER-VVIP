# TIGER AION ∞ — A8 Progressive Bounded Remediation Design

**Status:** IMPLEMENTATION SPEC / A8

**Authority:** `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

## Goal

Implement a deterministic, evidence-bound progressive remediation controller that evaluates candidate changes through:

`SHADOW → CANARY → COHORT_1 → COHORT_N → FULL`

A8 never grants unrestricted Production authority and never performs deployment, rollback, database mutation, secret mutation, or payment action from this implementation branch. It produces sealed promotion/hold/rollback candidates for an already-valid A5 Action Passport and authorization.

## A5 binding

Every A8 rollout is bound to:

- one valid A5 Action Passport;
- one deterministic A5 authorization decision;
- exact source SHA;
- rollback reference;
- recovery checkpoint reference;
- explicit reversibility/preapproval flags;
- blast-radius boundary.

A8 cannot manufacture authority missing from A5. `L6_UNRESTRICTED_PRODUCTION_MUTATION` remains forbidden.

## Progressive state machine

Allowed order only:

1. `SHADOW`
2. `CANARY`
3. `COHORT_1`
4. `COHORT_N`
5. `FULL`

No stage skip, reverse promotion, duplicate promotion, or transition beyond `FULL` is valid.

## Baseline and guardrail dimensions

Every rollout carries a sealed baseline and explicit guardrails for all dimensions:

- error rate;
- p95 latency;
- p99 latency;
- database saturation;
- security findings;
- business KPI floor;
- user-harm rate;
- cost rate.

No dimension may be omitted. A technically healthy change cannot promote when security, business, user-harm, or cost guardrails fail.

## Stage observation

Every stage evaluation requires a complete observation bound to:

- current stage;
- exact source SHA;
- observation timestamp;
- evidence references;
- all eight measured dimensions.

Observation values are compared to explicit guardrails, not to LLM judgment.

## Decisions

### Promotion candidate

If all guardrails pass and the requested next stage is the only legal successor, A8 may emit:

- `PROMOTION_CANDIDATE`;
- exact current/next stage;
- evidence and rollout digests;
- `execution_performed = false`;
- `production_mutation_authorized = false`.

### Failed observation

If any guardrail fails:

- A8 never promotes;
- if A5 authorization level is `L5_PREAPPROVED_REVERSIBLE_REMEDIATION`, the rollout is explicitly preapproved and reversible, and rollback + recovery are verified, A8 may emit `ROLLBACK_CANDIDATE` with `automatic_rollback_eligible = true`;
- otherwise A8 emits `HOLD_FOR_HUMAN` with `automatic_rollback_eligible = false`.

Even an eligible rollback candidate does not execute rollback in this module.

## Freshness and integrity

- Action Passport must be fresh at evaluation time.
- A5 authorization must be sealed and exactly bound to the passport/source/autonomy level.
- rollout, baseline, guardrails, and observations are SHA-256 sealed.
- tampering, missing evidence, future observation timestamps, stale passports, malformed metrics, or source mismatch fail closed.

## Acceptance criteria

A8 is `VERIFIED` only when tests prove:

1. exact stage ordering with no skips;
2. all eight dimensions are mandatory;
3. all-pass evidence produces only a non-executing promotion candidate;
4. any failed dimension prevents promotion;
5. automatic rollback eligibility requires A5 L5 + preapproval + reversibility + verified rollback + verified recovery;
6. otherwise failure holds for a human;
7. no A8 result authorizes unrestricted or direct Production mutation;
8. tamper/stale/source mismatch fail closed;
9. all ten same-SHA CI/rehearsal gates are GREEN;
10. `main` and Production remain untouched.

# TIGER AION ∞ — A4 Synthetic Society & Fraud Futures Design

**Status:** `OWNER_APPROVED / IMPLEMENTATION_SLICE`

**Authority:** `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

**Parent spec:** `docs/superpowers/specs/2026-08-25-tiger-aion-prospective-living-digital-organism-design.md`

## 1. Goal

Build a deterministic, isolated Synthetic Society layer on top of A3 Twin Swarm so TIGER can rehearse normal and adversarial user journeys before real users experience a release.

A4 must evaluate releases across all six dimensions:

- `TECHNICAL`
- `SECURITY`
- `HUMAN`
- `ECONOMIC`
- `LEGAL`
- `SOCIAL`

A technically healthy release is not accepted if another required dimension fails.

## 2. Persona classes

The first A4 classes are:

- `NORMAL`
- `CONSTRAINED_DEVICE`
- `ABUSIVE`
- `SPAM`
- `FRAUD`
- `COORDINATED`

Personas are synthetic behavioral archetypes only. They never impersonate or reference a real person.

## 3. Privacy and identity boundary

A synthetic persona may contain bounded non-identifying traits such as synthetic locale class, network class, device class, accessibility mode, behavior intensity, and journey preferences.

A4 rejects real-person or account identity fields including direct email, phone, real-name, government identifier, exact address, IP address, production account/user identifier, credentials, authorization material, secrets, or private-key material.

`synthetic = true` is immutable in A4 records.

## 4. Journey boundary

Journeys run only against `SHADOW` or `ISOLATED_TWIN` targets and are always `SIMULATION`.

Representative actions may include:

- register/login simulation;
- publish/read/react/message/search simulation;
- report/block simulation;
- advertising-view simulation;
- marketplace-discovery/contact simulation;
- bounded abuse/spam/fraud attempts inside the isolated Twin;
- coordinated synthetic behavior inside a synthetic cohort.

No A4 journey receives Production credentials or Production write capability.

## 5. Synthetic cohorts

A cohort is a sealed collection of verified synthetic persona references used to rehearse coordinated behavior. Cohorts cannot contain raw real-user identifiers and cannot target external systems.

## 6. Six-dimensional release gate

Each dimension produces a bounded decision record:

```text
DimensionDecision {
  dimension
  decision = PASS | HOLD | FAIL
  evidence_refs[]
  policy_ref
  human_approved? // mandatory true for LEGAL
}
```

Gate law:

- missing or duplicate dimension => fail closed;
- any `FAIL` => `REJECTED`;
- otherwise any `HOLD` => `HOLD`;
- all six `PASS` => `APPROVED`;
- `LEGAL` is invalid unless `human_approved = true`.

The gate is deterministic. LLM output alone never grants legal or release authority.

## 7. Integrity

Personas, journeys, cohorts, and release-gate decisions are canonicalized and SHA-256 sealed. Tampered synthetic records fail closed before reuse.

## 8. Acceptance criteria

A4 is `IMPLEMENTED` when:

1. all six persona classes are supported;
2. real-person/PII and secret-bearing fields fail closed;
3. journeys are simulation-only and isolated from Production;
4. coordinated cohorts contain only verified synthetic personas;
5. six-dimensional release decisions are complete and deterministic;
6. LEGAL requires explicit human approval;
7. any failed dimension rejects the release;
8. all records are content-addressed and tamper-evident;
9. repository gates pass on one exact head before A4 is called `VERIFIED`.

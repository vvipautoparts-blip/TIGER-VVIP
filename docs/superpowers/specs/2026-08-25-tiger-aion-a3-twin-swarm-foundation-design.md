# TIGER AION ∞ — A3 Twin Swarm Foundation Design

**Status:** `OWNER_APPROVED / IMPLEMENTATION_SLICE`

**Authority:** `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

**Parent spec:** `docs/superpowers/specs/2026-08-25-tiger-aion-prospective-living-digital-organism-design.md`

## 1. Goal

Implement the first deterministic Twin Swarm substrate for TIGER AION without touching Production. A3 provides isolated, expiring, proof-sealed simulation scenarios for the first four twin classes:

- `RELEASE`
- `PERFORMANCE`
- `DATABASE`
- `SECURITY`

The foundation must support counterfactual replay while preserving the hard boundary that simulated observations are never Production facts.

## 2. Non-goals

- No Production deployment or Production mutation.
- No Production credentials or raw secrets inside Twin scenarios.
- No raw Production personal data by default.
- No fraud/population/jurisdiction/economic/growth twins in this slice; those belong to later AION stages.
- No autonomous remediation.
- No claim that simulation predicts the future with certainty.
- No vendor-specific simulator requirement.

## 3. Core invariants

1. Twin data mode is only `SYNTHETIC` or `SANITIZED`.
2. Twin execution target is only `SHADOW` or `ISOLATED_TWIN`.
3. Production write capability is always denied.
4. Every scenario has explicit assumptions, generator version, model version, source-state reference, creation time, expiry, horizon, and sensitivity.
5. Every scenario and replay result carries a deterministic SHA-256 content digest.
6. Tampered scenario digests fail closed before replay.
7. Expired scenarios fail closed before replay.
8. Counterfactual replay outputs `fact_class = SIMULATION` unconditionally.
9. Twin evidence may reference Production state, but cannot silently become authoritative Production truth.
10. Secret-bearing keys or secret-like values fail closed.
11. Inputs are bounded to prevent unbounded memory/cost amplification.
12. No scenario is authorized to mutate `main`, Production, Production DB, secrets, payments, or branch protection.

## 4. Scenario model

```text
TwinScenario {
  schema_version = TIGER-AION-TWIN-SCENARIO-1
  scenario_id
  twin_class
  source_state_ref
  source_release_sha?
  created_at
  expires_at
  horizon_seconds
  generator_version
  model_version
  sensitivity
  data_mode = SYNTHETIC | SANITIZED
  execution_target = SHADOW | ISOLATED_TWIN
  production_write_capability = false
  assumptions[]
  content_digest
}
```

Assumptions are bounded records with stable IDs and typed values. They describe the hypothetical branch; they are not factual history.

## 5. Counterfactual replay model

```text
TwinReplay {
  schema_version = TIGER-AION-TWIN-REPLAY-1
  replay_id
  scenario_id
  twin_class
  fact_class = SIMULATION
  executed_at
  execution_target
  interventions[]
  observation_refs[]
  outcome
  scenario_digest
  content_digest
}
```

Interventions are simulated only. Any intervention that requests a Production target or a write-to-Production capability is rejected.

## 6. Foundation twin semantics

### RELEASE

Rehearses candidate release effects, dependency/version assumptions, rollback readiness, and baseline deltas before promotion.

### PERFORMANCE

Rehearses load, latency, saturation, queueing, cache behavior, and capacity assumptions against bounded synthetic/sanitized workloads.

### DATABASE

Rehearses query plans, locks, connection pressure, RLS-safe access patterns, migration/read-path assumptions, and recovery dependencies in an isolated database twin.

### SECURITY

Rehearses authorized defensive scenarios and bounded hostile conditions inside an isolated security twin/cyber range. No external target permission and no Production credentials.

## 7. Freshness and integrity

- `expires_at` must be later than `created_at`.
- Replay requires an injected `now_ms` within the scenario validity window.
- Scenario content is canonicalized before SHA-256 sealing.
- Replay verifies the supplied scenario digest before use.
- A stale or tampered scenario returns a typed fail-closed error.

## 8. Secret/data protection

The A3 model stores no secret values. It rejects recursively named secret fields such as password/token/private-key/authorization/credential classes and rejects common secret-shaped values. Test fixtures must construct hostile markers at runtime where needed so repository secret scanners remain clean.

## 9. Acceptance criteria

A3 Foundation is `IMPLEMENTED` when:

1. a pure deterministic module implements scenario creation, freshness, integrity verification, and counterfactual replay;
2. RED-first tests cover all four twin classes;
3. raw Production data mode is rejected;
4. Production execution/write requests are rejected;
5. stale and tampered scenarios are rejected;
6. secret-bearing inputs are rejected;
7. replay outputs can never claim `PRODUCTION_FACT`;
8. deterministic digests are proven by tests;
9. Project Control and repository gates pass on the same exact head before A3 is called `VERIFIED`.

# TIGER AION ∞ — A6 Immune Memory + Red/Blue Swarm Design

**Status:** IMPLEMENTATION SPEC / A6

**Authority:** `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

## Goal

Turn confirmed operational incidents into expiring, versioned Digital Antibodies while keeping every antibody advisory and subject to the normal A5 deterministic authorization path. Add an isolated Red/Blue cyber-range that can rehearse defensive futures without Production credentials, Production writes, or external-target authority.

## Non-goals

- No antibody may directly mutate Production.
- No simulated Red/Blue event may become a Production fact.
- No Red agent receives Production credentials, internet target authority, or unrestricted network access.
- No Blue remediation bypasses Action Passport, Capability Cell, policy, evidence, approval, recovery, or autonomy gates.
- No incident may create an antibody until the incident is explicitly confirmed by authoritative evidence.

## Digital Antibody

A Digital Antibody is immutable defensive memory, not executable policy. It contains:

- `antibody_id` and positive integer `version`;
- confirmed `incident_ref` and `causal_graph_ref`;
- bounded indicators;
- successful and failed defenses;
- candidate remediation references;
- rollback reference;
- confidence;
- `created_at` and `valid_until`;
- exact source SHA and evidence references;
- `advisory_only = true`;
- SHA-256 content digest.

Antibodies expire. An expired antibody cannot be reused for a remediation candidate.

## Confirmed-incident rule

Creation requires an incident proof with:

- `status = CONFIRMED`;
- `fact_class = PRODUCTION_FACT`;
- `authoritative_source = true`;
- bounded incident, causal-graph, evidence, and exact-source references.

Simulation, hypothesis, unconfirmed, or non-authoritative incident material fails closed.

## Antibody-triggered remediation

Antibody reuse is only evidence input to the existing A5 path. The caller must supply:

1. a valid, fresh Digital Antibody;
2. an A5 `ActionPassport` whose evidence references include the exact antibody digest reference;
3. an A5 deterministic `TIGER-AION-AUTHORIZATION-DECISION-1` bound to that exact passport and source SHA;
4. a remediation reference present in the antibody.

A6 returns a bounded remediation candidate. It does not execute anything and does not create new authority. Any actual canary/remediation remains governed by the A5 authorization decision and later delivery controls.

## Red/Blue cyber-range

An A6 cyber-range exercise must be:

- `ISOLATED_CYBER_RANGE`;
- `SYNTHETIC` or `SANITIZED` data only;
- `production_credentials = false`;
- `production_write_capability = false`;
- `external_targets = false`;
- bounded by creation/expiry timestamps and scenario references;
- limited to internal `range://` or `twin://` targets.

Red capabilities are simulation-only. Blue capabilities are detect/contain/recover/propose-only. Exercise outputs remain `SIMULATION` and may create candidate detections or runbooks, never Production facts or automatic remediation authority.

## Security invariants

- immutable SHA-256 seals for antibodies, ranges, and exercise results;
- stale or tampered records fail closed;
- no secret-bearing fields or secret-like values in immune memory;
- no external target URI in Red/Blue scope;
- no Production credential or write flag can be true;
- A5 exact-source and passport binding is mandatory for antibody reuse;
- L6 unrestricted Production mutation remains forbidden by A5 and is not redefined here.

## Acceptance criteria

A6 is `VERIFIED` only when:

1. confirmed authoritative incidents can produce sealed antibodies;
2. unconfirmed/simulated incidents are rejected;
3. antibody expiry/tamper is rejected;
4. antibody remediation cannot bypass A5 Action Passport + deterministic authorization;
5. Red/Blue exercises are isolated, synthetic/sanitized, no credentials, no external targets, no Production writes;
6. Red/Blue results remain `SIMULATION`;
7. project-control tests, Quality Gate, Zero-Residue, CleanGuard, and all same-SHA rehearsal gates are GREEN;
8. `main` and Production remain untouched.

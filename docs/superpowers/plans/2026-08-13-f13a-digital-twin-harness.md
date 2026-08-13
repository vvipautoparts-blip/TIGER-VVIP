# F13A Digital Twin Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a deterministic, memory-bounded planning and actor-generation core for the FUSION Digital Twin gates: 4,000,000 unique reproducible actors and 4,000,000 simultaneous active virtual users.

**Architecture:** Do not materialize four million actor objects in memory. A pure CommonJS module derives each actor deterministically from `(seed, index)` and emits a shard execution plan that covers the required actor range without overlap. This phase creates planning/replay primitives only; it never claims that the 4M load test has actually run.

**Tech Stack:** Node.js 22, CommonJS, built-in `crypto`, `node:test`.

## Global Constraints
- Exact launch-scale targets are 4,000,000 unique actors and 4,000,000 simultaneous active users.
- Any synthetic actor failure must be reproducible from seed + index.
- Actor fixtures contain no real person/business contact data.
- Planning must be memory-bounded; no array of four million actors.
- `PLANNED` is not `PASS`; only later measured execution evidence can satisfy F13/F16.
- No Production traffic, load test, deployment, or launch claim in F13A.

### Task 1: Deterministic actor generator and scale plan
**Files:** Test `tests/f13a-digital-twin-harness.test.cjs`; create `scripts/digital-twin/f13a-harness.js`.
**Interfaces:** `DIGITAL_TWIN_GATE`, `generateActor(seed,index)`, `buildShardPlan(input)`, `buildPlannedManifest(input)`.
- [ ] Write failing tests for exact 4M targets, deterministic replay, uniqueness, bounded shard planning, complete/non-overlapping coverage, invalid plan rejection, and no unearned PASS/launch claim.
- [ ] Verify RED because the module does not exist.
- [ ] Implement the minimal pure module using hash-derived choices and range metadata only.
- [ ] Verify GREEN with focused `node --test`.

### Task 2: Execution evidence contract
**Files:** Test `tests/f13a-digital-twin-evidence.test.cjs`; create `config/fusion/f13-digital-twin-evidence-schema.json`.
- [ ] Write failing test requiring exact SHA, artifact digest, timestamps, 4M measured counts, failures, replay seeds and explicit result state.
- [ ] Verify RED because the schema does not exist.
- [ ] Add schema with `PLANNED|RUNNING|PASS|FAIL`; F13 PASS alone must keep global launch eligibility false.
- [ ] Verify GREEN.

## Verification
Run `node --test tests/f13a-digital-twin-harness.test.cjs tests/f13a-digital-twin-evidence.test.cjs` and require zero failures. This proves the harness/evidence contract only; it does not prove the actual 4M load run.
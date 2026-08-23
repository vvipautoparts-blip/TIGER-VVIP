# Market Genesis Observability + Exact-Head Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add privacy-minimized Market Genesis operational telemetry and a deterministic exact-head readiness gate without creating a transaction runtime, a legacy fallback, or a deployment side effect.

**Architecture:** Add two small CommonJS authority modules under `scripts/marketplace/`. `market-observability.js` accepts only allowlisted operational/audit event shapes and returns frozen privacy-safe projections plus aggregate counters. `market-readiness-gate.js` consumes an immutable release snapshot and decides whether the exact Market Genesis head is eligible for controlled rollout; it never deploys or mutates Production.

**Tech Stack:** Node.js CommonJS, `node:test`, existing Market Genesis contract primitives and repository GitHub Actions evidence.

**Spec:** `docs/superpowers/specs/2026-08-23-tiger-private-market-genesis-design.md`

## Global Constraints

- `DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.`
- `AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.`
- Raw private intent, direct PII/contact values, reusable contact tokens, message content, private embeddings, secrets, and transaction payloads must never enter Market Genesis telemetry.
- No telemetry event may claim deal completion, product/service payment, delivery completion, settlement, escrow, or ownership transfer.
- Unknown/stale policy, Sector Physics, index/cache projection, or exact-head evidence fails closed for rollout.
- Living Classified Fabric is retired and may never be considered a rollout fallback.
- Sponsored delivery may be suppressed when Pulse proof is unavailable; organic discovery may remain eligible only when the organic path and policy authority are independently valid.
- No `main`, Production, database, payment, deployment, or infrastructure mutation in this plan.

---

### Task 1: Privacy-minimized Market Genesis observability authority

**Files:**
- Create: `tests/private-market-observability.test.cjs`
- Create: `scripts/marketplace/market-observability.js`

**Interfaces:**
- Produces: `createMarketObservabilityAuthority(options)`.
- Method: `record(input)` -> frozen `{ ok, event }` or frozen fail-closed denial.
- Method: `snapshotMetrics()` -> frozen aggregate counters only.

- [ ] **Step 1: Write the failing test**

Create `tests/private-market-observability.test.cjs` using `node:test` and `node:assert/strict`.

Required assertions:

```js
const { createMarketObservabilityAuthority } = require('../scripts/marketplace/market-observability.js');

const telemetry = createMarketObservabilityAuthority({ now: () => '2026-08-23T13:10:00.000Z' });
const compiled = telemetry.record({
  event_type: 'market_genesis.compiled',
  request_id: 'req_001',
  generation_id: 'gen_001',
  sector_id: 'automotive',
  policy_version: 'policy-2026-08',
  physics_version: '1.0.0',
  compiler_version: 'market-genesis-1',
  placement_class: 'ORGANIC',
  candidate_count: 12,
  result_count: 4,
  latency_ms: 18,
});
assert.equal(compiled.ok, true);
assert.equal(Object.isFrozen(compiled.event), true);
assert.equal(compiled.event.event_type, 'market_genesis.compiled');
assert.equal(compiled.event.occurred_at, '2026-08-23T13:10:00.000Z');

for (const forbidden of ['raw_intent', 'intent_text', 'email', 'phone', 'message_body', 'checkout', 'order', 'payment_intent']) {
  const denied = telemetry.record({ event_type: 'market_genesis.compiled', request_id: 'req_002', [forbidden]: 'x' });
  assert.equal(denied.ok, false, `${forbidden} must fail closed`);
  assert.ok(denied.reason_codes.includes('OBSERVABILITY_PRIVATE_OR_TRANSACTION_FIELD_FORBIDDEN'));
}

const vehicleReject = telemetry.record({
  event_type: 'automotive.whole_vehicle_rejected',
  request_id: 'req_003',
  ad_id: 'ad_vehicle',
  sector_id: 'automotive',
  policy_version: 'policy-2026-08',
  physics_version: '1.0.0',
  reason_codes: ['WHOLE_VEHICLE_FORBIDDEN'],
});
assert.equal(vehicleReject.ok, true);

const transactionClaim = telemetry.record({ event_type: 'marketplace.transaction_completed', request_id: 'req_004' });
assert.equal(transactionClaim.ok, false);
assert.ok(transactionClaim.reason_codes.includes('OBSERVABILITY_EVENT_TYPE_FORBIDDEN'));

const metrics = telemetry.snapshotMetrics();
assert.equal(Object.isFrozen(metrics), true);
assert.equal(metrics.events_by_type['market_genesis.compiled'], 1);
assert.equal(metrics.events_by_type['automotive.whole_vehicle_rejected'], 1);
assert.equal(metrics.whole_vehicle_rejections, 1);
```

Also cover:
- supported event types include `market_genesis.requested`, `market_genesis.compiled`, `market_genesis.policy_denied`, `ad_genome.created`, `ad_genome.validated`, `ad_genome.published`, `ad_genome.rejected`, `ad_genome.expired`, `sector_physics.activated`, `contact.requested`, `contact.authorized`, `handoff.emitted`, `automotive.whole_vehicle_rejected`;
- non-allowlisted fields fail closed instead of being silently logged;
- nested private/transaction fields fail closed;
- metrics expose counts/latency aggregates only and never opaque IDs or payload content;
- `handoff.emitted` increments handoff count but cannot contain message or deal state.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/private-market-observability.test.cjs`

Expected: FAIL because `scripts/marketplace/market-observability.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/marketplace/market-observability.js` with:

```js
function createMarketObservabilityAuthority(options = {}) {
  // server time provider, strict event allowlist, strict field allowlist,
  // recursive forbidden-field scan, immutable event projection,
  // aggregate counters and latency totals only.
  return Object.freeze({ record, snapshotMetrics });
}
```

Implementation rules:
- strict allowlist of the event types listed in Step 1;
- reject transaction/deal/payment/delivery event names even when fields look safe;
- reuse the transaction field vocabulary from `FORBIDDEN_TRANSACTION_FIELDS` and extend it with raw intent, direct PII, message/group/conversation, contact-token, private embedding, credential/secret names;
- every accepted event gets authoritative `occurred_at` from the injected server clock;
- allow only scalar operational references, reason-code arrays, counts, booleans, placement class, and latency; no arbitrary nested metadata object;
- freeze accepted event and result;
- aggregate only event counts, policy-denial count, whole-vehicle rejection count, handoff count, total recorded latency, and latency sample count;
- `snapshotMetrics()` must clone/freeze counters so callers cannot mutate internal state.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/private-market-observability.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(market): add privacy-safe observability authority`

---

### Task 2: Deterministic exact-head compatibility/readiness gate

**Files:**
- Create: `tests/private-market-readiness-gate.test.cjs`
- Create: `scripts/marketplace/market-readiness-gate.js`

**Interfaces:**
- Produces: `evaluateMarketGenesisReadiness(snapshot, options)` -> frozen verdict.
- The verdict contains only readiness state and reason codes; it performs no deployment.

- [ ] **Step 1: Write the failing test**

Create `tests/private-market-readiness-gate.test.cjs` with a valid snapshot like:

```js
const { evaluateMarketGenesisReadiness } = require('../scripts/marketplace/market-readiness-gate.js');

const requiredWorkflows = [
  'VVIP Quality Gate',
  'TIGER CleanGuard',
  'Project Control Integrity',
  'Zero-Residue Full History',
];

function validSnapshot(overrides = {}) {
  return {
    expected_head_sha: '881ef74eca17245c96316ddf301f1501fb73b0db',
    observed_head_sha: '881ef74eca17245c96316ddf301f1501fb73b0db',
    workflows: requiredWorkflows.map((name) => ({ name, status: 'completed', conclusion: 'success' })),
    authority: {
      market_genesis_active: true,
      living_classified_fabric_active: false,
      transaction_capabilities_enabled: false,
      pulse_ad_billing_authority_preserved: true,
    },
    compatibility: {
      policy_version: 'policy-2026-08',
      active_policy_version: 'policy-2026-08',
      sector_physics_version: '1.0.0',
      active_sector_physics_version: '1.0.0',
      compiler_projection_version: 'genesis-projection-1',
      index_projection_version: 'genesis-projection-1',
      cache_projection_version: 'genesis-projection-1',
      organic_path_verified: true,
      pulse_proof_available: true,
    },
    ...overrides,
  };
}

const ready = evaluateMarketGenesisReadiness(validSnapshot(), { requiredWorkflows });
assert.equal(ready.ready, true);
assert.equal(ready.state, 'ROLLOUT_ELIGIBLE');
assert.equal(Object.isFrozen(ready), true);
```

Required denial assertions:
- exact head mismatch -> `EXACT_HEAD_MISMATCH`;
- missing/non-success workflow -> `REQUIRED_WORKFLOW_NOT_GREEN`;
- stale policy -> `POLICY_VERSION_MISMATCH`;
- stale Sector Physics -> `SECTOR_PHYSICS_VERSION_MISMATCH`;
- index or cache projection mismatch -> `PROJECTION_VERSION_MISMATCH`;
- Market Genesis authority inactive -> `MARKET_GENESIS_AUTHORITY_INACTIVE`;
- Living Classified Fabric active -> `RETIRED_FALLBACK_ACTIVE`;
- transaction capabilities enabled -> `TRANSACTION_BOUNDARY_VIOLATION`;
- Pulse advertising authority not preserved -> `PULSE_AUTHORITY_NOT_PRESERVED`;
- Pulse proof unavailable with verified organic path returns ready with `sponsored_mode: 'SUPPRESSED'` and `organic_mode: 'ELIGIBLE'`;
- Pulse proof unavailable without verified organic path fails closed with `NO_SAFE_DISCOVERY_PATH`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/private-market-readiness-gate.test.cjs`
Expected: FAIL because `scripts/marketplace/market-readiness-gate.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/marketplace/market-readiness-gate.js`.

Rules:
- validate the snapshot shape and required workflows;
- compare exact head strings;
- require every named workflow to be `completed/success`;
- require current/active policy and Sector Physics versions to match;
- require compiler/index/cache projection versions to be identical;
- reject any active retired fallback or transaction capability;
- require Market Genesis authority active and Pulse advertising ownership preserved;
- when Pulse proof is missing, suppress sponsored mode rather than failing organic discovery if `organic_path_verified === true`;
- never return a deployment command, environment mutation, payment state, or transaction state;
- return a frozen object with `{ ready, state, reason_codes, organic_mode, sponsored_mode }` only.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/private-market-readiness-gate.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(market): add exact-head readiness gate`

---

### Task 3: Final exact-head verification and governance sync

**Files:**
- Modify: `docs/superpowers/plans/2026-08-23-market-genesis-contact-handoff.md`
- Modify: `docs/superpowers/plans/2026-08-23-market-genesis-observability-readiness.md`
- Modify PR #323 body.

**Interfaces:**
- Consumes: final implementation HEAD and GitHub workflow conclusions.
- Produces: auditable repository/PR state consistent with actual runtime work.

- [ ] **Step 1: Verify focused Market Genesis test matrix**

Run through the repository Quality Gate for the exact final HEAD; it must execute `tests/private-market-*.test.cjs` with no failures.

- [ ] **Step 2: Verify required workflows for exact final HEAD**

Required: `VVIP Quality Gate`, `TIGER CleanGuard`, `Project Control Integrity`, `Zero-Residue Full History` = `completed/success` for the exact final SHA.

- [ ] **Step 3: Verify PR isolation**

Confirm PR #323 remains open/draft/unmerged, base `feat/tiger-one-living-surface-impl-20260818`, and `main`/Production are untouched.

- [ ] **Step 4: Sync governance text**

Update the contact/handoff plan checkboxes only after exact-head evidence confirms its tasks; update this plan checkboxes similarly. Replace the stale PR statement `documentation-only / NOT IMPLEMENTED` with an accurate implementation summary while preserving the no-main/no-production boundary.

- [ ] **Step 5: Re-run exact-head workflows after governance sync**

Do not claim the phase complete until the governance-sync commit itself has fresh GREEN exact-head evidence.

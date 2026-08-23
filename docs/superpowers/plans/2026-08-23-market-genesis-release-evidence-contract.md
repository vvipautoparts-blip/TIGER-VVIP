# Market Genesis Release Evidence Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Market Genesis Contact/Handoff rollout fail closed unless the exact target environment provides bounded, exact-head, exact-migration distributed replay evidence; a source durability Boolean alone must never authorize rollout.

**Architecture:** Add a pure closed-schema release-evidence contract module and make `market-readiness-gate.js` consume it only when Contact/Handoff is enabled. Keep repository/source durability separate from deployed-environment proof, preserve discovery behavior when Contact/Handoff is disabled, and perform no network/database I/O in M10.

**Tech Stack:** Node.js CommonJS, `node:test`, deterministic pure validation, existing GitHub Actions quality/rehearsal workflows.

**Spec:** `docs/superpowers/specs/2026-08-23-market-genesis-release-evidence-contract-design.md`

## Global Constraints

- Preserve **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
- Preserve **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
- `Living Classified Fabric` remains retired with no fallback.
- Supported release environments are exactly `staging` and `production`.
- Reviewed migration SHA-256 is exactly `484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad`.
- Evidence objects and probe objects are closed allowlists; unknown keys are invalid.
- No remote database, Staging, Production, secrets, DNS, payment-provider, or infrastructure mutation in this plan.
- PR #323 remains Draft/Open/Unmerged.

---

### Task 1: RED — prove Boolean-only durability is insufficient

**Files:**
- Create: `tests/private-market-release-evidence-contract.test.cjs`
- Modify: `tests/private-market-premerge-contact-readiness.test.cjs`

**Interfaces:**
- Consumes: existing `evaluateMarketGenesisReadiness(snapshot, options)`.
- Produces: failing expectations that require `release.contact_replay_release_evidence` when Contact/Handoff is enabled.

- [ ] **Step 1: Write failing readiness tests**

Add a helper producing otherwise-green exact-head snapshots and assert that this state is blocked:

```js
const verdict = evaluate(snapshot({
  contact_handoff_enabled: true,
  contact_replay_protection_durable: true,
}));
assert.equal(verdict.ready, false);
assert.ok(verdict.reason_codes.includes('CONTACT_REPLAY_RELEASE_EVIDENCE_MISSING'));
```

Also assert Contact/Handoff disabled does not require release evidence.

- [ ] **Step 2: Write failing contract-module tests**

Create `tests/private-market-release-evidence-contract.test.cjs` requiring:

```js
const {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  REVIEWED_REPLAY_MIGRATION_SHA256,
  validateContactReplayReleaseEvidence,
} = require('../scripts/marketplace/market-release-evidence-contract.js');
```

The tests must require exact constants, exact `staging|production`, exact 40-lowercase-hex release SHA, exact reviewed migration digest, valid ordered ISO timestamps, bounded `probe_run_id`, `runtime_instance_count >= 2`, exact `{attempts:2,successes:1,replay_rejections:1}` probes, and rejection of unknown keys.

- [ ] **Step 3: Run the quality gate and observe intended RED**

Expected: `VVIP Quality Gate` fails because `market-release-evidence-contract.js` does not yet exist and/or Boolean-only readiness still reports eligible. All unrelated workflows should remain unaffected.

- [ ] **Step 4: Commit the RED tests**

Commit message: `test(market): require deployed replay release evidence`

---

### Task 2: GREEN — implement the closed release-evidence contract

**Files:**
- Create: `scripts/marketplace/market-release-evidence-contract.js`
- Test: `tests/private-market-release-evidence-contract.test.cjs`

**Interfaces:**
- Produces constants:
  - `RELEASE_EVIDENCE_SCHEMA_VERSION = 'market-contact-replay-release-evidence-v1'`
  - `REVIEWED_REPLAY_MIGRATION_SHA256 = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad'`
  - `SUPPORTED_RELEASE_ENVIRONMENTS = Object.freeze(['staging', 'production'])`
- Produces `validateContactReplayReleaseEvidence({ release, expectedHeadSha, observedHeadSha })` returning a frozen bounded result:

```js
{ ok: true, reason_code: 'CONTACT_REPLAY_RELEASE_EVIDENCE_VERIFIED' }
```

or one exact failure code from the spec.

- [ ] **Step 1: Implement strict shape primitives**

Use `isPlainObject`, exact-key comparison, lowercase hex regexes `/^[0-9a-f]{40}$/` and `/^[0-9a-f]{64}$/`, strict integer checks, and ISO timestamps that round-trip through `Date.parse` to finite epoch values.

- [ ] **Step 2: Implement closed allowlists**

Require release keys exactly:

```js
['target_environment', 'contact_replay_release_evidence']
```

Evidence keys exactly:

```js
[
  'schema_version', 'environment', 'release_sha', 'migration_sha256',
  'migration_applied', 'migration_applied_at', 'probe_completed_at',
  'probe_run_id', 'runtime_instance_count', 'duplicate_nonce_probe',
  'duplicate_consume_probe'
]
```

Probe keys exactly `['attempts', 'successes', 'replay_rejections']`.

- [ ] **Step 3: Implement deterministic failure ordering**

Return bounded reason codes in this precedence: missing → invalid shape/schema/value → environment mismatch → release SHA mismatch → migration digest mismatch → migration not applied → runtime count insufficient → nonce probe failed → consume probe failed. Chronologically impossible timestamps collapse to `CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID`.

- [ ] **Step 4: Verify focused tests GREEN**

Expected: contract tests pass without network/database I/O.

- [ ] **Step 5: Commit**

Commit message: `feat(market): add replay release evidence contract`

---

### Task 3: GREEN — integrate evidence into Market Genesis readiness

**Files:**
- Modify: `scripts/marketplace/market-readiness-gate.js`
- Modify: `tests/private-market-premerge-contact-readiness.test.cjs`

**Interfaces:**
- Consumes `validateContactReplayReleaseEvidence({ release, expectedHeadSha, observedHeadSha })`.
- Preserves `evaluateMarketGenesisReadiness(snapshot, options)` return shape.

- [ ] **Step 1: Import the contract validator**

Add:

```js
const {
  validateContactReplayReleaseEvidence,
} = require('./market-release-evidence-contract.js');
```

- [ ] **Step 2: Keep source durability as a separate prerequisite**

Retain the existing check:

```js
if (authority.contact_handoff_enabled === true && authority.contact_replay_protection_durable !== true) {
  pushUnique(reasonCodes, 'CONTACT_REPLAY_PROTECTION_NOT_DURABLE');
}
```

- [ ] **Step 3: Require deployed evidence only when Contact/Handoff is enabled**

Invoke the validator with:

```js
const releaseEvidence = validateContactReplayReleaseEvidence({
  release: snapshot.release,
  expectedHeadSha: snapshot.expected_head_sha,
  observedHeadSha: snapshot.observed_head_sha,
});
```

If `releaseEvidence.ok !== true`, add its single bounded `reason_code` to readiness reasons.

- [ ] **Step 4: Update positive fixture**

The passing Contact/Handoff readiness fixture must include valid release evidence matching its exact synthetic SHA and the reviewed migration digest. Boolean-only fixtures must remain blocked.

- [ ] **Step 5: Verify Quality Gate GREEN**

Expected: all M10 tests and existing Market Genesis tests pass; no whole-vehicle/no-transaction/privacy/Pulse regressions.

- [ ] **Step 6: Commit**

Commit message: `feat(market): gate contact rollout on deployed replay proof`

---

### Task 4: Documentation truth and exact-head verification

**Files:**
- Modify: `docs/owner-control/TIGER_PRIVATE_MARKET_GENESIS_2026_CURRENT_OWNER_AUTHORITY.md`
- Modify: PR #323 body

**Interfaces:**
- Documentation must describe M0–M10 source truth without claiming remote deployment.

- [ ] **Step 1: Update owner implementation truth**

State that M0–M10 are source-implemented only after code verification, and explicitly distinguish `SOURCE_DURABLE` from `DEPLOYED_DURABLE_VERIFIED`.

- [ ] **Step 2: Update PR #323**

Add M10 files, contract semantics, exact final SHA, exact workflow run IDs, and repeat that no Staging/Production migration or distributed deployed probe was executed.

- [ ] **Step 3: Run final exact-head verification**

Require all triggered workflows on one final SHA to complete successfully, including at minimum:

```text
VVIP Quality Gate
TIGER CleanGuard
Project Control Integrity
Zero-Residue Full History
TIGER Social DB Rehearsal
LC04 Production Legacy RPC Rehearsal
LC05 Credential Surface Isolation Rehearsal
LC06 RLS Performance Hardening Rehearsal
```

- [ ] **Step 4: Review branch diff**

Confirm no migration bytes changed, no Production/Staging/remote DB mutation occurred, no Living Classified Fabric runtime/fallback was added, and no transaction capability was introduced.

- [ ] **Step 5: Leave PR Draft/Open/Unmerged**

Do not merge, mark ready, deploy, or apply the migration remotely.

# TSTO M14 Trust Nervous System and Continuous Revocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a source-only Trust Nervous System that accepts only authenticated, fresh, scope-bound, monotonic signals and derives provenance-protected capability-scoped revocation state for SCAE.

**Architecture:** Add two focused modules: `trust-signals.cjs` owns signal validation, trusted adapter admission, freshness and trusted signal provenance; `revocation-state.cjs` owns exact-scope binding, monotonic sequence resolution and trusted revocation-state provenance. Modify SCAE to consume the original trusted M14 revocation-state object instead of accepting shape-only `trusted_signals` input. Preserve all M12/M13 contracts and immutable Market Genesis laws.

**Tech Stack:** CommonJS Node.js, built-in `node:test`, `node:assert/strict`, existing TSTO canonical SHA-256 helpers and contracts.

**Spec:** `docs/superpowers/specs/2026-08-24-tsto-m14-trust-nervous-system-continuous-revocation-design.md`

## Global Constraints

- Source-only implementation on Draft PR #323 branch `feat/tiger-private-market-genesis-20260823`.
- Do not merge `main`, deploy Production/Staging, mutate remote DB, DNS, secrets, payment provider, or enable Contact/Handoff.
- Signal lifetime maximum is exactly `5 * 60 * 1000` ms.
- Caller payload never supplies trusted current time, provenance, required scope, or monotonic authority.
- Shape validation never grants trusted provenance.
- Exact closed object keys; all-zero security SHA-256 digests fail closed.
- Revocation is capability-scoped; one revoked scope must not become platform-wide revocation.
- Existing M12 Trust Pulse V1 and M13 Trust Pulse V2 semantics remain unchanged.
- Whole-vehicle prohibition and transaction-authority prohibition remain stronger than otherwise perfect trust evidence.
- Completion truth after exact-head GREEN may state only `TRUST_NERVOUS_SYSTEM_CONTINUOUS_REVOCATION_SOURCE_VERIFIED`.

---

### Task 1: Trusted Signal Contract and Adapter

**Files:**
- Create: `scripts/trust/trust-signals.cjs`
- Create: `tests/tsto-m14-trust-signals.test.cjs`

**Interfaces:**
- Produces: `TRUST_SIGNAL_SCHEMA`, `TRUST_SIGNAL_CLASS`, `MAX_TRUST_SIGNAL_LIFETIME_MS`, `createTrustedSignalAdapter({ authenticate, clock })`, `validateTrustSignal(value, { nowMs })`, `digestTrustSignal(value, { nowMs })`, `isTrustedTrustSignal(value)`.
- `createTrustedSignalAdapter(...).admit(candidate)` authenticates externally, reads trusted time from adapter-owned `clock()`, validates and freezes the normalized signal, then grants process-local provenance.

- [ ] **Step 1: Write failing signal-contract tests**

Create tests using `node:test` that require the module and assert:

```js
const {
  TRUST_SIGNAL_SCHEMA,
  MAX_TRUST_SIGNAL_LIFETIME_MS,
  createTrustedSignalAdapter,
  validateTrustSignal,
  digestTrustSignal,
  isTrustedTrustSignal,
} = require('../scripts/trust/trust-signals.cjs');
```

Cover exact closed keys, immutable validated output, digestability, five-minute maximum lifetime, future/expired/overlong rejection, all-zero digest rejection, failed authentication, shape validation not granting provenance, copied/spread signal losing provenance, and adapter-owned clock semantics.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/tsto-m14-trust-signals.test.cjs
```

Expected: FAIL because `../scripts/trust/trust-signals.cjs` does not exist.

- [ ] **Step 3: Implement minimal signal module**

Implement the exact closed schema:

```js
{
  schema: 'TIGER_TRUST_SIGNAL_V1',
  signal_class: 'AUTHENTICATED_TRUST_SIGNAL',
  status: 'PASS' | 'REVOKED',
  signal_type: <bounded string>,
  subject_ref_sha256: <non-zero sha256>,
  resource_ref_sha256: <non-zero sha256>,
  action_profile_ref_sha256: <non-zero sha256>,
  country_ref_sha256: <non-zero sha256>,
  release_dna_sha256: <non-zero sha256>,
  issuer_ref_sha256: <non-zero sha256>,
  sequence: <safe integer >= 0>,
  issued_at_ms: <safe integer >= 0>,
  fresh_until_ms: <safe integer >= 0>,
  evidence_sha256: <non-zero sha256>,
  state: 'PASS'
}
```

Use a module-local `WeakSet` for provenance. `validateTrustSignal` validates/freeze only and never marks trusted. The adapter calls `authenticate(candidate)`; null/false authentication throws `TRUST_SIGNAL_ISSUER_UNTRUSTED`. Adapter current time comes only from `clock()`; invalid clock output throws `TRUST_SIGNAL_TIME_INVALID`. Freshness errors use `TRUST_SIGNAL_STALE` for expired and `TRUST_SIGNAL_FRESHNESS_INVALID` for future/overlong windows. Structural failures use `TRUST_SIGNAL_INVALID`.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --test tests/tsto-m14-trust-signals.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add scripts/trust/trust-signals.cjs tests/tsto-m14-trust-signals.test.cjs
git commit -m "feat(tsto): add trusted M14 signal contract"
```

---

### Task 2: Monotonic Revocation State Resolver

**Files:**
- Create: `scripts/trust/revocation-state.cjs`
- Create: `tests/tsto-m14-revocation-state.test.cjs`

**Interfaces:**
- Consumes: trusted signals from `trust-signals.cjs`.
- Produces: `REVOCATION_STATE_SCHEMA`, `createRevocationStateResolver({ clock })`, `validateRevocationState(value, { nowMs })`, `digestRevocationState(value, { nowMs })`, `isTrustedRevocationState(value)`.
- Resolver method: `observe({ signal, expectedScope })` where `expectedScope` has exact digest keys `subject_ref_sha256`, `resource_ref_sha256`, `action_profile_ref_sha256`, `country_ref_sha256`, `release_dna_sha256`.

- [ ] **Step 1: Write failing resolver tests**

Cover: merely shape-valid signal cannot mint state; exact scope match is required; trusted clock controls state freshness; higher sequence supersedes lower sequence; older/equal rollback is blocked; identical same-sequence duplicate is idempotent; conflicting same-sequence canonical digest throws `TRUST_SIGNAL_SEQUENCE_CONFLICT`; older PASS cannot erase newer REVOKED; copied revocation state loses provenance; output omits raw subject/resource/country/private values.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/tsto-m14-revocation-state.test.cjs
```

Expected: FAIL because `../scripts/trust/revocation-state.cjs` does not exist.

- [ ] **Step 3: Implement minimal resolver**

Canonical scope digest is SHA-256 over exact ordered scope digest fields. State schema:

```js
{
  schema: 'TIGER_REVOCATION_STATE_V1',
  signal_digest_sha256,
  scope_digest_sha256,
  issuer_ref_sha256,
  release_dna_sha256,
  sequence,
  effective_status: 'PASS' | 'REVOKED',
  issued_at_ms,
  fresh_until_ms,
  state: 'PASS'
}
```

Maintain resolver-local `Map` keyed by canonical `issuer_ref_sha256 + scope_digest_sha256`; never claim cross-instance durability. Store only the accepted canonical signal digest and sequence/status metadata required for deterministic ordering. Use a module-local `WeakSet` for state provenance. Scope mismatch throws `TRUST_SIGNAL_SCOPE_MISMATCH`; non-provenance signal throws `TRUST_SIGNAL_UNTRUSTED`; stale signal/state throws `TRUST_SIGNAL_STALE`; sequence rollback throws `TRUST_SIGNAL_SEQUENCE_ROLLBACK`.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --test tests/tsto-m14-trust-signals.test.cjs tests/tsto-m14-revocation-state.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add scripts/trust/revocation-state.cjs tests/tsto-m14-revocation-state.test.cjs
git commit -m "feat(tsto): add monotonic revocation resolver"
```

---

### Task 3: Provenance-Enforced SCAE Integration

**Files:**
- Modify: `scripts/trust/scae.cjs`
- Create: `tests/tsto-m14-scae-revocation.test.cjs`

**Interfaces:**
- Replace trusted-context key `trusted_signals` with `revocation_state` for M14 source behavior.
- Consume `isTrustedRevocationState` and `validateRevocationState` from `revocation-state.cjs`.
- Derive expected signal scope from the current decision using SHA-256 references of request subject/resource/profile/country plus the already-validated Trust DNA digest.

- [ ] **Step 1: Write failing SCAE M14 tests**

Construct existing valid M12/M13 decision fixtures and prove:

```text
missing revocation state => TRUST_SIGNAL_MISSING
shape-valid copied state => TRUST_SIGNAL_UNTRUSTED
stale state => TRUST_SIGNAL_STALE
scope/release mismatch => TRUST_SIGNAL_SCOPE_MISMATCH
trusted REVOKED => TRUST_SIGNAL_REVOKED
trusted PASS satisfies only signal requirement
```

Also prove valid trusted PASS does not bypass missing proof geometry, whole-vehicle prohibition, transaction-authority prohibition, epoch mismatch, stale Pulse, or invalid M10/M11-derived deployment facts.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/tsto-m14-scae-revocation.test.cjs
```

Expected: FAIL because SCAE still expects the pre-M14 shape-only `trusted_signals` path.

- [ ] **Step 3: Implement minimal SCAE integration**

Change trusted context closed keys to include `revocation_state` instead of `trusted_signals`. After Trust DNA/epochs/Pulse validation and before final ALLOW, require the original trusted revocation-state object, validate it against trusted `now_ms`, derive the exact expected scope digest from canonical hashed request fields + Trust DNA digest, compare state scope/release, and append one of the M14 reason codes. Do not modify M12/M13 Pulse validation or Market Genesis hard-law checks.

- [ ] **Step 4: Verify GREEN plus prior M12/M13 regression**

Run:

```bash
node --test tests/tsto-m12-*.test.cjs tests/tsto-m13-*.test.cjs tests/tsto-m14-trust-signals.test.cjs tests/tsto-m14-revocation-state.test.cjs tests/tsto-m14-scae-revocation.test.cjs
```

Expected: PASS. If legacy M12/M13 SCAE fixtures require migration to the new mandatory trusted context field, update only the fixtures so their original semantics remain identical; do not weaken assertions.

- [ ] **Step 5: Commit Task 3**

```bash
git add scripts/trust/scae.cjs tests/tsto-m12-*.test.cjs tests/tsto-m13-*.test.cjs tests/tsto-m14-scae-revocation.test.cjs
git commit -m "feat(tsto): enforce continuous revocation in SCAE"
```

---

### Task 4: Acceptance Boundaries, Authority Docs, and Exact-Head Verification

**Files:**
- Create: `tests/tsto-m14-acceptance-boundaries.test.cjs`
- Modify: `docs/owner-control/TIGER_TSTO_2026_CURRENT_OWNER_AUTHORITY.md`
- Modify: `docs/superpowers/specs/2026-08-24-tsto-m14-trust-nervous-system-continuous-revocation-design.md`
- Update PR #323 body only after exact-head evidence is GREEN.

**Interfaces:**
- Acceptance tests exercise only public M14 module interfaces and SCAE behavior.
- Documentation must distinguish `SOURCE_IMPLEMENTED` from real runtime/Production integration.

- [ ] **Step 1: Write failing acceptance-boundary tests before final doc/source changes**

Prove all 24 acceptance requirements from the M14 design, including no raw `nonce`, `password`, `credential`, `private_key`, `database_url`, raw subject/resource, precise location, network/cloud/remote DB dependency, or Production mutation requirement.

- [ ] **Step 2: Verify RED where a remaining acceptance behavior is intentionally missing**

Run:

```bash
node --test tests/tsto-m14-acceptance-boundaries.test.cjs
```

Expected: at least one targeted FAIL for the final missing acceptance behavior; if every behavior is already covered by Tasks 1-3, make this test suite assert the aggregate source boundary and verify it passes without changing production code.

- [ ] **Step 3: Complete only the minimal missing behavior, then update authority/design status**

When all source tests are GREEN, change design status to `OWNER APPROVED / SOURCE IMPLEMENTED / EXACT-HEAD VERIFICATION REQUIRED`. Update owner authority to record M14 as source-implemented while retaining explicit non-claims. Do not embed a self-referential final commit SHA in source docs.

- [ ] **Step 4: Run focused and full source tests**

Run:

```bash
node --test tests/tsto-m12-*.test.cjs tests/tsto-m13-*.test.cjs tests/tsto-m14-*.test.cjs
```

Then rely on PR-triggered GitHub Actions for the repository Quality Gate and the existing same-SHA integrity/rehearsal workflows. All required current workflows must complete successfully on the exact final head before claiming M14 source verification.

- [ ] **Step 5: Commit final M14 source/docs**

```bash
git add tests/tsto-m14-acceptance-boundaries.test.cjs docs/owner-control/TIGER_TSTO_2026_CURRENT_OWNER_AUTHORITY.md docs/superpowers/specs/2026-08-24-tsto-m14-trust-nervous-system-continuous-revocation-design.md
git commit -m "docs(tsto): mark M14 source implemented"
```

- [ ] **Step 6: Verify exact-head evidence and update PR truth**

Fetch the current PR head SHA and all same-SHA workflow conclusions. Only if required workflows are `completed/success`, update PR #323 with:

```text
M0–M14 SOURCE IMPLEMENTED
M14 EXACT-HEAD VERIFIED
TRUST_NERVOUS_SYSTEM_CONTINUOUS_REVOCATION_SOURCE_VERIFIED
DRAFT OPEN UNMERGED
NOT DEPLOYED TO PRODUCTION
```

Never claim `PRODUCTION_CONTINUOUS_REVOCATION_ACTIVE`, `CAEP_CONFORMANT`, `SSF_CONFORMANT`, `CONTACT_HANDOFF_ENABLED`, `PRODUCTION_READY`, or distributed durable signal delivery from this source-only milestone.

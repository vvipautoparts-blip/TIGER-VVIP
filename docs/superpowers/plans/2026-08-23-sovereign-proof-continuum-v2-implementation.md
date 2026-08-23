# TIGER Sovereign Proof Continuum v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a selective privileged execution continuum in which HIGH/CRITICAL actions require convergent server-side proof and a single-use persistent lease while the browser never holds portable execution authority.

**Architecture:** Preserve the Unified Authorization Runtime Bridge as the sole TIGER authorization authority. Add a canonical Action Intent, server-owned proof/risk policy, provider-capability-aware reverification adapter, continuous revocation/risk ratchet, intent-bound lease extension, isolated confirmation surface, release-proof verifier and atomic execution core. Optional 2026 mechanisms such as DBSC/DPoP/message signatures remain capability hooks until independently evidenced.

**Tech Stack:** Plain JavaScript/CommonJS contracts, static HTML/JS for the privileged confirmation surface, Supabase/PostgreSQL forward source migrations, existing Clerk federated identity boundary, existing authorization/audit modules, Node `node:test`, repository Quality Gate/CleanGuard/Project Control/Zero-Residue CI.

**Spec:** `docs/superpowers/specs/2026-08-23-sovereign-action-chamber-design.md`

## Global Constraints

- `BROWSER_PORTABLE_EXECUTION_AUTHORITY=false`.
- `PROOF_ENVELOPE_IS_PORTABLE_AUTHORITY=false`.
- `PERSISTENT_GRANT = PERMISSION AUTHORITY`; no parallel permission engine or grant store.
- `SINGLE_USE_PERSISTENT_LEASE = EXECUTION AUTHORITY` for protected mutations.
- Database/server time is authoritative for security expiry and replay decisions.
- Client-provided risk tier, proof status, scope digest, release trust, session trust or reverification trust is never authoritative.
- AI/risk may raise the security bar or deny; it may never grant capability, expand scope or lower baseline requirements.
- Provider capabilities must be explicitly verified; Passkey/WebAuthn privileged reverification must never be assumed.
- DBSC/DPoP/mTLS/message-signature hooks remain optional fail-safe capabilities until real support is evidenced.
- Normal Social / ONE FIELD / discovery fast paths remain unchanged.
- No first-party TIGER password/passkey credential store.
- No Production/Staging mutation, remote database apply or merge within this plan unless separately authorized after source-level verification.
- CONTACT -> HANDOFF commercial boundary remains unchanged.

---

### Task 1: Sovereign Action Intent Canonical Contract

**Files:**
- Create: `scripts/security/sovereign-action-intent.js`
- Test: `tests/sovereign-action-intent.test.cjs`

**Interfaces:**
- Produces: `canonicalizeActionIntent(input)` -> deeply frozen canonical object.
- Produces: `digestActionIntent(canonicalIntent)` -> lowercase SHA-256 hex.
- Produces: `buildActionIntent(input)` -> `{ intent, intent_digest, execution_authority:false }`.

- [ ] **Step 1: Write the failing tests** proving deterministic key ordering, normalized bounded scope, server-owned `risk_tier`, rejection of client digest/proof/authority fields, rejection of wildcard/platform resource scope, no prototype-pollution keys, and `execution_authority:false`.
- [ ] **Step 2: Run** `node --test tests/sovereign-action-intent.test.cjs` and verify RED because the module does not exist.
- [ ] **Step 3: Implement minimal canonicalization** using stable recursive object-key ordering, explicit allowlists, SHA-256 and deep freeze; do not import browser state or grant authority.
- [ ] **Step 4: Re-run focused test** and then repository gates.
- [ ] **Step 5: Commit** `feat(security): add canonical sovereign action intent`.

### Task 2: Server-Owned Risk Tier and Mandatory Proof Policy

**Files:**
- Create: `scripts/security/sovereign-proof-policy.js`
- Test: `tests/sovereign-proof-policy.test.cjs`

**Interfaces:**
- Consumes: canonical action name/context from Task 1.
- Produces: `resolveBaselineRisk(action)` -> `LOW|MEDIUM|HIGH|CRITICAL`.
- Produces: `resolveRequiredProofClasses({ action, risk_signals })` -> frozen ordered proof-class list.
- Produces: `applyRiskRatchet({ baseline_tier, risk_signals })` -> effective tier never lower than baseline.

- [ ] Test that browser/client risk labels are ignored.
- [ ] Test that risk signals can retain/raise tier or deny but never reduce below baseline.
- [ ] Test that AI-shaped signals cannot add capabilities or scope.
- [ ] Implement deterministic allowlisted policy table and monotonic tier comparison.
- [ ] Verify focused tests + exact-SHA gates.

### Task 3: Privileged BFF Request Boundary Contract

**Files:**
- Create: `scripts/security/privileged-bff-boundary.js`
- Test: `tests/privileged-bff-boundary.test.cjs`

**Interfaces:**
- Produces: `validatePrivilegedRequest(request, policy)` -> safe normalized request or opaque fail-closed reason.

- [ ] RED tests require POST for mutation, exact allowed origin, HTTPS/forwarded-proto policy, allowlisted content type, Fetch Metadata checks when present, CSRF double-binding contract for cookie continuation, bounded body size and no credentials in URL/query.
- [ ] Tests require fail closed for missing/contradictory origin/session evidence and ensure diagnostics do not echo tokens.
- [ ] Implement pure boundary validator only; no provider-specific network calls yet.
- [ ] Verify focused tests + exact-SHA gates.

### Task 4: Persistent Action Intent Authority

**Files:**
- Create: `supabase/migrations/20260823060000_sovereign_action_intents.sql`
- Test: `tests/sovereign-action-intent-migration.test.cjs`

**Interfaces:**
- Produces DB tables/events/functions for create/read/finalize/expire intent state.
- Service-role-only mutation surface; browser roles cannot write privileged intent authority.

- [ ] RED migration tests require database `statement_timestamp()`, immutable canonical fields/digest, short expiry, state transition guard, unique nonce/correlation protections, RLS enabled/forced, browser mutation denial and no caller `p_now`.
- [ ] Implement forward source migration only; no remote apply.
- [ ] Verify exact-byte/security scanners without weakening them.
- [ ] Run gates.

### Task 5: Federated Reverification Capability and Intent Binding

**Files:**
- Create: `scripts/security/federated-reverification-adapter.js`
- Test: `tests/federated-reverification-adapter.test.cjs`

**Interfaces:**
- Produces: `createReverificationAdapter({ verifyProviderEvidence, getProviderCapabilities })`.
- Produces bounded result `{ ok, reason_code, method_class, evidence_ref, freshness_seconds }`.

- [ ] RED tests require explicit capability discovery before accepting a method.
- [ ] Test that `passkey/webauthn` cannot be claimed unless provider capability says the exact privileged reverification flow supports it.
- [ ] Test intent-digest/principal/challenge/freshness binding and replay denial delegated to persistent/provider authority.
- [ ] Unknown provider reason codes map to bounded denial.
- [ ] Implement no first-party credential storage and no raw provider token exposure.
- [ ] Verify gates.

### Task 6: Continuous Session/Revocation Adapter and Monotonic Risk Ratchet

**Files:**
- Create: `scripts/security/continuous-trust-adapter.js`
- Test: `tests/continuous-trust-adapter.test.cjs`

**Interfaces:**
- Consumes bounded provider/security event inputs.
- Produces normalized trust events: `SESSION_ACTIVE`, `SESSION_REVOKED`, `ACCOUNT_DISABLED`, `CREDENTIAL_CHANGED`, `RISK_ELEVATED`, `DEVICE_BINDING_LOST`, `UNKNOWN`.

- [ ] Test that revocation/disable events force deny.
- [ ] Test elevated risk can raise proof requirements.
- [ ] Test absence of optional signal source is `UNKNOWN`, never positive trust.
- [ ] Test signals never grant capabilities or lower risk tier.
- [ ] Implement bounded adapter with no raw behavioral profile persistence.
- [ ] Verify gates.

### Task 7: Persistent Grant Re-resolution Proof Bridge

**Files:**
- Modify: `scripts/security/authorization-runtime-bridge.js`
- Create: `scripts/security/sovereign-proof-evaluator.js`
- Test: `tests/sovereign-proof-grant-bridge.test.cjs`

**Interfaces:**
- Reuse existing persistent grant resolver/lease authority.
- Produces: `evaluatePreExecutionProofs(input)` with `proof_decision` and bounded reason codes; never returns raw grants.

- [ ] RED tests prove stale presentation snapshot cannot satisfy proof.
- [ ] Require persistent grant re-resolution for principal/action/scope/policy/authority version.
- [ ] Reject client scope digest, role label and client capability arrays.
- [ ] Implement proof evaluator as composition layer, not a new permission engine.
- [ ] Verify gates.

### Task 8: Intent-Bound Non-Portable Execution Lease

**Files:**
- Create: `supabase/migrations/20260823061000_sovereign_intent_bound_execution_lease.sql`
- Modify focused JS bridge only if required.
- Test: `tests/sovereign-intent-bound-lease.test.cjs`

**Interfaces:**
- Extends existing sensitive lease authority with `intent_digest` and required proof/reference binding.

- [ ] RED tests require exact intent digest/principal/action/scope/policy binding, DB time, single-use consume, grant/session revocation recheck and no lease secret returned to browser-shaped result.
- [ ] Serialize issuance/consume against revocation and intent finalization.
- [ ] Preserve existing lease authority; no parallel lease table unless a forward schema extension is technically impossible and separately justified.
- [ ] Implement source migration and adapter changes.
- [ ] Verify gates.

### Task 9: Privileged Security Island

**Files:**
- Create: `privileged-action-confirmation.html`
- Create: `scripts/security/privileged-confirmation.js`
- Create: `styles/tiger-security/privileged-confirmation.css`
- Test: `tests/privileged-security-island.test.cjs`

**Interfaces:**
- Consumes safe confirmation projection only.
- Produces user confirmation referencing opaque intent reference; never a lease/grant/token.

- [ ] RED tests deny ads, analytics, marketplace scripts, arbitrary third-party origins and inline executable script.
- [ ] Require CSP/Trusted-Types target policy, frame denial, restrictive form/referrer/navigation policy and no secrets in URL.
- [ ] Require deterministic human-readable action/target/scope/expiry rendering.
- [ ] Implement minimal bilingual/RTL-compatible static page using existing design tokens where safe.
- [ ] Verify gates and static smoke tests.

### Task 10: Release / Supply-Chain Proof Contract

**Files:**
- Create: `scripts/security/release-proof-verifier.js`
- Test: `tests/release-proof-verifier.test.cjs`

**Interfaces:**
- Produces `verifyReleaseProof(input, policy)` -> bounded evidence decision.

- [ ] RED tests require exact source SHA/artifact digest/builder or workflow identity fields when policy demands them.
- [ ] Test that release evidence can deny but never grant TIGER capability.
- [ ] Test unsupported attestation mechanisms remain `UNAVAILABLE`, never silently trusted.
- [ ] Implement verifier around supplied verified attestation metadata; do not fabricate SLSA/Sigstore evidence.
- [ ] Verify gates.

### Task 11: Atomic Protected-Action Executor and Audit Finalization

**Files:**
- Create: `supabase/migrations/20260823062000_sovereign_proof_atomic_executor.sql`
- Modify/reuse: existing authorization audit adapter.
- Test: `tests/sovereign-proof-atomic-executor.test.cjs`

**Interfaces:**
- Database function executes one protected mutation class through a registered handler/contract after proof convergence.

- [ ] RED tests enforce lock/re-resolve grant + intent + required proof + lease before mutation.
- [ ] Require mutation, lease consume, intent finalize and mandatory audit state in one transaction where DB-local.
- [ ] Verify rollback on any failure and no half-success result.
- [ ] Reuse existing audit chain and recursive secret rejection.
- [ ] Implement forward source migration only.
- [ ] Verify gates.

### Task 12: Optional Sender / Device / Workload Proof Hooks

**Files:**
- Create: `scripts/security/optional-proof-capabilities.js`
- Test: `tests/optional-proof-capabilities.test.cjs`

**Interfaces:**
- Normalizes capability states for `DPOP`, `MTLS`, `DBSC`, `HTTP_MESSAGE_SIGNATURES` as `SUPPORTED_VERIFIED|UNSUPPORTED|UNAVAILABLE|FAILED`.

- [ ] RED tests prohibit `SUPPORTED_VERIFIED` without an explicit verifier/evidence port.
- [ ] Test optional proof may increase confidence or become mandatory by explicit server policy, but absence never grants equivalent assurance.
- [ ] Test optional proof never replaces persistent grant/lease.
- [ ] Implement capability hook only; no fake provider integration.
- [ ] Verify gates.

### Task 13: Full Sovereign Proof Envelope Integration and Threat-Model Evidence

**Files:**
- Create: `tests/sovereign-proof-continuum-integration.test.cjs`
- Create: `docs/architecture/SOVEREIGN_PROOF_CONTINUUM_V2_EVIDENCE_2026-08-23.md`
- Update: PR #322 body after exact-head evidence.

**Interfaces:**
- Joins Tasks 1–12 into one source-level execution proof path.

- [ ] Integration test covers: canonical intent, risk ratchet, BFF boundary, persistent intent, reverification capability discovery, revocation signals, grant re-resolution, intent-bound lease, secure island, release proof, atomic execution, audit secrecy and optional-proof unsupported states.
- [ ] Add explicit adversarial regressions for replay, stale snapshot, scope substitution, client risk downgrade, fake Passkey claim, session revocation, release drift, lease replay, TOCTOU, cross-process reuse and secret leakage.
- [ ] Run focused integration test.
- [ ] Run full exact-SHA VVIP Quality Gate, TIGER CleanGuard, Project Control Integrity and Zero-Residue Full History.
- [ ] Record exact SHA/run IDs and explicit non-claims: no remote migration apply, no Production/Staging deployment, no provider dashboard activation, no unsupported optional proof claim.
- [ ] Keep PR Draft/unmerged until a separate integration/deployment decision.

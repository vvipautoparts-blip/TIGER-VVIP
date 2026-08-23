# Unified Authorization Runtime Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect persisted authorization authority to sensitive UI/actions through short-lived presentation snapshots and exact-bound single-use leases, while making Owner-Sealed Disclosure replay-safe across processes.

**Architecture:** Extend the existing sensitive grant/event/lease authority rather than creating a second permission engine. The server/database boundary resolves current authority; the browser receives only a short-lived presentation projection. Every sensitive mutation re-resolves authority and consumes an exact-bound lease atomically, and owner-sealed disclosure gains persistent request/lease state backed by database time and one-time owner step-up consumption.

**Tech Stack:** Node.js CommonJS contract tests, PostgreSQL/Supabase source-only forward migrations, existing profile controller/HTML, GitHub Actions repository gates.

**Spec:** `docs/superpowers/specs/2026-08-23-unified-authorization-runtime-bridge-design.md`

## Global Constraints

- Preserve `CONTACT -> HANDOFF` as terminal for TIGER's commercial role.
- Do not create a parallel permission engine.
- Role labels, DOM state, client clocks, local storage, and client-supplied capabilities are never authorization authority.
- Browser roles receive no direct mutation authority over sensitive authorization tables.
- Database/server time is authoritative for security windows.
- UI snapshots are presentation-only and never accepted as mutation proof.
- Sensitive actions require exact-bound single-use leases.
- Owner-sealed disclosure requires persistent atomic cross-process replay protection.
- All database artifacts remain source-only; no remote `db push`, Production/Staging mutation, or merge is authorized by this plan.
- Every task follows RED -> GREEN and ends with exact-SHA repository-gate evidence.

---

### Task 1: Capability Snapshot Contract

**Files:**
- Create: `tests/authorization-runtime-bridge.test.cjs`
- Create: `scripts/security/authorization-runtime-bridge.js`

**Interfaces:**
- Consumes: canonical sensitive grants shaped by `scripts/security/sensitive-permission-contract.js`.
- Produces: `buildCapabilitySnapshot(input)` returning an immutable presentation-only snapshot and `resolveEffectiveCapabilities(input)` returning the server-resolved capability set.

- [ ] **Step 1: Write the failing tests**

Tests must prove:

```js
assert.equal(snapshot.execution_authority, false);
assert.equal(snapshot.ttl_seconds <= 60, true);
assert.equal(snapshot.principal, 'member:viewer');
assert.deepEqual(snapshot.visible_capabilities, ['VIEW_PERMISSION_STATE']);
assert.deepEqual(snapshot.management_capabilities, []);
```

and must reject/ignore caller-supplied `viewer_capabilities`, role labels, caller time, wildcard scope, revoked grants, expired grants, wrong-principal grants, and scope mismatches.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/authorization-runtime-bridge.test.cjs`
Expected: FAIL with `MODULE_NOT_FOUND` for `scripts/security/authorization-runtime-bridge.js`.

- [ ] **Step 3: Implement the minimal pure resolver**

`buildCapabilitySnapshot(input)` accepts only server-established values:

```js
{
  authenticated_principal,
  target_id,
  surface,
  requested_scope,
  grants,
  policy_version,
  authority_version,
  server_now,
  snapshot_ttl_seconds
}
```

It validates `snapshot_ttl_seconds` in `1..60`, uses `server_now` only, resolves active grants by exact principal/action/scope, returns no raw grant objects, sets `execution_authority: false`, and deep-freezes the result.

- [ ] **Step 4: Run focused test and repository gates**

Run: `node --test tests/authorization-runtime-bridge.test.cjs`
Expected: PASS.
Then verify VVIP Quality Gate, TIGER CleanGuard, Project Control Integrity, and Zero-Residue Full History on the exact head SHA.

- [ ] **Step 5: Commit**

Commit message: `feat(authz): add presentation-only capability snapshots`

---

### Task 2: Database Capability Resolver Authority

**Files:**
- Create: `tests/authorization-runtime-bridge-migration.test.cjs`
- Create: `supabase/migrations/20260823050000_authorization_runtime_bridge.sql`

**Interfaces:**
- Consumes: `sensitive_permission_grants`, `sensitive_permission_grant_events`, server-time helpers and scope-subset helpers already present in forward migrations.
- Produces: service-role-only `resolve_authorization_snapshot(...)` RPC returning minimal rows needed to build a UI snapshot.

- [ ] **Step 1: Write RED migration tests**

Require the migration to:

```text
- derive time from statement_timestamp()
- derive caller principal from a server-supplied authenticated-principal parameter accepted only by a service-role RPC boundary
- filter revoked/expired/not-yet-active grants
- enforce target/resource/sector/entity/geo subset checks
- return capability ids and projected scope only
- never return audit evidence, delegability ceiling, nonce hashes, or raw owner-step-up data
- revoke execute from public/anon/authenticated
- grant execute only to service_role
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/authorization-runtime-bridge-migration.test.cjs`
Expected: FAIL because migration does not exist.

- [ ] **Step 3: Implement source-only forward migration**

Create a `SECURITY DEFINER` RPC with safe `search_path`, database time, fail-closed input validation, and read-only resolution semantics. Do not add direct browser table policies or remote apply commands.

- [ ] **Step 4: Verify GREEN + Steel Shield + full gates**

Run focused test then exact-SHA repository gates.

- [ ] **Step 5: Commit**

Commit message: `feat(authz): add database capability snapshot resolver`

---

### Task 3: Permissions View-Model Consumes Server Snapshot

**Files:**
- Create: `tests/permissions-control-server-snapshot.test.cjs`
- Modify: `scripts/social/permissions-control.js`

**Interfaces:**
- Consumes: immutable snapshot from `buildCapabilitySnapshot` / server endpoint projection.
- Produces: `buildPermissionsControlModel({ snapshot, target_id })` with no caller-supplied role/capability/grant authority.

- [ ] **Step 1: Write RED compatibility/security tests**

Prove that supplying `viewer_capabilities`, `target_grants`, role names, or a client `now` cannot widen the model; expired snapshot fails closed; self-view remains read-only unless server snapshot explicitly provides management authority.

- [ ] **Step 2: Verify RED**

Expected failure: current module still accepts caller-provided capabilities/grants/time.

- [ ] **Step 3: Adapt the module minimally**

Remove authorization decisions from caller arrays. Render only `snapshot.visible_capabilities`, `snapshot.management_capabilities`, projected statuses/scopes, and snapshot expiry metadata. Keep `integration.dom_ready = false`.

- [ ] **Step 4: Verify GREEN + full gates**

- [ ] **Step 5: Commit**

Commit message: `refactor(profile): consume server authorization snapshot`

---

### Task 4: Profile More-Menu Integration

**Files:**
- Create: `tests/profile-permissions-runtime-integration.test.cjs`
- Modify: `scripts/profile/pr39-profile-controller.js`
- Modify: `public-profile-p05.html`

**Interfaces:**
- Consumes: an injected/fetched server snapshot for the authenticated viewer and current profile subject.
- Produces: a live permissions surface under the existing `data-pr39-menu-trigger` menu; no new parallel menu.

- [ ] **Step 1: Write RED integration tests**

Test no snapshot -> permission control omitted/disabled; view-only snapshot -> read-only state; manage snapshot -> controls visible; expired snapshot -> refresh/fail-closed; no role-name fallback.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Wire existing profile controller/menu**

Use the existing viewer identity and `?subject=` target identity. Introduce one snapshot loader boundary in the controller, map the response through `permissions-control.js`, and set `dom_ready = true` only when an authoritative snapshot is present and valid.

- [ ] **Step 4: Verify GREEN + full gates**

- [ ] **Step 5: Commit**

Commit message: `feat(profile): wire authoritative permission projection`

---

### Task 5: Persistent Owner-Sealed Disclosure Authority

**Files:**
- Create: `tests/owner-sealed-disclosure-runtime-migration.test.cjs`
- Create: `supabase/migrations/20260823051000_owner_sealed_disclosure_runtime.sql`

**Interfaces:**
- Consumes: existing owner step-up persistence and server-time authority.
- Produces: append-only disclosure requests/events plus single-use disclosure leases and service-role-only RPCs.

- [ ] **Step 1: Write RED migration tests**

Require exact binding of request id, requester, artifact id, classification, artifact scope digest, purpose, nonce digest, challenge digest, owner authorization id when required, status, audit evidence, and database timestamps.

Require unique/idempotent issuance, immutable bindings, explicit terminal states, RLS enabled+forced, browser mutation denied, server time, and atomic owner-step-up consumption when issuing `CONFIDENTIAL`/`OWNER_ONLY` leases.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement forward migration**

Implement service-role-only `issue_disclosure_lease(...)` and `consume_disclosure_lease(...)`. Issue must lock and consume the exact owner step-up authorization in the same transaction for owner-sealed classes; consume must `FOR UPDATE`, verify bindings/current grant/policy where applicable, transition exactly once, and never expose raw approval secrets.

- [ ] **Step 4: Verify GREEN + full gates**

- [ ] **Step 5: Commit**

Commit message: `feat(disclosure): add persistent atomic disclosure leases`

---

### Task 6: Disclosure Runtime Adapter

**Files:**
- Create: `tests/disclosure-runtime-bridge.test.cjs`
- Create: `scripts/security/disclosure-runtime-bridge.js`
- Modify: `scripts/security/owner-sealed-disclosure.js`

**Interfaces:**
- Consumes: persistent disclosure RPC results.
- Produces: deterministic request validation and response mapping without claiming in-memory state as authority.

- [ ] **Step 1: Write RED tests**

Prove that an already-consumed persistent lease cannot be resurrected by replaying an old JavaScript `ISSUED` object; one owner authorization cannot approve two different disclosure requests; database reason codes map fail-closed; raw OTP/password/approval-code fields are rejected before persistence.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement adapter**

Keep existing pure validation helpers, but change authoritative consume/issue flows to require persistent authority responses. Do not maintain a second state machine in JavaScript.

- [ ] **Step 4: Verify GREEN + full gates**

- [ ] **Step 5: Commit**

Commit message: `refactor(disclosure): bind model to persistent authority`

---

### Task 7: Sensitive Action Lease Bridge and Revocation Race

**Files:**
- Create: `tests/authorization-action-lease-bridge.test.cjs`
- Modify: `scripts/security/authorization-runtime-bridge.js`
- Extend source migration through a new forward hardening migration only if the existing lease RPC cannot atomically combine protected action + consume.

**Interfaces:**
- Consumes: current persisted grant authority and canonical verified scope.
- Produces: `requestSensitiveActionLease(input)` and `consumeSensitiveActionLease(input)` server-boundary contracts.

- [ ] **Step 1: Write RED tests**

Test stale snapshot + revoked grant -> mutation denied; two concurrent consume attempts -> exactly one success; principal/action/scope/nonce/policy mismatch -> deny; client-generated scope digest -> ignored/rejected; lease TTL never exceeds grant expiry or 60 seconds.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement minimal bridge**

Use the database-issued lease and database-derived scope digest. Protected state change and consume must share one atomic server/database operation when they modify database state.

- [ ] **Step 4: Verify GREEN + full gates**

- [ ] **Step 5: Commit**

Commit message: `feat(authz): add exact-bound sensitive action bridge`

---

### Task 8: Structured Authorization Audit

**Files:**
- Create: `tests/authorization-runtime-audit.test.cjs`
- Modify/create only the smallest server/database audit adapter required by Tasks 5-7.

**Interfaces:**
- Consumes: correlation id, actor, target, action, decision, reason, authority refs, scope digest, policy version, environment/release binding.
- Produces: secret-safe structured audit events.

- [ ] **Step 1: Write RED secret-exclusion tests**

Reject or redact keys matching raw OTP, password, authorization header/token, reusable approval code, raw prompt, or secret material.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement minimal audit adapter**

Reuse existing audit-chain infrastructure where possible; do not create a second audit ledger.

- [ ] **Step 4: Verify GREEN + full gates**

- [ ] **Step 5: Commit**

Commit message: `feat(authz): add secret-safe authorization audit linkage`

---

### Task 9: Full Integration and Residual Non-Claims

**Files:**
- Create: `tests/unified-authorization-runtime-bridge-integration.test.cjs`
- Create: `docs/architecture/UNIFIED_AUTHORIZATION_RUNTIME_BRIDGE_EVIDENCE_2026-08-23.md`

**Interfaces:**
- Consumes: outputs of Tasks 1-8.
- Produces: exact-SHA evidence that the complete source integration satisfies the approved spec.

- [ ] **Step 1: Write integration tests**

Cover profile projection, mutation lease issuance/consume, revocation race, disclosure one-time approval, cross-process replay model, database-time authority, browser privilege denial, and audit secret exclusion.

- [ ] **Step 2: Run integration + all repository gates**

Required exact-SHA SUCCESS:

```text
VVIP Quality Gate
TIGER CleanGuard
Project Control Integrity
Zero-Residue Full History
```

- [ ] **Step 3: Write evidence document**

State only source-level claims proven by the branch. Explicitly retain non-claims: no remote migration apply, no Production/Staging deployment, no merge, no native mobile adapter activation, no payment-provider/legal readiness claim.

- [ ] **Step 4: Final self-review**

Search for role-authority fallbacks, caller time, direct browser sensitive mutations, parallel permission/disclosure state engines, stale `dom_ready: false` contradictions, raw secret audit paths, and `TODO/TBD` placeholders.

- [ ] **Step 5: Keep PR Draft**

Do not merge or mark ready-for-review solely because source integration is GREEN; later integration/merge remains an explicit owner decision.

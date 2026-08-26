# TIGER AION ∞ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TIGER AION ∞ the single fail-closed owner authority for post-launch autonomous operations, then implement the program in independently verifiable stages without touching main or Production until explicitly authorized.

**Architecture:** AION is an authority-governed prospective operating fabric. The authority graph and machine contract first establish one CURRENT_ONLY post-launch authority; later stages add telemetry proof graphs, recovery/metabolism, twin swarms, synthetic society, bounded agents, immune memory, jurisdiction policy, and progressive remediation. VERITY remains the evidence foundation and AION never gains unrestricted production authority.

**Tech Stack:** GitHub Actions, Node.js, JSON governance contracts, Markdown authority/specs, OpenTelemetry, PostgreSQL/Supabase, eBPF where measured, SLSA/Sigstore/GitHub attestations, policy-as-code, optional WASI/WebAssembly sandboxing.

**Spec:** `docs/superpowers/specs/2026-08-25-tiger-aion-prospective-living-digital-organism-design.md`

## Global Constraints

- Owner mode is `CURRENT_ONLY`.
- Canonical post-launch authority is `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`.
- No AEGIS, ORACLE, or legacy post-launch model may become fallback/current authority.
- No change in this plan authorizes main merge, Production deploy, real-money movement, Production database mutation, secret rotation, or branch-protection bypass.
- `L6 UNRESTRICTED_PRODUCTION_MUTATION = FORBIDDEN`.
- `NO_PROVENANCE_NO_PRODUCTION` is fail-closed.
- High-risk/destructive action requires verified rollback/recovery and applicable human authority.
- Every stage uses exact-head evidence and cannot inherit GREEN from an older SHA.

---

### Task 1: Establish AION Owner Authority

**Files:**
- Create: `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`
- Create: `docs/superpowers/specs/2026-08-25-tiger-aion-prospective-living-digital-organism-design.md`
- Modify: `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`

**Interfaces:**
- Produces: canonical owner decision path for the `post-launch-autonomy` domain.
- Consumes: existing CURRENT_ONLY governance rule and VERITY exact-evidence model.

- [ ] **Step 1: Write authority coverage test**

Create `project-control/tests/aion_owner_authority.test.mjs` with assertions that the owner entrypoint references the canonical AION path and that all mandatory AION concepts exist.

- [ ] **Step 2: Run the test before all authority wiring**

Run: `node --test project-control/tests/aion_owner_authority.test.mjs`

Expected: FAIL until registry/machine contract/entrypoint wiring is complete.

- [ ] **Step 3: Wire the owner entrypoint**

Add AION to the current authority order and mark prior AEGIS/ORACLE/post-launch aliases non-authoritative with no fallback.

- [ ] **Step 4: Re-run the focused test**

Run the same node test; expected PASS only after all required files and strings exist.

### Task 2: Enforce AION in Authority Graph

**Files:**
- Modify: `project-control/authority/authority-registry.v1.json`
- Test: `project-control/tests/aion_owner_authority.test.mjs`

**Interfaces:**
- Produces: exactly one CURRENT_ONLY authority for domain `post-launch-autonomy`.
- Consumes: `project-control/scripts/validate_authority_graph.mjs`.

- [ ] **Step 1: Add failing graph assertion**

Assert `currentByDomain['post-launch-autonomy'] === 'authority.post-launch-autonomy.v1'`.

- [ ] **Step 2: Run focused test**

Expected: FAIL before registry record is added.

- [ ] **Step 3: Add registry record**

Record fields:

```json
{
  "authority_id": "authority.post-launch-autonomy.v1",
  "domain": "post-launch-autonomy",
  "version": 1,
  "status": "CURRENT_ONLY",
  "owner_decision_ref": "docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md",
  "canonical_path": "docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md",
  "supersedes": [],
  "protected_boundaries": ["main", "production", "owner-constitution", "unrestricted-agent-mutation"]
}
```

- [ ] **Step 4: Validate graph**

Run: `node project-control/scripts/validate_authority_graph.mjs`

Expected: `AUTHORITY_GRAPH=PASS` and one additional current domain.

### Task 3: Bind AION to Machine Handover Contract

**Files:**
- Modify: `project-control/production-handover/current-authority.v1.json`
- Test: `project-control/tests/aion_owner_authority.test.mjs`

**Interfaces:**
- Produces: machine-readable post-launch contract with AION invariants.

- [ ] **Step 1: Add failing contract assertions**

Test for canonical path, `CURRENT_ONLY`, proof-carrying action, no-provenance-no-production, recovery requirement, and forbidden unrestricted production mutation.

- [ ] **Step 2: Add `post_launch_autonomy` contract object**

Encode the canonical authority, loop, mandatory concepts, retired aliases, autonomy ceiling, and fail-closed invariants.

- [ ] **Step 3: Parse/validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('project-control/production-handover/current-authority.v1.json','utf8')); console.log('JSON=PASS')"`

Expected: `JSON=PASS`.

### Task 4: Ensure CI Executes AION Governance Tests

**Files:**
- Modify: `.github/workflows/project-control-integrity.yml`
- Test: `project-control/tests/aion_owner_authority.test.mjs`

**Interfaces:**
- Produces: remote CI enforcement on every relevant governance change.

- [ ] **Step 1: Update test command**

Use:

```bash
node --test project-control/tests/*.test.mjs
```

- [ ] **Step 2: Include owner-control paths in workflow trigger**

Add `docs/owner-control/**` under pull_request paths.

- [ ] **Step 3: Run tests locally/in isolated checkout when available**

Expected: all project-control tests PASS.

### Task 5: A1 Sensory Proof Graph

**Files:**
- Create future focused spec before implementation: `docs/superpowers/specs/2026-08-25-tiger-aion-a1-sensory-proof-graph-design.md`
- Add implementation only after RED tests and authority review.

**Interfaces:**
- Produces normalized telemetry envelopes and correlation graph.

- [ ] **Step 1:** Inventory current telemetry, database metrics, release evidence, user experience signals, and cost/business signals.
- [ ] **Step 2:** Define vendor-neutral OpenTelemetry semantic conventions and sensitivity classes.
- [ ] **Step 3:** Write RED tests for correlation integrity and stale-evidence rejection.
- [ ] **Step 4:** Implement collector/adapters without coupling product identity to one backend.
- [ ] **Step 5:** Verify overhead budgets before enabling eBPF/zero-code telemetry broadly.

### Task 6: A2 Recovery & Digital Metabolism

**Files:**
- Create focused design and implementation artifacts in a later verified slice.

- [ ] **Step 1:** Define RTO/RPO and restore evidence schema.
- [ ] **Step 2:** Implement isolated Always-Recovering Twin rehearsal.
- [ ] **Step 3:** Build lifecycle registry for code/data/cache/token/artifact/config assets.
- [ ] **Step 4:** Implement entropy score without giving it deletion authority.
- [ ] **Step 5:** Implement `Detect → Prove → Dependency Check → Quarantine → Observe → Delete → Verify → Seal` with destructive-operation gates.

### Task 7: A3 Twin Swarm Foundation

- [ ] Build Release, Performance, Database, and Security Twin foundations first.
- [ ] Use sanitized/synthetic data by default.
- [ ] Add counterfactual replay and strict write isolation from Production.
- [ ] Add scenario freshness, assumptions, model version, and expiry.

### Task 8: A4 Synthetic Society & Fraud Futures

- [ ] Define synthetic personas without impersonating real people.
- [ ] Add normal, constrained-device, abusive, spam, fraud, and coordinated behavior journeys.
- [ ] Gate releases on Technical + Security + Human + Economic + Legal + Social outcomes.

### Task 9: A5 Agentic Dual Brain

- [ ] Define capabilities and separation-of-duties matrix.
- [ ] Add WASI/WebAssembly or equivalent sandbox pilot for suitable agent tools.
- [ ] Implement Action Passport schema and deterministic authorization engine.
- [ ] Implement adaptive autonomy levels L0-L5; hard-deny L6.
- [ ] Add agent behavior monitoring and runaway cost/loop containment.

### Task 10: A6 Immune Memory

- [ ] Define Digital Antibody schema.
- [ ] Convert confirmed incidents into expiring/versioned antibodies.
- [ ] Add Red/Blue isolated cyber-range exercises.
- [ ] Require normal proof gates before any antibody-triggered remediation.

### Task 11: A7 Jurisdiction Genome

- [ ] Define jurisdiction policy schema with source, effective date, approver, tests, migration, rollback.
- [ ] Enforce human legal approval before machine policy becomes active.
- [ ] Build Jurisdiction Twin tests for advertising, privacy, data, identity, and payment boundaries as applicable.

### Task 12: A8 Progressive Bounded Remediation

- [ ] Implement Shadow → Canary → Cohorts → Full promotion state machine.
- [ ] Add baseline comparisons for error rate, p95/p99, DB saturation, security, business, user harm, and cost.
- [ ] Auto-abort/rollback only for preauthorized reversible actions with verified recovery paths.

### Task 13: A9 Crypto Genome & High-Security Cells

- [ ] Build cryptographic inventory and rotation/migration metadata.
- [ ] Track standardized PQC readiness without premature production claim.
- [ ] Pilot confidential/attested execution cells only where threat model justifies operational complexity.

### Task 14: Final A0 Verification

- [ ] Run `node --test project-control/tests/*.test.mjs`.
- [ ] Run `node project-control/scripts/validate_authority_graph.mjs`.
- [ ] Run `bash scripts/quality-gate.sh` or the repository's exact isolated Quality Gate procedure.
- [ ] Confirm secret scan findings = 0 for the exact new head.
- [ ] Confirm no main/Production mutation.
- [ ] Read remote `VVIP Quality Gate` and `TIGER Social DB Rehearsal` on the exact published head before calling A0 `VERIFIED`.

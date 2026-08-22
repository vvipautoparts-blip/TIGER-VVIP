# Final Release Closure Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining repository-controlled launch work on one forward-only convergence line without reviving legacy brokerage, stale documentation authority, dead UI, fake success, or unverifiable Production claims.

**Architecture:** Start from exact convergence SHA `1f69f70fe5b1ea0ed23a44ab36529de9b9b61c18`. Use strict RED→GREEN contracts for every code/governance behavior, preserve historical evidence only behind explicit tombstones, and make Staging/Production/legal/device gates fail closed whenever real external evidence is absent. Do not merge divergent legacy branches wholesale; selectively port only independently validated authority/evidence changes.

**Tech Stack:** Node.js 22 `node:test`, Python 3.12, GitHub Actions, Supabase/RLS rehearsal tooling, deterministic public-release tooling, CycloneDX 1.6, GitHub artifact attestations/provenance.

**Spec:** GitHub Issue #312 (Private Discovery Rendezvous), GitHub Issue #243 (Global Launch Control), and `docs/superpowers/specs/2026-08-22-tiger-one-field-living-discovery-design.md`.

## Global Constraints

- External commerce invariant: `DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS`.
- `ACTIVE BROKERAGE PATHS = 0` and `ACTIVE EXTERNAL TRANSACTION COMMISSION = 0`.
- Platform-owned finance is limited to advertising/ad credits/packages/approved platform services and their own accounting/refund/tax/provider obligations.
- Paid delivery never changes organic relevance/fit.
- Preserve all existing sectors and non-conflicting platform capabilities; sector additions remain additive.
- No `main`, Production, Staging, provider-secret, remote-Supabase, or legal-state mutation may be inferred from CI.
- No launch PASS may be claimed without actual same-SHA evidence.
- No dead control, fake success, placeholder-as-real feature, stale source-of-truth pointer, or duplicate authority is permitted in release-visible surfaces.

---

### Task 1: Zero-Brokerage semantic authority closure

**Files:**
- Create: `tests/final-zero-brokerage-authority.test.cjs`
- Create: `docs/architecture/OWNER_AUTHORITY_REGISTRY.md`
- Modify: `DOCUMENTATION-INDEX.md`
- Modify: `docs/payments/TIGERPAY_TP00_CONSTITUTION.md`
- Modify only where tests prove ambiguity: current owner/product-readiness/flow documents discovered by the audit

**Interfaces:**
- Consumes: Issue #312 and existing fail-closed runtime/database controls.
- Produces: one explicit precedence registry and local split-scope declarations in every still-current conflicting document.

- [ ] **Step 1: Write the failing governance test** requiring the registry, current documentation index, local TigerPay split scope, and contact-handoff invariant.
- [ ] **Step 2: Verify RED** on the exact branch head; failure must be caused by missing/stale authority, not test syntax.
- [ ] **Step 3: Add the minimal authority registry and local document corrections**; preserve historical facts rather than deleting audit evidence.
- [ ] **Step 4: Verify focused GREEN and full Quality Gate GREEN** on the new exact SHA.
- [ ] **Step 5: Record exact paths/classifications/dependency impact in Issue #312**.

### Task 2: Documentation and legacy-residue vacuum

**Files:**
- Create or extend: `tests/current-documentation-authority.test.cjs`
- Modify: root/current documentation only where stale runtime, Firebase, password, production-ready, or missing-file pointers are found

**Interfaces:**
- Consumes: Task 1 precedence registry.
- Produces: current docs that cannot redirect engineers/agents toward removed runtime or obsolete release authority.

- [ ] **Step 1: Write RED assertions for every confirmed stale current-document pointer.**
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Replace stale current pointers with canonical runtime/evidence references or explicit historical tombstones.**
- [ ] **Step 4: Verify focused GREEN, CleanGuard, Zero-Residue and Quality Gate.**

### Task 3: Real Staging evidence handoff

**Files:**
- Create: `tests/tsrf-staging-evidence-producer.test.cjs`
- Modify: `.github/workflows/tsrf-staging-evidence.yml`
- Reuse: `scripts/tsrf/evidence/staging-bridge.cjs`

**Interfaces:**
- Consumes: exact `source_sha` and protected `staging` environment identity.
- Produces: a same-job/same-SHA proof producer whose outputs are consumed by the evidence capsule; no phantom `$RUNNER_TEMP` handoff.

- [ ] **Step 1: Write RED contract proving the workflow must create `proof-input.json` and `source-proof.json` before consuming them.**
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement the minimal protected Staging proof-producer step using trusted staging identity/config and no Production credentials.**
- [ ] **Step 4: Verify focused GREEN and full gate.**
- [ ] **Step 5: Dispatch the Staging workflow only when protected environment variables/identity are actually configured; otherwise report `BLOCKED_REAL_STAGING_EVIDENCE` rather than fake PASS.**

### Task 4: User-facing dead-control and fake-success closure

**Files:**
- Create: `tests/final-user-surface-control-integrity.test.cjs`
- Modify only confirmed canonical release HTML/JS/CSS files identified by `tools/vvip_public_release.py` allowlist and runtime entry points.

**Interfaces:**
- Consumes: canonical release file inventory.
- Produces: deterministic checks that interactive release controls have a real navigation/action contract or are absent/disabled with truthful semantics.

- [ ] **Step 1: Inventory release-visible controls and classify each as wired, truthful-disabled, or dead.**
- [ ] **Step 2: Write RED tests for confirmed dead/fake controls only.**
- [ ] **Step 3: Verify RED.**
- [ ] **Step 4: Wire the real action or remove the misleading control; do not add placeholder success.**
- [ ] **Step 5: Verify mobile/desktop/RTL/LTR/accessibility static contracts plus the full gate.**

### Task 5: Immutable Release DNA readiness

**Files:**
- Reuse: `.github/workflows/v14-release-candidate.yml`
- Reuse: `.github/workflows/production-release-artifact.yml`
- Reuse: deterministic public-release/SBOM/provenance tooling
- Create tests only if a same-SHA binding gap is found

**Interfaces:**
- Consumes: final reviewed source SHA after Tasks 1–4.
- Produces: `SOURCE SHA = BUILD = SBOM = SECURITY = DATABASE EVIDENCE = RELEASE ARTIFACT = PROVENANCE` when and only when the SHA is the approved current `main` release SHA.

- [ ] **Step 1: Audit existing release workflows for SHA drift, mutable inputs, missing SBOM/provenance/artifact hash, and rollback identity gaps.**
- [ ] **Step 2: TDD-fix only confirmed gaps.**
- [ ] **Step 3: Do not weaken the current-main preflight to manufacture branch Production evidence.**
- [ ] **Step 4: After authorized merge, build/seal/attest exactly once from the approved current-main SHA and retain artifact identities.**

### Task 6: Reliability, observability, F05, country/legal and launch evidence closure

**Files:**
- Reuse the Issue #243 evidence model, existing F05 workflows/tests, staging/production reconciliation workflows, and operational evidence manifests.
- Add repository contracts only where a real missing fail-closed gate is proven.

**Interfaces:**
- Consumes: real environment/device/legal/provider evidence.
- Produces: PASS only for evidenced controls; otherwise explicit blocker states.

- [ ] **Step 1: Reconcile Issue #243 sections A–J against actual current evidence, not stale checkboxes or prose.**
- [ ] **Step 2: Verify backup/PITR/restore, DR, load/soak/spike, health/readiness, idempotency/retry, capacity ceilings and kill switches using real environment evidence.**
- [ ] **Step 3: Verify SLIs/SLOs, dashboards, probes, alerts, audit sink and escalation using live observability evidence.**
- [ ] **Step 4: Keep iPhone HEIC/Android/desktop/privacy/LGPL/HEVC evidence blocked until real-device/legal proof exists.**
- [ ] **Step 5: Keep every country in `Draft → Legal Approved → Tax Configured → Active`; never activate by code inference.**
- [ ] **Step 6: Final launch authorization requires one immutable SHA, all blocking evidence PASS, Production smoke PASS, rollback proof PASS, and zero P0/P1 blockers.**

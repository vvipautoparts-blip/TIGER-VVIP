# VVIP TIGER Sovereign Launch Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close LC-01 through LC-12 with real, release-bound evidence so VVIP TIGER can reach the canonical `TIGER_SOVEREIGN_READINESS_100` state without bypassing owner, security, staging, recovery, legal/privacy, or production gates.

**Architecture:** Use the existing static HTML/CSS/JS application and TIGER SOVEREIGN control plane. Treat the current AI-18 branch as the protected launch-closure candidate, repair exact-head repository failures first, then collect staging/manual/security/operations evidence against immutable Release DNA before any production promotion. Every mandatory gate fails closed and every release-changing byte invalidates affected evidence.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node.js 22, Python 3.12/pytest, Bash, GitHub Actions, Supabase/PostgreSQL/RLS/Edge Functions, Clerk/Firebase auth surfaces already present, WebAuthn/passkey or phishing-resistant IdP MFA for owner Step-Up.

## Global Constraints

- `main` remains protected.
- No production mutation is implied by a broad instruction such as “finish everything”.
- Merge, database promotion, and production activation remain three separate owner decisions.
- AI remains unable to transfer funds, delete production data autonomously, or change owner authority.
- Browser/client state never constitutes trusted L4 authorization.
- Secrets remain server-side only.
- Any historically exposed real credential must be inventoried and rotated as required.
- Unknown, stale, ambiguous, forged, replayed, cross-scope, or incomplete authority fails closed.
- Repository evidence cannot substitute for staging/production evidence.
- Evidence must be bound to the exact Release DNA being promoted.
- Any release-changing code, migration, policy, prompt, model, tool, or security configuration change invalidates affected evidence and triggers required revalidation.
- No new non-launch-critical feature work is permitted during release closure.
- Static multi-page architecture remains canonical; do not introduce a framework, bundler, or package build step.

---

### Task 1: LC-01 Exact-Head CI Root-Cause Closure

**Files:**
- Modify: `scripts/quality-gate.sh`
- Modify: `scripts/ai/sovereign-master-dossier-renderer.js`
- Create: `tests/quality-gate-shell-contract.test.cjs`
- Modify/Create: AI dossier renderer contract test under `tests/*.test.cjs` using the existing test naming pattern.

**Interfaces:**
- Consumes: GitHub Actions `VVIP Quality Gate`, CodeQL, current AI-18 head.
- Produces: a syntactically valid quality-gate runner and Markdown table-cell escaping that handles backslash, pipe, CR and LF deterministically.

- [ ] **Step 1: Preserve RED evidence for quality-gate syntax**

Run on the exact pre-fix head:

```bash
bash -n scripts/quality-gate.sh
```

Expected: non-zero syntax result caused by the current `diff_check` block construction, matching the failing Quality Gate.

- [ ] **Step 2: Add a shell syntax regression contract**

Create `tests/quality-gate-shell-contract.test.cjs` that executes:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

test('quality gate shell script is syntactically valid', () => {
  const result = spawnSync('bash', ['-n', 'scripts/quality-gate.sh'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
```

Run:

```bash
node --test tests/quality-gate-shell-contract.test.cjs
```

Expected before implementation: FAIL.

- [ ] **Step 3: Fix the `diff_check` invocation without weakening the gate**

Replace the invalid continuation/block construction with a dedicated helper that first ensures `origin/main` exists and then runs:

```bash
git diff --check origin/main...HEAD
```

The helper must return the real command status and must remain wrapped by `run_clean_gate "diff_check"` so worktree-mutation detection remains active.

- [ ] **Step 4: Verify quality-gate shell contract GREEN**

Run:

```bash
bash -n scripts/quality-gate.sh
node --test tests/quality-gate-shell-contract.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Preserve RED evidence for incomplete dossier escaping**

Use a renderer contract with table-cell input containing both `\\` and `|` and assert the emitted Markdown cannot reinterpret the backslash as an incomplete escape.

Run the focused renderer test before implementation and confirm it fails for the exact vulnerable behavior identified by CodeQL.

- [ ] **Step 6: Implement minimal deterministic Markdown cell escaping**

Update `escapeCell(value)` so escaping order is:

```text
backslash -> escaped backslash
pipe      -> escaped pipe
CRLF/LF   -> <br>
```

Do not alter unrelated rendering behavior.

- [ ] **Step 7: Verify focused renderer tests and CodeQL-relevant contract GREEN**

Run the focused dossier renderer contract and then:

```bash
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit Task 1**

```bash
git add scripts/quality-gate.sh scripts/ai/sovereign-master-dossier-renderer.js tests/
git commit -m "fix: close exact-head quality and dossier escaping failures"
```

### Task 2: LC-01 Release Freeze, Dependency and Provenance Baseline

**Files:**
- Modify: `data/ai/sovereign-release-provenance.json`
- Modify: `docs/ai/TIGER_SOVEREIGN_CURRENT_READINESS.md`
- Create: `docs/ai/TIGER_SOVEREIGN_LAUNCH_CANDIDATE_BASELINE.md`
- Test: existing release-provenance/readiness tests under `tests/*.test.cjs`.

**Interfaces:**
- Consumes: AI-01..AI-18 stacked PR metadata and exact current head.
- Produces: one candidate Release DNA, dependency order, superseded-path register, exact CI evidence references.

- [ ] **Step 1: Inventory PR #137, #140-#156 and explicitly mark superseded duplicate PR #157 outside the release chain.**
- [ ] **Step 2: Recompute release provenance from the exact clean checkout and capture candidate digest.**
- [ ] **Step 3: Add baseline documentation that names branch, head SHA, base SHA, dependency order, and no-feature-freeze rule.**
- [ ] **Step 4: Run release-provenance and readiness tests.**

```bash
node --test tests/*release*provenance*.test.cjs tests/*readiness*.test.cjs
```

- [ ] **Step 5: Re-run exact-head repository CI and require Quality Gate, CodeQL, Dependency Review and Project Control Integrity PASS before LC-01 exit.**
- [ ] **Step 6: Commit Task 2.**

```bash
git add data/ai/sovereign-release-provenance.json docs/ai/
git commit -m "docs: freeze sovereign launch candidate baseline"
```

### Task 3: LC-02 Core Platform Automated Closure

**Files:**
- Modify only canonical files when a failing test proves a defect: `index.html`, `auth-clerk-index.js`, `scripts/vvip-pr29-home-marketplace.js`, `private-profile-p03.html`, `scripts/vvip-p03-profile.js`, `reset-password.html`, `reset-password.js`, `sw.js`, `manifest.webmanifest`.
- Test: `tests/pr35/**/*.test.mjs`, `tests/pr36/**/*.test.mjs`, `scripts/listing/listing-contract.test.js`, relevant `tests/*.test.cjs`.

**Interfaces:**
- Consumes: current static app behavior.
- Produces: automated proof for auth/session/profile/listing/search/image/PWA/role contracts.

- [ ] **Step 1: Run the existing automated core suite.**

```bash
node --test tests/pr35/**/*.test.mjs tests/pr36/**/*.test.mjs
node --test scripts/listing/listing-contract.test.js
bash scripts/qa-smoke.sh
```

- [ ] **Step 2: For each failing behavior, write or tighten one focused RED contract before changing canonical code.**
- [ ] **Step 3: Apply the minimal canonical fix, rerun the focused test, then rerun the entire core suite.**
- [ ] **Step 4: Record automated evidence without marking manual browser gates PASS.**
- [ ] **Step 5: Commit each independent core defect separately.**

### Task 4: LC-02 Manual Browser and Real Image Acceptance

**Files:**
- Create: `docs/ai/evidence/LC02_MANUAL_BROWSER_ACCEPTANCE.md`
- Modify: `data/ai/sovereign-readiness-evidence.example.json` only to document the schema if needed; do not convert examples into production evidence.

**Interfaces:**
- Consumes: exact release candidate, real browsers/devices, a real `.jpg` file.
- Produces: release-bound manual evidence for PR36 and critical user journeys.

- [ ] **Step 1: Serve the exact candidate.**

```bash
python -m http.server 800
```

- [ ] **Step 2: Execute registration/login/session/logout/password-reset/profile/search/listing/image-upload/error/offline journeys on supported desktop and mobile browsers.**
- [ ] **Step 3: Upload a real `.jpg`; verify selection, processing, preview/state, and no material console error.**
- [ ] **Step 4: Verify Arabic/English, RTL/LTR, no horizontal overflow, keyboard/focus behavior, and PWA/offline state where supported.**
- [ ] **Step 5: Record browser name/version, device/form factor, timestamp, Release DNA, result and evidence location.**
- [ ] **Step 6: Keep any unexecuted manual check `PENDING`; never synthesize PASS evidence.**

### Task 5: LC-03 Security, Secrets, Authorization and SQL Closure

**Files:**
- Modify when proven necessary: `.gitignore`, `.github/workflows/*.yml`, `scripts/security/p08-steel-shield/*`, Supabase migrations, authorization/security tests.
- Create: `docs/ai/evidence/LC03_SECURITY_CLOSURE.md`.

**Interfaces:**
- Consumes: exact candidate, Git history/config inventory, static scanners, RLS/auth probes.
- Produces: P0/P1=0 evidence and credential remediation record.

- [ ] **Step 1: Run secret scan, CodeQL, dependency review and dangerous-SQL scan.**

```bash
bash scripts/security/p08-steel-shield/scan-secret-leaks.sh
bash scripts/security/p08-steel-shield/scan-dangerous-sql.sh
```

- [ ] **Step 2: Inventory tracked/history/config credentials without printing secret values into logs or documentation.**
- [ ] **Step 3: Rotate any real credential whose exposure cannot be excluded; record credential identifier/type and rotation status, never the secret.**
- [ ] **Step 4: Run authorization-abuse tests proving browser/client cannot forge owner/admin/agent authority.**
- [ ] **Step 5: Require open P0=0 and P1=0 before LC-03 exit.**

### Task 6: LC-04 Staging Database and Trust Fabric

**Files:**
- Existing migrations under `supabase/migrations/`.
- Create: `scripts/ai/staging-trust-fabric-probe.sql` and `docs/ai/evidence/LC04_STAGING_TRUST_FABRIC.md` if not already represented by equivalent files.

**Interfaces:**
- Consumes: isolated non-production Supabase/PostgreSQL staging project.
- Produces: real DB/RLS/replay/concurrency/backup-restore evidence.

- [ ] **Step 1: Apply migrations to isolated Staging only using approved staging credentials.**
- [ ] **Step 2: Execute browser-role denial probes and service-boundary allow probes.**
- [ ] **Step 3: Execute approval expiry/replay/duplicate/concurrent consumption tests.**
- [ ] **Step 4: Execute atomic budget/rate/concurrency race tests.**
- [ ] **Step 5: Create a Staging backup, restore to a clean recovery target, and verify integrity.**
- [ ] **Step 6: Record migration hashes, Staging environment identity, timestamps and results bound to Release DNA.**

### Task 7: LC-05 Live Staging AI Runtime

**Files:**
- Existing `supabase/functions/tiger-sovereign-ai/**` and `scripts/ai/sovereign-*gateway*.js`, evidence adapters, tool registry, kill-switch/runtime scripts.
- Create: `docs/ai/evidence/LC05_STAGING_AI_RUNTIME.md`.

**Interfaces:**
- Consumes: server-only staging identity/provider configuration.
- Produces: live inference/evidence/tool-boundary/circuit-breaker/budget evidence.

- [ ] **Step 1: Configure provider/model credentials server-side in Staging; verify no provider secret appears in browser-visible configuration.**
- [ ] **Step 2: Run live structured-output inference success/failure contracts.**
- [ ] **Step 3: Force timeout/provider outage and verify bounded retry plus circuit breaker.**
- [ ] **Step 4: Verify cost/token/rate/concurrency ceilings and budget exhaustion fail closed.**
- [ ] **Step 5: Verify Evidence Plane freshness/scope projection and reviewed safe tools only.**
- [ ] **Step 6: Verify global/per-agent/provider/tool kill switches work independently of model availability.**

### Task 8: LC-06 Owner Sovereignty and Phishing-Resistant Step-Up

**Files:**
- Existing owner Step-Up core, Supabase consumer, protected executor and migration.
- Create: `docs/ai/evidence/LC06_OWNER_STEPUP.md`.

**Interfaces:**
- Consumes: real owner identity enrolled with WebAuthn/passkey or phishing-resistant IdP MFA in Staging.
- Produces: one-time transaction-bound authorization evidence.

- [ ] **Step 1: Bind the real owner identity to the approved phishing-resistant method in Staging.**
- [ ] **Step 2: Verify valid exact-action Step-Up consumes exactly once.**
- [ ] **Step 3: Verify forged owner, copied JSON, stale login, expiry, replay, duplicate, wrong action, wrong payload, wrong Release DNA, wrong scope/environment, concurrent consumption and revoked credential all fail closed.**
- [ ] **Step 4: Verify audit events contain no raw authenticator secret/material.**
- [ ] **Step 5: Record manual owner Step-Up acceptance against exact Release DNA.**

### Task 9: LC-07 Independent BLACKBOX / Red-Team Closure

**Files:**
- Existing `data/ai/sovereign-eval-catalog.json`, security/eval scripts and threat model.
- Create: `docs/ai/evidence/LC07_BLACKBOX_REDTEAM.md`.

**Interfaces:**
- Consumes: exact Staging release candidate.
- Produces: independent adversarial PASS, P0=0, P1=0, residual-risk register.

- [ ] **Step 1: Execute prompt/authority injection, tool invention, privilege escalation, cross-user/country, secret exfiltration, schema smuggling, poisoned-content, false-execution, cyclic-delegation and audit-tamper probes.**
- [ ] **Step 2: Execute XSS/SSRF probes only on applicable input/network surfaces.**
- [ ] **Step 3: Force provider cascading failure and verify fail-closed behavior.**
- [ ] **Step 4: Fix every accepted P0/P1 finding under TDD and invalidate/recollect affected evidence.**
- [ ] **Step 5: Record final BLACKBOX decision with P0=0 and P1=0.**

### Task 10: LC-08/LC-09 UX, Accessibility, Compatibility, Performance and Reliability

**Files:**
- Canonical UI files only when a proven defect requires modification.
- Create: `docs/ai/evidence/LC08_UX_ACCESSIBILITY.md` and `docs/ai/evidence/LC09_PERFORMANCE_RELIABILITY.md`.

**Interfaces:**
- Consumes: real browser/device matrix and staging load probes.
- Produces: compatibility/accessibility acceptance and p50/p95/p99 reliability evidence.

- [ ] **Step 1: Validate Arabic/English, RTL/LTR, keyboard, focus, contrast, loading/error/empty, responsive, overflow, console and PWA behavior.**
- [ ] **Step 2: Measure page/startup, API, image-upload, database and model latency at p50/p95/p99.**
- [ ] **Step 3: Execute representative concurrency/load/stress tests and bounded recovery tests.**
- [ ] **Step 4: Demonstrate rate-limit and budget-exhaustion behavior without uncontrolled resource growth.**
- [ ] **Step 5: Fix blocking regressions under focused RED/GREEN tests and recollect invalidated evidence.**

### Task 11: LC-10/LC-11 Operations, Recovery, Legal, Privacy and Country Activation

**Files:**
- Existing incident/staging/production runbooks and policy/country configuration files.
- Create: `docs/ai/evidence/LC10_OPERATIONS_RECOVERY.md` and `docs/ai/evidence/LC11_LEGAL_PRIVACY_COUNTRY.md`.

**Interfaces:**
- Consumes: Staging operational environment and current launch-country legal/privacy/tax/residency requirements.
- Produces: executable recovery proof and explicit country activation decision record.

- [ ] **Step 1: Execute backup/restore, application rollback, migration recovery, provider outage, kill-switch, alert-delivery and incident-escalation drills in non-production.**
- [ ] **Step 2: Verify audit-integrity recovery and responsible operator runbook execution.**
- [ ] **Step 3: Review Terms, Privacy, retention/deletion/export, provider/model processing, data residency, currency/tax, consent/disclosure and country activation constraints using current authoritative sources.**
- [ ] **Step 4: Keep country activation blocked for any unresolved mandatory legal/privacy requirement.**

### Task 12: LC-12 Golden Release, Owner Gates and Controlled Production Promotion

**Files:**
- Modify: readiness evidence dataset and current readiness dossier.
- Produce: final Release DNA/Evidence Root/Golden Release Passport using existing TIGER proof tooling.

**Interfaces:**
- Consumes: PASS evidence from LC-01..LC-11 for one exact release.
- Produces: owner-gated production promotion and canonical readiness truth.

- [ ] **Step 1: Build the final evidence-backed Golden Release candidate and verify every mandatory evidence item is real, valid, non-stale and bound to exact Release DNA.**
- [ ] **Step 2: Run the canonical readiness truth engine; before owner gates it must remain blocked.**
- [ ] **Step 3: Request and record separate Owner Merge Approval for the exact reviewed source release.**
- [ ] **Step 4: After merge approval only, perform the approved merge and verify the resulting immutable source identity.**
- [ ] **Step 5: Request and record separate Owner DB Promotion Approval for the exact reviewed production migration payload.**
- [ ] **Step 6: After DB approval only, promote the exact approved migration payload and verify production DB state.**
- [ ] **Step 7: Request and record separate Owner Production Activation Approval for the exact reviewed production artifact/configuration.**
- [ ] **Step 8: After activation approval only, deploy/activate the approved production release.**
- [ ] **Step 9: Run production post-deploy smoke, monitoring/alert verification and backup-state verification.**
- [ ] **Step 10: Re-run the readiness truth engine and accept completion only when it returns exactly:**

```text
productionReady=true
readinessPercent=100
blockedCount=0
status=TIGER_SOVEREIGN_READINESS_100
```

- [ ] **Step 11: If any mandatory gate fails or release bytes change, stop promotion, invalidate affected evidence, issue a new Release DNA and repeat the affected gates.**

## Self-Review Record

- Spec coverage: LC-01 through LC-12 are each mapped to one or more executable tasks above.
- Placeholder scan: no `TBD`, `TODO`, “implement later”, or synthetic PASS instruction is permitted.
- Type/authority consistency: the same Release DNA, evidence truth rules, L4 owner Step-Up boundary and three separate owner gates are used throughout.
- Scope control: no new non-launch-critical feature family or framework migration is included.
- Truth rule: repository/CI evidence is not substituted for manual, staging, legal, operational or production evidence.

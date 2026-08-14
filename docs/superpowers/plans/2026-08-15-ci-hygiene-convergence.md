# CI Hygiene Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge 18 current GitHub Actions workflows into exactly nine durable, runnable production-grade workflows without weakening local Supabase security verification, release controls, or exact-head evidence.

**Architecture:** Keep repository-wide contracts in one canonical Quality Gate, candidate construction in one Release Candidate workflow, local migration/Edge verification in one generic fail-closed Supabase Security Gate, and retain only current security and Production build/promotion controls. Delete stage-specific, stale reconciliation, and non-runnable Staging placeholder workflows while retaining their useful behavior fixtures, evidence libraries, and historical documentation.

**Tech Stack:** GitHub Actions, Bash, Node.js 22, Python 3.12, Deno 2, Supabase CLI 2.109.0, PostgreSQL/psql, Node test runner.

## Global Constraints

- No Production or Staging mutation from Gate 0 CI.
- Never use linked or remote Supabase mutation commands.
- Fail closed if remote Supabase credential environment variables are present in the local database gate.
- Preserve exact source-SHA checkout and verification.
- No secrets added to Git, manifests, tests, logs, or artifacts.
- Keep `PRODUCTION-MAIN-GOVERNANCE`; do not bypass the required human approval.
- Final current workflow tree is the exact nine-path allowlist from the corrected design spec.
- No retained workflow may contain historical feature/integration/reconciliation branch triggers or stale hard-coded release SHAs.

---

### Task 1: Add the RED CI hygiene contract

**Files:**
- Create: `tests/ci-hygiene-convergence.test.cjs`
- Read: `.github/workflows/*.yml`
- Read: `scripts/tsrf/evidence/release-dna.cjs`

- [ ] Assert the exact nine workflow filenames and absence of all superseded executable workflow files.
- [ ] Assert no current workflow contains known historical stage branch names or stale reconciliation SHAs.
- [ ] Assert Quality and Release Candidate exact-source checks.
- [ ] Assert the Supabase gate is local-only, pinned, exact-source, remote-credential fail-closed, uses `supabase db reset --local`, never uses link/db-push/linked flags, covers every Edge `index.ts`, and stops the local stack on all paths.
- [ ] Assert Release DNA contains the exact current security/release control paths and no superseded paths.
- [ ] Preserve RED intent in PR history; local execution is unavailable in the current harness, so GitHub Actions is the executable verification environment.

### Task 2: Converge Quality and Release Candidate

**Files:**
- Create: `.github/workflows/quality-gate.yml`
- Create: `.github/workflows/release-candidate.yml`
- Delete: `.github/workflows/vvip-quality-gate.yml`
- Delete: `.github/workflows/v14-release-candidate.yml`

- [ ] Create `quality-gate.yml` for PRs to `main`, pushes to `main`, and manual dispatch; bind `SOURCE_SHA` to PR head/event SHA, exact checkout, Node 22, Python 3.12, `scripts/quality-gate.sh`, diagnostics artifact.
- [ ] Create `release-candidate.yml` preserving proven exact-source verification, full quality gate, release tests, deterministic candidate build, and exact-SHA evidence upload while removing V14/integration naming.
- [ ] Remove old filenames only in the same converged branch.

### Task 3: Converge current security analysis workflows

**Files:**
- Modify: `.github/workflows/codeql.yml`
- Modify: `.github/workflows/dependency-review.yml`
- Modify: `.github/workflows/tiger-cleanguard.yml`
- Modify: `.github/workflows/project-control-integrity.yml`

- [ ] Remove historical feature/integration branch lists.
- [ ] Use `main` as the durable target and bind source analysis checkout to exact PR head/event SHA where applicable.
- [ ] Preserve least-privilege permissions, immutable action SHAs, scanners, and existing integrity/value-governance behavior.

### Task 4: Build one generic local-only Supabase Security Gate

**Files:**
- Create: `.github/workflows/supabase-security-gate.yml`
- Delete: `.github/workflows/lc03-supabase-security-rehearsal.yml`
- Delete: `.github/workflows/lc04-production-legacy-rpc-rehearsal.yml`
- Delete: `.github/workflows/lc05-credential-surface-isolation-rehearsal.yml`
- Delete: `.github/workflows/lc06-rls-performance-hardening-rehearsal.yml`
- Delete: `.github/workflows/tsrf-phone-otp-rehearsal.yml`
- Delete: `.github/workflows/tsrf-semantic-convergence.yml`
- Delete: `.github/workflows/v14-local-supabase-rehearsal.yml`
- Retain all canonical migrations and SQL behavior fixtures.

- [ ] Add exact-source checkout and clean-worktree verification.
- [ ] Fail closed if `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, or `SUPABASE_PROJECT_REF` is present.
- [ ] Install pinned Supabase CLI `2.109.0`; start isolated local stack and run exactly `supabase db reset --local`.
- [ ] Run retained LC03/LC04/LC05/LC06/OTP SQL behavior fixtures, applying drift fixture + canonical migration only where the convergence fixture requires it.
- [ ] Verify fail-closed AI runtime defaults formerly protected by the semantic-convergence workflow.
- [ ] Install Deno 2 and typecheck every tracked `supabase/functions/*/index.ts` discovered at runtime.
- [ ] Stop Supabase under `if: always()` and re-check exact source/cleanliness.

### Task 5: Remove dead/stale executable evidence workflows

**Files:**
- Delete: `.github/workflows/documentation-sovereign-knowledge-plane.yml`
- Delete: `.github/workflows/tsrf-staging-evidence.yml`
- Delete: `.github/workflows/production-reconciliation-proof.yml`
- Delete/update: workflow-specific tests whose sole executable subject is one of the removed files.
- Retain: Staging evidence libraries and their behavior/security tests.
- Retain: reconciliation reports and historical documentation.

- [ ] Remove the non-runnable Staging placeholder because no current repository producer/download step can provide its `$RUNNER_TEMP/tsrf-staging-proof` handoff.
- [ ] Remove the one-time Production reconciliation workflow because it is bound to an old branch, old main SHA, and dated reports.
- [ ] Remove only tests that assert the existence/internal sequencing of superseded workflows; keep evidence-library, SQL, migration, and fail-closed behavior tests.

### Task 6: Rebind Release DNA and fixtures

**Files:**
- Modify: `scripts/tsrf/evidence/release-dna.cjs`
- Modify: `tests/tsrf-evidence-hardening.test.cjs`
- Modify: `tests/tsrf-launch-evidence-plane.test.cjs`

- [ ] Set Release DNA security paths to the nine current workflow controls plus `scripts/quality-gate.sh`, secret scan, and dangerous-SQL scan.
- [ ] Update test fixtures to the exact same path set.
- [ ] Ensure no superseded workflow path remains in executable Release DNA/test fixtures.

### Task 7: GREEN verification and PR handoff

- [ ] Open the Gate 0 PR against `main` after the converged files are committed.
- [ ] Verify the PR changed-file list contains only intended CI/tests/docs/evidence bindings and no secrets.
- [ ] Require applicable exact-head Quality Gate, Release Candidate, CodeQL, Dependency Review, CleanGuard, Project Control, and Supabase Security Gate success; inspect failed job logs and repair the same branch until green.
- [ ] Confirm current workflow tree equals the nine-file allowlist.
- [ ] Add PR/head/check evidence to #252 and approval queue #253.
- [ ] Stop Gate 0 only at its independent human approval boundary; continue the next independent Global Launch gate without bypassing review.
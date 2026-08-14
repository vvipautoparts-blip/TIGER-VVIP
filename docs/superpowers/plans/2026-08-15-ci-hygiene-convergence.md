# CI Hygiene Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge 18 current GitHub Actions workflows into exactly 10 durable production-grade workflows without weakening local Supabase security verification or exact-head release evidence.

**Architecture:** Keep repository-wide functional/security contracts in one canonical Quality Gate, release construction in one Release Candidate workflow, and all local Supabase migration/Edge verification in one generic fail-closed Supabase Security Gate. Remove stage labels from executable CI, retain behavioral fixtures, and bind the new durable workflow paths into Release DNA.

**Tech Stack:** GitHub Actions, Bash, Node.js 22, Python 3.12, Deno 2, Supabase CLI 2.109.0, PostgreSQL/psql, Node test runner.

## Global Constraints

- No Production or Staging mutation from CI.
- Never use linked Supabase commands.
- Fail closed if remote Supabase credential environment variables are present.
- Preserve exact source-SHA checkout and verification.
- No secrets added to Git, manifests, tests, or artifacts.
- Keep `PRODUCTION-MAIN-GOVERNANCE`; do not bypass the required human approval.
- Final current workflow tree contains exactly the ten paths defined by the design spec.

---

### Task 1: Add the RED CI hygiene contract

**Files:**
- Create: `tests/ci-hygiene-convergence.test.cjs`
- Read: `.github/workflows/*.yml`
- Read: `scripts/tsrf/evidence/release-dna.cjs`

**Interfaces:**
- Consumes: repository filesystem only.
- Produces: a Node test contract that enforces the durable workflow allowlist and fail-closed Supabase/Release-DNA invariants.

- [ ] **Step 1: Write a failing test** that asserts the exact ten workflow filenames, absence of all superseded workflow filenames, absence of historical feature/integration branch triggers in the canonical Quality and Release Candidate workflows, required local-only Supabase markers, pinned Supabase CLI version, `supabase db reset --local`, prohibition of `--linked`, Deno typecheck coverage, and Release-DNA references to only durable workflow paths.
- [ ] **Step 2: Run `node --test tests/ci-hygiene-convergence.test.cjs`** and require FAIL against the 18-workflow baseline.
- [ ] **Step 3: Commit only the RED contract** if using a local execution environment; when using connector atomic commits, preserve the RED intent in the PR description and test history.

### Task 2: Converge Quality and Release Candidate workflows

**Files:**
- Create: `.github/workflows/quality-gate.yml`
- Create: `.github/workflows/release-candidate.yml`
- Delete: `.github/workflows/vvip-quality-gate.yml`
- Delete: `.github/workflows/v14-release-candidate.yml`

**Interfaces:**
- Consumes: `scripts/quality-gate.sh`, release tests, `tools/vvip_public_release.py`.
- Produces: durable exact-head Quality and candidate-build checks.

- [ ] **Step 1: Create `quality-gate.yml`** with `pull_request` targeting `main`, `push` to `main`, and `workflow_dispatch`; keep read-only contents permission, pinned checkout/setup actions, Node 22, Python 3.12, exact-SHA checkout, `scripts/quality-gate.sh`, and diagnostics upload.
- [ ] **Step 2: Create `release-candidate.yml`** by preserving the proven V14 exact-source checkout, full quality gate, release-specific test set, candidate build, and evidence upload while removing historical V14 branch names.
- [ ] **Step 3: Remove the two superseded filenames** only after their durable replacements are present in the same commit.

### Task 3: Build one generic local-only Supabase Security Gate

**Files:**
- Create: `.github/workflows/supabase-security-gate.yml`
- Delete: `.github/workflows/lc03-supabase-security-rehearsal.yml`
- Delete: `.github/workflows/lc04-production-legacy-rpc-rehearsal.yml`
- Delete: `.github/workflows/lc05-credential-surface-isolation-rehearsal.yml`
- Delete: `.github/workflows/lc06-rls-performance-hardening-rehearsal.yml`
- Delete: `.github/workflows/tsrf-phone-otp-rehearsal.yml`
- Delete: `.github/workflows/v14-local-supabase-rehearsal.yml`
- Retain: `tests/sql/lc03-legacy-drift-reconciliation.sql`
- Retain: `tests/sql/lc04-production-legacy-rpc-behavior.sql`
- Retain: `tests/sql/lc04-production-legacy-drift-fixture.sql`
- Retain: `tests/sql/lc04-production-legacy-drift-convergence.sql`
- Retain: `tests/sql/lc05-credential-canonical-behavior.sql`
- Retain: `tests/sql/lc05-credential-production-drift-fixture.sql`
- Retain: `tests/sql/lc05-credential-drift-convergence.sql`
- Retain: `tests/sql/lc06-rls-performance-behavior.sql`
- Retain: `tests/sql/tsrf-phone-otp-behavior.sql`

**Interfaces:**
- Consumes: the complete `supabase/migrations` chain and every current `supabase/functions/*/index.ts`.
- Produces: local database rebuild, durable SQL behavior evidence, and Edge typecheck with no provider or remote project credentials.

- [ ] **Step 1: Add exact-source checkout and clean-worktree verification.**
- [ ] **Step 2: Add a fail-closed environment check** for `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_REF` before any Supabase command.
- [ ] **Step 3: Install pinned Supabase CLI `2.109.0`, start the isolated local stack, and run exactly `supabase db reset --local`.**
- [ ] **Step 4: Execute retained SQL behavior fixtures** with local PostgreSQL at `127.0.0.1:54322`, `ON_ERROR_STOP=1`. Apply drift fixtures plus the canonical migration where a convergence fixture requires that sequence.
- [ ] **Step 5: Install Deno 2 and run `deno check` over every tracked `supabase/functions/*/index.ts` discovered from the repository.**
- [ ] **Step 6: Stop the local stack under `if: always()` and re-check source cleanliness.**

### Task 4: Remove historical executable CI and rebind Release DNA

**Files:**
- Delete: `.github/workflows/documentation-sovereign-knowledge-plane.yml`
- Delete: `.github/workflows/tsrf-semantic-convergence.yml`
- Delete: `.github/workflows/tsrf-staging-evidence.yml`
- Modify: `scripts/tsrf/evidence/release-dna.cjs`
- Modify/delete only workflow-name-specific Node tests that cannot survive the new durable paths; retain behavior/security tests.

**Interfaces:**
- Consumes: durable workflow paths from Tasks 2 and 3.
- Produces: security configuration digest bound to current executable CI only.

- [ ] **Step 1: Replace Release-DNA workflow paths** `vvip-quality-gate.yml`, `tsrf-semantic-convergence.yml`, `lc03-supabase-security-rehearsal.yml`, and `tsrf-phone-otp-rehearsal.yml` with `quality-gate.yml`, `release-candidate.yml`, and `supabase-security-gate.yml` while retaining CodeQL, Dependency Review, CleanGuard, Project Control, and security scanner paths.
- [ ] **Step 2: Remove historical workflows** listed above.
- [ ] **Step 3: Update or remove tests that assert only superseded workflow filenames.** Tests that assert security behavior, SQL properties, or Release-DNA fail-closed behavior remain.

### Task 5: GREEN verification and PR handoff

**Files:**
- Verify all changed files.
- Update issue #252 and owner approval queue #253 with immutable evidence.

**Interfaces:**
- Consumes: final branch head.
- Produces: one reviewable Gate 0 PR parked at the human-approval boundary.

- [ ] **Step 1: Run `node --test tests/ci-hygiene-convergence.test.cjs`** and require PASS.
- [ ] **Step 2: Run the full `scripts/quality-gate.sh` through GitHub Actions** on the exact PR head.
- [ ] **Step 3: Require applicable exact-head Quality Gate, Release Candidate, CodeQL, Dependency Review, CleanGuard, Project Control, and Supabase Security Gate success.**
- [ ] **Step 4: Confirm the PR diff contains no secret values and no Production mutation path.**
- [ ] **Step 5: Add the exact PR number/head SHA to #253 and stop Gate 0 at the independent human approval boundary; continue unrelated global-launch work instead of bypassing the rule.**
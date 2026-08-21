# TIGER Gate 6 Exact-SHA Staging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a fail-closed Gate 6 that builds a staging-only exact-SHA artifact, validates non-Production provider identity, deploys only to dedicated Staging providers, verifies the live HTTPS runtime, and seals 10/10 evidence without touching `main` or Production.

**Architecture:** Reuse `tools/vvip_public_release.py` as the exact public allowlist authority. Add a staging-specific builder and Gate 6 guard rather than changing Production promotion semantics. Split PR-time contract verification from provider mutation: ordinary pull-request checks prove code/config safety; an explicit `workflow_dispatch` against an exact SHA performs Supabase Staging and Cloudflare Pages operations only when the protected `staging` environment provides all required credentials.

**Tech Stack:** Plain JavaScript/Node 22, Python 3.12, GitHub Actions, Supabase/PostgreSQL, Cloudflare Pages, existing VVIP Quality Gate and Steel Shield.

**Spec:** `docs/superpowers/specs/2026-08-20-tiger-gate6-exact-sha-staging-design.md`

## Global Constraints

- Never merge to `main` as part of Gate 6 implementation.
- Never deploy to Production or use Production credentials.
- Production Supabase ref `zelcngyyvbomuzokvuxo` is forbidden.
- Browser artifacts may contain publishable keys only; service-role/database/private tokens are forbidden.
- Data classification is `SYNTHETIC_SANITIZED` only.
- Payment mode is `disabled` or `sandbox`; live payment mode is forbidden.
- Exact source identity is a lowercase 40-character Git SHA and must match artifact, deployment and evidence.
- Provider mutation is allowed only through the GitHub `staging` environment and must fail closed when configuration is missing or ambiguous.
- Existing `.github/workflows/pages.yml` remains Production-only and is not modified for Staging deployment.
- Existing Preview evidence remains a non-provider candidate path and is not relabeled as Gate 6 PASS.

---

### Task 1: Gate 6 Staging Guard

**Files:**
- Create: `project-control/gate6-staging/contract.v1.json`
- Create: `project-control/scripts/gate6_staging_guard.mjs`
- Create: `tests/tiger-gate6-staging-guard.test.cjs`

**Interfaces:**
- Consumes: exact source SHA, Supabase URL/ref, public browser config, data/payment modes, Cloudflare deployment metadata.
- Produces: `evaluateGate6Candidate(input)` returning `{ schemaVersion, decision, eligible, reasons }` and `gate6StagingContract`.

- [ ] **Step 1: Write failing guard tests**

Create tests that require these reason codes: `INVALID_SOURCE_SHA`, `PRODUCTION_ENVIRONMENT_FORBIDDEN`, `BACKEND_UNBOUND`, `PRODUCTION_SUPABASE_FORBIDDEN`, `SUPABASE_URL_REF_MISMATCH`, `PRIVILEGED_BROWSER_CONFIG_FORBIDDEN`, `SYNTHETIC_DATA_REQUIRED`, `LIVE_PAYMENT_FORBIDDEN`, `HTTPS_STAGING_REQUIRED`, `DEPLOYMENT_SOURCE_MISMATCH`, and one complete safe candidate.

- [ ] **Step 2: Run RED**

Run: `node --test tests/tiger-gate6-staging-guard.test.cjs`

Expected: FAIL because `project-control/scripts/gate6_staging_guard.mjs` does not exist.

- [ ] **Step 3: Implement the minimal guard**

The guard must import and reuse `evaluatePreviewCandidate` where its generic preview/STAGING checks are applicable, then add Gate 6-specific checks for the exact forbidden Supabase ref, URL/ref consistency, payment mode, provider name, and exact deployment source identity. It must not read secrets from GitHub or perform network calls.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/tiger-gate6-staging-guard.test.cjs tests/tiger-exact-sha-preview-guard.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(gate6): add staging isolation guard`

### Task 2: Exact-SHA Staging Artifact Builder

**Files:**
- Create: `tools/vvip_staging_release.py`
- Create: `tests/test_vvip_staging_release.py`

**Interfaces:**
- Consumes CLI args `--source`, `--output`, `--source-sha`, `--supabase-url`, `--supabase-publishable-key`, `--payment-mode`.
- Produces public allowlisted artifact plus `staging-identity.js`, `gate6-staging-manifest.json`, and updated `release-manifest.json`.

- [ ] **Step 1: Write failing builder tests**

Tests must prove: exact SHA required; Production Supabase ref rejected; HTTPS Supabase origin required; publishable key cannot contain secret/service-role markers; payment mode only `disabled|sandbox`; output has no `CNAME`; generated runtime environment is `staging`; manifest contains source SHA, Supabase ref, `SYNTHETIC_SANITIZED`, and forbidden Production ref; staging identity is visibly loaded from `index.html`.

- [ ] **Step 2: Run RED**

Run: `python -m pytest -q tests/test_vvip_staging_release.py`

Expected: FAIL because `tools/vvip_staging_release.py` does not exist.

- [ ] **Step 3: Implement the minimal builder**

Call `vvip_public_release.build(source, output, mode="staging", source_sha=source_sha, include_cname=False)` so the existing exact allowlist remains authoritative. Temporarily set only the validated public staging runtime variables for the build, restore the process environment afterward, add a staging identity script, re-hash the artifact, and emit a pre-deployment Gate 6 manifest with `eligible=false` until Cloudflare evidence is added.

- [ ] **Step 4: Run GREEN**

Run: `python -m pytest -q tests/test_vvip_staging_release.py tests/test_vvip_public_release_preview.py`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(gate6): build exact-sha staging artifact`

### Task 3: Deterministic Synthetic Seed Proof and Runtime Verifier

**Files:**
- Create: `scripts/gate6/seed-synthetic.cjs`
- Create: `scripts/gate6/verify-runtime.cjs`
- Create: `tests/tiger-gate6-synthetic-seed.test.cjs`
- Create: `tests/tiger-gate6-runtime-verifier.test.cjs`

**Interfaces:**
- `buildSyntheticSeed({ sourceSha })` returns a deterministic, non-real fixture envelope and SHA-256 digest; it does not know Production credentials.
- `verifyGate6Runtime({ sourceSha, stagingUrl, supabaseUrl, supabaseProjectRef, fetchImpl })` verifies HTTPS, exact SHA marker, staging environment marker, Supabase origin binding and live backend reachability.

- [ ] **Step 1: Write failing seed/runtime tests**

Seed tests require deterministic IDs based on `sourceSha`, explicit `SYNTHETIC_SANITIZED` classification, synthetic email/name markers, and no Production data fields. Runtime tests use an injected `fetchImpl` and require rejection of HTTP, SHA mismatch, Production Supabase ref, backend origin mismatch and missing staging identity.

- [ ] **Step 2: Run RED**

Run: `node --test tests/tiger-gate6-synthetic-seed.test.cjs tests/tiger-gate6-runtime-verifier.test.cjs`

Expected: FAIL because the scripts do not exist.

- [ ] **Step 3: Implement minimal deterministic seed and verifier**

The seed script creates data only; actual remote insertion is a provider step and must use the dedicated Staging project. The runtime verifier checks the deployed `/gate6-staging-manifest.json` and performs a GET to the configured Supabase `/auth/v1/settings` or equivalent public health surface with only the publishable key supplied by the workflow; it never logs the key.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/tiger-gate6-synthetic-seed.test.cjs tests/tiger-gate6-runtime-verifier.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(gate6): add synthetic proof and runtime verifier`

### Task 4: Gate 6 GitHub Actions Orchestration

**Files:**
- Create: `.github/workflows/tiger-gate6-exact-sha-staging.yml`
- Create: `tests/tiger-gate6-workflow-contract.test.cjs`

**Interfaces:**
- Pull request job: contract/static verification only, no provider mutations.
- Manual `workflow_dispatch` input: `source_sha` exact 40-character SHA.
- Protected `staging` environment variables/secrets: `TIGER_STAGING_SUPABASE_URL`, `TIGER_STAGING_SUPABASE_PROJECT_REF`, `TIGER_STAGING_SUPABASE_PUBLISHABLE_KEY`, `TIGER_STAGING_SUPABASE_DB_URL`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`; secret `CLOUDFLARE_API_TOKEN`. Optional Clerk test key stays publishable only.

- [ ] **Step 1: Write failing workflow contract test**

The test reads the YAML as text and requires: exact checkout by SHA; `environment: staging` on provider job; Production ref literal only in rejection/guard context; no `main` deployment; no use of `.github/workflows/pages.yml`; provider job only on `workflow_dispatch`; Gate 6 focused tests and full Quality Gate; Cloudflare Pages direct deploy; evidence artifact upload; no echo of secret values.

- [ ] **Step 2: Run RED**

Run: `node --test tests/tiger-gate6-workflow-contract.test.cjs`

Expected: FAIL because the Gate 6 workflow does not exist.

- [ ] **Step 3: Implement workflow**

PR verification job checks exact PR head, runs all `tests/tiger-gate6-*.test.cjs`, `tests/test_vvip_staging_release.py`, `bash scripts/quality-gate.sh`, builds a pre-deploy artifact and uploads it as `BLOCKED_PROVIDER` candidate evidence. Manual provider job checks out `inputs.source_sha`, validates Staging vars, builds the same artifact, applies repository migrations only to the dedicated Staging DB authority, writes deterministic synthetic proof into Staging only, deploys the artifact with pinned Wrangler execution, resolves the returned HTTPS URL/deployment identity, runs `verify-runtime.cjs`, seals final JSON, and uploads `tiger-gate6-staging-evidence-<sha>`.

The provider job must fail before mutation if the Supabase ref equals `zelcngyyvbomuzokvuxo`, the URL/ref disagree, the Cloudflare project/account variables are absent, or payment mode is not `disabled|sandbox`.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/tiger-gate6-workflow-contract.test.cjs tests/tiger-gate6-*.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `ci(gate6): add exact-sha staging evidence workflow`

### Task 5: Repository-wide Closure Before Provider Mutation

**Files:**
- Modify only if evidence demands it: `docs/MASTER_PROJECT_STATE.md`
- Do not mark Gate 6 VERIFIED in registry yet.

- [ ] **Step 1: Run focused Gate 6 tests**

Run: `node --test tests/tiger-gate6-*.test.cjs && python -m pytest -q tests/test_vvip_staging_release.py`

Expected: all PASS.

- [ ] **Step 2: Run inherited Gate 5 tests**

Run: `node --test tests/tiger-gate5-*.test.*`

Expected: all PASS.

- [ ] **Step 3: Run full Quality Gate**

Run: `bash scripts/quality-gate.sh`

Expected: `VVIP_QUALITY_GATE=PASS` and no source-tree mutation.

- [ ] **Step 4: Run Steel Shield migration/security audits**

Run: `bash scripts/security/p08-steel-shield/scan-secret-leaks.sh && bash scripts/security/p08-steel-shield/scan-dangerous-sql.sh && bash scripts/security/p08-steel-shield/audit-migration-versions.sh`

Expected: zero Critical/High and migration audit PASS.

- [ ] **Step 5: Update current project cursor accurately**

`docs/MASTER_PROJECT_STATE.md` may be moved from the stale Gate 4 cursor to Gate 6 `IN_PROGRESS/BLOCKED_PROVIDER` only after exact-head CI supports the repository changes. Do not claim Gate 6 VERIFIED before live provider evidence exists.

### Task 6: Dedicated Supabase Staging Provisioning

**Provider action; no repository file is authoritative for the live provider state.**

- [ ] **Step 1: Select owner-approved Supabase organization and confirm any provider cost**

Use the connected Supabase account. The organization must be explicitly selected because provider costs differ by organization.

- [ ] **Step 2: Create dedicated project**

Name: `tiger-vvip-staging`; choose a region appropriate for the initial Staging audience and independent from the Production project. Record project ref and URL, never service-role values.

- [ ] **Step 3: Prove isolation before mutation**

Require project ref != `zelcngyyvbomuzokvuxo`; verify project URL contains the dedicated ref; run Supabase security advisors after schema application.

- [ ] **Step 4: Apply repository migrations**

Apply migrations in repository order to the dedicated Staging project only. Any migration failure stops Gate 6 and is not repaired against Production.

- [ ] **Step 5: Insert deterministic synthetic fixtures**

Use `scripts/gate6/seed-synthetic.cjs` output as the source. Insert only into Staging through an explicit bounded script/query and record non-secret row IDs/digests as evidence.

### Task 7: Cloudflare Pages Staging Deployment and Final Evidence

**Provider action; requires a least-privilege Cloudflare credential for the Staging Pages project.**

- [ ] **Step 1: Configure protected GitHub `staging` environment**

Add only Staging-scoped Supabase/Cloudflare configuration. Never store Production credentials in the environment.

- [ ] **Step 2: Execute Gate 6 manual workflow for exact head SHA**

The workflow must deploy the already-built allowlisted artifact to Cloudflare Pages over HTTPS and capture immutable deployment metadata.

- [ ] **Step 3: Run live runtime verification**

Verify HTTPS, `environment=staging`, exact SHA marker, dedicated Supabase project ref and live backend reachability. Android/iPhone reality testing remains Gate 7 and is not falsely absorbed into Gate 6.

- [ ] **Step 4: Seal Evidence 10/10**

Final evidence JSON must include exact SHA, artifact manifest digest, Supabase project ref, Cloudflare deployment ID/URL, synthetic seed digest, payment mode, runtime smoke result and 10-item evidence status. No secret value may be included.

- [ ] **Step 5: Update authoritative status and PR**

Only after all exact-head checks and live provider evidence pass: set Gate 5 `VERIFIED`, Gate 6 `VERIFIED`, update `docs/MASTER_PROJECT_STATE.md`, update the Draft PR evidence, keep the PR unmerged, and stop before Production.

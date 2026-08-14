# CI Hygiene Convergence Design

Issue: #252
Parent: #251
Baseline: `main@648fca9ca4f1ed5e685e06694a589a125542640b`

## Goal

Replace historical, stage-specific, stale, or non-runnable GitHub Actions definitions with a minimal durable production-grade CI surface without weakening security, release identity, local Supabase verification, or exact-head evidence.

## Evidence-driven correction

The original Gate 0 draft incorrectly classified `production-reconciliation-proof.yml` as durable and treated workflow count as the target. Inspection proved that file is a one-time historical workflow pinned to `ops/production-reconciliation-20260810`, hard-coded old main SHA `3d8bbfc8611e53510b3bb776b8d9752df6595d8d`, and dated reconciliation reports. It must not remain executable current CI.

Inspection also proved `tsrf-staging-evidence.yml` is not a runnable proof pipeline: it requires `$RUNNER_TEMP/tsrf-staging-proof/proof-input.json` and `source-proof.json`, but no repository workflow or production code creates or downloads that handoff. Its own approved design states that real Staging proof was not created and still required an external producer. A permanently fail-closed placeholder is historical evidence logic, not durable CI.

Workflow count is therefore an outcome of responsibility boundaries, not a target.

## Durable workflow surface

The repository SHALL contain exactly these nine current workflow files after convergence:

1. `.github/workflows/quality-gate.yml`
2. `.github/workflows/release-candidate.yml`
3. `.github/workflows/codeql.yml`
4. `.github/workflows/dependency-review.yml`
5. `.github/workflows/tiger-cleanguard.yml`
6. `.github/workflows/project-control-integrity.yml`
7. `.github/workflows/supabase-security-gate.yml`
8. `.github/workflows/production-release-artifact.yml`
9. `.github/workflows/pages.yml`

Each retained workflow must be current, runnable for its declared responsibility, and free of historical feature/integration/reconciliation branch triggers and hard-coded historical source SHAs.

## Superseded executable workflow files

Remove from the current workflow tree:

- `documentation-sovereign-knowledge-plane.yml`
- `lc03-supabase-security-rehearsal.yml`
- `lc04-production-legacy-rpc-rehearsal.yml`
- `lc05-credential-surface-isolation-rehearsal.yml`
- `lc06-rls-performance-hardening-rehearsal.yml`
- `tsrf-phone-otp-rehearsal.yml`
- `tsrf-semantic-convergence.yml`
- `tsrf-staging-evidence.yml`
- `v14-local-supabase-rehearsal.yml`
- `v14-release-candidate.yml`
- `vvip-quality-gate.yml`
- `production-reconciliation-proof.yml`

Historical documentation and reconciliation reports remain as non-executable project history. No claim is made that GitHub Actions run history is deleted.

`v14-release-candidate.yml` is replaced by `release-candidate.yml`; `vvip-quality-gate.yml` is replaced by `quality-gate.yml`.

## Canonical Quality Gate

`quality-gate.yml` runs for pull requests targeting `main`, pushes to `main`, and manual dispatch. It binds checkout to the exact PR head or event SHA, installs the repository's pinned runtime majors, executes `scripts/quality-gate.sh`, and uploads diagnostics. Historical feature-branch trigger lists are forbidden.

The existing shell quality gate remains the canonical repository-wide contract runner, including all root `tests/*.test.cjs` tests, Python tests, cleanroom checks, security scanners, project-control integrity, and QA smoke behavior.

## Release Candidate

`release-candidate.yml` preserves exact-source checkout and source-SHA verification from the proven V14 release-candidate workflow. It retains the full quality gate, release-specific tests, candidate artifact build, and exact-SHA evidence upload. Historical V14/integration branch triggers and naming are removed.

## Security analysis gates

`codeql.yml`, `dependency-review.yml`, `tiger-cleanguard.yml`, and `project-control-integrity.yml` are retained but converged to current `main` pull-request/push semantics appropriate to each gate. Historical feature/integration branch names are removed. Where a workflow analyzes repository source, checkout is bound to the exact PR head or event SHA rather than relying on a synthetic merge checkout.

## Supabase Security Gate

`supabase-security-gate.yml` is generic and local-only. It:

- runs for pull requests targeting `main`, pushes to `main`, and manual dispatch;
- checks out the exact source SHA and requires a clean worktree;
- fails closed if `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, or `SUPABASE_PROJECT_REF` are present;
- uses pinned `supabase/setup-cli@ab058987d8d6c725971f6cf9d0b5c98467e30bd1` with CLI `2.109.0`;
- rebuilds the full repository migration chain using only `supabase db reset --local`;
- never uses `--linked`, `supabase link`, `supabase db push`, or any remote database mutation;
- runs retained SQL behavior fixtures for canonical legacy-drift convergence, credential isolation, RLS behavior, OTP behavior, and fail-closed AI runtime defaults;
- typechecks every current `supabase/functions/*/index.ts` using Deno 2;
- runs durable static Supabase/OTP/security contracts without provider secrets;
- stops the local Supabase stack on every path;
- does not upload historical per-stage migration digest artifacts.

## Staging evidence libraries

Removing `tsrf-staging-evidence.yml` does not delete the fail-closed evidence libraries or their unit/security tests. `scripts/tsrf/evidence/staging-bridge.cjs`, Release DNA logic, capsule contracts, and behavior tests remain available. Workflow-specific tests whose only executable subject is the removed placeholder are removed. A future Staging evidence workflow may only return when it has a real same-SHA proof producer/download contract and can pass end-to-end.

## Release DNA

`SECURITY_CONFIG_PATHS` in `scripts/tsrf/evidence/release-dna.cjs` is updated to hash current security/release control paths only:

- `quality-gate.yml`
- `release-candidate.yml`
- `codeql.yml`
- `dependency-review.yml`
- `tiger-cleanguard.yml`
- `project-control-integrity.yml`
- `supabase-security-gate.yml`
- `production-release-artifact.yml`
- `pages.yml`
- `scripts/quality-gate.sh`
- secret and dangerous-SQL scanners.

Removed stage workflow paths are forbidden in the Release DNA configuration set. Test fixtures that mirror `SECURITY_CONFIG_PATHS` are updated to the same canonical list.

## No-regression contract

`tests/ci-hygiene-convergence.test.cjs` SHALL fail if:

- the current workflow set differs from the exact nine-file allowlist;
- a superseded executable workflow is reintroduced;
- a current workflow contains known historical feature/integration/reconciliation branch names or hard-coded historical source SHAs;
- canonical Quality or Release Candidate loses exact-head identity checks;
- the generic Supabase gate can see remote Supabase credentials without failing;
- the Supabase gate uses `--linked`, `supabase link`, `supabase db push`, or Production/Staging mutation credentials;
- the Supabase CLI pin or exact-source identity check is removed;
- Edge typechecking ceases to cover all current `supabase/functions/*/index.ts` files;
- Release DNA references superseded workflow paths or omits the current security/release workflow set.

Existing feature/security tests remain unless their executable subject is solely a superseded workflow. Behavior tests, SQL fixtures, evidence libraries, and historical docs remain.

## Production release controls

`production-release-artifact.yml` and `pages.yml` remain manual, exact-current-main, build-once/promote-many controls. Gate 0 does not weaken or automate Production promotion and does not modify the active GitHub ruleset.

## Governance

`PRODUCTION-MAIN-GOVERNANCE` remains active. No bypass is permitted. Merge requires a pull request and one human approval. No secrets are added and no Production or Staging mutation occurs from Gate 0.

## Success criteria

Gate 0 is complete only when the PR head has exactly nine durable workflow files, no current workflow contains historical stage triggers or stale fixed release identity, Release DNA resolves only current security/release controls, applicable exact-head automated checks are green, and the PR is parked for the required independent human approval rather than bypassed.
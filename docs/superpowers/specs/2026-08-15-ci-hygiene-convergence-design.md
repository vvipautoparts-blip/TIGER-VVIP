# CI Hygiene Convergence Design

Issue: #252
Parent: #251
Baseline: `main@648fca9ca4f1ed5e685e06694a589a125542640b`

## Goal

Replace stage-specific historical GitHub Actions workflows with a small durable production-grade CI surface without weakening security, release identity, local Supabase verification, or exact-head evidence.

## Durable workflow surface

The repository SHALL contain exactly these ten current workflow files after convergence:

1. `.github/workflows/quality-gate.yml`
2. `.github/workflows/release-candidate.yml`
3. `.github/workflows/codeql.yml`
4. `.github/workflows/dependency-review.yml`
5. `.github/workflows/tiger-cleanguard.yml`
6. `.github/workflows/project-control-integrity.yml`
7. `.github/workflows/supabase-security-gate.yml`
8. `.github/workflows/production-release-artifact.yml`
9. `.github/workflows/production-reconciliation-proof.yml`
10. `.github/workflows/pages.yml`

## Superseded workflow files

The following workflow files are removed from the current tree:

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

`v14-release-candidate.yml` is replaced by `release-candidate.yml`; `vvip-quality-gate.yml` is replaced by `quality-gate.yml`.

## Canonical Quality Gate

`quality-gate.yml` runs for pull requests targeting `main`, pushes to `main`, and manual dispatch. It checks out the exact event SHA, installs pinned runtime majors already used by the repository, executes `scripts/quality-gate.sh`, and uploads diagnostics. Historical feature-branch trigger lists are forbidden.

The existing shell quality gate remains the canonical repository-wide contract runner, including all root `tests/*.test.cjs` tests, Python tests, cleanroom checks, security scanners, project-control integrity, and QA smoke behavior.

## Release Candidate

`release-candidate.yml` preserves exact-source checkout and source-SHA verification from the proven V14 release-candidate workflow. It retains the full quality gate, release-specific tests, candidate artifact build, and exact-SHA evidence upload. Historical V14/integration branch triggers and naming are removed.

## Supabase Security Gate

`supabase-security-gate.yml` is generic and local-only. It:

- runs for pull requests targeting `main`, pushes to `main`, and manual dispatch;
- checks out the exact source SHA and requires a clean worktree;
- fails closed if `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, or `SUPABASE_PROJECT_REF` are present;
- uses pinned `supabase/setup-cli@ab058987d8d6c725971f6cf9d0b5c98467e30bd1` with CLI `2.109.0`;
- rebuilds the full repository migration chain using only `supabase db reset --local`;
- never uses `--linked` and never mutates Staging or Production;
- runs durable SQL behavior fixtures that remain relevant to the canonical migration chain;
- typechecks every current `supabase/functions/*/index.ts` with pinned Deno major v2;
- runs durable static Supabase/OTP/security contracts without provider secrets;
- stops the local Supabase stack on every path.

Historical migration digests are not uploaded as separate stage artifacts; source identity is already bound by Git and release evidence.

## Release DNA

`SECURITY_CONFIG_PATHS` in `scripts/tsrf/evidence/release-dna.cjs` is updated to hash the durable security workflow paths, including `quality-gate.yml`, `release-candidate.yml`, and `supabase-security-gate.yml`. Removed stage workflow paths are forbidden in the Release DNA configuration set.

## No-regression contract

A new `tests/ci-hygiene-convergence.test.cjs` SHALL fail if:

- the current workflow set differs from the exact ten-file allowlist;
- a superseded workflow file is reintroduced;
- historical branch trigger names return to canonical Quality or Release Candidate workflows;
- the generic Supabase gate can see remote Supabase credentials without failing;
- the Supabase gate uses `--linked` or a remote DB command;
- the Supabase CLI pin or exact-source identity check is removed;
- Edge typechecking ceases to cover all current `index.ts` functions;
- Release DNA references superseded workflow paths.

Existing feature/security tests remain unless they only assert the existence or name of a superseded workflow. Workflow-name-only tests are replaced by the generic CI hygiene contract; behavior tests and SQL fixtures are retained.

## Governance

`PRODUCTION-MAIN-GOVERNANCE` remains active. No bypass is permitted. Merge requires a pull request and one human approval. CI changes do not modify the ruleset. No secrets are added and no Production mutation occurs from this gate.

## Success criteria

Gate 0 is complete only when the PR head is immutable and the applicable exact-head automated checks are green, the current workflow tree contains exactly ten durable files, Release DNA resolves only current security paths, and the PR is parked for the required independent human approval rather than bypassed.
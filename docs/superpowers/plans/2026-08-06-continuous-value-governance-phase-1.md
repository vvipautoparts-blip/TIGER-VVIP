# Continuous Value Governance Phase 1 — As-Built Implementation Plan

**Status:** Implemented and verified on the feature branch  
**Date:** 2026-08-06  
**Mode:** `ANALYSIS_ONLY`

## Goal

Deliver a deterministic, read-only repository governance engine that inventories declared assets, gathers local evidence, rejects unsafe or stale evidence, evaluates value and lifecycle state, and emits content-addressed **non-executable** cleanup plans. Phase 1 does not delete, quarantine, mutate, connect to production, or access a remote database.

## Governing constraints

- No direct writes to `main`.
- No remote Supabase, production, network, database, or credential access.
- No third-party runtime dependency.
- No file deletion, worktree mutation, feature disablement, or cleanup executor.
- Missing, stale, future, malformed, unknown, or contradictory evidence fails closed.
- Class C assets remain protected.
- Class B produces quarantine recommendations only.
- Class A may produce a content-addressed plan with `executable: false` only after all evidence gates pass.
- AI output is never deletion authority.
- Registry and policy declarations are metadata, not proof of a live runtime dependency.
- Every report is deterministic, portable, free of secrets and absolute local paths, and includes rollback requirements.

## As-built files

### Runtime modules

- `project-control/value-governance/contracts.mjs`
- `project-control/value-governance/registry.mjs`
- `project-control/value-governance/inventory.mjs`
- `project-control/value-governance/evaluator.mjs`
- `project-control/value-governance/planner.mjs`
- `project-control/value-governance/cli.mjs`

### Policy and registry

- `project-control/value-governance/policy.v1.json`
- `project-control/value-governance/registry.v1.json`
- `project-control/schemas/value_asset.schema.json`

### Tests

- `tests/value-governance-contracts.test.cjs`
- `tests/value-governance-registry.test.cjs`
- `tests/value-governance-inventory.test.cjs`
- `tests/value-governance-evaluator.test.cjs`
- `tests/value-governance-planner.test.cjs`
- `tests/value-governance-cli.test.cjs`

### Integration and documentation

- `scripts/quality-gate.sh`
- `project-control/README_AR.md`
- `project-control/data/artifact_register.csv`

## Completed TDD tasks

### 1. Closed contracts and immutable policy

- [x] Added stable lifecycle states, action classes, reason codes, identifiers, SHA-256 validation, and deep freezing.
- [x] Added policy `CVGE_REPOSITORY_V1` with:
  - `mode: ANALYSIS_ONLY`;
  - automatic removal class A only;
  - automatic quarantine class B only;
  - protected class C;
  - evidence confidence `1`;
  - evidence freshness window `24` hours;
  - worktree, network, and production access disabled.
- [x] Proved RED through missing module and GREEN through focused and full Quality Gate tests.

### 2. Fail-closed asset registry

- [x] Added strict policy and registry loaders.
- [x] Rejected unknown fields, path escapes, absolute paths, backslashes, NUL, duplicate IDs, duplicate paths, unsupported permanent exceptions, and protected-class downgrade attempts.
- [x] Added an initial registry of critical controls without claiming complete production coverage.
- [x] Protected Quality Gate, Project Control validation, secret scanning, dangerous SQL scanning, policy, and registry assets as Class C.

### 3. Read-only evidence collection

- [x] Added deterministic SHA-256, file size, existence, type, and literal-reference evidence.
- [x] Rejected symlinks resolving outside the repository.
- [x] Hashed binary and oversized files without parsing them for references.
- [x] Limited text scanning to approved extensions and 2 MiB per file.
- [x] Added no network or subprocess capability.
- [x] Proved no bytes, mtimes, directory entries, or official worktree state change during analysis.
- [x] Excluded CVGE policy, registry, and schema declarations from live dependency counts so metadata cannot prevent a proven Class A cleanup candidate.

### 4. Deterministic lifecycle evaluator

- [x] Kept Class C at `PROTECTED` with `NO_ACTION`.
- [x] Returned `NO_ACTION` for incomplete, missing, invalid, unknown, contradictory, stale, or future evidence.
- [x] Enforced `staleEvidenceHours` against an explicit `evaluatedAt` timestamp.
- [x] Preserved evidence hashes in stale decisions for auditability.
- [x] Allowed Class B only to reach `QUARANTINED` recommendation.
- [x] Allowed Class A to reach `REMOVAL_READY` only when:
  - it has no protected obligations;
  - the asset exists;
  - the content hash is valid;
  - reference count is zero;
  - expected evidence is complete;
  - rollback is reproducible;
  - policy permits Class A;
  - evidence confidence meets policy;
  - no contradictory evidence exists.
- [x] Normalized registry and evidence ordering for deterministic decisions.

### 5. Content-addressed reports and cleanup plans

- [x] Added canonical SHA-256 report hashing independent of timestamp and input order.
- [x] Excluded diagnostics, raw content, environment values, usernames, host data, and absolute paths.
- [x] Added Class A plans containing:
  - target repository path;
  - expected content hash;
  - stable reason codes;
  - preconditions and postconditions;
  - content-addressed restoration method;
  - `executable: false`.
- [x] Embedded `cleanupPlans` in the report and in its semantic hash.
- [x] Prevented Class B and Class C from receiving removal plans.

### 6. Read-only CLI and CI gate

- [x] Added only:
  - `node project-control/value-governance/cli.mjs --check`
  - `node project-control/value-governance/cli.mjs --report-json`
- [x] Rejected unknown, cleanup, delete, execute, and production modes.
- [x] Added stable exit codes:
  - `0`: valid read-only analysis;
  - `2`: malformed input, configuration, evidence, or CLI argument;
  - `3`: protected or forbidden action policy.
- [x] Added `continuous_value_governance` exactly once to the isolated Quality Gate.
- [x] Updated Arabic documentation and the Project Control artifact hash.

## Verification commands

```bash
node --test tests/value-governance-*.test.cjs
node project-control/value-governance/cli.mjs --check
node project-control/value-governance/cli.mjs --report-json
bash scripts/quality-gate.sh
```

Expected control markers:

```text
CVGE_REPOSITORY_CHECK=PASS
GATE_continuous_value_governance=PASS
ISOLATED_WORKTREE=CLEAN
OFFICIAL_WORKSPACE=UNCHANGED
VVIP_QUALITY_GATE=PASS
```

## Final acceptance checklist

- [x] Versioned schema, policy, and registry exist.
- [x] Analysis is read-only and deterministic.
- [x] No runtime deletion API exists.
- [x] Class C cannot enter automatic cleanup.
- [x] Class B cannot enter removal in Phase 1.
- [x] Class A plans are non-executable and content-addressed.
- [x] Missing, stale, future, or invalid evidence cannot authorize action.
- [x] Plans include rollback and verification requirements.
- [x] Registry self-declarations are not treated as runtime dependencies.
- [x] Reports contain no secrets, personal data, or absolute local paths.
- [x] Analysis does not mutate the isolated or official worktree.
- [x] Quality Gate, Project Control, Dependency Review, and CodeQL are required on one final SHA.

## Rollback

Phase 1 has no production state or remote side effects. Rollback consists of reverting the feature branch commits that add the CVGE files and the single Quality Gate invocation. No database, user data, country configuration, or production environment requires restoration.

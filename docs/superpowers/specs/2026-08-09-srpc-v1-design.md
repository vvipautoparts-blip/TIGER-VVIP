# VVIP TIGER Sovereign Release Proof Chain — SRPC v1

Status: **OWNER-APPROVED DESIGN**  
Date: **2026-08-09**  
Scope: **Global Launch Phase B controlled promotion and future release-proof baseline**

## 1. Purpose

SRPC v1 establishes one fail-closed release-proof chain:

`exact source -> exact bytes -> immutable capsule -> verified Staging identity -> Phase-B-only execution -> runtime/security proof -> cryptographic attestation -> independent security approval -> Steel Shield pin-only commit -> fresh exact-head CI -> Production eligibility -> Production closure proof`

Core constitutional rule:

> **Proof cannot grant Authority, and Authority cannot change Proof.**

A component that generates evidence cannot approve that evidence, modify the reviewed-hash policy, merge its own security change, or deploy Production.

## 2. Frozen Phase B Artifact Identity

The artifact identity frozen for this proof chain is:

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Pull request: `#181`
- Source commit H0: `e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0`
- Migration path: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- Expected migration SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`
- Target Staging branch name: `lc04-sovereign-staging-20260807`

Observed environment identifiers at design time:

- Staging project ref observed on 2026-08-09: `mduummtnlupktjaujgyx`
- Production project ref observed on 2026-08-09: `zelcngyyvbomuzokvuxo`

The migration path, H0, and migration digest are frozen release identity. **Supabase project refs are not blindly frozen**: the Staging branch must be re-resolved at execution time by branch name, health, parent relationship, and explicit inequality with the current Production project ref. A recreated branch must therefore receive a fresh runtime identity proof.

Any byte change to the migration creates a new release candidate and invalidates the previous Phase B proof chain.

## 3. Non-Negotiable Invariants

1. No mutable branch `HEAD`, `latest`, or synthetic PR merge commit may substitute for H0 during pre-pin proof.
2. The migration digest is computed from the exact artifact that will execute.
3. Hash mismatch never triggers automatic acceptance of a newly calculated hash.
4. `supabase db push`, run-all-pending, migration loops, and queue replay are forbidden for Phase B promotion.
5. Manual insertion into migration-ledger tables is forbidden.
6. Staging identity is verified before any DDL-capable step receives Staging deployment authority.
7. Production credentials are unavailable to Staging proof jobs.
8. Proof and Steel Shield approval are separate authority domains.
9. Auto-pinning is forbidden; auto-preparing a draft pin change is allowed.
10. The pin commit must not change Phase B migration bytes.
11. Fresh full CI runs on H1 after pinning; H0 success cannot authorize Production after H1 exists.
12. Missing evidence is failure, not unknown-pass.
13. No bypass, force-green, skip-CI security path, or unaccounted manual mutation is permitted.
14. Production stays blocked until all Production gates are satisfied.

## 4. Three-Plane Architecture

### 4.1 Proof Plane

Responsible for source lock, byte lock, static tests, capsule construction, Staging identity, ledger/schema classification, Phase-B-only execution, structural verification, runtime behavior proof, Phase A regression proof, residue proof, machine decision, and attestations.

It cannot modify Steel Shield reviewed hashes.

### 4.2 Authority Plane

Responsible for independent review of the completed evidence and authorization of one pin-only change.

It cannot alter the proved migration artifact.

### 4.3 Execution Plane

Responsible for H1 fresh CI, Production identity, exact-artifact Production promotion when permitted, and Production closure evidence.

It cannot bypass Proof or Authority.

## 5. Release State Machine

States are monotonic within one immutable capsule identity:

1. `SOURCE_LOCKED`
2. `STATIC_PROOF_PASSED`
3. `CAPSULE_BUILT`
4. `STAGING_IDENTITY_VERIFIED`
5. `STAGING_PREFLIGHT_VERIFIED`
6. `STAGING_MIGRATION_APPLIED_OR_ACCOUNTED`
7. `STAGING_RUNTIME_VERIFIED`
8. `EVIDENCE_COMPLETE`
9. `ATTESTED`
10. `ELIGIBLE_FOR_SECURITY_REVIEW`
11. `SECURITY_APPROVED`
12. `PIN_COMMIT_CREATED`
13. `POST_PIN_BYTES_VERIFIED`
14. `FRESH_CI_GREEN`
15. `PRODUCTION_ELIGIBLE`
16. `PRODUCTION_VERIFIED`

A failed later verification invalidates forward progression; it never retroactively turns incomplete evidence into success.

## 6. Gate 0 — Release Intent Lock

Materialize immutable inputs:

```text
PHASE=GLOBAL_LAUNCH_PHASE_B
SOURCE_COMMIT=e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0
MIGRATION_PATH=supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql
MIGRATION_SHA256=9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9
TARGET=STAGING
QUEUE_EXECUTION=FORBIDDEN
AUTO_PIN=FORBIDDEN
PRODUCTION_WRITE=FORBIDDEN
```

Any mismatch => STOP.

## 7. Gate 1 — Exact Source Lock

Explicitly check out H0. Record expected/actual commit, repository identity, migration Git blob identity, and tree identity where available.

`actual_commit != H0` => `SRPC-001 SOURCE_COMMIT_MISMATCH`.

## 8. Gate 2 — Exact Byte Lock and Static Proof

Run Phase B static contracts from H0 in an unprivileged job with no database deployment secrets.

Required:

- all Phase B static tests pass;
- emitted digest equals the frozen digest;
- digest comes from repository bytes, not copied/edited SQL.

Mismatch => `SRPC-003 BYTE_HASH_MISMATCH`.

## 9. Gate 3 — Immutable Sovereign Release Capsule

Build one content-addressed artifact:

```text
phase-b-sovereign-release-capsule/
├── migration.sql
├── release-manifest.json
├── source-commit.txt
├── git-tree.txt
├── migration-path.txt
├── migration.sha256
├── toolchain.json
├── preflight/
│   ├── staging-identity.json
│   ├── ledger-before.json
│   ├── schema-before.json
│   └── queue-observation.json
├── execution/
│   ├── execution-method.json
│   ├── deployment-log.ndjson
│   └── ledger-after.json
├── verification/
│   ├── schema-after.json
│   ├── runtime-tests.json
│   ├── rls-report.json
│   ├── acl-report.json
│   ├── storage-report.json
│   ├── phase-a-regression.json
│   └── synthetic-residue.json
├── decision/
│   └── staging-decision.json
└── recovery/
    └── recovery-plan.md
```

No secrets, tokens, service-role values, private connection strings, or user-data dumps may enter the capsule. Corrections create a new capsule identity; evidence is not silently replaced.

## 10. Release Manifest Contract

Minimum shape:

```json
{
  "schema": "vvip.tiger/release-capsule/v1",
  "release_id": "global-launch-phase-b",
  "source": {
    "repository": "vvipautoparts-blip/TIGER-VVIP",
    "commit": "e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0",
    "migration_path": "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql",
    "migration_sha256": "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"
  },
  "target": {
    "environment": "staging",
    "resolved_project_ref": null,
    "production_target": false
  },
  "execution": {
    "scope": "single-migration",
    "pending_queue_runner_used": false,
    "manual_sql_mutation": false
  },
  "verification": {
    "static_contract": "PASS",
    "runtime": "PENDING",
    "security": "PENDING",
    "phase_a_regression": "PENDING",
    "synthetic_residue": "PENDING"
  },
  "decision": {
    "state": "NOT_YET_ELIGIBLE",
    "steel_shield_pin": "NOT_PERFORMED",
    "production": "BLOCKED"
  }
}
```

A field may claim PASS only when its referenced evidence exists and validates.

## 11. Gate 4 — Protected Staging Identity

Immediately before DDL-capable work, resolve the branch by name and prove:

- branch name is `lc04-sovereign-staging-20260807`;
- branch is healthy;
- resolved project ref is recorded in the capsule;
- parent project relationship is expected;
- resolved Staging project ref differs from the current Production project ref;
- deployment job has no Production host/ref/credential;
- workflow/environment identity is recorded.

Ambiguity => fail closed.

SRPC recommends dedicated GitHub Environments `staging-release` and `production-release`, with separate credentials and protection rules. Their creation is an implementation concern and must not mutate H0.

## 12. Concurrency and Race Protection

Only one Phase B Staging promotion may execute at a time. Use a release-specific concurrency group. Parallel or stale attempts cannot race from the same ledger preflight.

Race or unexpected concurrent mutation => `SRPC-006 LEDGER_RACE_DETECTED`.

## 13. Gate 5 — Ledger and Schema State Classifier

Ledger and schema are separate signals.

### State A — Ledger absent / canonical target schema

Allowed controlled convergence. Existing canonical objects may come from prior rehearsals; object existence alone does not prove Phase B ledger application.

### State B — Ledger absent / partial or drifted schema

STOP => `SRPC-007 SCHEMA_DRIFT`.

### State C — Ledger present / same accounted release / canonical schema

Do not reapply. Enter verification-only mode.

### State D — Ledger present / evidence unknown

STOP => `UNACCOUNTED_EXECUTION`.

### State E — Ledger present / partial schema

CRITICAL STOP.

## 14. Gate 6 — Exact Single-Migration Execution

Forbidden:

- `supabase db push`;
- run-all-pending;
- shell migration iteration;
- queue replay;
- manual ledger insertion;
- SQL copied from an editor/chat response.

Execution input is the already sealed `migration.sql`, re-hashed immediately before execution.

For the current connected Supabase control plane, use one explicit migration application named `global_launch_phase_b_marketplace_convergence` with the exact sealed SQL body. If State C is proven, execution is skipped and verification-only mode is used.

## 15. Gate 7 — Post-Deployment Double Fingerprint

A successful DDL response is insufficient. Capture and verify:

- ledger after;
- schema after;
- target tables/functions/triggers/indexes/constraints;
- RLS and FORCE RLS states;
- policy names and commands;
- grants and revokes;
- private helper exposure;
- `listing-media` privacy, MIME allowlist, and size limit;
- review RPC exposure;
- append-only audit properties.

Unexpected drift => fail closed.

## 16. Gate 8 — Transaction-Scoped Behavioral Proof

Synthetic proof data exists only inside an explicit transaction and is rolled back.

Required behavior:

1. non-Clerk subject cannot own a listing;
2. inactive/unsealed country blocks listing creation;
3. owner may create DRAFT only;
4. owner cannot self-promote to ACTIVE;
5. unauthorized reviewer cannot approve;
6. authorized reviewer can approve eligible `PENDING_REVIEW` content;
7. audit entry is appended;
8. audit entry cannot be updated/deleted;
9. transaction rolls back;
10. synthetic residue is zero.

Synthetic proof data is never release seed data.

## 17. Gate 9 — Phase A Non-Regression

Phase A security/identity behavior must remain valid after Phase B proof. Any regression => `SRPC-011 PHASE_A_REGRESSION`.

## 18. Gate 10 — Evidence Completeness

`EVIDENCE_COMPLETE` requires:

```text
SOURCE_EXACT=true
BYTE_HASH_MATCH=true
STATIC_TESTS_PASS=true
STAGING_IDENTITY_VALID=true
LEDGER_PRECHECK_VALID=true
SCHEMA_PRECHECK_VALID=true
PHASE_B_ONLY=true
QUEUE_EXECUTION_USED=false
LEDGER_POSTCHECK_VALID=true
SCHEMA_POSTCHECK_VALID=true
RUNTIME_SECURITY_PASS=true
PHASE_A_REGRESSION_PASS=true
SYNTHETIC_RESIDUE_ZERO=true
CAPSULE_COMPLETE=true
```

At this point the evidence is ready to be cryptographically attested, but **not yet eligible for security approval**.

## 19. Gate 11 — Cryptographic Attestation

Create and verify two logically separate attestations.

### 19.1 Provenance Attestation

Subject: immutable Release Capsule artifact.

Purpose: prove repository/workflow/commit provenance and capsule digest.

### 19.2 VVIP Staging Verification Attestation

Predicate namespace: `https://vvip.tiger/attestation/staging-promotion/v1`.

Claims include H0, migration digest, resolved Staging identity, ledger classification, execution scope, queue-runner false, runtime/security result, Phase A regression result, zero residue, and decision state.

VVIP security claims are not embedded as ad-hoc SLSA provenance fields. Provenance and security verification remain semantically separate. Where in-toto is emitted, use Statement v1 semantics.

After both attestations verify against the expected identity and subjects, set:

```text
ATTESTED=true
ELIGIBLE_FOR_SECURITY_REVIEW=true
```

Attestation failure => `SRPC-013 ATTESTATION_INVALID`.

## 20. Gate 12 — Independent Security Approval

Machine proof cannot approve itself.

The reviewer verifies capsule digest, H0, migration digest, Staging identity, ledger/schema evidence, runtime/RLS/ACL/Storage evidence, Phase A non-regression, zero residue, attestation validity, and absence of bypass/manual mutation.

Only after this review may one pin-only change be authorized.

## 21. Gate 13 — Steel Shield Pin-Only Commit

The current Steel Shield reviewed-hash policy remains in:

`scripts/security/p08-steel-shield/scan-dangerous-sql.sh`

SRPC v1 does not refactor it during Phase B.

The authorized change adds one reviewed baseline entry for:

`supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`

with the exact proven digest and review comment. This produces H1.

Auto-pinning is forbidden. A workflow may prepare a draft change, but approval/merge authority stays independent.

## 22. Gate 14 — Post-Pin Byte and Diff Invariance

Prove:

```text
SHA256(migration @ H0)
==
SHA256(migration @ H1)
==
9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9
```

Any migration drift => `SRPC-015 POST_PIN_BYTE_DRIFT` and invalidates the Staging proof for Production.

The H0->H1 diff is constrained to approved policy/evidence changes. Unexpected application or migration change blocks release.

## 23. Gate 15 — Fresh Exact-Head CI on H1

Run fresh required checks on the same H1, including when applicable:

- VVIP Quality Gate;
- V14 Release Candidate;
- Project Control Integrity;
- Documentation checks;
- CleanGuard;
- Dependency Review;
- CodeQL;
- LC03/LC04/LC05/LC06 rehearsals;
- Phone OTP rehearsal;
- any additional required target-branch security checks.

No stale H0 success substitutes for H1 evidence. Any required failure => `SRPC-016 FRESH_CI_NOT_GREEN`.

## 24. Gate 16 — Production Eligibility

`PRODUCTION_ELIGIBLE` requires:

- approved H1;
- H0/H1 migration-byte equality;
- fresh H1 CI green;
- valid Staging capsule and attestations;
- current Production identity proof;
- no unexplained Production drift;
- exact Phase B artifact identity;
- satisfaction of the existing Production owner/security gate.

Production receives the exact proven bytes. No rebuild, copy/paste transformation, regenerated SQL, or changed hash is permitted.

## 25. Gate 17 — Production Closure Proof

After permitted Production deployment, generate a closure capsule containing Production identity, H1, exact migration digest, ledger before/after, schema/RLS/ACL/Storage verification, runtime smoke, Phase A non-regression, security advisors where available, deployment-run identity, and final decision.

Only then may project state declare:

`GLOBAL_LAUNCH_PHASE_B=PRODUCTION_VERIFIED`.

## 26. Standard STOP Codes

```text
SRPC-001 SOURCE_COMMIT_MISMATCH
SRPC-002 MIGRATION_PATH_MISMATCH
SRPC-003 BYTE_HASH_MISMATCH
SRPC-004 STAGING_IDENTITY_MISMATCH
SRPC-005 PRODUCTION_CREDENTIAL_EXPOSURE
SRPC-006 LEDGER_RACE_DETECTED
SRPC-007 SCHEMA_DRIFT
SRPC-008 SINGLE_SCOPE_VIOLATION
SRPC-009 RUNTIME_FAILURE
SRPC-010 SECURITY_POLICY_FAILURE
SRPC-011 PHASE_A_REGRESSION
SRPC-012 SYNTHETIC_RESIDUE
SRPC-013 ATTESTATION_INVALID
SRPC-014 UNAUTHORIZED_PIN
SRPC-015 POST_PIN_BYTE_DRIFT
SRPC-016 FRESH_CI_NOT_GREEN
SRPC-017 PRODUCTION_IDENTITY_MISMATCH
```

Every STOP report contains: code, failed gate, expected state, actual state, evidence reference, and safest permitted next action.

## 27. VVIP Release Evidence Agent Boundary

Permitted:

`READ, VERIFY, COMPARE, GENERATE_REPORT, ASSEMBLE_CAPSULE, VERIFY_ATTESTATION, PREPARE_DRAFT_PIN_CHANGE`

Forbidden:

`ALTER_PROVED_MIGRATION, REDEFINE_EXPECTED_HASH, AUTO_PIN, SELF_APPROVE, MERGE_SECURITY_PIN, HOLD_PRODUCTION_WRITE_DURING_STAGING_PROOF, BYPASS_GATE, UNAUTHORIZED_PRODUCTION_DEPLOY`

AI confidence is never release authority. Explicit evidence contracts decide pass/fail.

## 28. Deferred Extensions

### SRPC v2 — Hermetic Clean-Room Rehearsal

An ephemeral Supabase branch may supplement real Staging with clean replay proof. It never replaces Staging.

### Steel Shield v2 — Signed Policy Manifest

A future project may move reviewed hashes from Bash into a dedicated signed policy manifest. It is intentionally excluded from Phase B so the security-policy substrate is not redesigned while Phase B is being proved.

### SRPC v3 — Confidential / Zero-Knowledge Verification

ZK mechanisms are deferred until a concrete privacy-preserving verification requirement exists.

## 29. Implementation Units

Implementation is decomposed into independently testable units:

1. source/byte lock;
2. capsule builder + schema validator;
3. Staging identity preflight;
4. ledger/schema classifier;
5. single-migration runner;
6. structural verifier;
7. runtime behavior verifier;
8. Phase A regression verifier;
9. attestation generator/verifier;
10. security-review package;
11. pin-diff guard;
12. fresh-CI release gate;
13. Production preflight + closure proof.

Each unit receives only the minimum credentials needed for its responsibility.

## 30. Definition of Done

SRPC v1 Phase B is complete only when demonstrated without bypass:

- exact H0 source proof;
- exact migration digest;
- immutable Release Capsule;
- runtime-resolved protected Staging identity;
- ledger/schema classification;
- exact single-migration application or legitimate verification-only classification;
- structural verification;
- transaction-scoped runtime/security proof;
- Phase A non-regression;
- zero synthetic residue;
- provenance and VVIP verification attestations;
- independent security approval;
- pin-only H1;
- H0/H1 migration-byte equality;
- fresh H1 CI green;
- Production remains blocked until its existing gate is satisfied;
- after permitted Production promotion, Production Closure Capsule proves final canonical state.

Until all applicable conditions are satisfied, SRPC remains fail-closed.

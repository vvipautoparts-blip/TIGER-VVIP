# VVIP TIGER Sovereign Release Proof Chain — SRPC v1

Status: **OWNER-APPROVED DESIGN**  
Date: **2026-08-09**  
Scope: **Global Launch Phase B controlled promotion and future release-proof baseline**

## 1. Purpose

SRPC v1 establishes one fail-closed release-proof chain that cryptographically and procedurally binds:

`exact source commit -> exact migration bytes -> staging identity -> controlled single-migration execution -> runtime/security proof -> immutable evidence capsule -> cryptographic attestation -> independent security approval -> Steel Shield reviewed-hash pin -> fresh exact-head CI -> production eligibility`

The design exists to prevent evidence substitution, mutable-branch ambiguity, queue replay, policy self-approval, environment confusion, and production promotion of bytes that were not the bytes proven on Staging.

Core constitutional rule:

> **Proof cannot grant Authority, and Authority cannot change Proof.**

No component that generates release evidence may approve its own evidence, mutate Steel Shield policy, merge its own security change, or deploy Production.

## 2. Phase B Frozen Release Identity

The current Phase B candidate is frozen as:

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Pull request: `#181`
- Source commit H0: `e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0`
- Migration path: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- Expected migration SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`
- Target proof environment: Supabase branch `lc04-sovereign-staging-20260807`
- Current Staging project ref: `mduummtnlupktjaujgyx`
- Production project ref: `zelcngyyvbomuzokvuxo`

These identifiers are release evidence, not convenience defaults. Any byte change to the migration creates a new candidate and invalidates the prior Phase B proof chain.

## 3. Non-Negotiable Invariants

1. No branch-relative `HEAD`, `latest`, or synthetic PR merge commit may substitute for H0 during the pre-pin proof.
2. The migration digest must be computed from the exact artifact that will be executed.
3. No automatic recalculation may bless a new digest after a mismatch.
4. No `supabase db push`, generic pending-migration queue, migration loop, or replay-all mechanism is permitted for Phase B promotion.
5. No manual insertion into migration-ledger tables is permitted.
6. Staging identity must be proven before any DDL-capable step receives access to Staging credentials.
7. Production credentials must not be available to Staging proof jobs.
8. Phase B proof and Steel Shield pinning are separate authority domains.
9. Auto-pinning is forbidden.
10. A pinning change must not modify the Phase B migration bytes.
11. Fresh full CI must run on the post-pin commit H1; H0 CI cannot authorize Production after the policy commit exists.
12. Production remains blocked until all required owner/security gates are satisfied.
13. Any missing evidence is a failure, not an unknown-pass state.
14. No gate bypass is permitted.

## 4. Three-Plane Architecture

### 4.1 Proof Plane

Responsibilities:

- source lock;
- exact-byte verification;
- static contract tests;
- Release Capsule assembly;
- Staging identity verification;
- ledger/schema classification;
- controlled Phase-B-only migration execution;
- runtime, RLS, ACL, Storage, regression, and residue verification;
- machine-readable decision generation;
- artifact/provenance/security attestations.

The Proof Plane has no authority to modify the reviewed-hash policy.

### 4.2 Authority Plane

Responsibilities:

- independent review of the completed Release Capsule;
- verification of machine attestations;
- authorization of one pin-only change;
- rejection of incomplete, inconsistent, substituted, or stale evidence.

The Authority Plane cannot alter the migration artifact proved by the Proof Plane.

### 4.3 Execution Plane

Responsibilities:

- fresh post-pin exact-head CI;
- Production identity re-verification;
- promotion of the exact proven migration bytes only;
- Production post-deployment verification;
- final closure evidence.

The Execution Plane cannot bypass Proof or Authority.

## 5. SRPC State Machine

Release states are explicit and monotonic:

1. `SOURCE_LOCKED`
2. `STATIC_PROOF_PASSED`
3. `CAPSULE_BUILT`
4. `STAGING_IDENTITY_VERIFIED`
5. `STAGING_PREFLIGHT_VERIFIED`
6. `STAGING_MIGRATION_APPLIED_OR_ACCOUNTED`
7. `STAGING_RUNTIME_VERIFIED`
8. `EVIDENCE_COMPLETE`
9. `ELIGIBLE_FOR_SECURITY_REVIEW`
10. `SECURITY_APPROVED`
11. `PIN_COMMIT_CREATED`
12. `POST_PIN_BYTES_VERIFIED`
13. `FRESH_CI_GREEN`
14. `PRODUCTION_ELIGIBLE`
15. `PRODUCTION_VERIFIED`

No later state may be asserted if any preceding state lacks machine-verifiable evidence.

## 6. Gate 0 — Release Intent Lock

The workflow materializes immutable inputs:

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

Mismatch => `STOP`.

## 7. Gate 1 — Exact Source Lock

The workflow must explicitly check out H0, not a mutable branch and not `refs/pull/*/merge`.

Required evidence:

- expected H0;
- actual checked-out commit;
- repository identity;
- migration Git blob identity;
- git tree identity where available.

`actual_commit != H0` => `SRPC-001 SOURCE_COMMIT_MISMATCH`.

## 8. Gate 2 — Exact Byte Lock and Static Proof

The Phase B static test suite must run from H0 in an unprivileged job with no database deployment secrets.

Required result:

- Phase B contract tests: all pass;
- emitted SHA-256 equals the frozen expected digest;
- the digest is computed from repository bytes, not copied or edited SQL.

`actual_sha256 != expected_sha256` => `SRPC-003 BYTE_HASH_MISMATCH`.

## 9. Gate 3 — Immutable Sovereign Release Capsule

The Proof Plane builds one content-addressed artifact:

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

The capsule must contain no secrets, passwords, service-role values, access tokens, private connection strings, or user data dumps.

The capsule is immutable evidence. Corrections require a new capsule identity, not in-place replacement.

## 10. Release Manifest Contract

`release-manifest.json` must include at least:

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

No field may claim a pass before its evidence file exists and validates.

## 11. Gate 4 — Protected Staging Identity

Before DDL, the Staging proof must verify all of:

- branch name is `lc04-sovereign-staging-20260807`;
- resolved project ref is the expected current Staging ref;
- project ref differs from Production;
- parent project relationship is expected;
- branch is healthy;
- no Production host/ref/credential is present in the deployment job;
- workflow/environment identity is recorded.

Any ambiguity => fail closed.

A dedicated protected GitHub Environment named `staging-release` is recommended, with Staging-only secrets and deployment restrictions. A separate `production-release` environment must hold Production-only secrets.

## 12. Concurrency and Race Protection

Only one Phase B Staging promotion may execute at a time.

The deployment workflow must use a release-specific concurrency group. Parallel or stale release attempts must not race through a shared ledger preflight.

Concurrent state mutation => `SRPC-006 LEDGER_RACE_DETECTED`.

## 13. Gate 5 — Ledger and Schema Classification

Migration ledger and schema state are independent signals.

### State A — Ledger absent / canonical target schema

Allowed controlled convergence state. This matches the expected current Staging pattern where prior rehearsals may already have created target objects but the Phase B convergence migration itself is not in the ledger.

### State B — Ledger absent / partial or drifted schema

`STOP — SRPC-007 SCHEMA_DRIFT`.

### State C — Ledger present / same accounted release / canonical schema

Do not reapply. Enter verification-only mode.

### State D — Ledger present / evidence unknown

`STOP — UNACCOUNTED_EXECUTION`.

### State E — Ledger present / partial schema

`CRITICAL STOP`.

Object existence alone must never be used as proof that the migration was legitimately applied.

## 14. Gate 6 — Exact Single-Migration Execution

Forbidden mechanisms:

- `supabase db push`;
- run-all-pending;
- shell iteration over migrations;
- migration-queue replay;
- manual migration-ledger insertion;
- SQL copied from an editor or chat response.

The DDL input must be the `migration.sql` bytes already sealed in the Release Capsule and re-hashed immediately before application.

For the current connected Supabase control plane, the intended primitive is one explicit migration application with migration name `global_launch_phase_b_marketplace_convergence` and the exact sealed SQL body.

## 15. Gate 7 — Post-Deployment Double Fingerprint

A successful DDL response is insufficient.

Capture and validate:

- ledger after;
- schema after;
- target tables;
- functions;
- triggers;
- indexes;
- constraints;
- RLS enabled state;
- FORCE RLS state;
- policy names and commands;
- grants/revokes;
- private helper exposure;
- `listing-media` bucket privacy, MIME allowlist, and size limit;
- trusted review RPC exposure;
- append-only audit behavior.

Unexpected object, privilege, or policy drift => fail closed.

## 16. Gate 8 — Transaction-Scoped Behavioral Proof

The Staging runtime proof must create only synthetic proof data inside an explicit transaction and roll it back.

Required behaviors:

1. non-Clerk subject cannot own a listing;
2. inactive/unsealed country blocks listing creation;
3. owner may create DRAFT only;
4. owner cannot self-promote to ACTIVE;
5. unauthorized reviewer cannot approve;
6. authorized reviewer can approve eligible `PENDING_REVIEW` content;
7. audit entry is appended;
8. audit entry cannot be updated/deleted;
9. transaction rolls back;
10. synthetic residue count is zero.

Synthetic data must never become release seed data.

## 17. Gate 9 — Phase A Non-Regression

Phase B cannot be declared safe by testing Phase B alone.

The Phase A security/identity contract must pass after Phase B proof. Any regression in Phase A causes `SRPC-011 PHASE_A_REGRESSION`.

## 18. Gate 10 — Evidence Completeness Decision

The decision may become `ELIGIBLE_FOR_SECURITY_REVIEW` only when all of the following are true:

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
ATTESTATIONS_VALID=true
```

`ELIGIBLE_FOR_SECURITY_REVIEW` is not Steel Shield approval and is not Production approval.

## 19. Gate 11 — Cryptographic Attestation Model

SRPC v1 uses two logically separate attestations.

### 19.1 Provenance Attestation

Subject: immutable Release Capsule artifact.

Purpose: prove repository/workflow/commit provenance and artifact digest.

### 19.2 VVIP Staging Verification Attestation

Predicate namespace: `https://vvip.tiger/attestation/staging-promotion/v1`.

Required claims include:

- H0;
- migration path and SHA-256;
- Staging identity;
- ledger classification;
- execution scope;
- queue runner not used;
- runtime/security result;
- Phase A regression result;
- synthetic residue result;
- decision state.

The VVIP security predicate must not be disguised as SLSA provenance. Provenance describes how an artifact was built; VVIP verification describes what release/security properties were proven.

Where in-toto is emitted, SRPC uses Statement v1 semantics.

## 20. Gate 12 — Independent Human Security Approval

Machine proof does not approve itself.

The reviewer must verify at least:

- capsule digest;
- H0 identity;
- migration digest;
- Staging identity;
- ledger before/after;
- schema before/after;
- runtime/RLS/ACL/Storage evidence;
- Phase A non-regression;
- zero residue;
- attestation validity;
- no bypass or manual mutation.

Only after this review may one pin-only change be authorized.

## 21. Gate 13 — Steel Shield Pin-Only Commit

Steel Shield currently stores reviewed migration hashes inside:

`scripts/security/p08-steel-shield/scan-dangerous-sql.sh`

SRPC v1 does not refactor this mechanism during Phase B.

The approved change may add exactly one reviewed baseline entry for:

`supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`

with the proven digest.

This creates post-pin commit H1.

Auto-pinning is forbidden. A workflow may prepare a draft change, but approval/merge authority is separate.

## 22. Post-Pin Byte Invariance

Before Fresh Full CI, prove:

```text
SHA256(migration @ H0)
==
SHA256(migration @ H1)
==
9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9
```

Any migration drift => `SRPC-015 POST_PIN_BYTE_DRIFT` and the prior Staging proof is invalid for Production.

The H0->H1 diff must be constrained to the approved policy/evidence changes. Unexpected application or migration changes block the release.

## 23. Gate 14 — Fresh Exact-Head CI on H1

All required release/security workflows must run fresh on the same H1.

Required plane includes at minimum, when applicable:

- VVIP Quality Gate;
- V14 Release Candidate;
- Project Control Integrity;
- Documentation checks;
- CleanGuard;
- Dependency Review;
- CodeQL;
- LC03/LC04/LC05/LC06 rehearsals;
- Phone OTP rehearsal;
- all additional required target-branch security checks emitted by GitHub.

No stale successful check from H0 may substitute for H1 evidence.

Any required failure => `SRPC-016 FRESH_CI_NOT_GREEN`.

## 24. Production Eligibility and Execution

`PRODUCTION_ELIGIBLE` requires:

- security-approved H1;
- post-pin byte invariance;
- fresh H1 CI green;
- valid Staging Release Capsule and attestations;
- Production identity proof;
- no unexplained Production drift;
- exact Phase B artifact identity;
- explicit satisfaction of the existing Production owner gate.

Production input bytes must equal the proven Staging bytes. No rebuild, copy/paste transformation, regenerated SQL, or changed hash is permitted.

## 25. Production Closure Capsule

After Production deployment, generate closure evidence containing:

- Production identity;
- H1;
- exact migration digest;
- ledger before/after;
- schema verification;
- RLS/ACL/Storage verification;
- runtime smoke proof;
- Phase A non-regression;
- security advisors where available;
- deployment run identity;
- final decision.

Only then may project state declare:

`GLOBAL_LAUNCH_PHASE_B = PRODUCTION_VERIFIED`.

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

Every STOP report must contain:

- stop code;
- failed gate;
- expected value/state;
- actual value/state;
- evidence reference;
- safest permitted next action.

## 27. VVIP Release Evidence Agent Boundary

Permitted:

- READ;
- VERIFY;
- COMPARE;
- GENERATE REPORT;
- ASSEMBLE CAPSULE;
- VERIFY ATTESTATION;
- PREPARE DRAFT PIN CHANGE.

Forbidden:

- alter the Phase B migration after proof;
- redefine the expected hash;
- auto-pin reviewed hashes;
- approve its own proof;
- merge the security pin;
- hold Production write authority during Staging proof;
- deploy Production without the Production gate;
- bypass a failed gate.

AI confidence scores are not release authority. Evidence is binary pass/fail against explicit contracts.

## 28. Deferred Extensions

The following are intentionally outside SRPC v1 Phase B critical path:

### SRPC v2 — Hermetic Clean-Room Rehearsal

An ephemeral Supabase branch may be used before real Staging for clean replay and isolation proof. It supplements Staging; it never replaces real Staging verification.

### Steel Shield v2 — Signed Policy Manifest

A future project may move reviewed hashes from the current Bash associative array into a dedicated signed policy manifest. This is not mixed into Phase B to avoid changing the policy substrate while proving the release.

### SRPC v3 — Confidential / Zero-Knowledge Verification

ZK proof mechanisms are deferred until a concrete privacy-preserving verification requirement exists. They are not required to prove the current exact-byte/Staging/RLS release contract.

## 29. Implementation Boundaries

SRPC v1 implementation must be decomposed into separately testable units:

1. source/byte lock;
2. capsule builder and schema validator;
3. Staging identity preflight;
4. ledger/schema classifier;
5. single-migration runner;
6. post-deployment structural verifier;
7. runtime behavior verifier;
8. Phase A regression verifier;
9. attestation generator/verifier;
10. security-review package;
11. pin-diff guard;
12. fresh-CI release gate;
13. Production preflight and closure proof.

No unit may acquire broader credentials than it needs.

## 30. Definition of Done for SRPC v1 Phase B

SRPC v1 is operational for Phase B when all of the following are demonstrated without bypass:

- H0 exact source proof;
- exact digest proof;
- immutable Release Capsule;
- protected Staging identity;
- ledger/schema classification;
- exact single-migration application or legitimate verification-only classification;
- post-deployment structural verification;
- transaction-scoped runtime/security proof;
- Phase A non-regression;
- zero synthetic residue;
- provenance + VVIP verification attestations;
- independent security approval;
- pin-only H1;
- H0/H1 migration-byte equality;
- fresh H1 CI green;
- Production remains blocked until the existing owner Production gate is satisfied;
- after permitted Production promotion, Production Closure Capsule proves final canonical state.

Until these conditions are satisfied, the release state remains fail-closed.

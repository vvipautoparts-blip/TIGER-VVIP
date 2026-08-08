# VVIP TIGER A++ — Sovereign Verified Execution Fabric (SVEF)

Status: FINAL APPROVED DESIGN
Date: 2026-08-08
Base SHA: `0f2c6f2d688998401494fa4d847ec72120fb9ffa`
Branch: `feat/svef-a-plus-plus-20260808`

## 1. Governing Objective

The release objective is **ZERO_UNPROVEN_RELEASE**, not an unverifiable claim of zero vulnerabilities.

A release is eligible only when the exact bytes that passed verification are the exact bytes authorized and promoted.

```text
BUILD ONCE -> ATTEST -> VERIFY EXACT BYTES -> AUTHORIZE EXACT DIGEST -> PROMOTE EXACT BYTES
```

No rebuild is permitted after release verification.

## 2. Sovereign Invariants

1. **Zero Implicit Trust** — browser, CI label, environment name, model output, and operator claims are not roots of trust.
2. **Zero Mutable Release Dependency** — release actions, toolchains, build images, and dependency resolution must be immutable or content-addressed.
3. **Zero Unattested Artifact** — every final candidate carries verifiable provenance and an SBOM.
4. **Zero Rebuild After Verification** — Production promotes the tested artifact digest; it does not rebuild release bytes.
5. **Zero Ambient Production Authority** — a component receives only the narrow capability needed for its role.
6. **Zero Self-Verification** — Builder, verifier, authorizer, and deployer are distinct trust roles.
7. **Zero Replay Authority** — sensitive authorization and proof freshness use nonce/jti semantics and single-use or bounded replay controls.
8. **Zero Unknown Critical Gate** — missing, skipped, stale, mismatched, or unprovable evidence is `BLOCKED`.
9. **Zero Security-Control Bypass** — no failed critical launch gate is converted to PASS manually.
10. **Zero Unproven Release** — no global launch until the complete Evidence Root matches the authorized artifact.

## 3. Five-Key Sovereignty

### 3.1 Builder
Builds candidate bytes only. It cannot authorize or deploy.

### 3.2 Machine Attestor
Produces signed provenance/attestation for the exact artifact and exact source identity. It cannot change artifact bytes or authorize deployment.

### 3.3 Independent Verifier
Recomputes digests, verifies provenance, verifies evidence capsules, and evaluates release policy. It cannot rebuild, authorize, or deploy.

### 3.4 Sovereign Authorizer
Owner step-up authorization is bound to exact `release_digest`, `artifact_digest`, `evidence_root`, payload, scope, environment, rollout ceiling, nonce, and expiry.

### 3.5 Constrained Deployer
Can promote only the exact artifact digest approved by the release decision. It cannot select arbitrary source, rebuild bytes, or weaken gates.

## 4. Work Package A — Immutable Supply Chain + Build Once

### 4.1 Immutable GitHub Actions
All release/security workflows MUST pin third-party and GitHub Actions to full immutable commit SHAs. Version tags such as `@v7`, `@v6`, `@v5`, and `@v4` are forbidden in protected release workflows.

A repository test MUST fail closed if a protected workflow contains an unpinned `uses:` reference.

### 4.2 Deterministic Candidate Identity
The V14 candidate remains exact-source bound. The build output MUST publish:

- exact source SHA;
- exact source tree;
- artifact SHA-256;
- release manifest;
- dependency/SBOM digest;
- provenance/attestation identity.

### 4.3 Build Once / Promote Exact Bytes
Production deployment MUST NOT call `tools/vvip_public_release.py` or otherwise rebuild the final artifact.

The production path accepts only a previously built, verified artifact identified by its digest and release decision.

Any digest mismatch is `NO_GO`.

### 4.4 Dependency and Toolchain Integrity
Release dependency installation must not perform uncontrolled upgrades. Tool/runtime versions are pinned. Lock/hash validation is fail closed.

## 5. Work Package B — Proof Capsule V2 + Evidence Root

### 5.1 Proof Capsule V2
`TSRF_PROOF_CAPSULE_V2` extends the current evidence contract with:

- `evidence_nonce`;
- `expires_at`;
- `sbom_sha256`;
- `provenance_sha256`;
- `builder_identity`;
- `workflow_repository_id`;
- `workflow_ref`;
- `workflow_sha`;
- `workflow_run_attempt`;
- `environment_id`;
- `environment_policy_digest`;
- `runtime_config_digest`.

Trusted CI identity fields MUST come from trusted execution context, never proof payload input.

V2 remains evidence-only. Authority-shaped fields remain forbidden.

### 5.2 Canonical Evidence Root
A deterministic Evidence Root is computed from a canonical ordered set containing:

- Release DNA;
- artifact digest;
- SBOM digest;
- provenance digest;
- all mandatory proof capsule digests;
- environment identity proof digest;
- legal proof digest.

The Evidence Root changes if any mandatory evidence byte changes.

### 5.3 Replay and Freshness
A PASS capsule requires a bounded freshness window, unique/bounded nonce semantics, internally ordered timestamps, and exact Release DNA/artifact binding.

Missing nonce, stale evidence, duplicate nonce where single-use is required, or an untrusted workflow identity is `BLOCKED`.

## 6. Work Package C — Zero Ambient Authority

### 6.1 Database
Protected tables continue to use `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.

The security model MUST additionally account for PostgreSQL roles that can bypass RLS. Application/runtime roles must not have DDL or `BYPASSRLS` capability.

Schema ownership and migration authority are separate from daily runtime authority.

Privileged runtime operations use narrow RPC/capability boundaries rather than broad ambient database authority wherever the platform permits.

### 6.2 Session Identity
A session variable is not trusted merely because it is stored in PostgreSQL session state. Any privileged identity context must originate from a server-controlled or cryptographically verified boundary that the browser cannot set authoritatively.

### 6.3 OTP
Keep the current CSPRNG + HMAC + atomic challenge model. Do not rewrite it unnecessarily.

Hardening additions:

- concurrency/race proof;
- real Staging provider proof;
- narrow database authority;
- signed Proof Capsule V2 evidence;
- fail-closed abuse/rate-limit evidence.

### 6.4 AI Least-Agency Cage
Assume prompt injection can occur. Security does not depend on perfect jailbreak detection.

The AI boundary MUST enforce:

```text
UNTRUSTED INPUT
 -> context classification/separation
 -> LLM
 -> strict structured output
 -> output security gate
 -> capability broker
 -> policy decision
 -> DENY / SAFE PROPOSE / OWNER STEP-UP
```

The inference boundary cannot obtain ambient production mutation authority.

Network egress is allowlisted to exact required services. Arbitrary internal/private/link-local/metadata destinations are denied.

## 7. Work Package D — Empirical Sovereign Release Gate

### 7.1 Three Test Speeds

**PR Fast Gate**
- unit/contract tests;
- SAST/CodeQL;
- immutable-action policy;
- dependency review;
- AST/semantic source checks;
- RLS contracts;
- evidence contract tests.

**Staging Security Gate**
- same-SHA real Staging identity;
- OTP E2E;
- PR36 real JPG pipeline;
- AI shadow / prompt-injection negatives;
- Owner Step-Up negatives;
- DAST;
- k6 concurrency/race/security invariants.

**Release Candidate Sovereign Gate**
- exact artifact bytes;
- verified provenance;
- verified SBOM;
- all mandatory Proof Capsules;
- Blackbox P0/P1 closure;
- cross-browser/mobile;
- performance SLO evidence;
- restore/rollback evidence;
- legal/country evidence;
- independent verification.

Mandatory release evidence cannot be `SKIP`.

### 7.2 Security Invariants Under Load
Performance/load tests verify security properties as well as latency:

- cross-tenant leak count = 0;
- duplicate OTP success = 0;
- double authorization consume = 0;
- unauthorized write = 0;
- audit-chain gap = 0;
- idempotency conflict leakage = 0.

### 7.3 Asymmetric Break-Glass
Emergency controls may only reduce authority/risk without fresh owner authorization:

Allowed emergency direction:
- enable kill switch;
- disable AI/feature/country;
- revoke sessions/keys;
- reduce traffic;
- freeze writes;
- roll back to previously approved digest.

Forbidden emergency direction:
- disable kill switch;
- enable L4;
- promote DB;
- activate Production;
- increase privileges;
- bypass a failed gate.

## 8. Environment Identity

An environment does not prove itself by setting a boolean.

Remote Staging proof requires independently bound identity facts including repository/environment identity, protected ref policy, runtime endpoint/config fingerprint, and exact source/artifact binding.

Secret values are never written to evidence. Only non-secret references/version identities or digests are permitted.

If Staging identity is not independently proven, the release remains `BLOCKED_STAGING_IDENTITY_UNPROVEN`.

## 9. Release Decision Contract

```text
GLOBAL_LAUNCH_READY = TRUE
```

only when all of the following are true on one immutable release package:

- exact source SHA/tree verified;
- exact artifact digest verified;
- artifact provenance verified;
- SBOM verified;
- protected workflow/action immutability verified;
- Proof Capsule V2 chain verified;
- Evidence Root verified;
- OTP security proven;
- RLS/authorization security proven;
- AI shadow/least-agency safety proven;
- Staging environment identity proven;
- PR36 real media flow proven;
- DAST/Blackbox P0/P1 closed;
- cross-browser/mobile proof passed;
- performance/concurrency SLO proof passed;
- backup restore/rollback proof passed;
- legal/country activation proof passed;
- independent verifier passed;
- owner authorization is valid, exact-bound, unexpired, and unconsumed;
- constrained deployer can promote only the authorized artifact digest.

Anything else is `NO_GO` / `BLOCKED`.

## 10. Non-Goals

This work does not promise that unknown future vulnerabilities cannot exist.
It does not introduce decorative scanners, blockchain, a microservice rewrite, mandatory device fingerprinting, or a new OTP architecture without evidence of need.
It does not make Production changes merely to prove the design.

## 11. Rollout and Rollback

Implementation is performed in four bounded work packages A-D. Each package follows RED -> GREEN -> exact-SHA verification.

A source change invalidates source-bound release evidence and requires evidence regeneration on the new SHA.

Production promotion occurs only after the final candidate is frozen and the complete release package is independently verified.

# TSRF Launch Evidence Plane Implementation Plan

> **Execution rule:** implement task-by-task with TDD. Every behavior starts RED, then receives the smallest GREEN implementation. A new commit creates a new evidence identity; PASS from older SHAs is historical only.

**Goal:** Build a fail-closed TSRF Evidence Plane that derives immutable Release DNA from trusted same-SHA surfaces, validates strict Proof Capsules, and packages verified evidence without creating release authority.

**Branch:** `feat/tsrf-launch-evidence-plane-20260808`

**Historical parent RC:** `238082e3f3b71301911380e2214ac04ef9f1f52d` — historical evidence only after this branch changes.

**Tech:** Node.js 22 built-ins, CommonJS, `node:test`, SHA-256, Git, GitHub Actions. No new runtime dependency.

## 1. Non-negotiable security constraints

- Allowed proof environments: `LOCAL`, `STAGING`, `NON_RUNTIME`; `PRODUCTION` is rejected by this sub-project.
- `STAGING` requires `kill_switch_state=TRUE`.
- `LOCAL` and `NON_RUNTIME` require `kill_switch_state=NOT_APPLICABLE`.
- `kill_switch_state=FALSE` is always rejected.
- `source_sha` and `source_tree` are 40 lowercase hex.
- SHA-256 values are 64 lowercase hex.
- `workflow_run_id` and `runner_identity` are trusted-context fields and may not come from untrusted proof payloads.
- Evidence cannot contain or infer owner/merge/Production authorization.
- No Production secrets, Production DB mutation, Production deployment, L4 activation, merge, or Staging kill-switch disablement.
- `prompt_sha256` and `model_config_sha256` remain separate.
- Remote `STAGING` packaging is fail-closed unless Staging identity/config can be positively proven.

## 2. Trusted Release DNA derivation contract

Caller-supplied digest strings are never authoritative. `deriveReleaseDna()` computes each field from trusted same-SHA source/build material.

### 2.1 Git identity

Derive:

- `source_sha` from `git rev-parse HEAD`.
- `source_tree` from `git rev-parse HEAD^{tree}`.

The derivation API may accept an injected Git adapter for tests, but it accepts no caller-provided source SHA/tree as truth.

### 2.2 `frontend_build_sha256`

Build the V14 public candidate for the same exact HEAD using `tools/vvip_public_release.py` into an isolated temporary directory.

Validate before hashing:

1. candidate manifest `sourceSha` equals trusted HEAD;
2. `releaseEligible === true`;
3. every manifest `files[path]` digest matches the actual candidate byte content;
4. no extra candidate file exists outside the manifest except the manifest itself.

Do **not** hash mutable `builtAt`. Derive:

`SHA256(canonical_json(manifest.files))`

where file keys are canonicalized lexicographically.

### 2.3 `backend_edge_build_sha256`

Recursively hash every regular `.ts` file under `supabase/functions/`. Produce sorted canonical records `{path, sha256}` and hash their canonical JSON. Symlinks, path escapes, or zero matching files => BLOCKED.

### 2.4 `migration_digests`

Derive from every regular `supabase/migrations/*.sql` file as sorted `{path, sha256}` records. No caller-supplied migration list is trusted.

### 2.5 `ai_policy_sha256`

Hash a fixed exact source set:

- `supabase/functions/tiger-sovereign-ai/index.ts`
- `supabase/migrations/20260808130000_tsrf_ai_trust_fabric.sql`
- `supabase/migrations/20260808131000_tsrf_ai_runtime_atomicity.sql`
- `supabase/migrations/20260808132000_tsrf_owner_authorization_leases.sql`

Any missing path => BLOCKED. Hash canonical sorted `{path, sha256}` records.

### 2.6 `prompt_sha256`

Source: `supabase/functions/tiger-sovereign-ai/index.ts` only.

Extract exactly two source-defined prompt surfaces using strict markers:

- the complete `AGENT_INSTRUCTIONS` object;
- the fixed provider policy instruction literals inside `buildProviderRequest()`.

Runtime interpolation values (`promptVersion`, `releaseDigest`, agent id, user input) are excluded. Marker missing, duplicated, or ambiguous => BLOCKED. Hash canonical JSON of the extracted source literals.

### 2.7 `model_config_sha256`

No trustworthy Staging configuration source exists in the repository today, and GitHub currently has no Environment named `staging`. Therefore this field has two modes:

- `LOCAL/NON_RUNTIME`: derive a **model configuration contract hash** from source-defined, non-secret configuration policy in `tiger-sovereign-ai/index.ts`: provider endpoint constant, environment variable names `TIGER_AI_OPENAI_MODEL`, `TIGER_AI_PROMPT_VERSION`, `TIGER_AI_MAX_OUTPUT_TOKENS`, normalized min/max/default token policy, and identity-verifier HTTPS policy. This proves the executable configuration contract, not a deployed model choice.
- `STAGING`: require a trusted Staging configuration snapshot supplied by a repository-controlled protected Staging identity. The snapshot must contain actual non-secret values `{model, prompt_version, max_output_tokens, provider_endpoint, identity_verifier_class}` and must not originate from workflow_dispatch/user input. Until such a trusted Staging identity exists, remote STAGING capsule generation returns `BLOCKED_STAGING_IDENTITY_UNPROVEN`.

The Evidence Plane MUST NOT invent model names, prompt versions, or environment values.

### 2.8 `tool_registry_sha256`

Current gateway is expected to have no tool execution. Derive canonical `[]` only after source validation proves all of:

- provider request contains no `tools` property;
- source contains the explicit boundary `cannot execute actions or invoke L4 tools`;
- usage ledger records `tool_calls: 0`;
- audit metadata records `toolExecution: false`.

Any missing guard => BLOCKED.

### 2.9 `rls_sha256`

Scan regular SQL migrations. Include files containing at least one case-insensitive RLS construct:

- `ENABLE ROW LEVEL SECURITY`
- `FORCE ROW LEVEL SECURITY`
- `CREATE POLICY`

Hash sorted `{path, sha256}` records. Zero matching files => BLOCKED.

### 2.10 `security_config_sha256`

Hash this fixed source set exactly:

- `.github/workflows/vvip-quality-gate.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/dependency-review.yml`
- `.github/workflows/tiger-cleanguard.yml`
- `.github/workflows/project-control-integrity.yml`
- `.github/workflows/tsrf-semantic-convergence.yml`
- `.github/workflows/lc03-supabase-security-rehearsal.yml`
- `.github/workflows/tsrf-phone-otp-rehearsal.yml`
- `scripts/quality-gate.sh`
- `scripts/security/p08-steel-shield/scan-secret-leaks.sh`
- `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`

Missing path => BLOCKED. Hash canonical sorted `{path, sha256}` records.

### 2.11 Canonical Release DNA

Output fields are exactly:

- `dna_version`
- `source_sha`
- `source_tree`
- `frontend_build_sha256`
- `backend_edge_build_sha256`
- `migration_digests`
- `ai_policy_sha256`
- `prompt_sha256`
- `model_config_sha256`
- `tool_registry_sha256`
- `rls_sha256`
- `security_config_sha256`
- `environment_class`

`environment_class` is `STAGING_CANDIDATE` for this release train. `release_digest = SHA256(canonical_json(release_dna))`.

## 3. Repository files

Create:

- `scripts/tsrf/evidence/contracts.cjs`
- `scripts/tsrf/evidence/release-dna.cjs`
- `scripts/tsrf/evidence/proof-capsule.cjs`
- `scripts/tsrf/evidence/staging-bridge.cjs`
- `tests/tsrf-launch-evidence-plane.test.cjs`
- `.github/workflows/tsrf-staging-evidence.yml`

No source-controlled Staging model-value file is created unless a real approved Staging configuration source exists. Unknown operational values remain BLOCKED rather than guessed.

---

## Task 1 — Core contracts and canonicalization

### RED

Create only `tests/tsrf-launch-evidence-plane.test.cjs` first. Tests require the still-missing `contracts.cjs` and cover:

- recursive canonical object-key ordering;
- array-order preservation;
- rejection of floats/non-finite/undefined/functions/symbols/BigInt/Date/non-plain objects;
- strict SHA-40/SHA-256 validation;
- UTC timestamp validation;
- `STAGING+TRUE` allowed;
- `LOCAL/NON_RUNTIME+NOT_APPLICABLE` allowed;
- PRODUCTION rejected;
- FALSE kill switch rejected;
- authority-shaped and secret-shaped metadata rejected;
- deep freeze.

Run `node --test tests/tsrf-launch-evidence-plane.test.cjs`; expected RED is `MODULE_NOT_FOUND` for `scripts/tsrf/evidence/contracts.cjs`.

### GREEN

Implement minimal `scripts/tsrf/evidence/contracts.cjs` exporting:

`EvidenceError`, constants/field allowlists, `canonicalJson`, `sha256Hex`, SHA/timestamp validators, environment policy validator, forbidden-shape validator, `deepFreeze`.

Bounded error codes must not echo untrusted values.

Re-run focused suite. Commit only Task 1 source + tests.

---

## Task 2 — Trusted deterministic Release DNA

### RED

Extend the same test file before implementation. Test an isolated temporary repository fixture and injected Git adapter. Required cases:

- source SHA/tree come from Git adapter, not caller values;
- frontend manifest source mismatch rejected;
- frontend `releaseEligible=false` rejected;
- frontend byte/hash mismatch rejected;
- mutable `builtAt` does not affect frontend build digest;
- edge file order does not affect digest;
- migrations derived and sorted automatically;
- fixed AI policy path missing => BLOCKED;
- prompt extraction deterministic and model config separate;
- gateway tool-registry guards produce hash of `[]`; removal of any guard => BLOCKED;
- RLS source set derived from SQL semantics;
- fixed security-config path missing => BLOCKED;
- caller-supplied digest fields are rejected/ignored as authority;
- same trusted source surfaces => same `release_digest`.

### GREEN

Implement `scripts/tsrf/evidence/release-dna.cjs` exporting:

- `deriveReleaseDna({ repositoryRoot, candidateDir, environmentClass, trustedStagingConfig, git, fsApi })`
- `computeReleaseDigest(releaseDna)`

The module computes all hashes itself. For `STAGING_CANDIDATE`, a caller cannot substitute raw component digests.

`trustedStagingConfig`, when used for actual remote STAGING evidence, must carry a provenance marker from the bridge's trusted environment provider; a normal proof payload cannot set it.

Re-run focused tests; commit Task 2 only after GREEN.

---

## Task 3 — Strict Proof Capsule core

### RED

Tests cover:

- positive STAGING capsule;
- positive LOCAL DB rebuild capsule;
- exact Release DNA digest recomputation;
- forged `workflow_run_id` / `runner_identity` in proof payload rejected;
- stale/future/misordered timestamps rejected;
- Production rejected;
- unknown capsule fields rejected;
- authority/secret shapes rejected;
- artifact digest format enforced;
- unsupported class rejected;
- inconclusive/skipped/cancelled cannot become PASS;
- output deeply immutable.

### GREEN

Implement `proof-capsule.cjs`:

`createProofCapsule({ proof, trustedContext, expectedReleaseDna, nowMs, maxAgeMs, futureSkewMs })`

and canonical serializer. `result` is only `PASS|BLOCKED`; any unverifiable condition is BLOCKED, never warning-to-PASS.

Commit after focused GREEN.

---

## Task 4 — Evidence Bridge and filesystem safety

### RED

Tests use temp directories and injected Git/filesystem adapters. Cover:

- exact Git HEAD/tree binding;
- clean worktree required before and after generation;
- artifact bytes independently hashed;
- Release DNA derived internally, not passed as authoritative input;
- output directory must be outside source repository;
- path traversal rejected;
- symlink escape rejected;
- missing/non-regular artifact rejected;
- source/tree/artifact tampering rejected;
- STAGING without trusted Staging identity/config => `BLOCKED_STAGING_IDENTITY_UNPROVEN`;
- LOCAL proof can be packaged with `NOT_APPLICABLE` kill switch;
- writes only `proof-capsule.json`, `release-dna.json`, `manifest.json`.

### GREEN

Implement `staging-bridge.cjs` with dependency injection and exclusive external writes.

Manifest exact schema:

```json
{
  "manifest_version": "TSRF_EVIDENCE_MANIFEST_V1",
  "proof_capsule_sha256": "<sha256>",
  "release_dna_sha256": "<sha256>"
}
```

The bridge never makes a failed binding a warning.

Commit after focused GREEN.

---

## Task 5 — Exact-SHA read-only GitHub workflow

### RED

Add workflow text-contract tests before creating `.github/workflows/tsrf-staging-evidence.yml`. They require:

- `permissions: contents: read`;
- exact `inputs.source_sha` checkout;
- explicit `git rev-parse HEAD` equality check;
- trusted `${{ github.run_id }}` and runner identity;
- evidence output under `${{ runner.temp }}` / `$RUNNER_TEMP`;
- exact-SHA artifact naming;
- no caller inputs named `workflow_run_id`, `runner_identity`, `authorized`, `productionReady`, or model/prompt configuration;
- no `supabase db push`;
- no Production environment/secrets;
- no merge/deploy/L4 command;
- STAGING path fails closed if Staging identity is unavailable.

### GREEN

Create read-only workflow using `actions/checkout@v7`, Node 22, exact SHA/tree checks, Evidence Bridge invocation, and `actions/upload-artifact@v6`.

Because the repository currently has no GitHub Environment named `staging`, the workflow must not claim remote STAGING identity today. It may package eligible LOCAL/NON_RUNTIME evidence and must emit BLOCKED for remote STAGING until a trusted Staging identity/config source exists.

Commit after workflow contract GREEN.

---

## Task 6 — Exact-SHA verification checkpoint

On the final implementation SHA only:

1. `node --test tests/tsrf-launch-evidence-plane.test.cjs` => PASS.
2. `node --test tests/*.test.cjs` => PASS.
3. `bash scripts/quality-gate.sh` => `VVIP_QUALITY_GATE=PASS`.
4. Record `git rev-parse HEAD`, `git rev-parse HEAD^{tree}`, clean status.
5. Same-SHA GitHub gates: Quality, CodeQL, Dependency Review, CleanGuard, Project Control Integrity, Steel Shield `CRITICAL=0 HIGH=0`.
6. Run Evidence workflow on exact SHA.
7. Package at least one **real existing** eligible proof source. If only LOCAL/NON_RUNTIME proof is trustworthy, package that and record remote STAGING as BLOCKED rather than fabricate it.
8. Record exact workflow run IDs and artifact SHA-256s.

The sub-project result may become `EVIDENCE_PLANE_GREEN` only when all approved completion criteria are satisfied. It is never itself Production authorization.

## 4. Subsequent launch work, explicitly out of this plan

After Evidence Plane GREEN, continue separate gated work for: real Staging identity/config, Staging OTP E2E, PR36 real JPG E2E, AI Shadow, Owner Step-Up negative proofs, Production read-only drift fingerprint, Blackbox P0/P1, cross-browser/mobile, performance/soak, backup restore/rollback, Jordan legal pack/country seal, independent verification, merge, Production DB promotion, and progressive activation.

Existing owner approvals remain recorded but cannot convert a failed evidence gate into PASS.

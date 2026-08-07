# AI-17 Trusted Release Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fail-closed, deterministic, repository-derived provenance envelope that cannot be fabricated by passing arbitrary component hashes.

**Architecture:** A versioned manifest defines which tracked repository files belong to each provenance component. A server/CI-only builder derives Git HEAD/tree identity, enforces a clean worktree, hashes exact file bytes, and returns an immutable `TIGER_RELEASE_PROVENANCE_V1` envelope. Cryptographic signing remains separate in AI-15.

**Tech Stack:** Node.js CommonJS, `node:test`, Node `crypto`, `fs`, `path`, `child_process.execFileSync`, Git, existing VVIP Quality Gate.

## Global Constraints
- No shell-string execution; Git commands use argv only.
- No caller-supplied component hashes.
- No absolute path, `..`, path escape, or measured symlink.
- Unknown manifest/envelope fields fail closed.
- Worktree must be clean for verified provenance.
- AI-17 proves repository/source provenance only; build/deployment attestation remains false.
- No merge, Supabase remote apply, or production activation.

---

### Task 1: Provenance Contract and RED Security Tests

**Files:**
- Create: `data/ai/sovereign-release-provenance.json`
- Create: `tests/sovereign-release-provenance.test.cjs`

**Interfaces:**
- Consumes: future `scripts/ai/sovereign-release-provenance.js`.
- Produces: expected API `createTrustedRepositoryContext`, `buildReleaseProvenance`, `verifyReleaseProvenanceIntegrity`.

- [ ] **Step 1: Write failing tests** for deterministic provenance, caller-hash rejection, dirty worktree, path traversal, symlink escape, mutation invalidation, and JSON-copy trust-brand rejection.
- [ ] **Step 2: Commit tests before implementation.**
- [ ] **Step 3: Run GitHub Quality Gate and verify RED is caused by missing provenance implementation only.**

### Task 2: Trusted Repository Context

**Files:**
- Create: `scripts/ai/sovereign-release-provenance.js`
- Test: `tests/sovereign-release-provenance.test.cjs`

**Interfaces:**
- `createTrustedRepositoryContext({ repositoryRoot }) -> opaque trusted context`
- Context derives `commitSha`, `treeSha`, clean status, canonical real root.

- [ ] **Step 1: Implement regular-directory and `.git` validation.**
- [ ] **Step 2: Run `git rev-parse HEAD`, `git rev-parse HEAD^{tree}`, `git status --porcelain` with `execFileSync` and no shell.**
- [ ] **Step 3: Reject dirty/untracked modifications for verified provenance.**
- [ ] **Step 4: Brand trusted context in-process so JSON copies are rejected.**

### Task 3: Manifest and Exact-Byte Measurement

**Files:**
- Modify: `scripts/ai/sovereign-release-provenance.js`
- Create: `data/ai/sovereign-release-provenance.json`

**Interfaces:**
- Manifest groups: `frontend`, `backend`, `aiPolicy`, `promptModel`, `toolRegistry`, `rlsPolicy`, `securityConfig`, `migrationsDirectory`.

- [ ] **Step 1: Strictly validate manifest schema and exact keys.**
- [ ] **Step 2: Resolve only relative repository paths.**
- [ ] **Step 3: Reject symlinks and non-regular files.**
- [ ] **Step 4: Hash exact bytes and deterministic path+hash tuples.**
- [ ] **Step 5: Enumerate SQL migrations from the versioned migration directory and hash each exact file.**

### Task 4: Provenance Envelope and Integrity Verification

**Files:**
- Modify: `scripts/ai/sovereign-release-provenance.js`
- Test: `tests/sovereign-release-provenance.test.cjs`

**Interfaces:**
- `buildReleaseProvenance({ trustedContext, manifestPath }) -> deep-frozen provenance`
- `verifyReleaseProvenanceIntegrity(provenance) -> boolean`

- [ ] **Step 1: Emit `TIGER_RELEASE_PROVENANCE_V1`.**
- [ ] **Step 2: Include Git commit/tree, manifest hash, component hashes, migration digests, provenance class, and explicit false build/deployment attestation flags.**
- [ ] **Step 3: Calculate canonical root SHA-256 digest.**
- [ ] **Step 4: Verify integrity by deterministic reconstruction of the envelope structure.**

### Task 5: Documentation and Exact-Head Verification

**Files:**
- Create: `docs/ai/VVIP_TIGER_SOVEREIGN_RELEASE_PROVENANCE.md`

- [ ] **Step 1: Document trust boundary and non-claims.**
- [ ] **Step 2: Run repository tests / VVIP Quality Gate.**
- [ ] **Step 3: Verify CodeQL, Dependency Review, and Project Control Integrity on the same exact head SHA.**
- [ ] **Step 4: Update the Draft PR with RED/GREEN evidence.**

## Self-review
- Spec coverage: provenance identity, clean checkout, path safety, exact-byte hashing, deterministic integrity, explicit non-claims, and CI gates are covered.
- Placeholder scan: no implementation placeholders are used as requirements.
- Type consistency: all three public API names are consistent across tasks.

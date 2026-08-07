# AI-17 Trusted Release Provenance Design

## Status
APPROVED BY OWNER DIRECTION / IMPLEMENTATION AUTHORIZED

## Goal
Derive release provenance from the actual checked-out Git repository and versioned provenance manifest instead of trusting hashes supplied by callers.

## Constitutional rules
- No evidence -> no verified claim -> no release authority.
- Fail closed on dirty worktree, missing tracked source, symlink escape, path traversal, duplicate manifest paths, unsupported file types, or Git identity mismatch.
- Merge, DB promotion, and production activation remain protected owner decisions.
- AI-17 does not claim production deployment provenance. It proves trusted repository/source provenance only.
- Private signing keys never enter this module.

## Architecture
AI-17 adds a server/CI-only provenance builder. It reads a versioned manifest from the repository, resolves each declared file under the repository root, obtains the current commit/tree identity from Git using argv-only `git` execution (no shell), verifies the worktree is clean, hashes exact bytes, and emits a deterministic immutable provenance envelope.

The builder remains separate from the cryptographic attestation layer. AI-15 verifies signatures; AI-17 proves what local repository/source bytes were measured. A later build/deployment provenance layer may attest produced artifacts without weakening this boundary.

## Components
1. `data/ai/sovereign-release-provenance.json`
   - versioned allowlist of source groups used to derive component hashes.
2. `scripts/ai/sovereign-release-provenance.js`
   - trusted repository-root creation;
   - Git HEAD/tree derivation;
   - clean-worktree enforcement;
   - safe file resolution;
   - exact-byte hashing;
   - deterministic manifest/component/root digests;
   - immutable provenance envelope;
   - integrity verifier.
3. `tests/sovereign-release-provenance.test.cjs`
   - negative security tests first;
   - deterministic hashing;
   - mutation invalidation;
   - dirty-worktree rejection;
   - path/symlink escape rejection;
   - caller-supplied hash rejection;
   - JSON-copy trust-brand rejection.
4. `docs/ai/VVIP_TIGER_SOVEREIGN_RELEASE_PROVENANCE.md`
   - scope, trust boundary, evidence rules, and explicit non-claims.

## Provenance envelope
`TIGER_RELEASE_PROVENANCE_V1` contains:
- `repository.commitSha`
- `repository.treeSha`
- `repository.clean=true`
- `manifest.sha256`
- deterministic component digests
- per-migration exact-byte digests
- `provenanceClass=TRUSTED_GIT_CHECKOUT`
- `buildArtifactAttested=false`
- `deploymentAttested=false`
- `digest`

## Source groups
The versioned manifest declares source groups for frontend, backend/runtime, AI policy, prompt/model contract, tool registry, RLS/database policy, and security configuration. Every declared path must be a tracked regular file inside the repository root.

## Data flow
Repository checkout -> trusted root -> Git identity/clean check -> manifest validation -> exact bytes -> component digests -> immutable provenance envelope -> optional downstream signature/Proof System integration.

## Error handling
All validation failures throw stable machine-readable codes. Unknown fields are rejected. No path may be absolute, contain `..`, or resolve outside the trusted root. Symlinks are rejected for measured files.

## Verification
AI-17 is complete only when the new tests pass and the exact head passes VVIP Quality Gate, CodeQL, Dependency Review, and Project Control Integrity. No merge or deployment is part of AI-17.
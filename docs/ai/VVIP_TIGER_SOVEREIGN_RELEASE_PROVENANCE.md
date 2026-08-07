# VVIP TIGER Sovereign Release Provenance — AI-17

## Status
Repository implementation in Draft PR #155. No merge, database promotion, staging deployment, or production activation is authorized by this document.

## Purpose
AI-17 closes the repository provenance gap identified by the Proof-Backed Master Dossier. Instead of accepting precomputed component hashes from a caller, the provenance builder measures exact bytes from a clean, tracked Git checkout using a versioned manifest.

## Trust boundary
The module is intended for CI/server-side execution. It derives:
- Git `HEAD` commit SHA;
- Git tree SHA;
- clean-worktree state;
- exact-byte SHA-256 for every declared source file;
- deterministic component digests;
- exact per-migration digests;
- deterministic root provenance digest.

The module rejects:
- dirty or changed worktrees;
- stale trusted contexts;
- unknown input fields;
- caller-supplied component hashes;
- absolute paths, `..`, `.git` paths, and path escapes;
- untracked measured files;
- symlinked measured files;
- malformed or incomplete manifests;
- duplicate manifest entries.

## Versioned manifest
`data/ai/sovereign-release-provenance.json` groups tracked source files into:
- frontend;
- backend/runtime;
- AI policy;
- prompt/model contract;
- tool registry;
- RLS/database policy;
- security configuration.

SQL migrations are additionally enumerated from the versioned migrations directory and measured individually.

## Provenance schema
`TIGER_RELEASE_PROVENANCE_V1` records:
- repository commit/tree identity;
- manifest path and digest;
- component digests;
- migration digests;
- `provenanceClass=TRUSTED_GIT_CHECKOUT`;
- `buildArtifactAttested=false`;
- `deploymentAttested=false`;
- deterministic envelope digest.

## Critical non-claims
AI-17 does **not** claim:
- that a frontend/backend build artifact was produced from these bytes;
- that a container/package was signed;
- that any artifact was deployed to staging or production;
- that KMS/HSM signing occurred;
- that Production Readiness is 100%.

Those claims require separate evidence and, where applicable, cryptographic attestation and owner gates.

## TDD evidence contract
The AI-17 regression contract verifies:
1. required public API exists;
2. clean-checkout provenance is deterministic;
3. dirty worktrees fail closed;
4. trusted contexts cannot be recreated by JSON copying;
5. caller-supplied hashes/unknown build fields are rejected;
6. path traversal is rejected;
7. symlinked measured files are rejected;
8. a committed byte mutation changes component and root provenance;
9. tampering invalidates integrity verification.

## Relationship to AI-14 / AI-15 / AI-16
- AI-14 defines Release DNA / Evidence Capsules / Golden Passport truth mechanics.
- AI-15 defines cryptographic evidence and owner-decision attestation.
- AI-16 makes the Master Dossier proof-backed.
- AI-17 supplies trusted repository/source provenance derived from measured bytes.

A future artifact/deployment provenance layer can consume AI-17 output without relabeling source provenance as build or deployment proof.

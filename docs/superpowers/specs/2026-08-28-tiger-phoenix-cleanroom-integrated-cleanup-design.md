# TIGER PHOENIX CLEANROOM 2026 — Integrated Cleanup Design

## Status

`OWNER_APPROVED DESIGN / SUBORDINATE TO CURRENT OWNER AUTHORITY`

Canonical owner authority:
`docs/owner-control/TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md`

This document is an implementation design, not a parallel cleanup authority.

## Purpose

Build one cleanup system that combines existing repository/PR housekeeping with storage/environment cleanup and makes cleanup safe, explainable, reproducible and evidence-backed.

The single distinctive mechanism is **Proof-of-Reclamation (PoR)**. No automatic delete is allowed unless the target passes deterministic reclamation proof.

## Design principles

1. Cleanup is one integrated lifecycle, not independent scripts with conflicting rules.
2. Measurement precedes deletion.
3. Classification precedes permission.
4. Stateful/sovereign objects fail closed.
5. Rebuildable objects require a regeneration proof.
6. Cleanup should be simulated before execution when destructive effects are possible.
7. Verification after cleanup is mandatory.
8. Owner authority and deterministic policy outrank AI recommendations.
9. The Codespace should become reproducible and disposable over time; hidden critical state is a defect.
10. Generic cleanup must never imply Production mutation, remote DB deletion, Git-history rewriting or credential rotation.

## Architecture

### 1. Observer

Collects a read-only baseline from the storage planes available in the current environment.

Expected signals where available:

- filesystem capacity and inode usage;
- repository dirty/untracked state and large generated paths;
- Docker images, containers, volumes and reclaimable BuildKit cache;
- local Supabase state;
- known dependency/cache/output directories;
- Actions artifact/cache retention configuration from repository workflows;
- stale PR/branch candidates from repository governance evidence.

Observer failures do not imply that the unknown plane is safe to clean. Unknown is fail-closed.

### 2. Classifier

Maps every cleanup candidate into exactly one class:

- `S0_SOVEREIGN`
- `S1_EVIDENCE`
- `S2_REBUILDABLE`
- `S3_EPHEMERAL`
- `S4_STATEFUL_LOCAL`

Classification includes reason codes and evidence references. Ambiguous candidates are not auto-deleted.

### 3. Proof-of-Reclamation engine

The PoR engine consumes candidate identity, class, age/use evidence, dependency evidence, regeneration evidence and protected-boundary policy.

Canonical decision states:

- `SAFE_AUTO_RECLAIM`
- `SAFE_MANUAL_RECLAIM`
- `RETENTION_HOLD`
- `STATEFUL_LOCK`
- `SOVEREIGN_LOCK`
- `INSUFFICIENT_EVIDENCE`

Only `SAFE_AUTO_RECLAIM` is eligible for automatic removal by the generic cleaner.

### 4. Shadow planner

Produces the intended cleanup set before deletion:

- objects/paths to remove;
- estimated reclaimable bytes where measurable;
- protected items explicitly excluded;
- risk class;
- commands/actions planned;
- recovery/regeneration recipe for rebuildable objects.

No broad destructive command may bypass the itemized shadow plan.

### 5. Reclaimer

Executes only PoR-approved operations.

Order of preference:

1. obvious ephemeral residue;
2. disposable package/tool caches;
3. stopped disposable containers;
4. stale BuildKit cache under configured policy;
5. unused rebuildable images/dependencies;
6. governance cleanup already proven historical/superseded/absorbed.

Stateful volumes, canonical evidence and sovereign assets are outside automatic reclaim.

### 6. Verifier

Reruns the relevant baseline after cleanup and asserts:

- intended targets are gone;
- protected paths/classes remain;
- repository authority/migrations/config are intact;
- storage/inode pressure improved or the no-op result is explainable;
- no unexpected deletions are detected.

### 7. Cleanup Passport

Creates a machine-readable cleanup result with:

- source/environment identity;
- requested scope;
- lifecycle phase outcomes;
- before/after capacity;
- reclaimed classes/objects;
- protected locks;
- unexpected deletion count;
- final result and reason codes.

The passport is evidence of the cleanup action, not owner authority and not Production release authority.

## Trigger semantics

An unscoped owner request equivalent to `clean`, `cleanup`, or `نظف` means `FULL_SCOPE_SAFE`: inspect all relevant cleanup planes currently accessible and apply the complete lifecycle.

A scoped request such as `clean Docker` or `clean old PRs` limits inventory/reclaim scope while retaining the same PoR, lock and verification rules.

## Repository/PR integration

Existing PR cleanup is not replaced. It becomes the repository-governance plane of PHOENIX CLEANROOM.

A PR/branch can be automatically proposed for historical cleanup only with one of these evidence classes:

- exact ancestry proves absorbed into current authoritative history;
- explicit successor identifies it as superseded;
- current authority explicitly retires it;
- no unique work remains and the required governance checks agree.

Age alone is never sufficient.

## Codespace and reproducibility

The implementation should add a lean devcontainer configuration only after inventorying required tools. The goal is reproducibility, not a large custom image.

Critical state detected only inside a Codespace must be classified and promoted to a durable declaration/backup before the Codespace is considered disposable.

## Docker/BuildKit policy

Use conservative garbage-collection policies and age/usage filters rather than a default broad `docker system prune -a --volumes`.

Docker volumes are `S4_STATEFUL_LOCAL` unless separately proven disposable. Build cache may be `S2_REBUILDABLE` or `S3_EPHEMERAL` depending on provenance and regeneration evidence.

## Supabase policy

Local Supabase service containers/images may be reclaimable when no unique state depends on them. Local database/storage volumes remain locked by default. Any destructive state cleanup requires a separate backup/recovery proof and protected authorization.

## Actions retention policy

Artifacts/logs are assigned retention by evidence temperature rather than one universal value. Routine diagnostics should expire sooner than release/security evidence. Canonical owner authority must never depend on a transient Actions artifact.

## AI boundary

AI can suggest candidates, detect growth anomalies and explain policy decisions. AI cannot change classification locks, lower evidence requirements or authorize deletion of protected state.

## Failure behavior

The cleaner must fail closed on:

- unknown storage class;
- missing regeneration recipe for a rebuildable target;
- uncertain volume/state ownership;
- missing repository/authority evidence;
- a mismatch between shadow plan and execution target;
- inability to perform post-clean verification.

## Security boundaries

PHOENIX CLEANROOM does not authorize:

- Production deployment or mutation;
- remote Supabase destructive operations;
- secret rotation or removal without the security workflow;
- Git history rewrite;
- deletion of current owner authority;
- deletion of required migrations;
- deletion of unique branch commits based on age alone.

## Acceptance criteria

The design is implemented only when automated tests demonstrate at least:

1. `S0` and `S4` are denied automatic deletion;
2. an `S2` object without regeneration proof is denied;
3. an `S2` object with valid regeneration proof may be safely reclaimed;
4. `S3` residue is reclaimed safely;
5. shadow output matches the actual target set;
6. protected paths remain after cleanup;
7. cleanup is idempotent;
8. a Cleanup Passport accurately records before/after state;
9. an unscoped owner cleanup request maps to the integrated full-safe lifecycle;
10. repository/PR cleanup obeys unique-work preservation rules.

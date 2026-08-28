# TIGER PHOENIX CLEANROOM 2026 — Integrated Cleanup Design

## Status

`OWNER_APPROVED DESIGN / SUBORDINATE TO CURRENT OWNER AUTHORITY`

Canonical owner authority:
`docs/owner-control/TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md`

This document is an implementation design, not a parallel cleanup authority.

## Purpose

Build one cleanup-governance system that combines repository/PR housekeeping with storage/environment reclamation while preserving TIGER AION ∞ as the mandatory destructive-disposal execution authority for post-launch/digital-metabolism actions.

The single distinctive mechanism is **Proof-of-Reclamation (PoR)**. PoR proves whether a target is eligible to enter disposal. It never grants permission to bypass AION’s destructive-action chain.

## Authority composition

There is no second delete pipeline.

- **PHOENIX CLEANROOM** owns observation, inventory, deterministic classification, PoR, trusted shadow planning, independent post-verification, cleanup passport and owner reporting for the `cleanup-governance` domain.
- **TIGER AION ∞** remains `CURRENT_ONLY` for the `post-launch-autonomy` domain.
- All destructive storage/object disposal must pass the current AION Digital Metabolism sequence implemented by `project-control/aion/metabolism.mjs`:
  `DETECT → CLASSIFY → EXPLAIN → APPROVE → QUARANTINE → REHEARSE → VERIFY → DELETE → SEAL`.
- PoR output is an eligibility input to AION, not an alternative approval.
- Repository metadata actions such as closing a superseded PR may use repository-governance evidence; actual branch deletion, state deletion, filesystem disposal, Docker/Supabase volume deletion, or remote artifact/cache deletion must use the applicable destructive gate.

## Design principles

1. Cleanup is one integrated lifecycle, not independent scripts with conflicting rules.
2. Measurement precedes disposal.
3. A complete, content-addressed inventory precedes classification.
4. Classification precedes PoR eligibility.
5. Stateful/sovereign/security-sensitive objects fail closed.
6. Rebuildable objects require regeneration proof.
7. Destructive execution must use AION; PHOENIX never becomes a parallel delete engine.
8. Shadow planning must be bound to the exact observation and target identities.
9. Every target must be re-observed immediately before destructive execution.
10. Verification after cleanup must independently compare before/after manifests rather than trust the action log.
11. Owner authority and deterministic policy outrank AI recommendations.
12. A Codespace should become reproducible and disposable over time; hidden critical state is a defect.
13. Generic cleanup never implies Production mutation, remote DB deletion, Git-history rewriting or credential rotation.
14. A full-scope run must explicitly account for every declared local and remote plane; inaccessible planes are `BLOCKED_CAPABILITY`, never silently ignored.
15. Persistent/local heavy operations must pass configurable byte-and-inode headroom preflight before starting.

## Canonical lifecycle

`OBSERVE → INVENTORY → CLASSIFY → PROVE → SHADOW → AION DISPOSAL GATE → POST-VERIFY → PASSPORT → REPORT`

## 1. Observer

Collects a read-only baseline from every declared cleanup plane accessible through the current authenticated environment.

Expected signals where available:

- filesystem capacity and inode usage;
- repository dirty/untracked state and large generated paths;
- Docker images, containers, volumes and reclaimable BuildKit cache;
- local Supabase state;
- known dependency/cache/output directories;
- live GitHub Actions artifact/log/cache inventory when the authenticated interface supports it;
- Codespaces/prebuild lifecycle inventory when the authenticated interface supports it;
- PR/branch state and ancestry/governance evidence;
- local Windows/WSL/Docker state when that machine is explicitly in scope and accessible.

Observer failures never imply that an unknown plane is safe. A full-scope execution records inaccessible declared planes as `BLOCKED_CAPABILITY` or `UNAVAILABLE` and cannot claim full completion.

## 2. Content-addressed inventory

The observer’s measurements are converted into a canonical before-state manifest. Capacity totals alone are insufficient.

The manifest records stable identities where available:

- file/path identity plus digest and protected metadata;
- Git ref/SHA/tree identity;
- Docker image/container/volume IDs and digests;
- BuildKit cache record identity where exposed;
- remote artifact/cache IDs plus repository/run/key metadata;
- Codespace/prebuild IDs plus lifecycle metadata;
- policy/authority source digests;
- environment identity and observation timestamp.

Canonical serialization produces `observation_manifest_digest`. Protected namespaces and in-scope namespaces are both represented so collateral changes can be detected later.

## 3. Classifier

Maps every cleanup candidate into exactly one class:

- `S0_SOVEREIGN`
- `S1_EVIDENCE`
- `S2_REBUILDABLE`
- `S3_EPHEMERAL`
- `S4_STATEFUL_LOCAL`

Classification includes reason codes and evidence references. Unknown, ambiguous, security-sensitive, protected-release or unique-state candidates are locked rather than defaulted to ephemeral.

## 4. Proof-of-Reclamation engine

PoR consumes:

- immutable candidate identity;
- storage class;
- dependency/use evidence;
- retention state;
- regeneration/recovery evidence;
- protected-boundary policy;
- owner-decision and authority digests;
- observation manifest identity.

Canonical PoR states:

- `RECLAIM_ELIGIBLE`
- `MANUAL_REVIEW_REQUIRED`
- `RETENTION_HOLD`
- `STATEFUL_LOCK`
- `SOVEREIGN_LOCK`
- `SECURITY_LOCK`
- `INSUFFICIENT_EVIDENCE`

`RECLAIM_ELIGIBLE` means the target may enter the AION disposal process. It is never direct delete authority.

## 5. Trusted Shadow Plan capsule

The Shadow planner creates a trusted in-process capability/capsule for the current observation. A serialized JSON plan read back from disk is evidence/debug output only and is not execution authority.

The trusted capsule binds:

- `observation_manifest_digest`;
- source/environment identity;
- owner-decision/policy digests;
- exact target IDs/digests;
- PoR decision digest for each target;
- issued timestamp and bounded freshness window;
- estimated reclaimable bytes/effects;
- explicit protected exclusions;
- regeneration/recovery references.

Before any destructive step, the executor re-observes the exact target and rejects:

- target replacement;
- digest/ID drift;
- stale observation;
- stale policy/authority;
- wildcard/unitemized targets;
- foreign/untrusted plan copies.

## 6. AION disposal adapter

PHOENIX supplies the target evidence to an adapter for the existing AION lifecycle. The adapter must reuse `project-control/aion/metabolism.mjs` rather than implement its own approval or deletion-chain semantics.

The adapter must prove that destructive disposal reached, in exact order:

`DETECT → CLASSIFY → EXPLAIN → APPROVE → QUARANTINE → REHEARSE → VERIFY → DELETE → SEAL`

and that:

- approval is valid;
- rollback-backed rehearsal evidence exists;
- quarantine is explicit;
- verification is recorded;
- deletion happens only after the preceding gates;
- sealing/disposal certificate is produced afterward.

No generic `rm`, broad prune, remote artifact deletion, branch deletion or volume removal may be reachable as a second hidden path outside this contract.

## 7. Independent post-verifier

After cleanup, PHOENIX produces a content-addressed after-state manifest using the same canonical inventory rules.

The verifier independently compares:

- before manifest;
- trusted target set;
- after manifest;
- protected namespace invariants;
- AION disposal certificate references where applicable.

The reclaimer/action log is not authoritative evidence of what actually changed.

A result cannot be `GREEN` if:

- a protected object changed;
- an unplanned object disappeared;
- an approved target identity was replaced/drifted;
- required before/after coverage is unavailable;
- a declared plane remains unaccounted for in a claimed full-scope run.

## 8. Cleanup Passport

Creates `TIGER_CLEANUP_PASSPORT_V1` containing:

- source/environment identity;
- requested scope;
- declared planes and each plane’s coverage state;
- before/after manifest digests;
- trusted Shadow Plan identity;
- PoR decision root;
- AION disposal certificate references;
- before/after capacity and inode pressure;
- intended and actual reclaimed objects;
- protected locks;
- unexpected deletion count;
- final result and reason codes.

The passport is cleanup evidence, not owner authority and not Production release authority.

## 9. Trigger semantics

An unscoped owner request equivalent to `clean`, `cleanup`, or `نظف` means `FULL_SCOPE_SAFE`: inspect every declared cleanup plane, apply PoR, route destructive work through AION, verify independently and report inaccessible planes.

A scoped request such as `clean Docker` or `clean old PRs` limits inventory/reclaim scope while retaining the same PoR, AION, lock and verification requirements for destructive actions.

## 10. Repository/PR integration

Existing PR cleanup becomes the repository-governance plane of PHOENIX CLEANROOM.

A PR may be closed as historical only with one of these evidence classes:

- exact ancestry proves work is retained by a successor/current authoritative history;
- explicit successor identifies it as superseded and preserves the intended work;
- current owner authority explicitly retires it;
- semantic replacement is demonstrated by current bytes/tests and no unique work is lost.

Age alone is never sufficient. Closing a PR does not authorize deleting its branch; branch deletion is a separate destructive action.

## 11. Codespace and reproducibility

A lean `.devcontainer` is introduced only after inventorying required tools. Critical state detected only inside one Codespace must be promoted to durable declaration/backup or locked state before the environment may be destroyed.

No hidden critical state is a CLEANROOM requirement.

## 12. Docker/BuildKit policy

Use conservative garbage-collection policies and itemized identities instead of default broad `docker system prune -a --volumes` behavior.

Docker volumes are `S4_STATEFUL_LOCAL` unless separately proven disposable. Build cache may be `S2_REBUILDABLE` or `S3_EPHEMERAL` only when provenance/regeneration evidence supports it. Actual destructive disposal still passes AION.

## 13. Supabase policy

Local service containers/images may become candidates when safe. Database/storage volumes and any unique state remain locked by default. State destruction requires backup/recovery proof and protected authorization in addition to the AION chain.

## 14. Remote GitHub planes

PHOENIX must have explicit adapters/interfaces for:

- GitHub Actions artifacts/logs;
- GitHub Actions caches;
- Codespaces;
- Codespaces prebuilds.

Adapters are capability-aware. Read-only access may inventory but not reclaim. Lack of a supported authenticated action yields `BLOCKED_CAPABILITY`; it never becomes implicit success.

Retention configuration in workflow YAML is not a substitute for inventorying live stored objects.

## 15. Preventive storage-pressure gate

PHOENIX defines configurable policy for:

- minimum free bytes/percentage;
- maximum inode pressure;
- operation-specific headroom requirements;
- environment profiles.

Persistent/local/Codespace heavy entrypoints must call a shared headroom preflight before starting. Initial implementation inventories all known heavy entrypoints (Supabase start/rebuild/rehearsal, Docker/BuildKit build, database rebuild, large test/evidence runs) and adds contract tests or a repository scan so newly introduced heavy entrypoints cannot silently omit the guard.

Outcomes include:

- `HEADROOM_GREEN`
- `HEADROOM_CLEAN_FIRST`
- `HEADROOM_BLOCK_HEAVY_OPERATION`

The guard fails before partial heavy state is created.

## 16. Actions retention policy

Artifacts/logs are assigned retention by evidence temperature, but canonical owner authority never depends on transient Actions artifact storage. Live remote object cleanup still follows the remote-plane adapter + PoR + AION contract.

## 17. AI boundary

AI can suggest candidates, detect growth anomalies and explain policy decisions. AI cannot change hard locks, mint AION approval, lower evidence requirements or authorize destructive disposal.

## Failure behavior

The system fails closed on:

- unknown storage class;
- missing regeneration/recovery evidence;
- uncertain state ownership;
- missing authority evidence;
- missing remote-plane capability in a claimed full-scope run;
- stale or foreign Shadow Plan;
- target re-observation mismatch;
- inability to build complete before/after manifests;
- inability to perform independent post-verification;
- missing AION approval/quarantine/rehearsal/verification/seal evidence for destructive disposal.

## Security boundaries

PHOENIX CLEANROOM does not authorize:

- Production deployment or mutation;
- remote Supabase destructive operations outside protected gates;
- security-sensitive material removal outside its dedicated security workflow;
- Git history rewrite;
- deletion of current owner authority;
- deletion of required migrations;
- deletion of unique branch commits based on age alone;
- bypass of AION destructive-action controls.

## Acceptance criteria

Implementation is complete only when tests prove at least:

1. `S0`, protected `S1`, security-sensitive state and `S4` cannot enter automatic disposal;
2. `S2` without regeneration proof is denied;
3. an eligible `S2/S3` target can enter AION but cannot bypass AION;
4. the exact AION chain and rollback-backed rehearsal are required;
5. the before manifest is content-addressed and covers protected + in-scope namespaces;
6. the Shadow Plan is trusted, observation-bound, fresh and rejects target replacement;
7. the after manifest independently detects collateral deletion;
8. cleanup is idempotent when no new eligible targets exist;
9. a Cleanup Passport records before/after roots, AION evidence and plane coverage;
10. an unscoped cleanup request maps to all declared planes and reports `BLOCKED_CAPABILITY` where required;
11. repository/PR cleanup obeys unique-work preservation rules;
12. bytes/inode headroom preflight protects every inventoried heavy local/Codespace operation;
13. owner continuity documents expose PHOENIX and its composition with AION;
14. no test or implementation creates a second destructive delete path.

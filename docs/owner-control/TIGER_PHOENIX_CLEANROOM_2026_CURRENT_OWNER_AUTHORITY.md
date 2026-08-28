# TIGER PHOENIX CLEANROOM 2026 — Current Owner Cleanup Authority

**Status:** `CURRENT_ONLY / OWNER_APPROVED / INTEGRATED_CLEANUP_AUTHORITY`

**Owner effective date:** 2026-08-28

**Domain:** `cleanup-governance`

## 1. Final owner decision

TIGER has exactly one current cleanup plan: **TIGER PHOENIX CLEANROOM 2026**.

It is not a separate subsystem beside the existing cleanup work. It absorbs and governs the complete cleanup program, including repository/PR/branch housekeeping, generated-file hygiene, Codespaces storage, Docker/BuildKit residue, Supabase local state, GitHub Actions artifacts/cache, Codespaces/prebuild lifecycle, and local development residue.

When the owner asks to **clean / cleanup / clean the project / clean the environment** without narrowing the scope, the default meaning is the complete safe PHOENIX CLEANROOM procedure in this document. A narrower explicit owner request limits the target scope but does not weaken the safety rules.

The historical `docs/VVIP_TIGER_REPOSITORY_HOUSEKEEPING_AUDIT.md` remains evidence only and is `HISTORICAL_ONLY`; it is not a competing current cleanup authority.

## 2. The single invention — Proof-of-Reclamation (PoR)

The one distinctive TIGER invention in this plan is **Proof-of-Reclamation**.

> **TIGER NEVER DELETES WHAT IT CANNOT EXPLAIN, PROVE SAFE TO RECLAIM, AND — WHEN REBUILDABLE — REGENERATE.**

Before an automatic cleanup action is permitted, the target must have enough evidence to prove all applicable statements:

1. its identity and storage class are known;
2. it is not current owner authority, canonical source, Production configuration, required migration, or protected release evidence;
3. it is not unbacked stateful data;
4. dependencies that still require it are absent or safely reconstructable;
5. if it is classified `REBUILDABLE`, its regeneration recipe/source exists;
6. the predicted cleanup does not cross a protected boundary;
7. the post-clean verification can prove the protected surfaces remained unchanged.

If proof is incomplete, cleanup fails closed.

## 3. Canonical cleanup lifecycle

Every PHOENIX CLEANROOM execution follows one integrated lifecycle:

`OBSERVE → INVENTORY → CLASSIFY → PROVE (PoR) → SHADOW → RECLAIM → VERIFY → PASSPORT → REPORT`

### OBSERVE
Measure before deleting. At minimum where applicable: filesystem capacity, inode pressure, repository status, Docker/BuildKit usage, local Supabase state, generated outputs, artifacts/cache and stale environment inventory.

### INVENTORY
Identify what consumes space or creates repository/governance clutter before selecting cleanup targets.

### CLASSIFY
Every target belongs to one of five classes:

- `S0_SOVEREIGN` — owner authority, canonical source, required migrations, Production configuration, current governance. Automatic deletion forbidden.
- `S1_EVIDENCE` — release/security/evidence material with governed retention. Never treated as ordinary cache.
- `S2_REBUILDABLE` — dependencies, build cache, images and generated assets reproducible from declared inputs. Eligible only after regeneration proof.
- `S3_EPHEMERAL` — temporary files, disposable logs, stopped disposable containers, stale generated outputs and other non-authoritative residue. Preferred automatic cleanup class.
- `S4_STATEFUL_LOCAL` — local database/volume/state that may contain unique data. Automatic destructive deletion forbidden without backup/recovery proof and the required owner gate.

### PROVE (PoR)
Produce the reclaim decision from classification, dependency/rebuildability, retention and protected-boundary evidence.

### SHADOW
Simulate the intended cleanup before destructive execution. Report expected reclaimed space/objects and protected objects that will remain untouched.

### RECLAIM
Execute only actions authorized by the PoR decision. Prefer lowest-risk residue first. Never use broad destructive volume deletion as a default cleanup technique.

### VERIFY
After cleanup, re-measure storage and verify that source, migrations, authority, protected configuration, state locks and required evidence remain intact.

### PASSPORT
Record a cleanup passport containing scope, before/after measurements, reclaimed objects/space, protected classes, unexpected deletions and final result.

### REPORT
Return a concise owner report: what was cleaned, what was protected, reclaimed capacity, remaining pressure and any locked item requiring a separate decision.

## 4. What is included in the one plan

PHOENIX CLEANROOM covers all of the following when they are relevant to the requested cleanup:

1. **Repository:** generated files, accidental local environments, tracked residue, obsolete current pointers and validated historical housekeeping.
2. **Pull requests / branches:** close or remove only when superseded, merged/absorbed, or otherwise proven non-current; unique work is preserved until convergence or an explicit owner decision.
3. **Codespace filesystem:** workspace residue, user caches, temporary files, extensions/tool residue and capacity/inode pressure.
4. **Docker / BuildKit:** stopped disposable containers, unused images/layers and build cache using conservative age/usage policies.
5. **Supabase local:** local containers/images may be reclaimed when safe; database/volume state is `S4_STATEFUL_LOCAL` and remains locked unless separately proven recoverable and authorized.
6. **GitHub Actions artifacts/logs:** retention is evidence-tier aware; canonical authority is not delegated to transient Actions artifact storage.
7. **GitHub Actions cache:** bounded and disposable; cache growth may never become an authority dependency.
8. **Codespaces/prebuild lifecycle:** stale stopped environments and unnecessary prebuild versions/regions are cleanup candidates after state protection checks.
9. **Local Windows/WSL/Docker Desktop environments:** treated as a separate physical storage plane but governed by the same classification/PoR rules when the owner requests local cleanup.

## 5. Permanent hard locks

The following are never removed automatically by a generic cleanup request:

- current `CURRENT_ONLY` owner authority;
- canonical source required by current runtime/release;
- required Supabase migrations;
- Production configuration or protected release identity;
- secrets/credential material through an unreviewed deletion path (credential rotation/remediation is separate security work);
- unbacked Supabase/PostgreSQL/Docker volumes or other unique state;
- canonical release/security evidence whose retention requirement is active;
- Git history through history-rewrite operations;
- unique PR/branch commits merely because they are old.

## 6. Storage pressure policy

PHOENIX CLEANROOM is preventive, not only reactive.

The implementation should maintain a safety reserve using both free bytes and inode availability. Initial policy targets are configurable and must be calibrated from real TIGER measurements; they are not owner business constants.

Heavy local operations such as Supabase rehearsals, large Docker builds, database rebuilds and large test/evidence runs may be blocked before start when measured headroom is insufficient. Safe PoR cleanup should run first rather than allowing `No space left on device` to become the normal control mechanism.

## 7. Reproducibility doctrine

The durable project is Git + declared configuration + protected authority/evidence/state, not a long-lived hand-mutated Codespace.

Generated dependencies and tool environments should move toward reproducible declarations. A Codespace may be disposable only after hidden unique state has been eliminated or protected.

`No hidden critical state` is a CLEANROOM requirement: anything important that exists only inside one disposable environment must be promoted to declared configuration, protected storage/evidence, or an explicit stateful backup class before that environment is destroyed.

## 8. AI boundary

AI may inventory, explain, predict storage pressure, recommend retention and rank cleanup candidates. AI does not override hard locks and does not gain independent authority to delete `S0`, protected `S1`, or `S4` state.

Deterministic policy and owner authority remain the final cleanup boundary.

## 9. Supersession and no-fallback rule

This document is the single current cleanup authority.

- Earlier repository-housekeeping audits remain `HISTORICAL_ONLY` evidence.
- Earlier standalone cleanup names, partial checklists or ad-hoc prune instructions do not become parallel authorities.
- Useful old procedures may be used only when they conform to this authority and the PoR safety contract.
- There is no fallback from PHOENIX CLEANROOM to a less safe broad-delete model.

## 10. Meaning of an owner cleanup request

Unless the owner explicitly limits scope, a future instruction equivalent to **"نظف"** means:

1. assess the relevant repository and environment planes;
2. continue approved PR/branch housekeeping safely;
3. diagnose storage rather than assuming repository size is the cause;
4. apply classification and Proof-of-Reclamation;
5. protect state/authority/evidence;
6. reclaim safe residue;
7. verify the result;
8. report reclaimed capacity and remaining locked items.

This semantic is part of the cleanup plan itself, not a separate feature.

## 11. Release boundary

Approval of this authority does not authorize Production mutation, remote database deletion, credential rotation, Git-history rewriting, or destructive state removal. Those remain separate protected actions when applicable.

**Canonical owner rule:** `NO PROOF OF RECLAMATION → NO AUTOMATIC DELETION.`

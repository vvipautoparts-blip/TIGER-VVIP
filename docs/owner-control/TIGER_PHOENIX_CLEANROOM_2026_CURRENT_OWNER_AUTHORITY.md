# TIGER PHOENIX CLEANROOM 2026 — Current Owner Cleanup Authority

**Status:** `CURRENT_ONLY / OWNER_APPROVED / INTEGRATED_CLEANUP_AUTHORITY`

**Owner effective date:** 2026-08-28

**Domain:** `cleanup-governance`

## 1. Final owner decision

TIGER has exactly one current cleanup-governance plan: **TIGER PHOENIX CLEANROOM 2026**.

It is not a second cleanup subsystem beside the existing cleanup work. It absorbs and governs the complete cleanup program, including repository/PR/branch housekeeping, generated-file hygiene, Codespaces storage, Docker/BuildKit residue, Supabase local state, GitHub Actions artifacts/cache, Codespaces/prebuild lifecycle, and local development residue.

When the owner asks to **clean / cleanup / clean the project / clean the environment / نظف** without narrowing the scope, the default meaning is the complete safe PHOENIX CLEANROOM procedure in this document. A narrower explicit owner request limits the target scope but does not weaken the safety rules.

The historical `docs/VVIP_TIGER_REPOSITORY_HOUSEKEEPING_AUDIT.md` remains evidence only and is `HISTORICAL_ONLY`; it is not a competing current cleanup authority.

## 2. Relationship to TIGER AION ∞ — one plan, no deletion bypass

PHOENIX owns the **cleanup-governance decision plane**: observation, inventory, classification, Proof-of-Reclamation, shadow planning, verification, passport and reporting.

TIGER AION ∞ remains the `CURRENT_ONLY` authority for the `post-launch-autonomy` domain and its Digital Metabolism deletion contract remains binding. PHOENIX does **not** create a second destructive executor and does not supersede or weaken `project-control/aion/metabolism.mjs`.

For any storage/object disposal that reaches a destructive delete action, the integrated PHOENIX lifecycle MUST enter the existing AION deletion chain:

`DETECT → CLASSIFY → EXPLAIN → APPROVE → QUARANTINE → REHEARSE → VERIFY → DELETE → SEAL`

Therefore PoR can prove that an object is **eligible to enter disposal**, but PoR by itself is never deletion authority. No PHOENIX component may call a destructive storage deletion path while bypassing the AION approval, quarantine, rollback-backed rehearsal, verification and sealing requirements.

Repository-governance metadata actions such as closing a superseded PR are governed by repository PoR/ancestry evidence. Actual branch deletion, Git-history deletion, state deletion, Docker/Supabase volume deletion, remote artifact/cache deletion or filesystem disposal remains subject to the applicable destructive-action gate.

## 3. The single invention — Proof-of-Reclamation (PoR)

The one distinctive TIGER invention in this plan is **Proof-of-Reclamation**.

> **TIGER NEVER DELETES WHAT IT CANNOT EXPLAIN, PROVE SAFE TO RECLAIM, AND — WHEN REBUILDABLE — REGENERATE.**

Before a cleanup target may even enter the destructive execution gate, the target must have enough evidence to prove all applicable statements:

1. its immutable identity and storage class are known;
2. it is not current owner authority, canonical source, Production configuration, protected release identity, required migration, active canonical evidence, secret/credential material, or unique unbacked state;
3. it is not unbacked stateful data;
4. dependencies that still require it are absent or safely reconstructable;
5. if it is classified `S2_REBUILDABLE`, its regeneration recipe/source exists;
6. the predicted cleanup does not cross a protected boundary;
7. the target identity can be re-observed immediately before destructive execution;
8. the post-clean verification can independently prove the protected surfaces remained unchanged and detect collateral deletion.

If proof is incomplete, cleanup fails closed.

## 4. Canonical integrated cleanup lifecycle

Every PHOENIX CLEANROOM execution follows one integrated lifecycle:

`OBSERVE → INVENTORY → CLASSIFY → PROVE (PoR) → SHADOW → AION DISPOSAL GATE → POST-VERIFY → PASSPORT → REPORT`

### OBSERVE
Measure before deleting. At minimum where applicable: filesystem capacity, inode pressure, repository state, Docker/BuildKit usage, local Supabase state, generated outputs, remote artifacts/cache, Codespaces/prebuild lifecycle and stale environment inventory.

### INVENTORY
Create a content-addressed before-state manifest for every in-scope and protected namespace. Capacity totals alone are not sufficient. The manifest must use stable identities where available: file path plus digest/metadata, Git SHA/ref identity, Docker object ID/digest, volume ID, remote artifact/cache ID and environment identity.

### CLASSIFY
Every target belongs to one of five classes:

- `S0_SOVEREIGN` — owner authority, canonical source, required migrations, Production configuration, protected release identity/current governance. Automatic disposal forbidden.
- `S1_EVIDENCE` — release/security/evidence material with governed retention. Never treated as ordinary cache.
- `S2_REBUILDABLE` — dependencies, build cache, images and generated assets reproducible from declared inputs. Eligible only after regeneration proof.
- `S3_EPHEMERAL` — temporary files, disposable logs, stopped disposable containers, stale generated outputs and other non-authoritative residue. Preferred cleanup candidate class, but still requires the destructive gate for actual disposal.
- `S4_STATEFUL_LOCAL` — local database/volume/state or any unique local state. Destructive deletion forbidden without backup/recovery proof and the required protected authorization.

Unknown or ambiguous state fails closed.

### PROVE (PoR)
Produce a deterministic reclaim-eligibility decision from classification, dependency/rebuildability, retention, immutable identity and protected-boundary evidence. `RECLAIM_ELIGIBLE` means only that the candidate can enter the destructive execution gate; it does not mean “delete now”.

### SHADOW
Build a trusted, observation-bound itemized plan before destructive execution. The executable plan is a trusted in-process capsule, not an arbitrary JSON file accepted from disk. It binds:

- observation manifest digest and source/environment identity;
- cleanup policy and owner-decision digests;
- exact target identities/digests;
- issued/freshness timestamps;
- expected effects and estimated reclaimed bytes;
- protected exclusions;
- regeneration/recovery references.

The executor must re-observe each target immediately before action and reject drift, stale observations, replacement objects, wildcard targets or foreign/untrusted plan copies.

### AION DISPOSAL GATE
All actual destructive storage/object disposal uses the existing AION Digital Metabolism chain and must produce its required approval, quarantine, rollback-backed rehearsal, verify, delete and seal evidence. A generic PHOENIX reclaimer is forbidden from becoming a parallel delete engine.

### POST-VERIFY
Create a content-addressed after-state manifest and compare it independently to the before manifest and planned target set. The action log is not sufficient evidence. Any deletion outside the approved target set, protected-object mutation, unavailable required verification or identity mismatch makes the result non-GREEN.

### PASSPORT
Record `TIGER_CLEANUP_PASSPORT_V1` containing scope, before/after manifest digests, observation/plan identity, AION disposal certificate references where applicable, reclaimed objects/space, protected classes, unexpected deletions and final result.

### REPORT
Return a concise owner report: what was cleaned, what was protected, reclaimed capacity, remaining pressure, inaccessible/blocked planes and any locked item requiring a separate decision.

## 5. Complete scope of the one plan

PHOENIX CLEANROOM covers all of the following when they are relevant to the requested cleanup:

1. **Repository:** generated files, accidental local environments, tracked residue, obsolete current pointers and validated historical housekeeping.
2. **Pull requests / branches:** close or remove only when superseded, merged/absorbed, or otherwise proven non-current; unique work is preserved until convergence or an explicit owner decision.
3. **Codespace filesystem:** workspace residue, user caches, temporary files, extensions/tool residue and capacity/inode pressure.
4. **Docker / BuildKit:** stopped disposable containers, unused images/layers and build cache using conservative age/usage policies plus AION disposal evidence for actual deletion.
5. **Supabase local:** local containers/images may become disposal candidates when safe; database/volume state is `S4_STATEFUL_LOCAL` and remains locked unless separately proven recoverable and authorized.
6. **GitHub Actions artifacts/logs:** live remote objects must be inventoried through an authenticated supported interface; retention is evidence-tier aware.
7. **GitHub Actions cache:** live cache objects are bounded/disposable only after remote observation and PoR; cache growth may never become an authority dependency.
8. **Codespaces/prebuild lifecycle:** stale stopped environments and unnecessary prebuild versions/regions are candidates only after remote state/capability and hidden-state checks.
9. **Local Windows/WSL/Docker Desktop environments:** a separate physical storage plane governed by the same classification/PoR/AION safety rules when requested.

A `FULL_SCOPE_SAFE` run must account for every declared plane. If the current authenticated interface cannot observe or mutate a plane, PHOENIX records `BLOCKED_CAPABILITY` or `UNAVAILABLE` for that plane and MUST NOT report full cleanup completion.

## 6. Permanent hard locks

The following are never removed automatically by a generic cleanup request:

- current `CURRENT_ONLY` owner authority;
- canonical source required by current runtime/release;
- required Supabase/database migrations;
- Production configuration;
- protected release identity, provenance or source-of-truth binding;
- secret/credential material through an unreviewed deletion path; credential rotation/remediation is separate security work;
- unbacked Supabase/PostgreSQL/Docker volumes or any other unique state, including non-volume state;
- active canonical release/security evidence whose retention requirement is active;
- Git history through history-rewrite operations;
- unique PR/branch commits merely because they are old.

The machine-readable owner decision and runtime policy must preserve this complete deny set; a narrower projection is invalid.

## 7. Preventive storage-pressure gate

PHOENIX CLEANROOM is preventive, not only reactive.

The implementation must maintain configurable byte and inode safety reserves and expose a deterministic headroom decision such as `HEADROOM_GREEN`, `HEADROOM_CLEAN_FIRST` or `HEADROOM_BLOCK_HEAVY_OPERATION`.

Heavy operations — including Supabase rehearsals/rebuilds, Docker/BuildKit builds, database rebuilds, large test/evidence runs and other discovered disk-intensive entrypoints — must run a PHOENIX headroom preflight before starting when executed in persistent/local/Codespace environments. The implementation plan must inventory heavy entrypoints and add scan/tests ensuring a newly introduced unguarded heavy entrypoint cannot silently bypass the policy.

Hosted ephemeral CI may have an explicitly documented policy profile, but “hosted” is not permission to ignore storage failure signals.

Safe cleanup should run before heavy work when headroom is insufficient; insufficient space must fail before partial state is created rather than relying on `No space left on device` as the normal control mechanism.

## 8. Reproducibility doctrine

The durable project is Git + declared configuration + protected authority/evidence/state, not a long-lived hand-mutated Codespace.

Generated dependencies and tool environments should move toward reproducible declarations. A Codespace may be disposable only after hidden unique state has been eliminated or protected.

`No hidden critical state` is a CLEANROOM requirement: anything important that exists only inside one disposable environment must be promoted to declared configuration, protected storage/evidence, or an explicit stateful backup class before that environment is destroyed.

## 9. AI boundary

AI may inventory, explain, predict storage pressure, recommend retention and rank cleanup candidates. AI does not override hard locks, does not mint AION approval, and does not gain independent authority to delete `S0`, protected `S1`, `S4`, secret/credential material, protected release identity or unique state.

Deterministic policy, AION destructive-action gates and owner authority remain the final cleanup boundary.

## 10. Supersession and no-fallback rule

This document is the single current `cleanup-governance` authority.

- It does **not** supersede TIGER AION ∞ in the separate `post-launch-autonomy` domain; instead it integrates AION’s deletion chain as the mandatory destructive execution gate.
- Earlier repository-housekeeping audits remain `HISTORICAL_ONLY` evidence.
- Earlier standalone cleanup names, partial checklists or ad-hoc prune instructions do not become parallel authorities.
- Useful old procedures may be used only when they conform to this authority and the AION/PoR safety contract.
- There is no fallback from PHOENIX CLEANROOM to a less safe broad-delete model.

## 11. Meaning of an owner cleanup request

Unless the owner explicitly limits scope, a future instruction equivalent to **“نظف”** means:

1. assess every declared repository/environment/remote cleanup plane that can be observed;
2. continue approved PR/branch housekeeping safely;
3. diagnose storage rather than assuming repository size is the cause;
4. build a complete content-addressed inventory;
5. apply classification and Proof-of-Reclamation;
6. build an observation-bound Shadow Plan;
7. route destructive disposal through AION’s mandatory deletion chain;
8. independently verify before/after state and collateral deletion;
9. issue a Cleanup Passport;
10. report reclaimed capacity, protected state and inaccessible/blocked planes.

This semantic is part of the cleanup plan itself, not a separate feature.

## 12. Release boundary

Approval of this authority does not authorize Production mutation, remote database deletion, credential rotation, Git-history rewriting, or destructive state removal outside their existing protected gates. It does not weaken AION, main governance or independent-review requirements.

**Canonical owner rule:** `NO PROOF OF RECLAMATION → NO ENTRY TO DESTRUCTIVE DISPOSAL.`

**Canonical execution rule:** `NO AION DELETION CHAIN → NO DESTRUCTIVE DISPOSAL.`
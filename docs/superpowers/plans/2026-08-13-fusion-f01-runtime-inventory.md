# FUSION F01 Runtime Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax.

**Goal:** Produce a deterministic, reviewable inventory of every Production/runtime-relevant path before any cleanup, classify each path by disposition, and prove that no deletion can occur from F01.

**Architecture:** A read-only Node inventory engine scans the repository tree, discovers runtime entrypoints and static references, applies an explicit classification registry, records inbound-reference evidence, and emits a canonical JSON inventory. Classification is advisory for cleanup; only F15 may delete approved obsolete runtime after stronger reachability/build/rollback proof.

**Tech Stack:** Node.js built-in modules and `node:test`, JSON registry, current static Web/PWA runtime, Git/GitHub CI.

## Classification contract

Allowed classes:

`ACTIVE | MIGRATION_BRIDGE | TEST_ONLY | HISTORICAL_DOC | ORPHANED | DELETE_CANDIDATE`

F01 itself performs **zero file deletion**.

### Mandatory safety rules

- `supabase/migrations/**` is never a runtime cleanup target.
- `.github/**`, release/security tooling, audit/evidence, and tests are not classified as browser Production runtime deletion targets by this phase.
- Existing profile redirect shims are `MIGRATION_BRIDGE` until F02/F03 remove all current references and redirect compatibility is explicitly retired.
- `owner-control.html` is a `MIGRATION_BRIDGE` while SOA/SCG Single Surface migration is unfinished.
- Current `index.html`, `private-profile-p03.html`, `sw.js`, `manifest.webmanifest`, and assets referenced from active entrypoints remain `ACTIVE` unless evidence proves otherwise in a later phase.
- A path cannot be `DELETE_CANDIDATE` merely because it contains `legacy`, `old`, `test`, a PR number, or an old date.
- A `DELETE_CANDIDATE` must have zero active inbound runtime references, an explicit replacement or no-runtime-purpose reason, and a rollback source in Git history.
- F01 does not alter runtime imports/routes, does not delete files, and does not change Production behavior.

---

### Task 1 — RED contract for inventory engine

**Files:**
- Create: `tests/fusion-f01-runtime-inventory.test.cjs`

- [ ] Require `scripts/fusion/runtime-inventory.cjs` and `config/fusion/runtime-inventory-registry.json`.
- [ ] Assert the six exact class names.
- [ ] Assert `inventoryRepository()` is deterministic for a synthetic filesystem fixture.
- [ ] Assert paths with active inbound references cannot be classified `DELETE_CANDIDATE`.
- [ ] Assert redirect shims can be represented as `MIGRATION_BRIDGE` with explicit replacement.
- [ ] Assert migrations and protected evidence paths never become deletion candidates.
- [ ] Assert duplicate file content alone does not authorize deletion.
- [ ] Run focused test and record expected RED because engine/registry do not exist.

### Task 2 — Explicit F01 classification registry

**Files:**
- Create: `config/fusion/runtime-inventory-registry.json`

Registry schema version 1 contains:

- current runtime roots/entrypoints;
- known migration bridges;
- protected path prefixes;
- known historical/test-only patterns used only as hints;
- explicit candidate records where prior audits already identified a path for review;
- classification reason codes.

Seed known current evidence from repository audits:

- `index.html` → `ACTIVE`.
- `private-profile-p03.html` → `ACTIVE`.
- `private-profile.html` → `MIGRATION_BRIDGE`, replacement `private-profile-p03.html`.
- `clerk-private-profile.html` → `MIGRATION_BRIDGE`, replacement `private-profile-p03.html`.
- `owner-control.html` → `MIGRATION_BRIDGE`, replacement target `SINGLE_SURFACE_SCG_PENDING`.
- `sw.js` → `ACTIVE`.
- `manifest.webmanifest` → `ACTIVE`.
- `auth-clerk-index.js` → `ACTIVE` when referenced by current shell.

Prior-audit review candidates such as `auth.js`, `auth-supabase.js`, `clerk-test.html`, `firebase.json`, and old root style/auth artifacts are **review candidates only**; the engine decides final F01 class using active references and registry evidence. No deletion is authorized.

### Task 3 — Read-only inventory engine

**Files:**
- Create: `scripts/fusion/runtime-inventory.cjs`

Exports:

```js
const CLASSES = Object.freeze([...]);
function inventoryRepository(options) {}
function collectStaticReferences(text, sourcePath) {}
function classifyPath(path, evidence, registry) {}
function canonicalizeInventory(inventory) {}
module.exports = { CLASSES, inventoryRepository, collectStaticReferences, classifyPath, canonicalizeInventory };
```

Engine responsibilities:

1. Walk only repository files supplied by adapter/options; no network, no mutation.
2. Identify root HTML/PWA entrypoints and recursively record static `src`, `href`, JS literal runtime paths, service-worker cache assets, and manifest/icon references.
3. Normalize relative paths; reject path escape.
4. Record `inboundReferences[]` for every discovered runtime path.
5. Apply explicit registry overrides only when their evidence requirements are satisfied.
6. Classify unresolved runtime-relevant files conservatively as `ORPHANED` or `MIGRATION_BRIDGE`, never delete automatically.
7. Sort all arrays and keys deterministically before serialization.
8. Emit no secret/file contents in report; only path, class, reasons, replacement, inbound reference paths, size/hash metadata if provided by adapter.

### Task 4 — Repository inventory snapshot

**Files:**
- Create: `config/fusion/runtime-inventory.json`

Generate a deterministic snapshot from the actual F01 branch. It must include:

```json
{
  "schemaVersion": 1,
  "sourceSha": "<exact F01 generation head>",
  "generatedFor": "FUSION_F01_RUNTIME_INVENTORY",
  "deletionAuthorized": false,
  "entries": []
}
```

Every entry has:

```text
path
classification
reasonCodes[]
inboundReferences[]
replacement (optional)
```

No file bytes, secrets, tokens, PII, or environment values are stored.

### Task 5 — Current runtime coverage contract

Extend focused tests to prove at minimum:

- canonical entrypoints are present in inventory;
- every file referenced by `index.html`, `private-profile-p03.html`, `sw.js`, and `manifest.webmanifest` appears in inventory;
- no entry marked `DELETE_CANDIDATE` has an inbound reference from an `ACTIVE` path;
- all `MIGRATION_BRIDGE` entries have a replacement/retirement target;
- `deletionAuthorized === false`;
- output is byte-deterministic for unchanged inputs.

### Task 6 — Exact-head review and CI

- [ ] Run focused F01 tests.
- [ ] Compare F01 branch to F00: only plan + registry + read-only engine + tests + inventory snapshot.
- [ ] Open Draft stacked PR to F00.
- [ ] Trigger exact-head repository CI against `main` via a verification channel only if required by workflow path filters; never merge verification PR.
- [ ] Required gates: Quality Gate, V14, CodeQL, Dependency Review, CleanGuard, Project Control.
- [ ] F01 exits only with an evidence-backed inventory; it performs no deletion.

## F02 handoff

F02 consumes only `ACTIVE` and `MIGRATION_BRIDGE` surface evidence to build the Single Surface. F15 later consumes `DELETE_CANDIDATE` evidence and adds stronger route/build/rollback proof before any actual removal.
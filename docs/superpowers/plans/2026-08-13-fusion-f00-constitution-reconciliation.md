# FUSION F00 Constitution Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove contradictory legacy product authority from all current owner/implementation references and establish one machine-verifiable VVIP TIGER FUSION 2026 Source of Truth without deleting historical Git evidence.

**Architecture:** Replace the three legacy active references (`docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md`, `docs/VVIP_TIGER_MEMORY_MAP.md`, `IMPLEMENTATION_CHECKLIST.md`) with concise supersession tombstones pointing to the FINAL FUSION constitution and master roadmap. Add a current-owner reference index plus a machine-readable decision catalog. Protect the reconciliation with a Node `node:test` contract that fails if forbidden legacy rules reappear in active references.

**Tech Stack:** Markdown, JSON, Node.js built-in `node:test`, GitHub Actions existing repository Quality Gate.

## Global Constraints

- Do not modify Production runtime, database, auth, payments, country activation, or mobile-store artifacts in F00.
- Git history preserves previous documents; current files must not continue presenting superseded rules as active truth.
- Forbidden active rules: Jordan-first/Arab-first governing identity, fixed three sectors, fixed four posts/week, universal 120-day listing lifetime, Tiger Care old support-center experience, admin/super_admin implying OWNER, separate role-specific product skins, and unapproved blue login.
- The approved FINAL constitution remains `docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md`.
- The master execution roadmap remains `docs/superpowers/plans/2026-08-13-vvip-tiger-fusion-2026-master-roadmap.md`.
- Historical evidence is preserved only in Git history or explicitly historical documentation, never as the current owner-operational reference.

---

### Task 1: Add the F00 authority contract test

**Files:**
- Create: `tests/fusion-f00-authority-reconciliation.test.cjs`

**Interfaces:**
- Consumes: repository files through `fs.readFileSync`.
- Produces: a test contract asserting exact canonical reference paths, valid JSON catalog state, and absence of forbidden legacy active rules from current references.

- [ ] **Step 1: Write the failing test**

Create a `node:test` suite that requires these files to exist:

```js
const ACTIVE_REFERENCE_FILES = [
  'docs/VVIP_TIGER_CURRENT_OWNER_REFERENCE.md',
  'docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md',
  'docs/VVIP_TIGER_MEMORY_MAP.md',
  'IMPLEMENTATION_CHECKLIST.md'
];
```

Require all four to point to:

```text
docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md
```

Require the current-owner index to point to:

```text
docs/superpowers/plans/2026-08-13-vvip-tiger-fusion-2026-master-roadmap.md
```

Load `config/fusion/vvip-tiger-fusion-2026-decisions.json` and assert:

```js
catalog.schemaVersion === 1
catalog.product === 'VVIP TIGER FUSION 2026'
catalog.identity === 'GLOBAL_FIRST'
catalog.currentOwnerReference.endsWith('owner-constitution-FINAL.md')
```

Assert each legacy decision id has state `SUPERSEDED`:

```text
LEGACY_JORDAN_FIRST
LEGACY_FIXED_THREE_SECTORS
LEGACY_FOUR_POSTS_WEEKLY
LEGACY_120_DAY_LISTING_LIFETIME
LEGACY_TIGER_CARE_SUPPORT_CENTER
LEGACY_ADMIN_EQUALS_OWNER
LEGACY_ROLE_SPECIFIC_SURFACE
LEGACY_BLUE_LOGIN_UNAPPROVED
```

Assert active reference files do not contain active-rule patterns such as:

```text
Maximum 4 posts per week
4 منشورات أسبوعيًا
Posts/content are automatically deleted after 120 days
حذف تلقائي بعد 120 يومًا
The platform starts with three sectors
القطاعات المعتمدة من البداية
Tiger Care Contact Request is officially adopted as a core
Jordan-first, Arab-first
```

The tombstones may mention the legacy decision names only inside an explicit `SUPERSEDED` table/list; they must not repeat old implementation instructions.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/fusion-f00-authority-reconciliation.test.cjs
```

Expected before implementation: FAIL because the current-owner index and decision catalog do not exist and old active references still contain legacy rules.

- [ ] **Step 3: Commit the RED contract**

```bash
git add tests/fusion-f00-authority-reconciliation.test.cjs
git commit -m "test(fusion): lock F00 product authority contract"
```

---

### Task 2: Create machine-readable FUSION decision authority

**Files:**
- Create: `config/fusion/vvip-tiger-fusion-2026-decisions.json`

**Interfaces:**
- Consumes: FINAL owner constitution.
- Produces: deterministic machine-readable current/superseded decision state for CI and future owner tooling.

- [ ] **Step 1: Create exact JSON catalog**

Use schema version `1` with top-level fields:

```json
{
  "schemaVersion": 1,
  "product": "VVIP TIGER FUSION 2026",
  "identity": "GLOBAL_FIRST",
  "currentOwnerReference": "docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md",
  "masterRoadmap": "docs/superpowers/plans/2026-08-13-vvip-tiger-fusion-2026-master-roadmap.md",
  "legacyDecisions": []
}
```

Each legacy item contains only:

```json
{
  "id": "LEGACY_JORDAN_FIRST",
  "state": "SUPERSEDED",
  "replacement": "GLOBAL_FIRST",
  "reason": "Owner-approved FUSION 2026 constitution"
}
```

Add the eight ids named in Task 1 with precise replacements:

- `GLOBAL_FIRST`
- `DYNAMIC_SECTOR_REGISTRY`
- `ADAPTIVE_SERVER_POSTING_CONTROLS`
- `POLICY_DRIVEN_LISTING_LIFECYCLE`
- `NO_OLD_TIGER_CARE_SURFACE`
- `SOA_SOVEREIGN_OWNER`
- `SINGLE_PRODUCT_SURFACE`
- `APPROVED_LOGIN_VISUAL_FREEZE`

- [ ] **Step 2: Validate JSON syntax**

Run:

```bash
node -e "const x=require('./config/fusion/vvip-tiger-fusion-2026-decisions.json'); if(x.schemaVersion!==1) process.exit(1); console.log('F00_DECISION_CATALOG_OK')"
```

Expected: `F00_DECISION_CATALOG_OK`.

- [ ] **Step 3: Commit**

```bash
git add config/fusion/vvip-tiger-fusion-2026-decisions.json
git commit -m "docs(fusion): add machine-readable FUSION authority catalog"
```

---

### Task 3: Create the current owner operational reference

**Files:**
- Create: `docs/VVIP_TIGER_CURRENT_OWNER_REFERENCE.md`

**Interfaces:**
- Consumes: FINAL constitution and master roadmap.
- Produces: one concise owner-facing operational index with no legacy implementation rules.

- [ ] **Step 1: Create the current owner index**

It must state:

```text
CURRENT PRODUCT: VVIP TIGER FUSION 2026
IDENTITY: GLOBAL-FIRST
CURRENT CONSTITUTION: docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md
CURRENT ROADMAP: docs/superpowers/plans/2026-08-13-vvip-tiger-fusion-2026-master-roadmap.md
```

It must state that old blue login, Jordan-first, fixed three sectors, four posts/week, universal 120-day life, Tiger Care old surface, old role hierarchy, and separate admin/owner skins are superseded.

It must not restate their old operational details.

It must state that Git history is evidence only and cannot override current FUSION decisions.

- [ ] **Step 2: Run focused test**

```bash
node --test tests/fusion-f00-authority-reconciliation.test.cjs
```

Expected: still FAIL until legacy active references and catalog are fully reconciled.

- [ ] **Step 3: Commit**

```bash
git add docs/VVIP_TIGER_CURRENT_OWNER_REFERENCE.md
git commit -m "docs(fusion): add current owner operational reference"
```

---

### Task 4: Tombstone the three legacy active references

**Files:**
- Modify: `docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md`
- Modify: `docs/VVIP_TIGER_MEMORY_MAP.md`
- Modify: `IMPLEMENTATION_CHECKLIST.md`

**Interfaces:**
- Consumes: current owner reference.
- Produces: stable old paths that no longer expose obsolete active instructions.

- [ ] **Step 1: Replace Official Product Blueprint content**

Replace the active legacy body with a concise notice containing:

```text
# SUPERSEDED — VVIP TIGER Legacy Product Blueprint
Status: HISTORICAL PATH ONLY — NOT CURRENT PRODUCT AUTHORITY
Current owner reference: docs/VVIP_TIGER_CURRENT_OWNER_REFERENCE.md
Current constitution: docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md
```

State that old content remains in Git history for provenance and must not be used for current implementation.

- [ ] **Step 2: Replace Memory Map content**

Use the same tombstone model. Do not repeat old roles, sectors, posting limits, lifecycle, or Tiger Care workflow.

- [ ] **Step 3: Replace Implementation Checklist content**

Point exclusively to the master F00-F16 roadmap and current owner reference. State that the July checklist is preserved in Git history and is not executable current policy.

- [ ] **Step 4: Run focused test and verify GREEN**

```bash
node --test tests/fusion-f00-authority-reconciliation.test.cjs
```

Expected: all F00 authority tests PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md docs/VVIP_TIGER_MEMORY_MAP.md IMPLEMENTATION_CHECKLIST.md
git commit -m "docs(fusion): retire legacy active product authority"
```

---

### Task 5: Repository-wide reconciliation evidence and CI

**Files:**
- Test: `tests/fusion-f00-authority-reconciliation.test.cjs`

**Interfaces:**
- Consumes: completed F00 branch.
- Produces: exact-head evidence and inventory inputs for F01.

- [ ] **Step 1: Search repository for legacy phrases**

Search for the legacy markers. Remaining hits are allowed only in historical/spec/test evidence that is not a current operational reference. Record paths for F01 classification.

- [ ] **Step 2: Run focused F00 test**

```bash
node --test tests/fusion-f00-authority-reconciliation.test.cjs
```

Expected: PASS.

- [ ] **Step 3: Open a Draft PR stacked on the approved design branch**

PR title:

```text
docs(fusion): reconcile F00 product authority
```

Body must state: no runtime mutation, no deletion from Git history, no Production change, and list the exact current owner reference/catalog/tombstone files.

- [ ] **Step 4: Run repository CI on exact F00 head**

Required green evidence includes available repository gates such as Quality Gate, V14 Release Candidate, CodeQL, Dependency Review, CleanGuard, and Project Control Integrity.

- [ ] **Step 5: Do not merge automatically**

F00 remains protected until exact-head review and owner/human merge requirements are satisfied. F01 may be prepared as a stacked branch only if it does not mutate F00 exact-head evidence.
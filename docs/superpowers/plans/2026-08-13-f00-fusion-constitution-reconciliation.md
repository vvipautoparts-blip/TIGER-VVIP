# F00 FUSION Constitution Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `VVIP TIGER FUSION 2026 — FINAL Owner Constitution` the single current product authority, prevent superseded legacy decisions from being treated as active, and create machine-verifiable governance before any user-facing runtime redesign.

**Architecture:** F00 is documentation/governance/runtime-authority reconciliation only. It does not delete legacy files and does not change Production behavior. It introduces a canonical authority manifest plus tests that fail if current-owner references or active product authority reintroduce superseded rules. Historical evidence remains available but is explicitly removed from the active authority chain.

**Tech Stack:** Git/GitHub, Markdown, JSON, Node 22 `node:test`, existing repository Quality Gate/CleanGuard/CodeQL workflows.

## Global Constraints

- FUSION FINAL is global-first; `Jordan-first` / `Arab-first` cannot remain an active governing identity.
- No fixed three-sector model.
- No fixed four-posts-per-week rule.
- No universal fixed 120-day listing lifetime.
- No Tiger Care old support-center experience as current product architecture.
- No unapproved blue login-screen decision.
- No separate final-state visual platform for owner/partner/employee/admin.
- Preserve SOA, RLS, release security, financial ledger, country gates, audit, recovery, PR36 resource safety, and Strangler architecture.
- Historical evidence may remain for audit/rollback/provenance but must not appear as current owner-operational authority.
- No Production deployment, remote DB apply, money movement, country activation, or destructive runtime deletion in F00.
- TDD: every enforcement rule is introduced by a failing test before implementation.

---

## File Structure

**Create**
- `docs/fusion/FUSION_CURRENT_AUTHORITY.md` — concise human-readable current authority index for owner/developers.
- `config/fusion/current-authority.json` — machine-readable authority and supersession catalog.
- `tests/fusion-current-authority.test.cjs` — contract tests for authority version, superseded decisions, and source-of-truth chain.
- `scripts/fusion/verify-current-authority.cjs` — deterministic validator used by tests/CI.

**Modify**
- `docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md` — replace obsolete top-authority claim and active legacy rules with a historical redirect notice; do not delete file.
- `docs/global/GLOBAL_ARCHITECTURE_DECISION_AR.md` — add explicit statement that FUSION FINAL governs product decisions while Strangler migration remains the architectural migration method.

**Do not modify in F00**
- `index.html`
- login/runtime CSS/JS
- database migrations
- SOA runtime
- PR36 runtime
- payment/ledger runtime
- deployment workflows

---

### Task 1: Authority contract RED

**Files:**
- Create: `tests/fusion-current-authority.test.cjs`
- Test target (not yet present): `config/fusion/current-authority.json`
- Test target (not yet present): `scripts/fusion/verify-current-authority.cjs`

**Interfaces:**
- Produces required manifest schema `VVIP_TIGER_FUSION_AUTHORITY_V1`.
- Requires `currentReference` = `docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md`.
- Requires superseded decision IDs: `LEGACY_JORDAN_FIRST`, `LEGACY_FIXED_THREE_SECTORS`, `LEGACY_FOUR_POSTS_WEEK`, `LEGACY_120_DAY_LIFETIME`, `LEGACY_TIGER_CARE`, `LEGACY_BLUE_LOGIN`, `LEGACY_SEPARATE_ADMIN_SURFACE`.

- [ ] **Step 1: Write the failing test**

Create a Node `node:test` suite that:
1. requires `config/fusion/current-authority.json` to exist;
2. requires `schemaVersion === "VVIP_TIGER_FUSION_AUTHORITY_V1"`;
3. requires `productIdentity === "GLOBAL_FIRST"`;
4. requires exact `currentReference` path;
5. requires every legacy decision above to exist with `status === "SUPERSEDED"`;
6. requires `historicalEvidencePolicy === "PRESERVE_OUTSIDE_CURRENT_AUTHORITY"`;
7. requires `implementationPhases` to equal `F00` through `F16` in order;
8. requires both `digitalTwin.uniqueActors === 4000000` and `digitalTwin.simultaneousActiveUsers === 4000000`;
9. requires `globalLaunchEligibilityRequiresBoth4M === true`.

- [ ] **Step 2: Run RED**

Run:
`node --test tests/fusion-current-authority.test.cjs`

Expected: FAIL because the authority manifest/validator do not yet exist.

- [ ] **Step 3: Commit RED evidence**

Commit only the failing test with message:
`test(fusion): define F00 current-authority contract`

---

### Task 2: Canonical machine-readable authority GREEN

**Files:**
- Create: `config/fusion/current-authority.json`
- Create: `scripts/fusion/verify-current-authority.cjs`
- Test: `tests/fusion-current-authority.test.cjs`

**Interfaces:**
- `verifyCurrentAuthority(manifest)` returns `{ ok: boolean, errors: string[] }`.
- Validator rejects unknown schema, duplicate decision IDs, missing F00–F16 sequence, wrong current reference, any superseded decision not marked `SUPERSEDED`, or either 4M target below 4,000,000.

- [ ] **Step 1: Implement minimal manifest**

Manifest contains only governance facts needed by automation: schema version, current reference, identity, superseded decisions, retained foundations, F00–F16 sequence, 4M requirements, historical evidence policy, and launch-eligibility truth rule. No PII, secret, country credential, pricing secret, or runtime token.

- [ ] **Step 2: Implement deterministic validator**

Use CommonJS, no network, no environment secrets, no filesystem writes. Export `verifyCurrentAuthority` and `REQUIRED_SUPERSEDED_IDS`.

- [ ] **Step 3: Run GREEN**

Run:
`node --test tests/fusion-current-authority.test.cjs`

Expected: PASS.

- [ ] **Step 4: Commit**

Commit manifest, validator, and green test with message:
`feat(fusion): establish machine-readable current authority`

---

### Task 3: Human current-authority index

**Files:**
- Create: `docs/fusion/FUSION_CURRENT_AUTHORITY.md`

**Interfaces:**
- Human-readable mirror of machine manifest; does not duplicate the full constitution.
- Links/paths to FINAL constitution, authority JSON, SOA design, and global architecture decision.

- [ ] **Step 1: Add contract test assertions**

Extend test to require `FUSION_CURRENT_AUTHORITY.md` to include:
- `CURRENT PRODUCT AUTHORITY`;
- exact FINAL constitution path;
- `GLOBAL_FIRST`;
- `SUPERSEDED / HISTORICAL ONLY`;
- `F00 -> F16`;
- both `4,000,000 unique` and `4,000,000 simultaneous` launch gates.

- [ ] **Step 2: Run RED**

Expected: FAIL because human index does not exist.

- [ ] **Step 3: Create concise index**

State that only FUSION FINAL is current product design authority; list retained foundations and superseded legacy decisions; explain that old docs remain evidence only; show execution order.

- [ ] **Step 4: Run GREEN and commit**

Commit message:
`docs(fusion): establish current owner authority index`

---

### Task 4: Retire obsolete Official Product Blueprint from active authority

**Files:**
- Modify: `docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md`
- Test: `tests/fusion-current-authority.test.cjs`

**Interfaces:**
- Old filename remains for historical links.
- Its first section becomes `SUPERSEDED / HISTORICAL ONLY` and points to FUSION current authority.
- It must not claim to be the highest current product reference.
- It must not present Jordan-first, fixed sectors, weekly post limit, 120-day lifetime, Tiger Care, or old fixed sector-management assignments as current instructions.

- [ ] **Step 1: Add failing regression assertions**

Test must fail if the old blueprint contains active-authority phrases such as:
- `highest product reference` without a superseded warning;
- `Jordan-first` as current identity;
- `Each account can publish 4 posts per week`;
- `Listing lifetime is 120 days`;
- `Tiger Care is a core unit`.

- [ ] **Step 2: Run RED**

Expected: FAIL on current legacy blueprint.

- [ ] **Step 3: Replace active legacy content with historical redirect**

Keep provenance metadata and a short historical summary, but move active implementation authority to `docs/fusion/FUSION_CURRENT_AUTHORITY.md` and FINAL constitution.

- [ ] **Step 4: Run GREEN and commit**

Commit message:
`docs(fusion): retire legacy product blueprint authority`

---

### Task 5: Preserve Strangler architecture while reconciling authority

**Files:**
- Modify: `docs/global/GLOBAL_ARCHITECTURE_DECISION_AR.md`
- Test: `tests/fusion-current-authority.test.cjs`

**Interfaces:**
- Product authority: FUSION FINAL.
- Migration strategy: Strangler Migration remains retained foundation.
- Legacy P/G mapping remains historical/migration evidence, not product-decision authority.

- [ ] **Step 1: Add failing assertion**

Require architecture document to contain `VVIP TIGER FUSION 2026` and explicitly distinguish `product authority` from `migration architecture`.

- [ ] **Step 2: Run RED**

Expected: FAIL before doc update.

- [ ] **Step 3: Update architecture decision**

Add a short authority section while preserving the existing Strangler boundaries and adapters.

- [ ] **Step 4: Run GREEN and commit**

Commit message:
`docs(fusion): bind strangler migration to FUSION authority`

---

### Task 6: Repository-wide F00 verification

**Files:** no new product files.

- [ ] **Step 1: Run focused F00 test**

`node --test tests/fusion-current-authority.test.cjs`

Expected: PASS.

- [ ] **Step 2: Run existing quality gate**

`scripts/quality-gate.sh`

Expected: PASS on exact head. If a gate fails, diagnose root cause; do not suppress or weaken checks.

- [ ] **Step 3: Run secret/security checks through repository CI**

Required exact-head workflows: Quality Gate, V14 Release Candidate, CleanGuard, Dependency Review, Project Control Integrity, CodeQL; additional path-triggered security rehearsals when applicable.

- [ ] **Step 4: Review diff scope**

F00 must contain governance/docs/test files only. No runtime, SQL, deployment, payment, or Production mutation.

- [ ] **Step 5: Create/refresh Draft PR**

PR title:
`feat(fusion): F00 reconcile global product authority`

PR remains Draft until exact-head CI and human review pass.

---

## Self-review result

- Spec coverage for F00: covered — current authority, supersession, owner index, machine catalog, Strangler preservation, no runtime deletion.
- Placeholder scan: no TBD/TODO/implement-later placeholders.
- Scope: intentionally excludes F01–F16 implementation details; each later phase gets its own plan.
- Security: no secret/PII/remote mutation path introduced.
- Rollback: revert F00 commits restores prior documentation authority; no Production data is changed.

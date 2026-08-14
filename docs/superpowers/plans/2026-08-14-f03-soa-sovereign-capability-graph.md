# F03 SOA + Sovereign Capability Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans with TDD and verification. Steps use checkbox syntax for tracking.

**Goal:** Add a fail-closed F03 capability contract and Single Surface `⋮` presentation layer on top of the existing V13/SOA authorization stack.

**Architecture:** A focused ESM module validates server-confirmed capability snapshots using existing V13 authority/permission constants and produces immutable presentation entries. A thin UI controller consumes only validated output. No browser authority decisions, SQL apply, Production RLS changes, or protected-auth weakening are allowed.

**Tech Stack:** Node 22 ESM, node:test CommonJS harness, existing V13 authorization modules, F02 Single Surface HTML/JS, existing Quality Gate.

## Global Constraints

- Preserve SOA and existing V13 authorization contracts.
- `OWNER_ROOT` remains immutable sovereign root.
- Unknown, stale, malformed, or unconfirmed capability data fails closed.
- Client state never grants authority.
- Enforce `docs/fusion/OWNER_RULE_ADVERTISING_CONNECTION_ONLY_2026.md`.
- No checkout, escrow, delivery/shipping, marketplace transaction settlement/commission, or dispute-resolution capability.
- No SQL/database apply, Production deploy, country activation, money movement, secrets change, or auth weakening.

---

### Task 1: Capability snapshot contract

**Files:**
- Test: `tests/f03-sovereign-capability-graph.test.cjs`
- Create: `scripts/fusion/f03-capability-graph.js`

**Interfaces:**
- Produces: `buildCapabilityView(snapshot, nowMs)` -> immutable `{ok, code, actor, entries}`.

- [ ] Write failing tests for absent/unconfirmed snapshot, expiry/TTL, unknown permissions, forbidden intermediary namespaces, exact permission mapping, and immutability.
- [ ] Run `node --test tests/f03-sovereign-capability-graph.test.cjs` and confirm RED because `scripts/fusion/f03-capability-graph.js` does not exist.
- [ ] Implement the minimal validator/presenter using `AUTHORITY_CLASSES`, `PERMISSION_IDS`, and `LIMITS.ENVELOPE_TTL_SECONDS` from `scripts/authorization/v13-authority-contracts.js`.
- [ ] Run the focused test and confirm PASS.
- [ ] Run the existing V13 authorization integrity tests and confirm PASS.

### Task 2: Single Surface capability menu controller

**Files:**
- Test: `tests/f03-single-surface-capability-menu.test.cjs`
- Create: `scripts/fusion/f03-capability-menu.js`
- Modify: `fusion-home-f02.html`

**Interfaces:**
- Consumes: validated result from `buildCapabilityView`.
- Produces: DOM rendering only; never authority.

- [ ] Write failing tests proving the menu renders no privileged entries without validated F03 output and only renders exact entries when validated.
- [ ] Add the controller and wire it to the existing `data-fusion-capability-menu` / `data-fusion-capability-sheet` hooks.
- [ ] Keep ordinary-user behavior safe when no server snapshot is available.
- [ ] Run focused F03 tests and existing F02 tests.

### Task 3: Owner authority traceability

**Files:**
- Modify: `docs/fusion/FUSION_CURRENT_AUTHORITY.md`
- Modify: `docs/fusion/OWNER_REQUIREMENTS_TRACEABILITY_2026.md`
- Create: `docs/fusion/F03_SCG_STATUS.md`

- [ ] Link the advertising/connection-only Owner Rule from the current authority chain.
- [ ] Record F03 scope, exact head, tests, and unresolved Production integration boundaries.
- [ ] Do not alter the already verified F02 branch; all F03 changes remain on the F03 branch.

### Task 4: Verification

- [ ] Run focused Node tests.
- [ ] Run `bash scripts/quality-gate.sh` through CI on exact head.
- [ ] Run V14 Release Candidate, CodeQL, Dependency Review, TIGER CleanGuard, and Project Control Integrity on exact head.
- [ ] Review the diff for no SQL/database apply, no Production deployment, no transaction-intermediary features, and no auth weakening.
- [ ] Keep F03 Draft until exact-head evidence is complete.
# Proximity-Only Three-Lane Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the owner-approved proximity-only constitution and `SHARE=DISTRIBUTE`, `•••=CONTROL`, `CONTACT=HANDOFF -> TIGER STOPS` model the enforced current authority, while removing currently rendered dead Share/••• controls and preventing legacy brokerage semantics from regaining runtime authority.

**Architecture:** Extend the existing Issue #312 owner-authority registry rather than creating a parallel commerce authority. Enforce the new rule with fail-closed static contracts, then minimally remove current UI controls whose runtime capability does not exist. Preserve working reactions/comments and preserve historical evidence only when explicitly tombstoned.

**Tech Stack:** Node.js `node:test`, CommonJS static contract tests, existing static/PWA Social Core JavaScript, Markdown owner/governance docs, GitHub Actions quality gates.

**Spec:** `docs/superpowers/specs/2026-08-22-proximity-only-three-lane-interaction-design.md`

## Global Constraints

- External-deal path remains `DISCOVERY -> RELEVANCE -> EXPLANATION -> CONTACT HANDOFF -> TIGER STOPS`.
- `SHARE = DISTRIBUTE`.
- `••• = CONTROL`.
- `CONTACT = HANDOFF -> TIGER STOPS`.
- No external-deal negotiation, order, checkout, payment, escrow, payout, settlement, fulfillment, transaction-value commission, or success fee.
- TIGER-owned advertising, ad credits/packages, paid visibility and explicitly approved platform-owned services remain separate allowed platform finance.
- `AD_REVENUE_DEPENDS_ON_DEAL_OUTCOME=false`.
- Capability must exist and be authorized before its user-visible control renders.
- Preserve working reactions/comments and unrelated Social/ONE FIELD/sector/security capabilities.
- Do not manufacture staging/production/legal/device evidence.

---

### Task 1: Make the proximity-only constitution part of canonical authority

**Files:**
- Modify: `docs/architecture/OWNER_AUTHORITY_REGISTRY.md`
- Create: `tests/proximity-only-three-lane-authority.test.cjs`

**Interfaces:**
- Consumes: current Issue #312 authority registry and the approved design spec.
- Produces: one canonical owner-authority pointer and machine-testable invariants for future code/docs.

- [ ] **Step 1: Write the failing authority test**

Create `tests/proximity-only-three-lane-authority.test.cjs` with tests that require the registry to reference the design spec and contain the canonical three-lane grammar and fail-closed invariants:

```js
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("owner authority binds proximity-only three-lane interaction", () => {
  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  assert.match(registry, /proximity-only-three-lane-interaction-design\.md/i);
  assert.match(registry, /SHARE\s*=\s*DISTRIBUTE/i);
  assert.match(registry, /CONTACT\s*=\s*HANDOFF\s*->\s*TIGER STOPS/i);
  assert.match(registry, /CONTACT_HANDOFF_IS_TERMINAL=true/);
  assert.match(registry, /ACTIVE_SUCCESS_FEE=0/);
  assert.match(registry, /AD_REVENUE_DEPENDS_ON_DEAL_OUTCOME=false/);
});

test("owner authority keeps advertising finance independent from external deal outcome", () => {
  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  assert.match(registry, /advertising|ad credits|platform-owned services/i);
  assert.match(registry, /independent.*external deal.*outcome|external deal.*outcome.*independent/i);
  assert.match(registry, /transaction-value commission|success fee/i);
});
```

- [ ] **Step 2: Verify RED**

Run through the repository quality gate / Node test suite. Expected: the new test fails because the canonical registry does not yet reference the new design or expose all new invariants.

- [ ] **Step 3: Minimal registry implementation**

Add one owner-approved section to `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` that:

```text
references docs/superpowers/specs/2026-08-22-proximity-only-three-lane-interaction-design.md
SHARE = DISTRIBUTE
••• = CONTROL
CONTACT = HANDOFF -> TIGER STOPS
CONTACT_HANDOFF_IS_TERMINAL=true
EXTERNAL_DEAL_STATE_MACHINE=0
ACTIVE_EXTERNAL_DEAL_PAYMENT=0
ACTIVE_EXTERNAL_DEAL_COMMISSION=0
ACTIVE_SUCCESS_FEE=0
ACTIVE_EXTERNAL_DEAL_SETTLEMENT=0
ACTIVE_EXTERNAL_DEAL_FULFILLMENT=0
AD_REVENUE_DEPENDS_ON_DEAL_OUTCOME=false
```

State that platform-owned advertising/service finance remains independent from external-deal outcome/value.

- [ ] **Step 4: Verify GREEN**

Run the same tests and the existing `tests/final-zero-brokerage-authority.test.cjs`. Expected: PASS without weakening Issue #312.

- [ ] **Step 5: Commit**

Commit test + registry update together after RED has been observed and corrected.

---

### Task 2: Prove current rendered Share/••• controls are dead before removing them

**Files:**
- Create: `tests/social-feed-no-dead-actions.test.cjs`
- Read: `scripts/social/feed-controller.js`

**Interfaces:**
- Consumes: current feed renderer.
- Produces: regression contract that allows only real post actions to render.

- [ ] **Step 1: Write the failing test**

Create:

```js
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("feed does not render a dead future Share control", () => {
  const feed = read("scripts/social/feed-controller.js");
  assert.doesNotMatch(feed, /data-social-share-trigger/);
  assert.doesNotMatch(feed, /المشاركة غير متاحة في الإصدار الحالي/);
  assert.doesNotMatch(feed, /social-post-action--share/);
});

test("feed does not render a dead future three-dot control", () => {
  const feed = read("scripts/social/feed-controller.js");
  assert.doesNotMatch(feed, /خيارات المنشور غير متاحة في الإصدار الحالي/);
  assert.doesNotMatch(feed, /social-feed-post__menu/);
});

test("removing dead controls preserves working reaction and comment hosts", () => {
  const feed = read("scripts/social/feed-controller.js");
  assert.match(feed, /data-social-reactions-host/);
  assert.match(feed, /data-social-comment-trigger/);
  assert.match(feed, /data-social-comments-host/);
});
```

- [ ] **Step 2: Verify RED**

Run quality gate / Node tests. Expected: Share and ••• tests fail because the renderer currently creates and appends both disabled controls; preservation test passes.

- [ ] **Step 3: Commit RED test only**

Commit the failing test alone so CI provides evidence that it detects the current defect.

---

### Task 3: Remove dead rendered Share/••• controls without deleting their approved product concepts

**Files:**
- Modify: `scripts/social/feed-controller.js`
- Test: `tests/social-feed-no-dead-actions.test.cjs`
- Test: `tests/tiger-social-core-shell.test.cjs`

**Interfaces:**
- Consumes: regression test from Task 2.
- Produces: feed renderer with no fake Share/••• controls while retaining comments/reactions.

- [ ] **Step 1: Minimal production change**

In `postNode()`:

1. Remove creation/append of the disabled `menu` button.
2. Change `header.append(avatar, identity, menu)` to:

```js
header.append(avatar, identity);
```

3. Remove creation/attributes/append of the disabled `share` button.
4. Change:

```js
secondaryActions.append(comment, share);
```

To:

```js
secondaryActions.append(comment);
```

Do not alter reaction/comment runtime behavior.

- [ ] **Step 2: Verify GREEN**

Run the new test plus Social Core tests. Expected: all pass.

- [ ] **Step 3: Check legacy tests**

If any legacy test requires a visible disabled Share/••• placeholder, change that assertion only to the new capability-before-UI contract; do not weaken assertions for real working controls.

- [ ] **Step 4: Commit**

Commit the minimal renderer fix and any strictly necessary legacy-test correction.

---

### Task 4: Prevent the Three-Lane model from being reinterpreted as commerce execution

**Files:**
- Create: `tests/proximity-only-current-authority-sweep.test.cjs`
- Read/modify only when required by RED evidence: current-authority product/payment/owner docs already governed by Issue #312.

**Interfaces:**
- Consumes: canonical registry and approved design.
- Produces: semantic guard against future Buy/Order/Checkout/Pay/commission authority in current paths.

- [ ] **Step 1: Write the failing-or-green diagnostic test**

The test must require:

```js
const spec = read("docs/superpowers/specs/2026-08-22-proximity-only-three-lane-interaction-design.md");
const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");

assert.match(spec, /CONTACT\s*=\s*HANDOFF\s*->\s*TIGER STOPS/i);
assert.match(spec, /AD_REVENUE_DEPENDS_ON_DEAL_OUTCOME=false/);
assert.match(registry, /RETIRE_BROKERAGE/);
```

For selected *current-authority* UI/runtime files, forbid TIGER-owned external transaction actions such as literal user-facing `Buy`, `Checkout`, `Pay`, or `Make Offer` when they would create an external-deal execution path. Historical evidence files are not scanned as current runtime authority.

- [ ] **Step 2: Verify result**

If RED, inspect each hit semantically. Do not perform global word deletion because terms may legitimately exist in tests, historical evidence, or platform-owned advertising billing.

- [ ] **Step 3: Retire or redesign each true conflict**

For every true active conflict choose exactly one:

```text
RETIRE_BROKERAGE
REDESIGN_DISCOVERY_ONLY
HISTORICAL_EVIDENCE_ONLY
KEEP_PLATFORM_FINANCE (only TIGER-owned advertising/services)
```

No alias may preserve prohibited external-deal execution.

- [ ] **Step 4: Verify GREEN and commit**

Run the new sweep plus existing zero-brokerage/owner-authority tests.

---

### Task 5: Update current navigation/documentation pointers without reviving stale authority

**Files:**
- Modify only if required after inspection: `DOCUMENTATION-INDEX.md`, `docs/MASTER_PROJECT_STATE.md`, current owner-control/readiness docs.
- Test: extend an existing current-documentation authority test or add a focused test.

**Interfaces:**
- Consumes: canonical registry/spec.
- Produces: current docs that route engineers to the proximity-only constitution rather than old commerce plans.

- [ ] **Step 1: Add a failing pointer test if current docs omit the new authority**

Require current documentation to link to both:

```text
docs/architecture/OWNER_AUTHORITY_REGISTRY.md
docs/superpowers/specs/2026-08-22-proximity-only-three-lane-interaction-design.md
```

- [ ] **Step 2: Verify RED where appropriate**

- [ ] **Step 3: Make the minimal documentation-pointer corrections**

Do not rewrite historical archives merely because they contain old terms; mark them historical where needed.

- [ ] **Step 4: Verify GREEN and commit**

---

### Task 6: Same-SHA verification before claiming repository closure

**Files:**
- No product file changes unless a failing test identifies a real defect.

**Interfaces:**
- Consumes: final branch SHA after Tasks 1-5.
- Produces: repository-controlled evidence only.

- [ ] **Step 1: Capture exact final branch SHA**

- [ ] **Step 2: Require the four main workflows on that exact SHA**

```text
Project Control Integrity = success
TIGER CleanGuard = success
Zero-Residue Full History = success
VVIP Quality Gate = success
```

- [ ] **Step 3: Do not overclaim**

A same-SHA repository GREEN state does not prove protected staging, production current-main release, device/HEIC, legal/country, rollback/DR, or production observability evidence.

- [ ] **Step 4: Keep PR #320 draft unless separate release evidence authorizes progression**

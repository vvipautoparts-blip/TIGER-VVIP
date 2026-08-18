# TIGER ONE 2026 Living Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current FUSION presentation authority with the OWNER-approved TIGER ONE 2026 Living Surface while preserving Clerk, F05/Media Fortress, Search Fabric, SCG/SOA, RLS, ownership, ledger, and the advertising/direct-contact platform boundary.

**Architecture:** Implement TIGER ONE as a new semantic presentation layer over the existing FUSION runtime contracts. New CSS lives under `styles/tiger-one/`; new presentation behavior lives under `scripts/tiger-one/`; current FUSION data/auth/search/media modules remain authoritative. Migration proceeds by contract tests first, then new tokens/primitives/shell/home behavior, then the old conflicting visual authority is disconnected from the authoritative entrypoint only after replacement coverage exists.

**Tech Stack:** HTML5, modern CSS with logical properties and container queries, vanilla browser JavaScript, Node `node:test` contract tests, existing GitHub Actions quality gates. View Transitions and Anchor Positioning are progressive enhancements only; no WebGPU core dependency.

**Spec:** `docs/superpowers/specs/2026-08-18-tiger-one-living-surface-design.md`

**Technology policy:** `docs/superpowers/specs/2026-08-18-tiger-one-technology-adoption-matrix-2026.md`

**OWNER authority:** `docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md`

## Global Constraints

- Current conflicting UI/UX/IA authority becomes `SUPERSEDED / HISTORICAL ONLY`; no dual current authority.
- Never weaken Clerk, SOA/SCG, RLS, F05/Media Fortress, Search Fabric eligibility, ownership authorization, ledger integrity, legal compliance, or the marketplace role boundary.
- No marketplace checkout, escrow, delivery, settlement, transaction commission, warranty execution, compensation, or platform-run transaction dispute workflow.
- Home order is `App Bar → TIGER Pulse → Composer → Context Rail → Feed`.
- The default numbered `1 / 2 / 3 / 4` listing wizard is prohibited.
- Card primary actions remain exactly `Save / Contact / Share`.
- UI visibility is never authorization.
- Arabic/English share one component system; use logical CSS properties.
- WCAG 2.2 AA-quality critical journeys, reduced motion, Data Saver, explicit offline/error states.
- Draft platform APIs never become single points of failure; capability detection and fallback are mandatory.
- No Production deploy, `main` merge, database apply, secrets mutation, AWS mutation, or money movement in this plan.

---

### Task 1: Freeze Current UI Authority in Executable Tests

**Files:**
- Create: `tests/tiger-one-current-authority.test.cjs`
- Read only: `index.html`
- Read only: `fusion-home-f02.html`
- Read only: `docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md`

**Interfaces:**
- Consumes: current HTML and OWNER authority text.
- Produces: executable invariants used by every later slice.

- [ ] **Step 1: Write the failing test**

Create a Node test that loads the files as UTF-8 and asserts the authoritative `index.html` contains TIGER ONE markers that do not exist yet:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const owner = fs.readFileSync('docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md', 'utf8');

test('TIGER ONE owner supersession authority is current-only', () => {
  assert.match(owner, /CURRENT_ONLY — BINDING OWNER AUTHORITY/);
  assert.match(owner, /SUPERSEDED \/ HISTORICAL ONLY/);
});

test('authoritative entrypoint declares TIGER ONE presentation authority', () => {
  assert.match(index, /data-tiger-one-surface/);
  assert.match(index, /data-tiger-one-app-bar/);
  assert.match(index, /data-tiger-one-pulse/);
  assert.match(index, /data-tiger-one-context-rail/);
});

test('legacy large hero and fixed numbered wizard are not current entrypoint authority', () => {
  assert.doesNotMatch(index, /class="hero"/);
  assert.doesNotMatch(index, /data-step="[1234]"/);
});
```

- [ ] **Step 2: Run the focused test and prove RED**

Run: `node --test tests/tiger-one-current-authority.test.cjs`

Expected: FAIL only because `data-tiger-one-*` markers are absent from `index.html`; OWNER supersession assertions pass.

- [ ] **Step 3: Commit RED only**

```bash
git add tests/tiger-one-current-authority.test.cjs
git commit -m "test(tiger-one): freeze living surface authority"
```

---

### Task 2: Add TIGER ONE Semantic Design Tokens

**Files:**
- Create: `styles/tiger-one/tokens.css`
- Create: `styles/tiger-one/type.css`
- Create: `tests/tiger-one-design-system.test.cjs`

**Interfaces:**
- Produces CSS custom properties with `--t1-*` names consumed by later TIGER ONE styles.
- No existing runtime module consumes raw color values from these files.

- [ ] **Step 1: Extend RED tests**

```js
const tokens = fs.readFileSync('styles/tiger-one/tokens.css', 'utf8');
const type = fs.readFileSync('styles/tiger-one/type.css', 'utf8');
assert.match(tokens, /--t1-surface-canvas:/);
assert.match(tokens, /--t1-action-primary:/);
assert.match(tokens, /--t1-accent-vvip:/);
assert.match(tokens, /--t1-motion-standard:/);
assert.match(type, /--t1-type-body-m:/);
assert.doesNotMatch(tokens, /--fb-/);
```

Expected before files exist: FAIL with `ENOENT`.

- [ ] **Step 2: Implement minimal token files**

`styles/tiger-one/tokens.css` defines semantic Light/Dark tokens only; no component selectors. Minimum families: surfaces, text, borders, actions, statuses, VVIP/campaign accent, focus, radii, shadows, spacing, motion.

`styles/tiger-one/type.css` defines semantic type roles and bilingual-safe line heights. It must use a robust system fallback stack first; final branded font-family remains swappable through the role tokens.

- [ ] **Step 3: Verify focused GREEN**

Run: `node --test tests/tiger-one-design-system.test.cjs`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add styles/tiger-one/tokens.css styles/tiger-one/type.css tests/tiger-one-design-system.test.cjs
git commit -m "feat(tiger-one): add semantic design foundation"
```

---

### Task 3: Add Accessible Action and Surface Primitives

**Files:**
- Create: `styles/tiger-one/primitives.css`
- Extend: `tests/tiger-one-design-system.test.cjs`

**Interfaces:**
- Produces `.t1-action`, `.t1-icon-action`, `.t1-surface`, `.t1-sheet` presentation primitives.
- Requires tokens from Task 2.

- [ ] **Step 1: Write RED assertions**

Require `.t1-action--primary`, `.t1-action--quiet`, `.t1-icon-action`, `:focus-visible`, disabled/loading selectors, minimum interactive target sizing, and no hard-coded Facebook token names.

- [ ] **Step 2: Verify RED**

Run focused Node test; expected missing selectors.

- [ ] **Step 3: Implement primitives**

Use logical padding/margins, semantic tokens, `min-block-size: 44px`, explicit focus ring, reduced-motion-safe transitions, and compact visual geometry without shrinking touch targets.

- [ ] **Step 4: Verify GREEN and commit**

Commit message: `feat(tiger-one): add accessible interaction primitives`.

---

### Task 4: Build the Compact Living Shell

**Files:**
- Create: `styles/tiger-one/shell.css`
- Create: `scripts/tiger-one/living-surface.js`
- Modify: `index.html`
- Test: `tests/tiger-one-current-authority.test.cjs`

**Interfaces:**
- `window.VVIPTigerOne.createLivingSurface({ root })` returns `{ setMode(mode), getMode(), supportsViewTransitions }`.
- Modes are presentation-only: `HOME`, `SEARCH`, `COMPOSER`, `DETAIL`, `PROFILE`, `CAMPAIGN`, `CAPABILITY`.

- [ ] **Step 1: Add RED tests**

Assert `index.html` links `styles/tiger-one/tokens.css`, `type.css`, `primitives.css`, `shell.css`; loads `scripts/tiger-one/living-surface.js`; root has `data-tiger-one-surface`; app bar has `data-tiger-one-app-bar`.

- [ ] **Step 2: Verify RED**

Expected missing links/markers/module.

- [ ] **Step 3: Implement shell**

Keep existing Clerk/auth nodes and data attributes intact. Replace presentation classes/markup only where needed; do not remove `data-vvip-auth-gate`, `data-vvip-unified-home`, `data-vvip-fusion-authoritative`, `data-fusion-capability-menu`, account/composer triggers, or existing runtime scripts.

`living-surface.js` may call `document.startViewTransition` only when present and reduced motion is not requested; otherwise state changes synchronously.

- [ ] **Step 4: Verify GREEN and commit**

Commit message: `feat(tiger-one): establish living shell`.

---

### Task 5: Recompose Authoritative Home Order

**Files:**
- Create: `styles/tiger-one/home.css`
- Modify: `index.html`
- Create: `tests/tiger-one-home-structure.test.cjs`

**Interfaces:**
- Home children expose ordered markers:
  `data-tiger-one-app-bar`, `data-tiger-one-pulse`, `data-fusion-composer`, `data-tiger-one-context-rail`, `data-vvip-marketplace-feed`.

- [ ] **Step 1: Write RED structural test**

Parse `index.html` as text and verify marker positions are strictly increasing:

```js
const markers = [
  'data-tiger-one-app-bar',
  'data-tiger-one-pulse',
  'data-fusion-composer',
  'data-tiger-one-context-rail',
  'data-vvip-marketplace-feed'
];
const positions = markers.map((m) => index.indexOf(m));
assert.ok(positions.every((p) => p >= 0));
for (let i = 1; i < positions.length; i += 1) assert.ok(positions[i - 1] < positions[i]);
```

- [ ] **Step 2: Verify RED**

Expected Pulse/Context Rail absent.

- [ ] **Step 3: Implement home structure**

Add a collapsed-by-default Pulse slot (`hidden` until eligible data exists), retain the existing composer trigger, relabel the dynamic sector host as Context Rail without hard-coding sectors, and remove duplicate large heading chrome from the feed.

- [ ] **Step 4: Verify GREEN and commit**

Commit message: `feat(tiger-one): compose living home surface`.

---

### Task 6: Add Publish Passport Shell Without Replacing Composer Authority

**Files:**
- Create: `styles/tiger-one/publish-passport.css`
- Create: `scripts/tiger-one/publish-passport.js`
- Modify: `index.html`
- Create: `tests/tiger-one-publish-passport.test.cjs`

**Interfaces:**
- `window.VVIPTigerOnePublishPassport.render(host, snapshot)` accepts only a presentation snapshot supplied by current composer/runtime code.
- Snapshot shape: `{ basics:boolean, media:boolean, location:boolean, policy:boolean, ready:boolean }`.
- It never decides publish authorization.

- [ ] **Step 1: RED test**

Require five semantic status keys and assert no numeric stepper labels `1/2/3/4` are rendered.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement read-only Passport renderer**

Use text/status semantics, `aria-live="polite"` only on readiness changes, and no gamified progress percentages.

- [ ] **Step 4: Verify GREEN and commit**

Commit message: `feat(tiger-one): add publish passport presentation`.

---

### Task 7: Convert Sector Filters into Dynamic Context Rail Presentation

**Files:**
- Modify: `index.html`
- Modify: `styles/tiger-one/home.css`
- Read/compatible only: `scripts/fusion/f02-feed.js`
- Extend: `tests/tiger-one-home-structure.test.cjs`

**Interfaces:**
- Existing `data-vvip-sector-filters` remains the runtime rendering hook.
- New parent presentation marker is `data-tiger-one-context-rail`.

- [ ] **Step 1: RED test**

Assert no hard-coded sector buttons exist in authoritative `index.html`; dynamic hook exists within the Context Rail.

- [ ] **Step 2: Verify RED or existing partial pass**

- [ ] **Step 3: Implement presentation-only rail**

Use horizontal overflow with logical scroll behavior, compact selected state, container-query adjustments, and keyboard-visible focus. Do not change Search Fabric eligibility/ranking.

- [ ] **Step 4: Verify GREEN and commit**

Commit message: `feat(tiger-one): present dynamic context rail`.

---

### Task 8: Upgrade Commercial Card Grammar Without Rewriting Feed Data Authority

**Files:**
- Create: `styles/tiger-one/cards.css`
- Modify only if required for semantic hooks: `scripts/fusion/f02-feed.js`
- Create: `tests/tiger-one-commercial-card.test.cjs`

**Interfaces:**
- Existing feed data remains authoritative.
- Card output exposes identity header, text, media, facts, actions.
- Primary actions exactly `Save`, `Contact`, `Share` (localized labels permitted).

- [ ] **Step 1: RED tests**

Assert generated card template contains stable TIGER ONE hooks and exactly three default primary action meanings.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Add semantic hooks minimally**

Do not change ownership, contact authorization, Search Fabric, save persistence, or listing data shape. Add presentation classes/data markers only where required.

- [ ] **Step 4: Verify GREEN and commit**

Commit message: `feat(tiger-one): refine commercial card grammar`.

---

### Task 9: Implement TIGER Morph Detail Continuity as Progressive Enhancement

**Files:**
- Modify: `scripts/tiger-one/living-surface.js`
- Modify: `styles/tiger-one/shell.css`
- Create: `tests/tiger-one-morph.test.cjs`

**Interfaces:**
- `transition({ from, to, mutate })` invokes `mutate()` exactly once.
- If View Transitions unavailable/reduced-motion, `mutate()` runs synchronously.

- [ ] **Step 1: RED unit tests with mocked document**

Cover supported, unsupported, reduced-motion, and thrown-transition fallback paths.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement bounded transition wrapper**

No navigation depends on the API. Preserve browser history/deep-link behavior from existing controllers.

- [ ] **Step 4: Verify GREEN and commit**

Commit message: `feat(tiger-one): add resilient morph transitions`.

---

### Task 10: Harden Accessibility, RTL/LTR, Data Saver, and Failure States

**Files:**
- Create: `styles/tiger-one/resilience.css`
- Modify: `index.html`
- Create: `tests/tiger-one-resilience.test.cjs`

**Interfaces:**
- Uses `prefers-reduced-motion`, logical properties, existing network notice, and existing `is-data-saver` hook where present.

- [ ] **Step 1: RED contracts**

Require visible focus, reduced-motion rule, safe-area handling, `dir`-agnostic logical CSS, explicit network notice semantics, no color-only status, and hidden Pulse collapse.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement resilience layer**

No fake privileged success offline; static Pulse under Data Saver; nonessential prefetch/motion suppressed by presentation hooks.

- [ ] **Step 4: Verify GREEN and commit**

Commit message: `feat(tiger-one): harden global resilient presentation`.

---

### Task 11: Disconnect Conflicting Legacy Visual Authority

**Files:**
- Modify: `index.html`
- Modify if still used by migration preview only: `fusion-home-f02.html`
- Extend: `tests/tiger-one-current-authority.test.cjs`

**Interfaces:**
- Existing functional runtime scripts remain.
- New TIGER ONE CSS owns current authoritative presentation.

- [ ] **Step 1: RED no-dual-authority assertions**

Assert authoritative `index.html` no longer links `styles/vvip-pr29-home-marketplace.css` or `styles/fusion/f02-single-surface.css` once all required replacement selectors are proven present.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Remove legacy CSS links from authoritative entrypoint**

Retain files as historical/migration evidence if still needed elsewhere; do not delete blindly. Preserve `styles/vvip-pr36-media.css` unless a later media-specific design migration replaces it.

- [ ] **Step 4: Verify all focused TIGER ONE tests GREEN**

Run:

```bash
node --test \
  tests/tiger-one-current-authority.test.cjs \
  tests/tiger-one-design-system.test.cjs \
  tests/tiger-one-home-structure.test.cjs \
  tests/tiger-one-publish-passport.test.cjs \
  tests/tiger-one-commercial-card.test.cjs \
  tests/tiger-one-morph.test.cjs \
  tests/tiger-one-resilience.test.cjs
```

- [ ] **Step 5: Commit**

Commit message: `refactor(tiger-one): retire conflicting visual authority`.

---

### Task 12: Exact-Head Repository Verification and Review Gate

**Files:**
- No Production files changed in this task.
- Update PR body with exact evidence only after CI completes.

**Interfaces:**
- Consumes final exact head SHA.
- Produces immutable review evidence.

- [ ] **Step 1: Run repository quality gates on the exact head**

Require all repository-mandated workflows associated with the exact implementation SHA to complete successfully.

- [ ] **Step 2: Inspect failures rather than rerunning blindly**

Any failure must be classified as product defect, test defect, infrastructure/transient, or unrelated pre-existing failure with evidence before action.

- [ ] **Step 3: Verify scope**

Confirm no Production deploy, DB/AWS/Clerk mutation, secret change, money movement, protected-branch bypass, or `main` merge occurred.

- [ ] **Step 4: Request independent review**

Only after exact-head GREEN. Do not self-approve or fabricate review.

- [ ] **Step 5: Merge only into the declared parent/spec branch after independent approval and exact-head checks**

Never merge this implementation child directly to `main` from this plan.

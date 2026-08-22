# ONE FIELD Runtime Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a real Home-first ONE FIELD intent flow that interprets natural language, discovers eligible candidates, applies hard constraints before ranking, explains fit, isolates sponsored delivery, and stops at direct contact handoff.

**Architecture:** Add a pure runtime orchestrator and bounded candidate adapters behind a browser controller. Reuse the existing ONE FIELD semantic modules and existing repository/search boundaries rather than coupling Home directly to Marketplace SQL or replacing current sectors. UI wiring is intentionally thin and keeps organic and sponsored projections structurally separate.

**Tech Stack:** Browser JavaScript/CommonJS-compatible modules, Node.js contract tests, existing VVIP Quality Gate, existing Social DB/LC security rehearsals.

**Spec:** `docs/superpowers/specs/2026-08-22-one-field-runtime-orchestrator-design.md`

## Global Constraints

- Base exact GREEN convergence SHA: `34f51540132677ee3247036b6efdde7ca303d3d6`.
- Discovery authority: `DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS`.
- No buyer/seller checkout, order execution, escrow, negotiation, settlement, fulfillment, deal-close, or external transaction commission path.
- Organic relevance and sponsored delivery remain structurally separated; paid fields cannot affect organic fit or explanation.
- Existing sectors remain additive compatibility metadata; no destructive sector removal or rigid semantic dependence on the seven legacy Marketplace sectors.
- Preserve Social Search privacy/RLS/cursor/rate-budget/block/visibility boundaries.
- No `main`, Production, Staging, remote Supabase, provider credential, or real-user mutation.
- Strict TDD: each production behavior requires a failing test observed first.

---

### Task 1: Pure Runtime Orchestrator Contract

**Files:**
- Create: `tests/one-field-runtime-orchestrator.test.cjs`
- Create: `scripts/discovery/one-field-runtime-orchestrator.js`

**Interfaces:**
- Consumes: existing semantic helpers injected as functions: `interpret`, `buildCapsule`, `rankOrganic`, `buildFit`.
- Consumes adapters: `organicSources[]`, each exposing `discover(request)`; optional `sponsoredSource.discover(request)`.
- Produces: `createOneFieldRuntimeOrchestrator(options)` with async `run({ text, locale, context, signal })`.
- Returns immutable `{ status, intent, organic, sponsored, facets, degradedSources }`.

- [ ] **Step 1: Write the failing orchestrator acceptance test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createOneFieldRuntimeOrchestrator } = require('../scripts/discovery/one-field-runtime-orchestrator.js');

test('acceptance intent excludes sugar candidates before organic ranking', async () => {
  const seenByRanker = [];
  const orchestrator = createOneFieldRuntimeOrchestrator({
    interpret: () => Object.freeze({ text: 'أريد كورن فليكس للأطفال بدون سكر', hardConstraints: [{ key: 'sugarFree', value: true }] }),
    organicSources: [Object.freeze({
      name: 'marketplace',
      discover: async () => [
        { id: 'a', label: 'حبوب أطفال بدون سكر', facts: { sugarFree: true }, sponsored: false },
        { id: 'b', label: 'حبوب أطفال محلاة', facts: { sugarFree: false }, sponsored: false }
      ]
    })],
    buildCapsule: (candidate) => candidate,
    rankOrganic: (intent, candidates) => { seenByRanker.push(...candidates.map((item) => item.id)); return candidates; },
    buildFit: (_intent, candidate) => ({ reasons: candidate.facts.sugarFree ? ['بدون سكر'] : [] })
  });

  const result = await orchestrator.run({ text: 'أريد كورن فليكس للأطفال بدون سكر', locale: 'ar', context: {} });
  assert.deepEqual(seenByRanker, ['a']);
  assert.deepEqual(result.organic.map((item) => item.id), ['a']);
  assert.equal(result.status, 'results');
});
```

- [ ] **Step 2: Run the single test and verify RED**

Run: `node --test tests/one-field-runtime-orchestrator.test.cjs`

Expected: FAIL because `scripts/discovery/one-field-runtime-orchestrator.js` does not exist.

- [ ] **Step 3: Implement the minimal orchestrator**

```js
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TIGEROneFieldRuntimeOrchestrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function frozen(value) { return Object.freeze(value); }
  function text(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, 500); }
  function matchesHardConstraints(intent, candidate) {
    return (intent.hardConstraints || []).every(function (constraint) {
      return candidate && candidate.facts && candidate.facts[constraint.key] === constraint.value;
    });
  }

  function createOneFieldRuntimeOrchestrator(options) {
    const interpret = options && options.interpret;
    const organicSources = (options && options.organicSources) || [];
    const buildCapsule = options && options.buildCapsule;
    const rankOrganic = options && options.rankOrganic;
    const buildFit = options && options.buildFit;
    if (![interpret, buildCapsule, rankOrganic, buildFit].every((fn) => typeof fn === 'function')) throw new TypeError('ONE_FIELD_RUNTIME_DEPENDENCY_REQUIRED');

    async function run(request) {
      const normalizedText = text(request && request.text);
      if (!normalizedText) throw new TypeError('ONE_FIELD_INTENT_REQUIRED');
      const intent = frozen(interpret({ text: normalizedText, locale: request.locale || 'ar', context: request.context || {} }));
      const degradedSources = [];
      const collected = [];
      for (const source of organicSources) {
        try { collected.push(...await source.discover({ intent, signal: request.signal })); }
        catch (_) { degradedSources.push(source.name || 'organic'); }
      }
      const constrained = collected.filter((candidate) => candidate && candidate.sponsored !== true && matchesHardConstraints(intent, candidate)).map(buildCapsule);
      const ranked = rankOrganic(intent, constrained).map((candidate) => frozen(Object.assign({}, candidate, { fit: buildFit(intent, candidate) })));
      return frozen({
        status: ranked.length ? (degradedSources.length ? 'degraded' : 'results') : (degradedSources.length ? 'degraded' : 'empty'),
        intent,
        organic: frozen(ranked),
        sponsored: frozen([]),
        facets: frozen([]),
        degradedSources: frozen(degradedSources)
      });
    }
    return frozen({ run });
  }

  return frozen({ createOneFieldRuntimeOrchestrator });
});
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test tests/one-field-runtime-orchestrator.test.cjs`

Expected: PASS.

- [ ] **Step 5: Add RED tests for sponsored isolation and degraded truth**

Add separate tests asserting:
- a candidate with `sponsored: true` returned from an organic adapter never reaches `rankOrganic`;
- one failed source plus one successful source returns `status === 'degraded'` and safe `degradedSources`;
- all successful sources with zero candidates return `status === 'empty'`;
- sponsored provider data cannot appear in FitExplanation input.

- [ ] **Step 6: Implement only the minimal sponsored/degradation behavior and re-run**

Run: `node --test tests/one-field-runtime-orchestrator.test.cjs`

Expected: all Task 1 tests PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add tests/one-field-runtime-orchestrator.test.cjs scripts/discovery/one-field-runtime-orchestrator.js
git commit -m "feat(one-field): add runtime orchestrator contract"
```

---

### Task 2: Bounded Runtime Candidate Adapters

**Files:**
- Create: `tests/one-field-runtime-adapters.test.cjs`
- Create: `scripts/discovery/one-field-runtime-adapters.js`
- Read/consume only: `scripts/fusion/runtime-adapters.js`, `scripts/social/search-controller.js`

**Interfaces:**
- Produces: `createMarketplaceCandidateAdapter(repository)` exposing `name` and `discover({ intent, signal })`.
- Produces: `createSocialSearchCandidateAdapter(searchApi)` exposing the same shape.
- Candidate output is a sanitized projection only; no Clerk subject, provider credential, raw DB row, ranking score, or paid metadata enters organic candidates.

- [ ] **Step 1: Write RED adapter sanitization tests**

```js
test('marketplace adapter strips private identifiers and preserves public contact handoff', async () => {
  const adapter = createMarketplaceCandidateAdapter({
    listPublic: async () => [{
      listing_id: 'listing-1',
      title: 'حبوب أطفال بدون سكر',
      summary: 'مناسبة للأطفال',
      sector: 'trade-supply',
      contact_phone: '+962700000000',
      owner_subject: 'clerk_secret_subject',
      price_minor: 2500,
      currency_code: 'JOD'
    }]
  });
  const rows = await adapter.discover({ intent: { text: 'بدون سكر' } });
  assert.equal(rows[0].id, 'listing-1');
  assert.equal(rows[0].contact.kind, 'phone');
  assert.equal('owner_subject' in rows[0], false);
  assert.equal(JSON.stringify(rows[0]).includes('clerk_secret_subject'), false);
  assert.equal(rows[0].sponsored, false);
});
```

- [ ] **Step 2: Run adapter test and verify RED**

Run: `node --test tests/one-field-runtime-adapters.test.cjs`

Expected: FAIL because adapter module is absent.

- [ ] **Step 3: Implement minimal projection adapters**

Implementation must:
- call existing public repository/search APIs only;
- limit candidate count to 60 or the stricter upstream limit;
- copy only allowlisted fields;
- map contact to `{ kind: 'phone', value }` or `null`;
- set `sponsored: false` unconditionally for organic adapters;
- reject malformed rows with no stable public ID/label rather than passing raw data through.

- [ ] **Step 4: Add RED tests proving no rigid sector dependency**

Test that an intent with no legacy sector name can still call the Marketplace adapter with search text and receive a candidate; `sector` is optional metadata, not a semantic gate.

- [ ] **Step 5: Run adapter tests and verify GREEN**

Run: `node --test tests/one-field-runtime-adapters.test.cjs`

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add tests/one-field-runtime-adapters.test.cjs scripts/discovery/one-field-runtime-adapters.js
git commit -m "feat(one-field): add bounded discovery adapters"
```

---

### Task 3: Browser Runtime Controller and Stale-Request Safety

**Files:**
- Create: `tests/one-field-runtime-controller.test.cjs`
- Create: `scripts/discovery/one-field-runtime-controller.js`

**Interfaces:**
- Consumes: `orchestrator.run(request)`.
- Consumes view adapter: `setState(state)` and `renderResult(result)`.
- Produces: `createOneFieldRuntimeController({ orchestrator, view })` with `submit({ text, locale, context })` and `cancel()`.

- [ ] **Step 1: Write RED stale-response test**

```js
test('older intent cannot overwrite newer results', async () => {
  const pending = new Map();
  const renders = [];
  const controller = createOneFieldRuntimeController({
    orchestrator: { run: ({ text }) => new Promise((resolve) => pending.set(text, resolve)) },
    view: { setState() {}, renderResult: (value) => renders.push(value.intentText) }
  });
  const first = controller.submit({ text: 'الأول', locale: 'ar', context: {} });
  const second = controller.submit({ text: 'الثاني', locale: 'ar', context: {} });
  pending.get('الثاني')({ intentText: 'الثاني' });
  await second;
  pending.get('الأول')({ intentText: 'الأول' });
  await first;
  assert.deepEqual(renders, ['الثاني']);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/one-field-runtime-controller.test.cjs`

Expected: FAIL because controller module is absent.

- [ ] **Step 3: Implement request generation + AbortController safety**

Minimal behavior:
- increment a generation number for every submit;
- abort prior request when supported;
- set `interpreting` then `discovering`/result state through the view;
- only render if generation still matches;
- abort is silent; real failures render `error` without clearing user text.

- [ ] **Step 4: Add RED tests for empty/degraded/error state truth**

Each state must be passed exactly to the view. No success state may be emitted after a thrown orchestrator error.

- [ ] **Step 5: Run controller tests and verify GREEN**

Run: `node --test tests/one-field-runtime-controller.test.cjs`

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add tests/one-field-runtime-controller.test.cjs scripts/discovery/one-field-runtime-controller.js
git commit -m "feat(one-field): add safe runtime controller"
```

---

### Task 4: Home Intent Surface and Accessible Result Projection

**Files:**
- Modify: `index.html`
- Create: `styles/tiger-social/one-field-runtime.css`
- Create: `scripts/discovery/one-field-runtime-view.js`
- Create: `tests/one-field-home-runtime-wiring.test.cjs`
- Modify: `tools/vvip_public_release.py` if the release allowlist requires explicit inclusion of the new runtime files.

**Interfaces:**
- DOM hooks:
  - `data-one-field-intent-form`
  - `data-one-field-intent-input`
  - `data-one-field-intent-submit`
  - `data-one-field-runtime-status`
  - `data-one-field-organic-results`
  - `data-one-field-sponsored-results`
- Legacy `data-listing-search` remains unchanged and Marketplace-scoped.

- [ ] **Step 1: Write RED wiring test**

```js
test('Home exposes ONE FIELD intent controls without repurposing Marketplace search', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /data-one-field-intent-form/);
  assert.match(html, /data-one-field-intent-input/);
  assert.match(html, /data-one-field-organic-results/);
  assert.match(html, /data-one-field-sponsored-results/);
  assert.match(html, /data-listing-search/);
  assert.ok(html.indexOf('data-one-field-intent-input') < html.indexOf('data-social-marketplace-surface'));
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/one-field-home-runtime-wiring.test.cjs`

Expected: FAIL because the Home ONE FIELD surface does not yet exist.

- [ ] **Step 3: Add minimal Home markup and scripts**

Add the ONE FIELD form inside the Home section, before feed items, with natural-language Arabic copy and no purchase/checkout wording. Add separate organic and sponsored regions; sponsored region starts hidden when empty.

Add defer scripts in dependency order:
1. existing semantic modules required by the browser adapter;
2. `one-field-runtime-adapters.js`;
3. `one-field-runtime-orchestrator.js`;
4. `one-field-runtime-controller.js`;
5. `one-field-runtime-view.js`.

- [ ] **Step 4: Implement accessible view rendering**

The view must:
- announce state via `aria-live="polite"`;
- render explanation text as ordinary accessible text;
- render direct contact/details link only from sanitized contact projection;
- label every sponsored result with visible Arabic `ممول` plus accessible text;
- never put sponsored nodes in the organic container;
- preserve input after empty/degraded/error states.

- [ ] **Step 5: Add RED safety-copy test**

Assert the new Home result surface does not contain Arabic/English transaction-success terms such as `تم الشراء`, `تم الطلب`, `checkout`, `order completed`, `payment successful`, or `escrow`.

- [ ] **Step 6: Add responsive/accessibility contract assertions**

Extend or add tests to assert:
- form label/accessible name exists;
- submit is a real button;
- status live region exists;
- no click-only `span` is introduced;
- stylesheet includes reduced-motion-safe rules and logical properties rather than LTR-only positioning for the new surface.

- [ ] **Step 7: Run focused UI tests and verify GREEN**

Run:
```bash
node --test tests/one-field-home-runtime-wiring.test.cjs
node --test tests/tiger-social-responsive-accessibility.test.cjs
node --test tests/tiger-social-ux-control-inventory.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit Task 4**

```bash
git add index.html styles/tiger-social/one-field-runtime.css scripts/discovery/one-field-runtime-view.js tests/one-field-home-runtime-wiring.test.cjs tools/vvip_public_release.py
git commit -m "feat(one-field): wire Home intent discovery surface"
```

---

### Task 5: End-to-End Acceptance Contract and Exact-SHA Regression

**Files:**
- Create: `tests/one-field-runtime-acceptance.test.cjs`
- Modify only if required by discovered release contract: `tools/vvip_public_release.py`

**Interfaces:**
- Verifies the assembled runtime contract without remote DB/provider mutation.

- [ ] **Step 1: Write the acceptance test using the approved Arabic phrase**

The test must assemble real orchestrator + adapters with deterministic in-memory repository data and prove:
- `أريد كورن فليكس للأطفال بدون سكر` is accepted as natural language;
- a sugar-containing candidate is excluded before ranking;
- a sugar-free candidate is returned with evidence-backed explanation;
- no rigid category named `cornflakes` is required;
- a sponsored candidate cannot change organic order or fit reasons;
- terminal action is direct contact/details only.

- [ ] **Step 2: Run acceptance test and verify RED if any assembly gap exists**

Run: `node --test tests/one-field-runtime-acceptance.test.cjs`

Expected before final wiring: FAIL only on missing assembly/wiring behavior, not syntax/setup errors.

- [ ] **Step 3: Make the minimum assembly changes required for GREEN**

Do not add DB migrations or provider activation. Reuse current public repository and semantic modules through adapters.

- [ ] **Step 4: Run all ONE FIELD runtime tests**

Run:
```bash
node --test tests/one-field-runtime-orchestrator.test.cjs \
  tests/one-field-runtime-adapters.test.cjs \
  tests/one-field-runtime-controller.test.cjs \
  tests/one-field-home-runtime-wiring.test.cjs \
  tests/one-field-runtime-acceptance.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Run relevant existing regression tests**

Run:
```bash
node --test tests/one-field-*.test.cjs
node --test tests/tiger-social-search-*.test.cjs
node --test tests/tiger-social-responsive-accessibility.test.cjs
node --test tests/tiger-social-ux-control-inventory.test.cjs
node --test tests/zero-brokerage-runtime-retirement.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit final acceptance slice**

```bash
git add tests/one-field-runtime-acceptance.test.cjs
git commit -m "test(one-field): prove Home runtime acceptance flow"
```

- [ ] **Step 7: Push exact head through GitHub CI and record evidence**

Required exact-SHA evidence before marking this slice complete:
- VVIP Quality Gate — SUCCESS
- TIGER CleanGuard — SUCCESS
- Project Control Integrity — SUCCESS
- Zero-Residue Full History — SUCCESS when triggered
- LC03/LC04/LC05/LC06 — SUCCESS when triggered
- TIGER Social DB Rehearsal — SUCCESS when triggered

If any gate is RED, diagnose root cause and remediate through a new RED→GREEN cycle; do not weaken tests or bypass security.

## Self-Review

- Spec coverage: Home intent, orchestration, adapters, hard constraints, FitExplanation, sponsored isolation, direct contact, stale-response safety, degradation truth, accessibility, responsive behavior, zero-brokerage boundary, and exact-SHA CI are each assigned to a concrete task.
- Placeholder scan: no `TBD`, `TODO`, `implement later`, or unspecified error-handling steps remain.
- Type consistency: `createOneFieldRuntimeOrchestrator`, `createMarketplaceCandidateAdapter`, `createSocialSearchCandidateAdapter`, and `createOneFieldRuntimeController` names are stable across producer/consumer tasks; result status vocabulary is `results | empty | degraded`, with controller-level `error` as a view state.

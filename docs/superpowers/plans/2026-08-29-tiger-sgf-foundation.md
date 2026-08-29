# TIGER SGF Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish TIGER Sovereign Genome Fabric as current machine/human authority with a global jurisdiction-neutral OWNER_ROOT, zero sovereign defaults, and market-neutral Pulse pricing semantics, without activating any market or mutating Production.

**Architecture:** The Foundation creates one canonical SGF authority/configuration boundary and makes existing owner/fusion validators depend on it. It removes JOD as a global sovereign price authority while preserving Pulse product semantics and all unrelated platform rules. Runtime Genome Compiler, passports, JIT owner execution, cells, workload identity, telemetry policy, and PQC migration are later SGF slices and are deliberately not implemented here.

**Tech Stack:** Node.js CommonJS validators/tests, JSON authority manifests, Markdown owner authorities, existing project-control authority registry, repository Quality Gate.

**Spec:** `docs/superpowers/specs/2026-08-29-tiger-sovereign-genome-fabric-2026.md`

## Global Constraints

- `OWNER_ROOT.country`, `OWNER_ROOT.currency`, and `OWNER_ROOT.market` are null/unbound at the global layer.
- No authoritative default country, currency, payment provider, legal entity, tax profile, or market.
- Empty `markets` is valid; no country becomes active in Foundation.
- No fallback from missing market/currency/provider policy to `JO`, `JOD`, `US`, `USD`, `SD`, or another market.
- Pulse remains optional paid visibility; ordinary publication remains free.
- Global `tiersJod` authority is removed; price/currency become market-contract concerns.
- Existing one-sale-one-winner, 7% self-service discount, 100% internal distribution, and marketplace non-intermediation rules remain unchanged unless a later explicit owner decision changes them.
- No Production, Staging, provider, database, or payment activation mutation.
- No direct write to protected `main`.
- No custom cryptography.
- Exact-head CI/security/release evidence is required before merge; unavailable runner state is never GREEN.

---

### Task 1: Add RED SGF zero-default authority contract

**Files:**
- Create: `tests/sgf-sovereignty-authority.test.cjs`
- Read: `config/fusion/current-authority.json`
- Read: `scripts/fusion/verify-current-authority.cjs`
- Read: `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

**Interfaces:**
- Consumes: current owner/fusion manifest and filesystem paths.
- Produces: failing contract for `config/sovereignty/sgf-v1.json`, SGF owner authority references, and zero-default invariants.

- [ ] **Step 1: Write the failing test**

Create `tests/sgf-sovereignty-authority.test.cjs` with this initial contract:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sgfPath = path.join(root, 'config/sovereignty/sgf-v1.json');
const ownerBindingPath = path.join(root, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
const sgfAuthorityPath = path.join(root, 'docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('SGF owner root is global and every sovereign default is null', () => {
  assert.equal(fs.existsSync(sgfPath), true, 'SGF machine authority must exist');
  const sgf = loadJson(sgfPath);

  assert.equal(sgf.schemaVersion, 'TIGER_SGF_V1');
  assert.deepEqual(sgf.ownerRoot, {
    id: 'OWNER_ROOT',
    country: null,
    currency: null,
    market: null,
    standingRuntimePrivilege: false
  });
  assert.deepEqual(sgf.defaults, {
    country: null,
    currency: null,
    paymentProvider: null,
    legalEntity: null,
    taxProfile: null,
    market: null
  });
  assert.deepEqual(sgf.markets, []);
  assert.equal(sgf.activationAuthority, 'MARKET_CAPABILITY_PASSPORT');
  assert.equal(sgf.fallbackPolicy, 'DENY_NO_SOVEREIGN_FALLBACK');
});

test('SGF is wired into current owner authority', () => {
  assert.equal(fs.existsSync(sgfAuthorityPath), true);
  const binding = fs.readFileSync(ownerBindingPath, 'utf8');
  assert.match(binding, /TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(binding, /ZERO DEFAULT COUNTRY/i);
  assert.match(binding, /ZERO DEFAULT CURRENCY/i);
  assert.match(binding, /NO SOVEREIGN FALLBACK/i);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
node --test tests/sgf-sovereignty-authority.test.cjs
```

Expected: FAIL because `config/sovereignty/sgf-v1.json` does not yet exist and current owner binding does not yet reference SGF.

- [ ] **Step 3: Commit RED evidence**

```bash
git add tests/sgf-sovereignty-authority.test.cjs
git commit -m "test(sgf): define zero-default sovereign authority contract"
```

---

### Task 2: Add SGF machine authority and deterministic validator

**Files:**
- Create: `config/sovereignty/sgf-v1.json`
- Create: `scripts/sovereignty/verify-sgf-authority.cjs`
- Modify: `tests/sgf-sovereignty-authority.test.cjs`

**Interfaces:**
- Consumes: SGF V1 JSON object.
- Produces: `verifySgfAuthority(manifest) -> { ok: boolean, errors: string[] }`.

- [ ] **Step 1: Extend RED tests for validator rejection cases**

Append to `tests/sgf-sovereignty-authority.test.cjs`:

```js
const sgfValidatorPath = path.join(root, 'scripts/sovereignty/verify-sgf-authority.cjs');

function verifySgf(manifest) {
  return require(sgfValidatorPath).verifySgfAuthority(manifest);
}

test('SGF validator rejects every sovereign default and owner-root binding', () => {
  const base = loadJson(sgfPath);
  const mutations = [
    (x) => { x.ownerRoot.country = 'JO'; },
    (x) => { x.ownerRoot.currency = 'JOD'; },
    (x) => { x.ownerRoot.market = 'JO'; },
    (x) => { x.ownerRoot.standingRuntimePrivilege = true; },
    (x) => { x.defaults.country = 'JO'; },
    (x) => { x.defaults.currency = 'JOD'; },
    (x) => { x.defaults.paymentProvider = 'stripe'; },
    (x) => { x.defaults.legalEntity = 'JO_ENTITY'; },
    (x) => { x.defaults.taxProfile = 'JO_TAX'; },
    (x) => { x.defaults.market = 'JO'; },
    (x) => { x.fallbackPolicy = 'FALLBACK_TO_JO'; }
  ];

  for (const mutate of mutations) {
    const candidate = structuredClone(base);
    mutate(candidate);
    const result = verifySgf(candidate);
    assert.equal(result.ok, false, JSON.stringify(candidate));
  }
});

test('SGF capability registry is exact, duplicate-free and markets may be empty', () => {
  const sgf = loadJson(sgfPath);
  assert.deepEqual(sgf.capabilityRegistry, [
    'SOCIAL',
    'DISCOVERY',
    'MESSAGING',
    'ADS_DELIVERY',
    'ADS_BILLING',
    'PULSE',
    'AI_RECOMMENDATION',
    'DATA_EXPORT'
  ]);
  assert.equal(new Set(sgf.capabilityRegistry).size, sgf.capabilityRegistry.length);
  assert.equal(verifySgf(sgf).ok, true);
});
```

- [ ] **Step 2: Run test and verify RED for missing validator/config**

```bash
node --test tests/sgf-sovereignty-authority.test.cjs
```

Expected: FAIL until the two new implementation files exist.

- [ ] **Step 3: Create the exact SGF machine authority**

Create `config/sovereignty/sgf-v1.json`:

```json
{
  "schemaVersion": "TIGER_SGF_V1",
  "ownerRoot": {
    "id": "OWNER_ROOT",
    "country": null,
    "currency": null,
    "market": null,
    "standingRuntimePrivilege": false
  },
  "defaults": {
    "country": null,
    "currency": null,
    "paymentProvider": null,
    "legalEntity": null,
    "taxProfile": null,
    "market": null
  },
  "capabilityRegistry": [
    "SOCIAL",
    "DISCOVERY",
    "MESSAGING",
    "ADS_DELIVERY",
    "ADS_BILLING",
    "PULSE",
    "AI_RECOMMENDATION",
    "DATA_EXPORT"
  ],
  "markets": [],
  "activationAuthority": "MARKET_CAPABILITY_PASSPORT",
  "fallbackPolicy": "DENY_NO_SOVEREIGN_FALLBACK"
}
```

- [ ] **Step 4: Implement deterministic validator**

Create `scripts/sovereignty/verify-sgf-authority.cjs`:

```js
'use strict';

const CAPABILITIES = Object.freeze([
  'SOCIAL',
  'DISCOVERY',
  'MESSAGING',
  'ADS_DELIVERY',
  'ADS_BILLING',
  'PULSE',
  'AI_RECOMMENDATION',
  'DATA_EXPORT'
]);

const DEFAULT_FIELDS = Object.freeze([
  'country',
  'currency',
  'paymentProvider',
  'legalEntity',
  'taxProfile',
  'market'
]);

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((item, index) => actual[index] === item);
}

function verifySgfAuthority(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, errors: ['manifest must be an object'] };
  }

  if (manifest.schemaVersion !== 'TIGER_SGF_V1') errors.push('schemaVersion must be TIGER_SGF_V1');

  const owner = manifest.ownerRoot || {};
  if (owner.id !== 'OWNER_ROOT') errors.push('ownerRoot.id must be OWNER_ROOT');
  if (owner.country !== null) errors.push('OWNER_ROOT country must be null');
  if (owner.currency !== null) errors.push('OWNER_ROOT currency must be null');
  if (owner.market !== null) errors.push('OWNER_ROOT market must be null');
  if (owner.standingRuntimePrivilege !== false) errors.push('OWNER_ROOT standing runtime privilege must be false');

  const defaults = manifest.defaults || {};
  for (const field of DEFAULT_FIELDS) {
    if (defaults[field] !== null) errors.push(`defaults.${field} must be null`);
  }

  if (!exactArray(manifest.capabilityRegistry, CAPABILITIES)) {
    errors.push('capabilityRegistry must equal the SGF V1 capability registry');
  }
  if (!Array.isArray(manifest.markets)) errors.push('markets must be an array');
  if (manifest.activationAuthority !== 'MARKET_CAPABILITY_PASSPORT') {
    errors.push('activationAuthority must be MARKET_CAPABILITY_PASSPORT');
  }
  if (manifest.fallbackPolicy !== 'DENY_NO_SOVEREIGN_FALLBACK') {
    errors.push('fallbackPolicy must be DENY_NO_SOVEREIGN_FALLBACK');
  }

  return { ok: errors.length === 0, errors };
}

module.exports = Object.freeze({ verifySgfAuthority, CAPABILITIES, DEFAULT_FIELDS });
```

- [ ] **Step 5: Run SGF test and require GREEN for machine authority tests**

```bash
node --test tests/sgf-sovereignty-authority.test.cjs
```

Expected: machine-authority tests pass; owner-binding reference test may remain RED until Task 3.

- [ ] **Step 6: Commit machine authority**

```bash
git add config/sovereignty/sgf-v1.json scripts/sovereignty/verify-sgf-authority.cjs tests/sgf-sovereignty-authority.test.cjs
git commit -m "feat(sgf): add zero-default sovereign machine authority"
```

---

### Task 3: Promote SGF into current owner authority graph

**Files:**
- Modify: `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
- Modify: `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`
- Modify: `config/fusion/current-authority.json`
- Modify: `scripts/fusion/verify-current-authority.cjs`
- Modify: `project-control/authority/authority-registry.v1.json`
- Modify: `tests/fusion-current-authority.test.cjs`
- Test: `tests/sgf-sovereignty-authority.test.cjs`

**Interfaces:**
- Consumes: `config/sovereignty/sgf-v1.json` and SGF authority document.
- Produces: current owner/fusion authority references `tigerSgfOwnerReference` and `tigerSgfConfig`.

- [ ] **Step 1: Add RED assertions to fusion authority test**

In `tests/fusion-current-authority.test.cjs`, add:

```js
assert.equal(
  manifest.tigerSgfOwnerReference,
  'docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md'
);
assert.equal(manifest.tigerSgfConfig, 'config/sovereignty/sgf-v1.json');
```

And assert the binding text contains:

```js
assert.match(binding, /TIGER SOVEREIGN GENOME FABRIC 2026/i);
assert.match(binding, /ZERO DEFAULT COUNTRY/i);
assert.match(binding, /NO SOVEREIGN FALLBACK/i);
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test tests/fusion-current-authority.test.cjs tests/sgf-sovereignty-authority.test.cjs
```

Expected: FAIL because current owner/fusion files do not reference SGF.

- [ ] **Step 3: Add SGF references to fusion manifest**

Add to `config/fusion/current-authority.json` near other owner references:

```json
"tigerSgfOwnerReference": "docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md",
"tigerSgfConfig": "config/sovereignty/sgf-v1.json"
```

- [ ] **Step 4: Require those references in fusion validator**

Add to `REQUIRED_REFERENCE_FIELDS` in `scripts/fusion/verify-current-authority.cjs`:

```js
tigerSgfOwnerReference: 'docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md',
tigerSgfConfig: 'config/sovereignty/sgf-v1.json',
```

- [ ] **Step 5: Update owner binding and Arabic owner entrypoint**

Make SGF a current authority and explicitly state:

```text
OWNER_ROOT = global logical root
ZERO DEFAULT COUNTRY
ZERO DEFAULT CURRENCY
ZERO DEFAULT PAYMENT PROVIDER
NO SOVEREIGN FALLBACK
```

The owner documents must state that market/capability activation is evidence-bound and that SGF supersedes global JOD authority only in the country/currency sovereignty domain; unrelated current finance/attribution rules remain intact.

- [ ] **Step 6: Register SGF authority in authority registry**

Add a `CURRENT_ONLY` record:

```json
{
  "authority_id": "authority.sovereign-genome-fabric.v1",
  "domain": "sovereign-market-control",
  "version": 1,
  "status": "CURRENT_ONLY",
  "owner_decision_ref": "docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md",
  "canonical_path": "docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md",
  "supersedes": [],
  "protected_boundaries": [
    "owner-root-global",
    "zero-default-country",
    "zero-default-currency",
    "zero-default-payment-provider",
    "market-capability-authority",
    "fail-closed",
    "no-sovereign-fallback",
    "exact-release-binding"
  ]
}
```

- [ ] **Step 7: Run focused authority tests**

```bash
node --test tests/fusion-current-authority.test.cjs tests/sgf-sovereignty-authority.test.cjs
```

Expected: PASS except JOD-global tests intentionally addressed in Task 4.

- [ ] **Step 8: Commit owner graph convergence**

```bash
git add docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md config/fusion/current-authority.json scripts/fusion/verify-current-authority.cjs project-control/authority/authority-registry.v1.json tests/fusion-current-authority.test.cjs tests/sgf-sovereignty-authority.test.cjs
git commit -m "feat(sgf): register sovereign owner authority"
```

---

### Task 4: Remove global JOD authority while preserving Pulse semantics

**Files:**
- Modify: `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`
- Modify: `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
- Modify: `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`
- Modify: `config/fusion/current-authority.json`
- Modify: `scripts/fusion/verify-current-authority.cjs`
- Modify: `project-control/authority/authority-registry.v1.json`
- Modify: `tests/fusion-current-authority.test.cjs`
- Modify: `tests/sgf-sovereignty-authority.test.cjs`

**Interfaces:**
- Consumes: SGF zero-default authority.
- Produces: global Pulse product-level identifiers with no global amount/currency; market pricing is explicitly unresolved until a market contract exists.

- [ ] **Step 1: Replace old JOD-positive test with RED market-neutral contract**

Replace the current test named `Pulse is exactly 2/10/25/45 with no product-time expiry` with assertions shaped like:

```js
test('Pulse product semantics are global but sovereign pricing is market-specific', () => {
  const manifest = loadManifest();
  assert.equal(Object.prototype.hasOwnProperty.call(manifest.pulseRing, 'tiersJod'), false);
  assert.deepEqual(manifest.pulseRing.productLevels, [
    'PULSE_2',
    'PULSE_10',
    'PULSE_25',
    'PULSE_45'
  ]);
  assert.equal(manifest.pulseRing.globalPrice, null);
  assert.equal(manifest.pulseRing.globalCurrency, null);
  assert.equal(manifest.pulseRing.pricingAuthority, 'MARKET_PRICING_CONTRACT');
  assert.equal(manifest.pulseRing.purchasedValue, 'SERVER_AUTHORITATIVE_VISIBILITY_ALLOCATION');
  assert.equal(manifest.pulseRing.productTimeExpiry, null);
  assert.equal(manifest.pulseRing.ordinaryPublicationPrerequisite, false);
  assert.equal(manifest.pulseRing.selfServiceDiscountPercent, 7);
  assert.equal(manifest.pulseRing.oneSaleOneSalesWinner, true);
});
```

Add mutation tests rejecting non-null global price/currency.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test tests/fusion-current-authority.test.cjs tests/sgf-sovereignty-authority.test.cjs
```

Expected: FAIL because `tiersJod` is still present and validator still requires it.

- [ ] **Step 3: Change fusion Pulse machine truth**

Replace:

```json
"tiersJod": [2, 10, 25, 45]
```

with:

```json
"productLevels": ["PULSE_2", "PULSE_10", "PULSE_25", "PULSE_45"],
"globalPrice": null,
"globalCurrency": null,
"pricingAuthority": "MARKET_PRICING_CONTRACT"
```

Preserve the existing purchased-value, no-product-time-expiry, self-service discount, one-sale-one-winner, and targeting semantics.

- [ ] **Step 4: Replace JOD validator with market-neutral validator**

In `verify-current-authority.cjs`, remove the `pulse.tiersJod` requirement and add:

```js
if (Object.prototype.hasOwnProperty.call(pulse, 'tiersJod')) {
  errors.push('Pulse global tiersJod authority is forbidden by SGF');
}
if (JSON.stringify(pulse.productLevels) !== JSON.stringify(['PULSE_2', 'PULSE_10', 'PULSE_25', 'PULSE_45'])) {
  errors.push('Pulse product levels must remain PULSE_2/PULSE_10/PULSE_25/PULSE_45');
}
if (pulse.globalPrice !== null) errors.push('Pulse globalPrice must be null under SGF');
if (pulse.globalCurrency !== null) errors.push('Pulse globalCurrency must be null under SGF');
if (pulse.pricingAuthority !== 'MARKET_PRICING_CONTRACT') {
  errors.push('Pulse pricingAuthority must be MARKET_PRICING_CONTRACT');
}
```

- [ ] **Step 5: Update Pulse and owner documents**

The documents must preserve product semantics while replacing statements such as `2/10/25/45 JOD are the global standard` with:

```text
PULSE_2 / PULSE_10 / PULSE_25 / PULSE_45 are global product-level identifiers.
No amount or currency is globally authoritative.
Amount + currency come from an explicitly authorized market pricing contract.
```

Do not change the no-expiry rule or turn Pulse into an ordinary-publication prerequisite.

- [ ] **Step 6: Remove JOD protected boundary from authority registry**

Replace advertising protected boundary `2-10-25-45-jod` with boundaries such as:

```json
"pulse-product-levels-market-priced",
"no-global-sovereign-currency",
"no-product-time-expiry",
"ordinary-publication-separation",
"one-sale-one-sales-winner"
```

- [ ] **Step 7: Run focused tests to GREEN**

```bash
node --test tests/fusion-current-authority.test.cjs tests/sgf-sovereignty-authority.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit Pulse sovereignty convergence**

```bash
git add docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md config/fusion/current-authority.json scripts/fusion/verify-current-authority.cjs project-control/authority/authority-registry.v1.json tests/fusion-current-authority.test.cjs tests/sgf-sovereignty-authority.test.cjs
git commit -m "feat(sgf): make Pulse pricing market sovereign"
```

---

### Task 5: Add current-tree anti-regression guard for sovereign defaults

**Files:**
- Create: `tests/sgf-zero-default-current-contract.test.cjs`
- Read: `config/fusion/current-authority.json`
- Read: `config/sovereignty/sgf-v1.json`
- Read: current owner authority files
- Read: current fusion validators

**Interfaces:**
- Consumes: selected current-authority files only.
- Produces: test that prevents reintroduction of prohibited global sovereign defaults without falsely banning ISO currency metadata or immutable historical migrations.

- [ ] **Step 1: Write RED/guard test for forbidden current-authority patterns**

Create a curated scan that reads only current authority/config/validator surfaces:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const currentPaths = [
  'config/fusion/current-authority.json',
  'config/sovereignty/sgf-v1.json',
  'scripts/fusion/verify-current-authority.cjs',
  'scripts/sovereignty/verify-sgf-authority.cjs',
  'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md',
  'docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md',
  'docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md',
  'docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md'
];

test('current SGF authority contains no global country/currency/provider fallback', () => {
  const text = currentPaths.map((relative) => fs.readFileSync(path.join(root, relative), 'utf8')).join('\n');

  assert.doesNotMatch(text, /"tiersJod"\s*:/);
  assert.doesNotMatch(text, /DEFAULT_COUNTRY\s*=\s*["']JO["']/i);
  assert.doesNotMatch(text, /DEFAULT_CURRENCY\s*=\s*["']JOD["']/i);
  assert.doesNotMatch(text, /DEFAULT_PAYMENT_PROVIDER\s*=\s*["'][^"']+["']/i);
  assert.doesNotMatch(text, /fallback[^\n]{0,80}(?:JO|JOD|US|USD|SD)/i);
});
```

The test intentionally does **not** scan all runtime files or historical migrations; JOD may legitimately appear in currency-fraction metadata, historical evidence, or future market-specific contracts.

- [ ] **Step 2: Run guard test**

```bash
node --test tests/sgf-zero-default-current-contract.test.cjs
```

Expected: PASS after Task 4. If it fails, inspect the exact current-authority occurrence and remove only the sovereign fallback, not legitimate ISO currency support.

- [ ] **Step 3: Commit guard**

```bash
git add tests/sgf-zero-default-current-contract.test.cjs
git commit -m "test(sgf): block sovereign default regressions"
```

---

### Task 6: Foundation verification and promotion boundary

**Files:**
- Verify all Foundation files.
- Do not modify Production configuration.

**Interfaces:**
- Consumes: exact SGF Foundation head.
- Produces: evidence package for review; does not produce market activation.

- [ ] **Step 1: Verify formatting/diff hygiene**

```bash
git diff --check main...HEAD
```

Expected: no output, exit 0.

- [ ] **Step 2: Run SGF focused tests**

```bash
node --test tests/sgf-sovereignty-authority.test.cjs tests/sgf-zero-default-current-contract.test.cjs tests/fusion-current-authority.test.cjs
```

Expected: all PASS.

- [ ] **Step 3: Run the complete Node CJS test suite**

```bash
node --test --test-reporter=dot tests/*.test.cjs
```

Expected: 0 failures.

- [ ] **Step 4: Run the repository Quality Gate**

```bash
bash scripts/quality-gate.sh
```

Expected final marker:

```text
VVIP_QUALITY_GATE=PASS
```

- [ ] **Step 5: Verify no Production activation was introduced**

Run:

```bash
git diff --name-only main...HEAD
```

Review every changed path. Foundation must contain no provider credential, Production deployment mutation, live market activation, or remote database mutation.

- [ ] **Step 6: Record exact head**

```bash
git rev-parse HEAD
```

Record the full SHA in the future PR description together with exact test/gate results.

- [ ] **Step 7: Do not merge while PR #346 is unresolved or SGF exact-head gates are unavailable**

If #346 is not safely merged/closed, keep the SGF branch as preparation only. Once the protected base is ready, reconcile SGF against exact current `main`, rerun every command above, and only then open/refresh the protected SGF PR.

- [ ] **Step 8: Commit any evidence-only documentation update if required**

```bash
git add docs/MASTER_PROJECT_STATE.md
git commit -m "docs(state): record SGF foundation verification"
```

Only perform this step if the status document is updated with real command outputs and exact SHA. Never fabricate evidence.

---

## Self-review result

- Spec coverage for SGF Foundation: owner authority, zero-default machine contract, current authority graph, JOD-global removal, anti-regression guard, exact-head verification are covered.
- Intentionally deferred: Sovereign Compiler, canonical genome hashing/signing, Market Passport verifier, owner JIT execution lease implementation, workload identity, cell runtime, telemetry export policy, kill-grid runtime, crypto inventory/PQC migration.
- No placeholder implementation steps are permitted; later SGF slices require their own plans before code changes.

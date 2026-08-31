# Clean-Room Foundation Domain Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a provider-neutral, test-driven domain kernel that enforces the approved 2026-08-30/31 identity, sector, paid Visibility Card, verified-impression, one-winner sales attribution, 7% self-service discount, and 84% + 16% suspense financial invariants without touching Production or live Supabase.

**Architecture:** Create a new isolated `cleanroom/domain` modular-monolith kernel using pure CommonJS modules and explicit ports. This first slice contains no live database migration, no real payment provider, no provider replacement, and no UI migration; it proves the business invariants and idempotent orchestration in deterministic tests before persistence/integration work begins.

**Tech Stack:** JavaScript CommonJS; Node.js built-in `node:test` and `node:assert/strict`; integer micro-JOD accounting (`1 JOD = 1,000,000 micro-JOD`) for internal allocation precision only; no new npm dependencies in this slice. Micro-JOD is not a new user-facing denomination and does not choose payment-provider settlement precision.

**Spec:** `docs/superpowers/specs/2026-08-31-cleanroom-modular-core-design.md`

## Global Constraints

- Latest explicit owner decision wins in overlapping scope.
- No TIGER password/create/confirm/reset product path.
- Ten current sector IDs are `SEC-001` through `SEC-010`; display labels are mutable metadata.
- Every publishable post requires a paid Visibility Card; no free publishing or free visibility bypass.
- Current card prices are exactly `2 / 10 / 20 / 45 JOD`; `25 JOD` is rejected.
- Card lifetime is verified-impression quota only; no calendar expiry.
- Invalid/failed/unqualified/duplicate delivery consumes zero quota.
- The user/client selects an approved price; the purchased impression quota is resolved by a trusted server-side card catalog. The client must not invent or submit quota as authority.
- `POST_EXPIRES_AT = VISIBILITY_CARD_END + 24 HOURS`.
- Sales roles are independent; one purchase has at most one winning 7% sales claimant.
- No valid claimant means visible 7% self-service discount before payment.
- Current beneficiary allocation is 84%; unresolved 16% is `PENDING_OWNER_REALLOCATION`, never an invented beneficiary.
- `ACTUAL_OPERATIONS = 43%` exactly: 8/8/8/8/8/3.
- Reusing an idempotency key with a materially different purchase command fails closed; it never returns the prior result for a different command.
- No live payment, payout, Supabase migration, role assignment, Production deployment, merge to `main`, or destructive legacy cleanup in this plan.
- Fine-grained social privacy/card-geometry/search wording remains SOURCE-RECOVERY-LOCKED and is outside this slice.

---

## File Structure Locked for This Slice

```text
cleanroom/
  domain/
    identity/verified-session.cjs
    policy/current-owner-policy.cjs
    sectors/sector-registry.cjs
    finance/purchase-quote.cjs
    visibility/visibility-card.cjs
    social/post-lifecycle.cjs
    purchase/purchase-visibility-card.cjs
    index.cjs
  tests/
    identity/verified-session.test.cjs
    policy/current-owner-policy.test.cjs
    sectors/sector-registry.test.cjs
    finance/purchase-quote.test.cjs
    visibility/visibility-card.test.cjs
    social/post-lifecycle.test.cjs
    purchase/purchase-visibility-card.test.cjs
    foundation/foundation-integration.test.cjs
```

Each domain file owns one responsibility. This slice must not import legacy `scripts/social/post-composer.js`, `config/fusion/current-authority.json`, or legacy Pulse product semantics into the clean kernel.

---

### Task 1: Current Owner Policy Contract

**Files:**
- Create: `cleanroom/domain/policy/current-owner-policy.cjs`
- Create: `cleanroom/tests/policy/current-owner-policy.test.cjs`

**Interfaces:**
- Produces: `CURRENT_OWNER_POLICY`, `deepFreeze(value)`, `isApprovedPriceJod(value)`.
- Consumers: sector registry, finance quote, Visibility Card.

- [ ] **Step 1: Write the failing policy test**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CURRENT_OWNER_POLICY,
  isApprovedPriceJod,
} = require('../../domain/policy/current-owner-policy.cjs');

test('current policy contains only owner-approved prices and ten stable sectors', () => {
  assert.deepEqual(CURRENT_OWNER_POLICY.visibility.pricesJod, [2, 10, 20, 45]);
  assert.equal(isApprovedPriceJod(25), false);
  assert.equal(CURRENT_OWNER_POLICY.sectors.length, 10);
  assert.deepEqual(
    CURRENT_OWNER_POLICY.sectors.map((sector) => sector.id),
    Array.from({ length: 10 }, (_, i) => `SEC-${String(i + 1).padStart(3, '0')}`)
  );
});

test('finance policy is 84 percent assigned plus 16 percent pending, with no active TAX_RESERVE', () => {
  assert.equal(CURRENT_OWNER_POLICY.finance.knownAssignedPercent, 84);
  assert.equal(CURRENT_OWNER_POLICY.finance.pendingOwnerReallocationPercent, 16);
  assert.equal(CURRENT_OWNER_POLICY.finance.operationsPercent, 43);
  assert.equal(CURRENT_OWNER_POLICY.finance.salesAdministrationPercent, 21);
  assert.equal(Object.hasOwn(CURRENT_OWNER_POLICY.finance, 'TAX_RESERVE'), false);
});

test('user-facing pace labels are exactly the approved Arabic labels', () => {
  assert.deepEqual(CURRENT_OWNER_POLICY.visibility.paceLabelsAr, ['بطيء', 'جيد', 'سريع']);
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
node --test cleanroom/tests/policy/current-owner-policy.test.cjs
```
Expected: FAIL with `MODULE_NOT_FOUND` for `current-owner-policy.cjs`.

- [ ] **Step 3: Implement the minimal immutable policy contract**

```js
'use strict';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const CURRENT_OWNER_POLICY = deepFreeze({
  sectors: [
    { id: 'SEC-001', labelAr: 'قطع غيار المركبات' },
    { id: 'SEC-002', labelAr: 'خدمات المركبات والخدمات المرتبطة بها' },
    { id: 'SEC-003', labelAr: 'المواد والتموين' },
    { id: 'SEC-004', labelAr: 'العقارات' },
    { id: 'SEC-005', labelAr: 'المقاولات والبناء' },
    { id: 'SEC-006', labelAr: 'الخدمات والمهن والحرف' },
    { id: 'SEC-007', labelAr: 'المعدات والآليات' },
    { id: 'SEC-008', labelAr: 'التجارة والأعمال والتوريد' },
    { id: 'SEC-009', labelAr: 'الهندسة والاستشارات' },
    { id: 'SEC-010', labelAr: 'التصميم' },
  ],
  visibility: {
    pricesJod: [2, 10, 20, 45],
    paceLabelsAr: ['بطيء', 'جيد', 'سريع'],
    expiryBasis: 'VERIFIED_IMPRESSION_QUOTA_ONLY',
    postAfterCardHours: 24,
  },
  finance: {
    knownAssignedPercent: 84,
    pendingOwnerReallocationPercent: 16,
    operationsPercent: 43,
    operations: {
      RISK: 8,
      MAINTENANCE: 8,
      DEVELOPMENT: 8,
      TECHNICAL_SUPPORT: 8,
      ADVERTISING: 8,
      CSR: 3,
    },
    salesAdministrationPercent: 21,
    salesRoles: {
      GENERAL_MANAGER: 7,
      SECTOR_MANAGER: 7,
      MARKETER: 7,
    },
    selfServiceDiscountPercent: 7,
  },
});

function isApprovedPriceJod(value) {
  return CURRENT_OWNER_POLICY.visibility.pricesJod.includes(value);
}

module.exports = Object.freeze({ CURRENT_OWNER_POLICY, deepFreeze, isApprovedPriceJod });
```

- [ ] **Step 4: Run the test and verify GREEN**

```bash
node --test cleanroom/tests/policy/current-owner-policy.test.cjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cleanroom/domain/policy/current-owner-policy.cjs cleanroom/tests/policy/current-owner-policy.test.cjs
git commit -m "feat(cleanroom): add current owner policy contract"
```

---

### Task 2: Provider-Neutral Verified Session Boundary

**Files:**
- Create: `cleanroom/domain/identity/verified-session.cjs`
- Create: `cleanroom/tests/identity/verified-session.test.cjs`

**Interfaces:**
- Produces: `normalizeVerifiedSession(input)` -> `{ ok: true, value }` or `{ ok: false, code }`.
- `value`: `{ userId, externalProvider, externalSubject, sessionId }`.
- Consumers: purchase orchestration and later authorization adapters.

- [ ] **Step 1: Write failing identity tests**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeVerifiedSession } = require('../../domain/identity/verified-session.cjs');

test('accepts only an already-verified external identity mapping', () => {
  const result = normalizeVerifiedSession({
    userId: 'usr_001',
    externalProvider: 'provider-neutral-example',
    externalSubject: 'sub_001',
    sessionId: 'sess_001',
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.userId, 'usr_001');
});

test('rejects local password material fail-closed', () => {
  for (const forbidden of ['password', 'passwordHash', 'encrypted_password', 'credential']) {
    const result = normalizeVerifiedSession({
      userId: 'usr_001', externalProvider: 'x', externalSubject: 'sub', sessionId: 'sess',
      [forbidden]: 'secret',
    });
    assert.deepEqual(result, { ok: false, code: 'LOCAL_CREDENTIAL_MATERIAL_FORBIDDEN' });
  }
});

test('rejects incomplete unverified identity state', () => {
  assert.deepEqual(
    normalizeVerifiedSession({ userId: 'usr_001' }),
    { ok: false, code: 'VERIFIED_EXTERNAL_SESSION_REQUIRED' }
  );
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test cleanroom/tests/identity/verified-session.test.cjs
```
Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement minimal fail-closed identity normalization**

```js
'use strict';
const FORBIDDEN = Object.freeze(['password', 'passwordHash', 'encrypted_password', 'credential']);

function failure(code) { return Object.freeze({ ok: false, code }); }

function normalizeVerifiedSession(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return failure('VERIFIED_EXTERNAL_SESSION_REQUIRED');
  }
  if (FORBIDDEN.some((key) => Object.hasOwn(input, key))) {
    return failure('LOCAL_CREDENTIAL_MATERIAL_FORBIDDEN');
  }
  const required = ['userId', 'externalProvider', 'externalSubject', 'sessionId'];
  if (required.some((key) => typeof input[key] !== 'string' || input[key].trim() === '')) {
    return failure('VERIFIED_EXTERNAL_SESSION_REQUIRED');
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      userId: input.userId.trim(),
      externalProvider: input.externalProvider.trim(),
      externalSubject: input.externalSubject.trim(),
      sessionId: input.sessionId.trim(),
    }),
  });
}

module.exports = Object.freeze({ normalizeVerifiedSession });
```

- [ ] **Step 4: Run and verify GREEN**

```bash
node --test cleanroom/tests/identity/verified-session.test.cjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cleanroom/domain/identity/verified-session.cjs cleanroom/tests/identity/verified-session.test.cjs
git commit -m "feat(cleanroom): enforce external verified session boundary"
```

---

### Task 3: Stable Ten-Sector Registry and Mutable Labels

**Files:**
- Create: `cleanroom/domain/sectors/sector-registry.cjs`
- Create: `cleanroom/tests/sectors/sector-registry.test.cjs`

**Interfaces:**
- Consumes: `CURRENT_OWNER_POLICY.sectors`.
- Produces: `createSectorRegistry(seed)`, registry methods `get(id)`, `requireActive(id)`, `rename(id, labelAr)`, `setActive(id, active)`, `listActive()`.

- [ ] **Step 1: Write failing sector tests**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CURRENT_OWNER_POLICY } = require('../../domain/policy/current-owner-policy.cjs');
const { createSectorRegistry } = require('../../domain/sectors/sector-registry.cjs');

test('seeds exactly ten current sectors and preserves immutable ids during rename', () => {
  const registry = createSectorRegistry(CURRENT_OWNER_POLICY.sectors);
  assert.equal(registry.listActive().length, 10);
  const before = registry.get('SEC-003');
  const renamed = registry.rename('SEC-003', 'مواد وتموين');
  assert.equal(before.id, 'SEC-003');
  assert.equal(renamed.id, 'SEC-003');
  assert.equal(renamed.labelAr, 'مواد وتموين');
});

test('unknown or inactive sector fails closed', () => {
  const registry = createSectorRegistry(CURRENT_OWNER_POLICY.sectors);
  assert.throws(() => registry.requireActive('SEC-999'), /SECTOR_NOT_ACTIVE/);
  registry.setActive('SEC-010', false);
  assert.throws(() => registry.requireActive('SEC-010'), /SECTOR_NOT_ACTIVE/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test cleanroom/tests/sectors/sector-registry.test.cjs
```
Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement in-memory immutable-id registry**

```js
'use strict';
function createSectorRegistry(seed) {
  const map = new Map(seed.map((sector) => [sector.id, { ...sector, active: true }]));
  const copy = (value) => value ? Object.freeze({ ...value }) : null;
  return Object.freeze({
    get(id) { return copy(map.get(id)); },
    requireActive(id) {
      const sector = map.get(id);
      if (!sector || sector.active !== true) throw new Error('SECTOR_NOT_ACTIVE');
      return copy(sector);
    },
    rename(id, labelAr) {
      const sector = map.get(id);
      if (!sector || typeof labelAr !== 'string' || !labelAr.trim()) throw new Error('SECTOR_RENAME_INVALID');
      sector.labelAr = labelAr.trim();
      return copy(sector);
    },
    setActive(id, active) {
      const sector = map.get(id);
      if (!sector) throw new Error('SECTOR_UNKNOWN');
      sector.active = active === true;
      return copy(sector);
    },
    listActive() { return Object.freeze([...map.values()].filter((s) => s.active).map(copy)); },
  });
}
module.exports = Object.freeze({ createSectorRegistry });
```

- [ ] **Step 4: Run and verify GREEN**

```bash
node --test cleanroom/tests/sectors/sector-registry.test.cjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cleanroom/domain/sectors/sector-registry.cjs cleanroom/tests/sectors/sector-registry.test.cjs
git commit -m "feat(cleanroom): add stable ten-sector registry"
```

---

### Task 4: One-Winner Quote, 7% Discount, and 100% Ledger Allocation

**Files:**
- Create: `cleanroom/domain/finance/purchase-quote.cjs`
- Create: `cleanroom/tests/finance/purchase-quote.test.cjs`

**Interfaces:**
- Consumes: `CURRENT_OWNER_POLICY`.
- Produces: `quoteVisibilityPurchase({ priceJod, claimant })`.
- Return fields: `grossMicroJod`, `discountMicroJod`, `capturedMicroJod`, `claimant`, `discountLedgerEntry`, `ledgerEntries`, `ledgerTotalMicroJod`.
- `claimant` is `NO_CLAIMANT` or exactly one of `GENERAL_MANAGER`, `SECTOR_MANAGER`, `MARKETER`.

- [ ] **Step 1: Write failing finance tests**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { quoteVisibilityPurchase } = require('../../domain/finance/purchase-quote.cjs');

function sum(entries) { return entries.reduce((total, e) => total + e.amountMicroJod, 0); }

test('no claimant gives 7 percent discount, emits discount-ledger source entry, and routes sales envelope to OWNER', () => {
  const quote = quoteVisibilityPurchase({ priceJod: 10, claimant: 'NO_CLAIMANT' });
  assert.equal(quote.grossMicroJod, 10_000_000);
  assert.equal(quote.discountMicroJod, 700_000);
  assert.equal(quote.capturedMicroJod, 9_300_000);
  assert.deepEqual(quote.discountLedgerEntry, {
    kind: 'SELF_SERVICE_DISCOUNT',
    percent: 7,
    amountMicroJod: 700_000,
    reasonCode: 'NO_SALES_CLAIMANT',
  });
  assert.equal(sum(quote.ledgerEntries), quote.capturedMicroJod);
  assert.equal(quote.ledgerEntries.some((e) => e.account === 'PENDING_OWNER_REALLOCATION' && e.percent === 16), true);
  assert.equal(quote.ledgerEntries.some((e) => e.account === 'TAX_RESERVE'), false);
  assert.equal(quote.ledgerEntries.filter((e) => e.kind === 'SALES_COMMISSION').length, 0);
});

test('one valid claimant suppresses discount and receives only one 7 percent commission', () => {
  const quote = quoteVisibilityPurchase({ priceJod: 20, claimant: 'MARKETER' });
  assert.equal(quote.discountMicroJod, 0);
  assert.equal(quote.discountLedgerEntry, null);
  assert.equal(quote.capturedMicroJod, 20_000_000);
  const winners = quote.ledgerEntries.filter((e) => e.kind === 'SALES_COMMISSION');
  assert.deepEqual(winners.map((e) => [e.account, e.percent]), [['MARKETER', 7]]);
  assert.equal(sum(quote.ledgerEntries), quote.capturedMicroJod);
});

test('rejects old price and ambiguous claimant', () => {
  assert.throws(() => quoteVisibilityPurchase({ priceJod: 25, claimant: 'NO_CLAIMANT' }), /PRICE_NOT_APPROVED/);
  assert.throws(() => quoteVisibilityPurchase({ priceJod: 10, claimant: ['MARKETER', 'GENERAL_MANAGER'] }), /CLAIMANT_INVALID/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test cleanroom/tests/finance/purchase-quote.test.cjs
```
Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement exact micro-JOD ledger construction**

Use:

```js
const MICRO_JOD_PER_JOD = 1_000_000;
const SALES_ROLES = new Set(['GENERAL_MANAGER', 'SECTOR_MANAGER', 'MARKETER']);

function percentOf(amount, percent) {
  const result = amount * percent;
  if (!Number.isSafeInteger(result) || result % 100 !== 0) throw new Error('LEDGER_PRECISION_INVALID');
  return result / 100;
}
```

Construct immutable allocation entries for:

```text
OWNER_BASE 5
PARTNER_1 5
PARTNER_2 5
PARTNER_3 5
RISK 8
MAINTENANCE 8
DEVELOPMENT 8
TECHNICAL_SUPPORT 8
ADVERTISING 8
CSR 3
SALES_COMMISSION 7 only when one claimant exists
OWNER_SALES_REROUTE 14 when one claimant exists
OWNER_SALES_REROUTE 21 when NO_CLAIMANT
PENDING_OWNER_REALLOCATION 16
```

Every allocation entry includes `percent`, `amountMicroJod`, `kind`, `account`, and immutable `reasonCode`. For `NO_CLAIMANT`, also emit exactly one immutable `discountLedgerEntry` with `kind=SELF_SERVICE_DISCOUNT`, `percent=7`, and `reasonCode=NO_SALES_CLAIMANT`. Assert allocation-entry percentages total 100 and allocation-entry amounts equal `capturedMicroJod`; otherwise throw `LEDGER_NOT_BALANCED`.

- [ ] **Step 4: Run and verify GREEN**

```bash
node --test cleanroom/tests/finance/purchase-quote.test.cjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cleanroom/domain/finance/purchase-quote.cjs cleanroom/tests/finance/purchase-quote.test.cjs
git commit -m "feat(cleanroom): add one-winner purchase quote and balanced ledger"
```

---

### Task 5: Paid Visibility Card and ZERO-BURN Impression State Machine

**Files:**
- Create: `cleanroom/domain/visibility/visibility-card.cjs`
- Create: `cleanroom/tests/visibility/visibility-card.test.cjs`

**Interfaces:**
- Produces: `createPaidVisibilityCard(input)`, `consumeQualifiedImpression(card, receipt, nowIso)`.
- Card fields: `cardId`, `postId`, `offerId`, `priceJod`, `purchasedQuota`, `consumedQuota`, `state`, `paidAt`, `endedAt`, `consumedReceiptIds`.
- `purchasedQuota` is a trusted server-resolved value. Public purchase commands are forbidden from supplying it directly.

- [ ] **Step 1: Write failing card tests**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPaidVisibilityCard,
  consumeQualifiedImpression,
} = require('../../domain/visibility/visibility-card.cjs');

test('card never ends by calendar time while verified quota remains', () => {
  const card = createPaidVisibilityCard({
    cardId: 'card_1', offerId: 'offer_2', postId: 'post_1', priceJod: 2,
    purchasedQuota: 2, paidAt: '2026-08-31T10:00:00.000Z'
  });
  const unchanged = consumeQualifiedImpression(card, { receiptId: 'bad_1', qualified: false }, '2030-01-01T00:00:00.000Z');
  assert.equal(unchanged.state, 'ACTIVE');
  assert.equal(unchanged.consumedQuota, 0);
  assert.equal(unchanged.endedAt, null);
});

test('duplicate or unqualified delivery burns zero quota', () => {
  let card = createPaidVisibilityCard({ cardId: 'c', offerId: 'o', postId: 'p', priceJod: 10, purchasedQuota: 2, paidAt: '2026-08-31T10:00:00.000Z' });
  card = consumeQualifiedImpression(card, { receiptId: 'r1', qualified: true }, '2026-08-31T10:01:00.000Z');
  const replay = consumeQualifiedImpression(card, { receiptId: 'r1', qualified: true }, '2026-08-31T10:02:00.000Z');
  assert.equal(replay.consumedQuota, 1);
});

test('card ends exactly on final verified impression and only once', () => {
  let card = createPaidVisibilityCard({ cardId: 'c', offerId: 'o', postId: 'p', priceJod: 20, purchasedQuota: 2, paidAt: '2026-08-31T10:00:00.000Z' });
  card = consumeQualifiedImpression(card, { receiptId: 'r1', qualified: true }, '2026-08-31T10:01:00.000Z');
  card = consumeQualifiedImpression(card, { receiptId: 'r2', qualified: true }, '2026-08-31T10:02:00.000Z');
  assert.equal(card.state, 'ENDED');
  assert.equal(card.consumedQuota, 2);
  assert.equal(card.endedAt, '2026-08-31T10:02:00.000Z');
  assert.throws(() => consumeQualifiedImpression(card, { receiptId: 'r3', qualified: true }, '2026-08-31T10:03:00.000Z'), /CARD_ALREADY_ENDED/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test cleanroom/tests/visibility/visibility-card.test.cjs
```
Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement immutable quota state transitions**

Rules in code:

```text
price must pass isApprovedPriceJod
offerId must be non-empty
purchasedQuota must be positive safe integer supplied by trusted server catalog
state starts ACTIVE
qualified !== true -> unchanged card
seen receiptId -> unchanged card
qualified unique receipt -> consumedQuota + 1
consumedQuota === purchasedQuota -> state ENDED and endedAt = nowIso
consumedQuota may never exceed purchasedQuota
ENDED card rejects additional qualified consumption
```

Use copied arrays for `consumedReceiptIds`; do not mutate the input card object.

- [ ] **Step 4: Run and verify GREEN**

```bash
node --test cleanroom/tests/visibility/visibility-card.test.cjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cleanroom/domain/visibility/visibility-card.cjs cleanroom/tests/visibility/visibility-card.test.cjs
git commit -m "feat(cleanroom): add verified-impression visibility card state machine"
```

---

### Task 6: Post Activation and Exact +24-Hour Expiry

**Files:**
- Create: `cleanroom/domain/social/post-lifecycle.cjs`
- Create: `cleanroom/tests/social/post-lifecycle.test.cjs`

**Interfaces:**
- Consumes: paid Visibility Card state.
- Produces: `activatePostWithCard(post, card)`, `derivePostLifecycle(post, card, nowIso)`.

- [ ] **Step 1: Write failing post lifecycle tests**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { activatePostWithCard, derivePostLifecycle } = require('../../domain/social/post-lifecycle.cjs');

test('draft cannot become active without a paid active card', () => {
  assert.throws(
    () => activatePostWithCard({ postId: 'p', state: 'READY_FOR_CARD' }, null),
    /PAID_CARD_REQUIRED/
  );
});

test('post remains active for exactly 24 hours after card end then expires', () => {
  const post = Object.freeze({ postId: 'p', state: 'ACTIVE', cardId: 'c' });
  const card = Object.freeze({ cardId: 'c', postId: 'p', state: 'ENDED', endedAt: '2026-08-31T12:00:00.000Z' });
  const before = derivePostLifecycle(post, card, '2026-09-01T11:59:59.999Z');
  assert.equal(before.state, 'ACTIVE_POST_CARD_GRACE');
  assert.equal(before.expiresAt, '2026-09-01T12:00:00.000Z');
  const at = derivePostLifecycle(post, card, '2026-09-01T12:00:00.000Z');
  assert.equal(at.state, 'EXPIRED');
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test cleanroom/tests/social/post-lifecycle.test.cjs
```
Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement exact lifecycle derivation**

Use:

```js
const POST_CARD_GRACE_MS = 24 * 60 * 60 * 1000;
```

`activatePostWithCard` requires a card with matching `postId`, `state === 'ACTIVE'`, and a non-empty `cardId`. `derivePostLifecycle` returns:

```text
ACTIVE                  when card is ACTIVE
ACTIVE_POST_CARD_GRACE  when card ENDED and now < endedAt + 24h
EXPIRED                 when now >= endedAt + 24h
```

Never derive card end from time alone.

- [ ] **Step 4: Run and verify GREEN**

```bash
node --test cleanroom/tests/social/post-lifecycle.test.cjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cleanroom/domain/social/post-lifecycle.cjs cleanroom/tests/social/post-lifecycle.test.cjs
git commit -m "feat(cleanroom): enforce paid-card post lifecycle"
```

---

### Task 7: Idempotent Purchase Orchestrator With Trusted Card Catalog and Fake Payment Port

**Files:**
- Create: `cleanroom/domain/purchase/purchase-visibility-card.cjs`
- Create: `cleanroom/tests/purchase/purchase-visibility-card.test.cjs`

**Interfaces:**
- Consumes: `normalizeVerifiedSession`, sector registry, `quoteVisibilityPurchase`, `createPaidVisibilityCard`, `activatePostWithCard`.
- Ports:
  - `cardCatalog.resolve({ priceJod })` -> `{ offerId, priceJod, purchasedQuota }` from trusted server configuration.
  - `payment.capture({ idempotencyKey, amountMicroJod })` -> `{ ok: true, paymentId }`.
  - `idempotency.get(key)` -> `{ fingerprint, result }` or `null`.
  - `idempotency.put(key, { fingerprint, result })`.
  - `audit.append(event)`.
- Produces: `purchaseVisibilityCard(command, deps)`.
- Public command fields do not include `purchasedQuota` or `quota`.

- [ ] **Step 1: Write failing orchestration tests**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { purchaseVisibilityCard } = require('../../domain/purchase/purchase-visibility-card.cjs');

function fakeDeps() {
  const saved = new Map();
  const captures = [];
  const events = [];
  return {
    captures, events,
    sectorRegistry: { requireActive(id) { if (id !== 'SEC-001') throw new Error('SECTOR_NOT_ACTIVE'); return { id }; } },
    cardCatalog: { resolve({ priceJod }) { return { offerId: `offer_${priceJod}`, priceJod, purchasedQuota: 100 }; } },
    payment: { async capture(input) { captures.push(input); return { ok: true, paymentId: 'pay_1' }; } },
    idempotency: { get(key) { return saved.get(key) || null; }, put(key, value) { saved.set(key, value); } },
    audit: { append(event) { events.push(event); } },
  };
}

const command = Object.freeze({
  idempotencyKey: 'buy_001',
  session: { userId: 'u1', externalProvider: 'x', externalSubject: 's1', sessionId: 'sess1' },
  post: { postId: 'p1', state: 'READY_FOR_CARD' },
  sectorId: 'SEC-001',
  priceJod: 10,
  claimant: 'NO_CLAIMANT',
  paidAt: '2026-08-31T15:00:00.000Z',
});

test('successful purchase captures once, uses server catalog quota, creates paid card, balanced ledger and active post', async () => {
  const deps = fakeDeps();
  const result = await purchaseVisibilityCard(command, deps);
  assert.equal(result.ok, true);
  assert.equal(result.card.offerId, 'offer_10');
  assert.equal(result.card.purchasedQuota, 100);
  assert.equal(result.card.state, 'ACTIVE');
  assert.equal(result.post.state, 'ACTIVE');
  assert.equal(result.quote.ledgerTotalMicroJod, result.quote.capturedMicroJod);
  assert.equal(deps.captures.length, 1);
});

test('public command cannot invent purchased quota', async () => {
  const deps = fakeDeps();
  const result = await purchaseVisibilityCard({ ...command, purchasedQuota: 999999 }, deps);
  assert.deepEqual(result, { ok: false, code: 'CLIENT_QUOTA_FORBIDDEN' });
  assert.equal(deps.captures.length, 0);
});

test('same idempotency key and same command returns prior result without second capture', async () => {
  const deps = fakeDeps();
  const first = await purchaseVisibilityCard(command, deps);
  const second = await purchaseVisibilityCard(command, deps);
  assert.deepEqual(second, first);
  assert.equal(deps.captures.length, 1);
});

test('same idempotency key with different material command fails closed', async () => {
  const deps = fakeDeps();
  await purchaseVisibilityCard(command, deps);
  const changed = await purchaseVisibilityCard({ ...command, priceJod: 20 }, deps);
  assert.deepEqual(changed, { ok: false, code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_COMMAND' });
  assert.equal(deps.captures.length, 1);
});

test('failed payment cannot activate post or create card result', async () => {
  const deps = fakeDeps();
  deps.payment.capture = async () => ({ ok: false, code: 'PAYMENT_NOT_CAPTURED' });
  const result = await purchaseVisibilityCard(command, deps);
  assert.deepEqual(result, { ok: false, code: 'PAYMENT_NOT_CAPTURED' });
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test cleanroom/tests/purchase/purchase-visibility-card.test.cjs
```
Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement minimal orchestrator with command fingerprinting**

Use a deterministic fingerprint over material command fields after verified-session normalization:

```js
function purchaseFingerprint({ userId, postId, sectorId, priceJod, claimant }) {
  return JSON.stringify({ userId, postId, sectorId, priceJod, claimant });
}
```

Order is fixed:

```text
1 reject client-supplied purchasedQuota/quota
2 normalize verified external session
3 validate non-empty idempotency key
4 compute command fingerprint
5 idempotency lookup: same fingerprint -> prior result; different fingerprint -> fail closed
6 active sector validation
7 resolve approved price to trusted server-side card catalog offer/quota
8 quote/attribution/discount/ledger calculation
9 payment capture through injected fake/provider-neutral port
10 create paid Visibility Card using server-resolved offerId/quota
11 activate post
12 append immutable audit event; include discount source event when discountLedgerEntry exists
13 persist { fingerprint, result } through idempotency port
```

The function must return failure before card/post creation when any earlier step fails. It must not contain a real payment SDK or Supabase client. Durable atomic reservation around external payment is intentionally delegated to the next persistence/transaction plan; therefore this slice cannot be wired to real money.

- [ ] **Step 4: Run and verify GREEN**

```bash
node --test cleanroom/tests/purchase/purchase-visibility-card.test.cjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cleanroom/domain/purchase/purchase-visibility-card.cjs cleanroom/tests/purchase/purchase-visibility-card.test.cjs
git commit -m "feat(cleanroom): add idempotent visibility purchase orchestrator"
```

---

### Task 8: Public Kernel Exports and End-to-End Foundation Contract

**Files:**
- Create: `cleanroom/domain/index.cjs`
- Create: `cleanroom/tests/foundation/foundation-integration.test.cjs`

**Interfaces:**
- Produces one explicit clean kernel entrypoint; no legacy runtime imports.

- [ ] **Step 1: Write failing integrated contract test**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const kernel = require('../../domain/index.cjs');

test('approved foundation flow reaches expiry only after server-issued paid card quota exhaustion plus 24 hours', async () => {
  const registry = kernel.createSectorRegistry(kernel.CURRENT_OWNER_POLICY.sectors);
  const store = new Map();
  const deps = {
    sectorRegistry: registry,
    cardCatalog: { resolve({ priceJod }) { return { offerId: `offer_${priceJod}`, priceJod, purchasedQuota: 1 }; } },
    payment: { async capture() { return { ok: true, paymentId: 'pay_e2e' }; } },
    idempotency: { get(k) { return store.get(k) || null; }, put(k, v) { store.set(k, v); } },
    audit: { append() {} },
  };
  const purchase = await kernel.purchaseVisibilityCard({
    idempotencyKey: 'e2e_1',
    session: { userId: 'u', externalProvider: 'x', externalSubject: 's', sessionId: 'sess' },
    post: { postId: 'p', state: 'READY_FOR_CARD' },
    sectorId: 'SEC-001', priceJod: 2, claimant: 'NO_CLAIMANT',
    paidAt: '2026-08-31T00:00:00.000Z',
  }, deps);
  assert.equal(purchase.ok, true);
  assert.equal(purchase.quote.discountLedgerEntry.kind, 'SELF_SERVICE_DISCOUNT');
  const endedCard = kernel.consumeQualifiedImpression(
    purchase.card,
    { receiptId: 'verified_1', qualified: true },
    '2026-08-31T01:00:00.000Z'
  );
  const lifecycle = kernel.derivePostLifecycle(
    purchase.post,
    endedCard,
    '2026-09-01T01:00:00.000Z'
  );
  assert.equal(lifecycle.state, 'EXPIRED');
  assert.equal(lifecycle.expiresAt, '2026-09-01T01:00:00.000Z');
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test cleanroom/tests/foundation/foundation-integration.test.cjs
```
Expected: FAIL with `MODULE_NOT_FOUND` for `domain/index.cjs`.

- [ ] **Step 3: Export only the clean domain interfaces**

```js
'use strict';
module.exports = Object.freeze({
  ...require('./policy/current-owner-policy.cjs'),
  ...require('./identity/verified-session.cjs'),
  ...require('./sectors/sector-registry.cjs'),
  ...require('./finance/purchase-quote.cjs'),
  ...require('./visibility/visibility-card.cjs'),
  ...require('./social/post-lifecycle.cjs'),
  ...require('./purchase/purchase-visibility-card.cjs'),
});
```

- [ ] **Step 4: Run the complete foundation suite**

```bash
node --test \
  cleanroom/tests/policy/current-owner-policy.test.cjs \
  cleanroom/tests/identity/verified-session.test.cjs \
  cleanroom/tests/sectors/sector-registry.test.cjs \
  cleanroom/tests/finance/purchase-quote.test.cjs \
  cleanroom/tests/visibility/visibility-card.test.cjs \
  cleanroom/tests/social/post-lifecycle.test.cjs \
  cleanroom/tests/purchase/purchase-visibility-card.test.cjs \
  cleanroom/tests/foundation/foundation-integration.test.cjs
```
Expected: all tests PASS, zero skipped, zero failed.

Also run the existing aligned finance-contract regression:

```bash
node --test tests/finance-current-distribution.test.cjs
```
Expected: PASS; the cleanroom implementation must not weaken the existing current finance contract.

- [ ] **Step 5: Commit**

```bash
git add cleanroom/domain/index.cjs cleanroom/tests/foundation/foundation-integration.test.cjs
git commit -m "test(cleanroom): prove foundation domain kernel end to end"
```

---

## Self-Review Checklist Before Declaring This Slice Complete

- [ ] Every approved price path accepts only 2/10/20/45 and rejects 25.
- [ ] No cleanroom identity module accepts or stores password material.
- [ ] Sector IDs are stable and label changes do not alter IDs.
- [ ] User/client cannot provide authoritative impression quota; trusted card catalog resolves it server-side.
- [ ] No post can activate before a paid card result exists.
- [ ] Unqualified/duplicate impressions consume zero quota.
- [ ] Card ends only at quota exhaustion, never by time.
- [ ] Post expires at card end + exactly 24 hours.
- [ ] One purchase has zero or one winning sales claimant, never two.
- [ ] NO_CLAIMANT produces 7% discount before capture and an immutable discount-ledger source entry.
- [ ] Ledger entries total exactly captured amount and 100% allocation.
- [ ] `PENDING_OWNER_REALLOCATION` remains 16% and has no beneficiary.
- [ ] No active `TAX_RESERVE` entry exists.
- [ ] Same idempotency key + different command fails closed.
- [ ] No live payment SDK, Supabase write, migration, or Production path is introduced.
- [ ] Full foundation suite and existing finance regression are GREEN on one exact commit SHA.

## Subsequent Approved-Spec Slices — Separate Plans Required Before Execution

This plan intentionally stops at the pure domain kernel. The remaining approved design is decomposed into separate independently reviewable plans in this order:

1. Persistence and transactional PostgreSQL schema: identity mappings, sector registry, posts, cards, verified-impression receipts, purchases, idempotency, immutable ledger, RLS/fail-closed database contracts.
2. Roles/capabilities, owner-only video entitlement, payout destination grace, 14-day settlement, and reporting projections.
3. Paid checkout adapter integration and provider-neutral payment boundary, still sandbox/test mode before any real-money authorization.
4. Social runtime migration: transform composer from direct free publish to DRAFT -> paid-card checkout -> ACTIVE; migrate feed/profile/comments/messages/search/notifications behind current authority.
5. Responsive Preview, security/authorization verification, exact-SHA evidence package, owner acceptance, and only then a separate release/Production decision.

No later slice may bypass the design spec, this foundation contract, or the `Exact SHA -> Tests -> Security -> Preview -> Owner Acceptance` gate.

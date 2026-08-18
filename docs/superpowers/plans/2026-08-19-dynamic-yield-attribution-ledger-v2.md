# VVIP TIGER Dynamic Yield Attribution & Ledger V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active V1 commission policy for new sales with the owner-approved V2.0 direct/referred policies, enforce V2.1 attribution priority, and create deterministic balanced V2.2 distribution journals without live payment or Production effects.

**Architecture:** Three dependency-free ES modules separate policy/allocation, trusted attribution resolution, and journal construction. The policy module is the central source of exact basis-point truth; attribution returns an immutable channel decision; the journal consumes both and creates a balanced allowlisted projection suitable for later persistence.

**Tech Stack:** Plain JavaScript ES modules, Node.js built-in `node:test` and `node:assert/strict`, `node:crypto`, JSON project-control evidence, existing repository shell quality gates.

**Spec:** `docs/superpowers/specs/2026-08-19-dynamic-yield-attribution-ledger-v2-design.md`

## Global Constraints

- Repository remains static HTML/CSS/JavaScript; no framework, bundler, package manager, or new dependency.
- V2 applies only to new economic events on or after `2026-08-19`; historical V1 facts are not rewritten.
- Percentages apply to trusted `NET_RECOGNIZED_REVENUE` minor units.
- Money is non-negative safe-integer minor units; exact multiplication uses `BigInt`.
- Both policy totals equal exactly `10000` basis points.
- `DIRECT_PLATFORM` contains no `PRIMARY_MARKETER` or `SECTOR_MANAGER` allocation.
- Risk/device/payment signals never award commission.
- Browser claims never become financial authority.
- No live provider, payout, database apply, Production mutation, credential, webhook, notification, or real-money execution.
- Retired recipients `SECONDARY_MARKETER`, `SUPERVISOR`, and `AREA_MANAGER` remain prohibited.
- All implementation uses TDD: focused test must fail for the expected missing behavior before production code is added.

---

## File Structure

- `scripts/finance/vvip-commission-policy.js` — active V2 policy constants and exact allocation.
- `scripts/finance/vvip-attribution-policy.js` — trusted evidence validation and V2.1 resolution.
- `scripts/finance/vvip-distribution-journal.js` — V2.2 balanced journal construction.
- `tests/vvip-commission-policy.test.cjs` — policy and allocation behavior.
- `tests/vvip-attribution-policy.test.cjs` — evidence priority/window/review behavior.
- `tests/vvip-distribution-journal.test.cjs` — journal balance, binding, replay, and validation behavior.
- `project-control/commission-policy/v2/owner-decision.json` — machine-readable active owner decision.
- `docs/MASTER_PROJECT_STATE.md` — continuation cursor and V2 finance state.

### Task 1: V2 Commission Policy Test Contract

**Files:**
- Modify: `tests/vvip-commission-policy.test.cjs`
- Modify later: `scripts/finance/vvip-commission-policy.js`

**Interfaces:**
- Produces test contract for `COMMISSION_POLICY_VERSION`, `SALE_CHANNELS`, `CENTRAL_COMMISSION_POLICIES`, `getCommissionPolicyForSaleChannel`, and `allocateNetRecognizedRevenueMinorUnits`.
- The allocator signature is:

```js
allocateNetRecognizedRevenueMinorUnits({
  amountMinor: number,
  saleChannel: "REFERRED_SALE" | "DIRECT_PLATFORM",
  transactionKey: string
}) -> Readonly<{
  policyVersion: string,
  saleChannel: string,
  transactionKey: string,
  amountMinor: number,
  allocations: Readonly<Record<string, {
    basisPoints: number,
    amountMinor: number,
    roundingAdjustmentMinor: 0 | 1
  }>>,
  residualMinor: 0
}>
```

- [ ] **Step 1: Replace V1 expectations with failing V2 policy expectations**

Add literal expectations equivalent to:

```js
assert.equal(COMMISSION_POLICY_VERSION, "VVIP_DYNAMIC_YIELD_2026_08_19_V2");
assert.deepEqual(CENTRAL_COMMISSION_POLICIES.REFERRED_SALE.shares, {
  OWNER_MANAGEMENT: 500,
  OPERATING_PARTNER_1: 500,
  OPERATING_PARTNER_2: 500,
  OPERATING_PARTNER_3: 500,
  GENERAL_MANAGER: 500,
  SECTOR_MANAGER: 500,
  PRIMARY_MARKETER: 500,
  TECH_CONTENT: 150,
  CUSTOMER_SERVICE_BASE: 150,
  PLATFORM_RETAINED: 6200
});
assert.deepEqual(CENTRAL_COMMISSION_POLICIES.DIRECT_PLATFORM.shares, {
  OWNER_MANAGEMENT: 500,
  OPERATING_PARTNER_1: 500,
  OPERATING_PARTNER_2: 500,
  OPERATING_PARTNER_3: 500,
  GENERAL_MANAGER: 500,
  TECH_CONTENT: 150,
  CUSTOMER_SERVICE_BASE: 150,
  CUSTOMER_SERVICE_PERFORMANCE: 500,
  GROWTH_ACQUISITION_RESERVE: 300,
  RISK_CHARGEBACK_RESERVE: 200,
  PLATFORM_RETAINED: 6200
});
```

Assert both sums are 10,000, both policy objects are deeply frozen, sector-local override is false, and all retired recipients are absent.

- [ ] **Step 2: Add failing allocation behavior tests**

Use hand-checked cases:

```js
const referred = allocateNetRecognizedRevenueMinorUnits({
  amountMinor: 100000,
  saleChannel: "REFERRED_SALE",
  transactionKey: "txn_referred_100_jod_001"
});
assert.equal(referred.allocations.OWNER_MANAGEMENT.amountMinor, 5000);
assert.equal(referred.allocations.PRIMARY_MARKETER.amountMinor, 5000);
assert.equal(referred.allocations.TECH_CONTENT.amountMinor, 1500);
assert.equal(referred.allocations.PLATFORM_RETAINED.amountMinor, 62000);
assert.equal(referred.residualMinor, 0);

const direct = allocateNetRecognizedRevenueMinorUnits({
  amountMinor: 100000,
  saleChannel: "DIRECT_PLATFORM",
  transactionKey: "txn_direct_100_jod_001"
});
assert.equal(Object.hasOwn(direct.allocations, "PRIMARY_MARKETER"), false);
assert.equal(Object.hasOwn(direct.allocations, "SECTOR_MANAGER"), false);
assert.equal(direct.allocations.CUSTOMER_SERVICE_PERFORMANCE.amountMinor, 5000);
assert.equal(direct.allocations.GROWTH_ACQUISITION_RESERVE.amountMinor, 3000);
assert.equal(direct.allocations.RISK_CHARGEBACK_RESERVE.amountMinor, 2000);
```

Loop over literal source amounts `[0, 1, 2, 3, 7, 11, 999, 10000, 10001, 100000, Number.MAX_SAFE_INTEGER]` for both channels and assert exact sum, non-negative safe-integer outputs, deterministic replay, and residual zero.

- [ ] **Step 3: Add failing input rejection tests**

Assert stable failures:

```js
assert.throws(
  () => allocateNetRecognizedRevenueMinorUnits({
    amountMinor: 1.5,
    saleChannel: "REFERRED_SALE",
    transactionKey: "txn_invalid_money_001"
  }),
  /VVIP_INVALID_MONEY/
);
assert.throws(
  () => getCommissionPolicyForSaleChannel("UNKNOWN"),
  /VVIP_INVALID_SALE_CHANNEL/
);
```

Also reject negative, unsafe, `NaN`, string money, and transaction keys shorter than eight characters.

- [ ] **Step 4: Run focused test and verify RED**

Run:

```bash
node --test tests/vvip-commission-policy.test.cjs
```

Expected: FAIL because the V1 module does not export the V2 contracts.

### Task 2: V2 Commission Policy Implementation

**Files:**
- Modify: `scripts/finance/vvip-commission-policy.js`
- Test: `tests/vvip-commission-policy.test.cjs`

**Interfaces:**
- Produces the exact exports and allocator signature frozen in Task 1.
- Consumed by `scripts/finance/vvip-distribution-journal.js` in Task 5.

- [ ] **Step 1: Replace the active V1 policy constants with V2**

Define:

```js
export const COMMISSION_POLICY_VERSION = "VVIP_DYNAMIC_YIELD_2026_08_19_V2";
export const SALE_CHANNELS = Object.freeze(["REFERRED_SALE", "DIRECT_PLATFORM"]);
export const RETIRED_COMMISSION_RECIPIENTS = Object.freeze([
  "SECONDARY_MARKETER",
  "SUPERVISOR",
  "AREA_MANAGER"
]);
```

Construct both policies from the literal basis-point maps in Task 1. Each policy must expose `calculationBase: "NET_RECOGNIZED_REVENUE"`, `sectorOverridesAllowed: false`, and `totalBasisPoints: 10000`.

- [ ] **Step 2: Implement exact largest-remainder allocation**

Use `BigInt(amountMinor) * BigInt(basisPoints)`, floor division by `10000n`, and fractional remainder sorting. For equal fractional remainders, derive a stable rotation from:

```js
createHash("sha256")
  .update(COMMISSION_POLICY_VERSION)
  .update("\u0000")
  .update(saleChannel)
  .update("\u0000")
  .update(transactionKey)
  .digest()
```

Create fresh allowlisted result objects and recursively freeze the public result.

- [ ] **Step 3: Enforce reconciliation and error codes**

Throw `VVIP_DISTRIBUTION_RECONCILIATION_FAILED` unless allocation sum equals `amountMinor` and residual is zero. Throw the exact validation codes specified in the design.

- [ ] **Step 4: Run focused test and verify GREEN**

```bash
node --test tests/vvip-commission-policy.test.cjs
```

Expected: all V2 commission tests pass with zero failures.

- [ ] **Step 5: Commit the V2 policy slice**

```bash
git add scripts/finance/vvip-commission-policy.js tests/vvip-commission-policy.test.cjs
git commit -m "feat(finance): add Dynamic Yield V2 commission policy"
```

### Task 3: V2.1 Attribution Resolver

**Files:**
- Create: `tests/vvip-attribution-policy.test.cjs`
- Create: `scripts/finance/vvip-attribution-policy.js`

**Interfaces:**
- Produces:

```js
resolveAttribution({
  transactionId: string,
  lockedAt: string,
  fraudReviewRequired?: boolean,
  evidence?: Array<{
    evidenceId: string,
    type: "CHECKOUT_CODE" | "VERIFIED_LEAD" | "VERIFIED_ORDER_START" | "CONSENTED_FIRST_PARTY_COOKIE" | "DEVICE_RISK_SIGNAL" | "PAYMENT_RISK_SIGNAL",
    capturedAt: string,
    marketerId?: string,
    managerAssignmentId?: string,
    sectorId?: string
  }>
}) -> Readonly<{
  policyVersion: "VVIP_ATTRIBUTION_2026_08_19_V2_1",
  transactionId: string,
  status: "ATTRIBUTED" | "DIRECT_PLATFORM" | "ATTRIBUTION_REVIEW",
  saleChannel: "REFERRED_SALE" | "DIRECT_PLATFORM" | null,
  lockedAt: string,
  winningEvidenceId: string | null,
  evidenceType: string | null,
  marketerId: string | null,
  managerAssignmentId: string | null,
  sectorId: string | null
}>
```

- [ ] **Step 1: Write failing priority and window tests**

Use fixed clock `2026-08-19T12:00:00.000Z`. Assert:

```js
const result = resolveAttribution({
  transactionId: "txn_attr_priority_001",
  lockedAt: "2026-08-19T12:00:00.000Z",
  evidence: [
    {
      evidenceId: "ev_cookie_001",
      type: "CONSENTED_FIRST_PARTY_COOKIE",
      capturedAt: "2026-08-18T12:00:00.000Z",
      marketerId: "mkt_cookie",
      managerAssignmentId: "asn_cookie",
      sectorId: "JO:AUTOMOTIVE"
    },
    {
      evidenceId: "ev_checkout_001",
      type: "CHECKOUT_CODE",
      capturedAt: "2026-08-19T11:59:00.000Z",
      marketerId: "mkt_checkout",
      managerAssignmentId: "asn_checkout",
      sectorId: "JO:AUTOMOTIVE"
    }
  ]
});
assert.equal(result.status, "ATTRIBUTED");
assert.equal(result.winningEvidenceId, "ev_checkout_001");
assert.equal(result.marketerId, "mkt_checkout");
```

Test exact boundary validity for 7, 30, and 60 days; one millisecond beyond each boundary is expired. Test that the newest evidence wins when two valid claims have the same type.

- [ ] **Step 2: Write failing direct and review tests**

Assert no evidence returns frozen `DIRECT_PLATFORM`; risk-only evidence also returns direct; `fraudReviewRequired: true` returns `ATTRIBUTION_REVIEW` with `saleChannel: null`; a fraud review never carries a beneficiary.

- [ ] **Step 3: Write failing malformed evidence tests**

Reject future evidence, invalid timestamps, unsupported evidence types, and eligible evidence missing any of `evidenceId`, `marketerId`, `managerAssignmentId`, or `sectorId` using the design's stable error codes.

- [ ] **Step 4: Run focused test and verify RED**

```bash
node --test tests/vvip-attribution-policy.test.cjs
```

Expected: FAIL because the attribution module does not exist.

- [ ] **Step 5: Implement the minimal resolver**

Define immutable priority/window metadata:

```js
CHECKOUT_CODE: { priority: 1, maxAgeMs: 0, orderOnly: true }
VERIFIED_LEAD: { priority: 2, maxAgeMs: 60 * 24 * 60 * 60 * 1000 }
VERIFIED_ORDER_START: { priority: 3, maxAgeMs: 30 * 24 * 60 * 60 * 1000 }
CONSENTED_FIRST_PARTY_COOKIE: { priority: 4, maxAgeMs: 7 * 24 * 60 * 60 * 1000 }
```

Treat `CHECKOUT_CODE` as valid when captured at or before lock and within the same UTC calendar date as the locked transaction. Filter risk-only evidence from commission candidates. Sort eligible candidates by priority, then newest capture time, then evidence ID for deterministic ties.

- [ ] **Step 6: Run focused test and verify GREEN**

```bash
node --test tests/vvip-attribution-policy.test.cjs
```

Expected: all attribution tests pass with zero failures.

- [ ] **Step 7: Commit the attribution slice**

```bash
git add scripts/finance/vvip-attribution-policy.js tests/vvip-attribution-policy.test.cjs
git commit -m "feat(finance): add V2.1 attribution resolution"
```

### Task 4: V2.2 Distribution Journal Tests

**Files:**
- Create: `tests/vvip-distribution-journal.test.cjs`
- Create later: `scripts/finance/vvip-distribution-journal.js`

**Interfaces:**
- Consumes `resolveAttribution` output and `allocateNetRecognizedRevenueMinorUnits`.
- Produces `createDistributionJournal` with the exact signature and output in the spec.

- [ ] **Step 1: Write failing referred-journal test**

Create a real attribution with `resolveAttribution`, pass it to `createDistributionJournal`, and assert literal behavior:

```js
assert.equal(journal.status, "POSTED");
assert.equal(journal.saleChannel, "REFERRED_SALE");
assert.equal(journal.debitTotalMinor, 100000);
assert.equal(journal.creditTotalMinor, 100000);
assert.equal(journal.residualMinor, 0);
assert.equal(
  journal.destinations.find((entry) => entry.recipient === "PRIMARY_MARKETER").beneficiaryReference,
  "mkt_4412"
);
assert.equal(
  journal.destinations.find((entry) => entry.recipient === "SECTOR_MANAGER").beneficiaryReference,
  "asn_sector_038"
);
```

Assert the source entry is exactly `NET_RECOGNIZED_REVENUE_CLEARING`, `DEBIT`, and 100000 minor units.

- [ ] **Step 2: Write failing direct-journal test**

Use a real direct result from `resolveAttribution`. Assert no marketer/sector-manager destination, presence of the three approved direct reserve/pool recipients, and exact balance.

- [ ] **Step 3: Write failing replay and fail-closed tests**

Assert deep equality for identical input replay. Reject:

- `ATTRIBUTION_REVIEW` as not postable;
- journal IDs, source-event IDs, and idempotency keys shorter than eight characters;
- invalid currency and money;
- an attribution object whose sale channel was manually changed;
- extra browser-provided beneficiary maps by proving the public function ignores no unrecognized input and builds fixed accounts from allowlisted policy.

- [ ] **Step 4: Run focused test and verify RED**

```bash
node --test tests/vvip-distribution-journal.test.cjs
```

Expected: FAIL because the journal module does not exist.

### Task 5: V2.2 Distribution Journal Implementation

**Files:**
- Create: `scripts/finance/vvip-distribution-journal.js`
- Test: `tests/vvip-distribution-journal.test.cjs`

**Interfaces:**
- Produces the journal contract consumed by a later persistence/outbox slice.

- [ ] **Step 1: Implement identifiers, currency, and attribution validation**

Use `/^[A-Za-z0-9][A-Za-z0-9:._/-]{7,159}$/` for internal identifiers and idempotency keys. Normalize currency with `/^[A-Za-z]{3}$/` and uppercase it. Require a frozen resolver result with the exact attribution policy version and matching channel/status combination.

- [ ] **Step 2: Implement canonical beneficiary/account mapping**

Fixed accounts:

```js
OWNER_MANAGEMENT -> commission:owner_management
OPERATING_PARTNER_1 -> commission:operating_partner:OP_01
OPERATING_PARTNER_2 -> commission:operating_partner:OP_02
OPERATING_PARTNER_3 -> commission:operating_partner:OP_03
GENERAL_MANAGER -> commission:general_manager
TECH_CONTENT -> allocation:tech_content
CUSTOMER_SERVICE_BASE -> allocation:customer_service_base
CUSTOMER_SERVICE_PERFORMANCE -> allocation:customer_service_performance
GROWTH_ACQUISITION_RESERVE -> reserve:growth_acquisition
RISK_CHARGEBACK_RESERVE -> reserve:risk_chargeback
PLATFORM_RETAINED -> revenue:platform_retained
```

Dynamic accounts:

```js
PRIMARY_MARKETER -> commission:marketer:<marketerId>
SECTOR_MANAGER -> commission:sector_manager:<managerAssignmentId>
```

The dynamic beneficiary values come only from the trusted attribution result.

- [ ] **Step 3: Construct and reconcile the immutable journal**

Call the V2 allocator, map every allocation to one credit destination, sum credits, compare with source debit, set residual zero, and recursively freeze the result. Throw `VVIP_DISTRIBUTION_RECONCILIATION_FAILED` on any mismatch.

- [ ] **Step 4: Run focused test and verify GREEN**

```bash
node --test tests/vvip-distribution-journal.test.cjs
```

Expected: all journal tests pass with zero failures.

- [ ] **Step 5: Run all three finance suites**

```bash
node --test \
  tests/vvip-commission-policy.test.cjs \
  tests/vvip-attribution-policy.test.cjs \
  tests/vvip-distribution-journal.test.cjs \
  tests/vvip-retired-role-policy.test.cjs
```

Expected: all finance and retired-role tests pass.

- [ ] **Step 6: Commit the journal slice**

```bash
git add scripts/finance/vvip-distribution-journal.js tests/vvip-distribution-journal.test.cjs
git commit -m "feat(finance): add balanced V2.2 distribution journal"
```

### Task 6: Owner Decision Evidence and Continuation State

**Files:**
- Create: `project-control/commission-policy/v2/owner-decision.json`
- Update: `docs/MASTER_PROJECT_STATE.md`
- Verify: `docs/superpowers/specs/2026-08-19-dynamic-yield-attribution-ledger-v2-design.md`
- Verify: `docs/superpowers/plans/2026-08-19-dynamic-yield-attribution-ledger-v2.md`

**Interfaces:**
- Produces machine-readable and human continuation evidence; creates no runtime authority beyond the implemented domain contracts.

- [ ] **Step 1: Create the V2 owner-decision JSON**

Record:

```json
{
  "decision_id": "DYNAMIC-YIELD-COMMISSION-ATTRIBUTION-2026-08-19-V2",
  "effective_at": "2026-08-19",
  "authority": "OWNER_APPROVED_PLATFORM_POLICY",
  "supersedes_for_new_sales": "COMMISSION-ROLE-POLICY-2026-08-11",
  "calculation_base": "NET_RECOGNIZED_REVENUE",
  "real_money_execution_authorized_by_this_file": false
}
```

Include the exact referred/direct basis-point maps, attribution priority, 7/30/60-day windows, fraud-review behavior, and historical-preservation rule from the spec.

- [ ] **Step 2: Update the finance section of the master state**

State that V2 is owner-approved and implemented on the feature branch only after tests pass. Preserve the existing V1 description as historical policy and do not claim Production activation, DB apply, or real-money movement.

- [ ] **Step 3: Validate JSON and scan for placeholders**

```bash
python3 -m json.tool project-control/commission-policy/v2/owner-decision.json >/dev/null
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("docs/superpowers/specs/2026-08-19-dynamic-yield-attribution-ledger-v2-design.md"),
    Path("docs/superpowers/plans/2026-08-19-dynamic-yield-attribution-ledger-v2.md"),
    Path("project-control/commission-policy/v2/owner-decision.json"),
]
forbidden = ("TO" + "DO", "TB" + "D", "implement " + "later", "fill in " + "details")
matches = [
    f"{path}:{term}"
    for path in paths
    for term in forbidden
    if term in path.read_text(encoding="utf-8")
]
if matches:
    raise SystemExit("placeholder scan failed: " + ", ".join(matches))
PY
```

Expected: JSON command exits zero; placeholder scan returns no matches.

- [ ] **Step 4: Commit decision evidence**

```bash
git add \
  docs/MASTER_PROJECT_STATE.md \
  docs/superpowers/specs/2026-08-19-dynamic-yield-attribution-ledger-v2-design.md \
  docs/superpowers/plans/2026-08-19-dynamic-yield-attribution-ledger-v2.md \
  project-control/commission-policy/v2/owner-decision.json
git commit -m "docs(finance): record Dynamic Yield V2 owner decision"
```

### Task 7: Integrated Verification

**Files:**
- Verify all changed files; no new Production configuration or credential file.

**Interfaces:**
- Produces exact-head evidence for repository handoff.

- [ ] **Step 1: Run focused finance tests**

```bash
node --test \
  tests/vvip-commission-policy.test.cjs \
  tests/vvip-attribution-policy.test.cjs \
  tests/vvip-distribution-journal.test.cjs \
  tests/vvip-retired-role-policy.test.cjs
```

- [ ] **Step 2: Run smoke checks**

```bash
./scripts/qa-smoke.sh
```

- [ ] **Step 3: Run the full isolated quality gate**

```bash
bash scripts/quality-gate.sh
```

- [ ] **Step 4: Review exact diff and forbidden scope**

```bash
git diff --check origin/main...HEAD
git status --short
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
```

Expected changed scope is limited to the files listed in this plan. No `.env*`, credential, provider configuration, SQL, HTML, CSS, service worker, or live endpoint file is allowed.

- [ ] **Step 5: Map acceptance criteria to evidence**

Record each spec acceptance criterion as `Confirmed`, `Partial`, `Unverified`, or `Failed` using fresh command output. Do not claim Production readiness, payout readiness, or real-money activation.

## Plan Self-Review

- Spec coverage: V2.0 policy, V2.1 attribution, V2.2 balanced journal, exact money, historical preservation, and deferred live scope are mapped to Tasks 1–7.
- Placeholder scan: no placeholders are permitted in plan deliverables.
- Type consistency: `amountMinor`, `saleChannel`, `transactionKey`, attribution fields, and journal fields use one spelling across tasks.
- Dependency order: policy precedes attribution consumer integration; both precede journal construction; evidence and broad verification follow runtime behavior.
- Scope remains one testable repository domain slice; persistence/outbox/provider/UI work is explicitly deferred.

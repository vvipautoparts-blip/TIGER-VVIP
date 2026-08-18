# TIGER Sovereign Sales DNA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the prior active commission attribution with deterministic Sales DNA lineage and the owner-approved 38% direct / 62% treasury financial invariant.

**Architecture:** A pure Node.js finance module creates immutable assignment epochs, ownership claims, locked Sales DNA snapshots, cryptographic seals, opaque revenue addresses, and exact integer-minor-unit allocations. The module is repository/runtime contract code; Production persistence and real-money execution remain separately gated.

**Tech Stack:** Node.js 22, `node:crypto`, Node test runner, GitHub protected quality gates.

**Spec:** `docs/superpowers/specs/2026-08-19-tiger-sovereign-sales-dna-design.md`

## Global Constraints

- Allocation must equal exactly 10000 bps.
- Manager and marketer allocations are each 500 bps per sale, never multiplied by population count.
- Canonical role names are `GENERAL_MANAGER`, `SECTOR_MANAGER`, and `MARKETER`.
- Responsibility Cell is routing metadata, not a financial role.
- Standard mode has at most one sector-manager beneficiary and one marketer beneficiary per sale.
- Historical locked lineage is immutable.
- Money uses integer minor units only.
- Missing manager/marketer attribution routes to separate unattributed reserves.
- Production DB mutation, real-money execution, payout, secret change, DNS change, and Production deployment are not authorized by this implementation.

---

### Task 1: Sales DNA contract tests

**Files:**
- Create: `tests/tiger-sales-dna.test.cjs`

**Interfaces:**
- Consumes: future exports from `scripts/finance/tiger-sales-dna.js`.
- Produces: executable contract for policy invariants, lineage locking, seals, reserves, and exact allocation.

- [ ] **Step 1: Write the failing test**

Create tests that import `scripts/finance/tiger-sales-dna.js` and assert:

```js
assert.equal(FINANCIAL_ALLOCATION_BPS.OWNER, 500);
assert.equal(FINANCIAL_ALLOCATION_BPS.GENERAL_MANAGER, 500);
assert.equal(FINANCIAL_ALLOCATION_BPS.SECTOR_MANAGER, 500);
assert.equal(FINANCIAL_ALLOCATION_BPS.MARKETER, 500);
assert.equal(FINANCIAL_ALLOCATION_BPS.CUSTOMER_SUPPORT_POOL, 150);
assert.equal(FINANCIAL_ALLOCATION_BPS.TECH_CONTENT_OPS_POOL, 150);
assert.equal(FINANCIAL_ALLOCATION_BPS.PLATFORM_TREASURY_RESERVE, 6200);
assert.equal(Object.values(FINANCIAL_ALLOCATION_BPS).reduce((a, b) => a + b, 0), 10000);
```

Create one valid manager assignment, one valid marketer assignment, one ownership claim, and one Sales DNA snapshot. Assert the snapshot is frozen, contains one manager and one marketer lineage, survives later assignment-object mutation attempts unchanged, and verifies its seal.

Create a tampered copy with a different manager id and assert `verifySalesDnaSnapshot` returns false.

Allocate `10001` minor units and assert all returned amounts are safe non-negative integers and sum exactly to `10001`.

Create a sale without manager and marketer attribution and assert the 500 bps shares route to `MANAGEMENT_UNATTRIBUTED_RESERVE` and `MARKETING_UNATTRIBUTED_RESERVE` while treasury remains 6200 bps.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/tiger-sales-dna.test.cjs
```

Expected: FAIL because `scripts/finance/tiger-sales-dna.js` does not yet exist.

---

### Task 2: Sales DNA finance module

**Files:**
- Create: `scripts/finance/tiger-sales-dna.js`

**Interfaces:**
- Produces: `SALES_DNA_POLICY_VERSION`, `FINANCIAL_ALLOCATION_BPS`, `createAssignmentEpoch`, `createSaleOwnershipClaim`, `createSalesDnaSnapshot`, `verifySalesDnaSnapshot`, `allocateSalesDnaMinorUnits`.

- [ ] **Step 1: Implement immutable validated records**

Use `Object.freeze` and strict identifier/timestamp validation. `createAssignmentEpoch` must require id, subject id, sector id, responsibility cell id, `validFrom`, optional `validUntil`, and `ACTIVE` status. Marketer assignment additionally requires `managerAssignmentId`.

- [ ] **Step 2: Implement ownership claim**

`createSaleOwnershipClaim` must validate claim id, customer/opportunity id, sector id, marketer assignment id, source, creation time, optional expiration, and eligible status.

- [ ] **Step 3: Implement canonical snapshot + seal**

Create a stable ordered JSON payload containing sale id, country, sector, cell, manager assignment lineage or null, marketer assignment lineage or null, claim id or null, financial policy version, and locked timestamp. SHA-256 the canonical JSON. Derive a non-PII revenue address from the seal prefix.

- [ ] **Step 4: Implement exact allocator**

Calculate each bucket as integer basis-point share of `baseDistributableMinorUnits`. Route missing manager/marketer buckets to their dedicated unattributed reserves. Put the final deterministic remainder only in `ROUNDING_ADJUSTMENT_ACCOUNT`. Assert final reconciliation equals the input amount.

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
node --test tests/tiger-sales-dna.test.cjs
```

Expected: PASS.

---

### Task 3: Remove the prior active commission authority

**Files:**
- Delete: `scripts/finance/vvip-commission-policy.js`
- Delete: `tests/vvip-commission-policy.test.cjs`
- Delete: `project-control/commission-policy/v1/owner-decision.json`
- Delete: `docs/superpowers/specs/2026-08-11-vvip-commission-policy-all-sectors-design.md`
- Delete: `docs/superpowers/plans/2026-08-12-vvip-all-sector-commission-role-retirement.md`

**Interfaces:**
- Consumes: Sales DNA authority and module from Tasks 1–2.
- Produces: no active alternate commission-policy path.

- [ ] **Step 1: Delete the five obsolete policy-specific files**

Delete the files exactly as listed above.

- [ ] **Step 2: Search active repository paths for obsolete policy version references**

Search for the prior commission-policy version and removed redistribution symbols. Any active finance/project-control reference must be removed or updated to Sales DNA authority; historical generic provenance outside active authority may not be executable.

---

### Task 4: Make owner/project state point to Sales DNA only

**Files:**
- Modify: `docs/MASTER_PROJECT_STATE.md`
- Keep current: `docs/owner-control/VVIP_TIGER_OWNER_SALES_DNA_AUTHORITY_2026-08-19.md`
- Keep current: `project-control/commission-policy/v2/owner-decision.json`

**Interfaces:**
- Produces: one current owner financial authority and one current machine contract.

- [ ] **Step 1: Replace the Finance / commission / worker identity state section**

The current state must say:

```text
Current financial attribution authority:
docs/owner-control/VVIP_TIGER_OWNER_SALES_DNA_AUTHORITY_2026-08-19.md

Machine contract:
project-control/commission-policy/v2/owner-decision.json
```

It must list the fixed 5/5/5/5/5/5/5/1.5/1.5/62 allocation and Sales DNA zero-overlap rule, and must not describe the removed redistribution algorithm as current.

- [ ] **Step 2: Preserve Production safety boundary**

Keep the explicit statement that repository implementation is not evidence of Production DB apply, payout, or real-money activation.

---

### Task 5: Verification and protected integration

**Files:**
- Test: `tests/tiger-sales-dna.test.cjs`
- Verify: repository quality/security workflows.

**Interfaces:**
- Produces: evidence that the branch is internally consistent before merge.

- [ ] **Step 1: Run focused Node test**

```bash
node --test tests/tiger-sales-dna.test.cjs
```

Expected: PASS.

- [ ] **Step 2: Run repository quality gate**

```bash
bash scripts/quality-gate.sh
```

Expected: `VVIP_QUALITY_GATE=PASS`.

- [ ] **Step 3: Open PR to `main`**

Use title:

```text
feat(finance): adopt TIGER Sovereign Sales DNA
```

The PR body must state the fixed 10000-bps allocation, deletion of the old active commission path, Sales DNA lineage invariants, and the explicit no-Production-money-movement boundary.

- [ ] **Step 4: Merge only after protected checks satisfy repository policy**

Do not bypass required review or protected checks.

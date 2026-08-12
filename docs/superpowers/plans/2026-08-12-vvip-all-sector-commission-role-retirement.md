# VVIP TIGER All-Sector Commission & Role Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish PR #191 by retiring cancelled operational/financial roles from all new active paths and establishing one exact, inherited commission policy for every current and future sector without rewriting historical facts.

**Architecture:** Keep geographic `area` scope available where it represents location, but remove `area_manager` as an active role. Separate active role catalogs from historical-readable role IDs. Add one server-side commission-policy module that exposes exact rational policy values and deterministic minor-unit redistribution of the removed 10.93% without sector-local copies or binary floating-point source-of-truth calculations.

**Tech Stack:** Node.js ES modules, Node built-in test runner, existing V13.1 authorization contracts, PR35 compatibility contracts, static Operations Console, GitHub Actions quality gates.

## Global Constraints

- `SECONDARY_MARKETER`, `SUPERVISOR`, and `AREA_MANAGER` are retired from all new active commission/operational assignment paths.
- `PRIMARY_MARKETER` remains exactly 4.30% / 430 basis points.
- Removed 10.93% is redistributed only to `SECTOR_MANAGER`, `COUNTRY_EXECUTIVE_COMMISSIONER`, and `MARKETING`.
- Exact nominal basis-point values are represented rationally, never from rounded display percentages: `SECTOR_MANAGER = 2383/3 bp`, `COUNTRY_EXECUTIVE_COMMISSIONER = 2734/3 bp`, `MARKETING = 3304/3 bp`.
- The equal removed-share addition is `1093/3 bp` to each of the three destinations.
- The geographic `area` scope remains valid; only the `area_manager` role is retired.
- Historical audit and financial facts remain readable and are not rewritten.
- No Production database migration apply, no real-money payout execution, no Clerk/DNS/secrets changes.
- Every new operational role assignment continues to require server-verified `ACCOUNT_ID` or `CLERK_USER_ID` identity binding.

---

### Task 1: RED — Prove retired roles are still active today

**Files:**
- Create: `tests/vvip-retired-role-policy.test.cjs`
- Test existing: `scripts/authorization/v13-authority-contracts.js`
- Test existing: `scripts/pr35/pr35-contracts.js`
- Test existing: `operations-console/role-permissions.js`

**Interfaces:**
- Consumes: `ROLE_IDS`, `ROLE_RANK`, PR35 `ROLE_IDS`, PR35 `ROLE_TEMPLATES`, Operations Console `ROLES` and `ACCESS`.
- Produces: failing evidence that `area_manager` is still selectable/authorizable before implementation.

- [ ] **Step 1: Write failing active-retirement assertions**

```js
assert.equal(v13.ROLE_IDS.includes('area_manager'), false);
assert.equal(Object.hasOwn(v13.ROLE_RANK, 'area_manager'), false);
assert.equal(pr35.ROLE_IDS.includes('area_manager'), false);
assert.equal(Object.hasOwn(pr35.ROLE_TEMPLATES, 'area_manager'), false);
assert.equal(consoleRoles.ROLES.some((role) => role.id === 'area_manager'), false);
assert.equal(Object.hasOwn(consoleRoles.ACCESS, 'area_manager'), false);
assert.deepEqual(consoleRoles.allowedScopes('area_manager'), []);
```

Also assert geographic scope remains:

```js
assert.equal(v13.SCOPE_LEVELS.includes('area'), true);
assert.equal(consoleRoles.SCOPES.includes('area'), true);
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/vvip-retired-role-policy.test.cjs
```

Expected: FAIL because active role catalogs still contain `area_manager`.

- [ ] **Step 3: Commit RED evidence**

```bash
git add tests/vvip-retired-role-policy.test.cjs
git commit -m "test(authz): prohibit retired roles from active assignment"
```

---

### Task 2: GREEN — Retire `area_manager` without destroying history

**Files:**
- Modify: `scripts/authorization/v13-authority-contracts.js`
- Modify: `scripts/pr35/pr35-contracts.js`
- Modify: `scripts/pr35/pr35-policy.js`
- Modify: `operations-console/role-permissions.js`
- Modify: `tests/ux-r01-role-permission-matrix.test.cjs`
- Modify/add focused authorization tests as required by current fixtures.

**Interfaces:**
- Produces active-only `ROLE_IDS` and active rank/templates without `area_manager`.
- Keeps `area` as a location/scope level.
- Adds explicit historical-readable constant where needed instead of letting retired roles grant live authority.

- [ ] **Step 1: Split active and historical role identities**

In V13 and PR35 contracts, active `ROLE_IDS` exclude `area_manager`. Add a frozen historical-readable list such as:

```js
export const RETIRED_ROLE_IDS = frozen(['area_manager']);
export const HISTORICAL_ROLE_IDS = frozen([...ROLE_IDS, ...RETIRED_ROLE_IDS]);
```

Do not use `HISTORICAL_ROLE_IDS` for delegation or authorization decisions.

- [ ] **Step 2: Remove live authority rank/template**

Remove `area_manager` from `ROLE_RANK`, PR35 `rank`, and `ROLE_TEMPLATES`. Unknown/new assignment attempts must fail through existing `UNKNOWN_ROLE` behavior.

- [ ] **Step 3: Remove Operations Console selection/access**

Remove the `area_manager` role row and `ACCESS.area_manager`. Keep `SCOPES` containing `area`. Update role-count expectation from 15 to 14 and replace old `areaScopes` expectation with `allowedScopes('area_manager') === []`.

- [ ] **Step 4: Run focused GREEN**

```bash
node --test tests/vvip-retired-role-policy.test.cjs tests/v13-1-authority-contracts.test.cjs tests/ux-r01-role-permission-matrix.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Run all V13/PR35 compatibility tests**

```bash
node --test tests/*.test.cjs
node --test tests/pr35/*.test.mjs
```

Expected: PASS; historical fixtures may name a retired role only where they are explicitly historical and must not grant current authority.

- [ ] **Step 6: Commit**

```bash
git add scripts/authorization/v13-authority-contracts.js scripts/pr35/pr35-contracts.js scripts/pr35/pr35-policy.js operations-console/role-permissions.js tests/
git commit -m "feat(authz): retire area manager from active authority paths"
```

---

### Task 3: RED→GREEN — Add one exact all-sector commission policy

**Files:**
- Create: `scripts/finance/vvip-commission-policy.js`
- Create: `tests/vvip-commission-policy.test.cjs`
- Read contract: `project-control/commission-policy/v1/owner-decision.json`

**Interfaces:**
- Produces `COMMISSION_POLICY_VERSION`.
- Produces `ACTIVE_COMMISSION_RECIPIENTS`, `RETIRED_COMMISSION_RECIPIENTS`.
- Produces `getCommissionPolicyForSector(sectorId)` that always inherits the same central policy and exposes no sector-local percentage override.
- Produces `allocateRemovedShareMinorUnits({ removedShareMinorUnits, transactionKey })` that allocates every integer minor unit among exactly the three approved destinations.

- [ ] **Step 1: Write RED policy tests**

Assert:

```js
assert.equal(policy.primaryMarketer.basisPointsNumerator, 430);
assert.equal(policy.primaryMarketer.basisPointsDenominator, 1);
assert.deepEqual(policy.retiredRecipients, ['SECONDARY_MARKETER','SUPERVISOR','AREA_MANAGER']);
assert.deepEqual(policy.redistribution.SECTOR_MANAGER, { numerator: 2383, denominator: 3 });
assert.deepEqual(policy.redistribution.COUNTRY_EXECUTIVE_COMMISSIONER, { numerator: 2734, denominator: 3 });
assert.deepEqual(policy.redistribution.MARKETING, { numerator: 3304, denominator: 3 });
```

Assert `getCommissionPolicyForSector('JO:AUTOMOTIVE')` and an otherwise-valid future sector return the same immutable central policy object/version.

- [ ] **Step 2: Write exhaustive minor-unit redistribution assertions**

For representative values and a deterministic sweep, including `0..10000` minor units:

```js
const allocation = allocateRemovedShareMinorUnits({
  removedShareMinorUnits: amount,
  transactionKey: `txn_${amount}`
});
assert.equal(Object.values(allocation.amounts).reduce((a,b) => a + b, 0), amount);
assert.deepEqual(Object.keys(allocation.amounts).sort(), [
  'COUNTRY_EXECUTIVE_COMMISSIONER', 'MARKETING', 'SECTOR_MANAGER'
]);
```

Assert each destination differs from another by at most one minor unit for equal redistribution and that the same transaction key always returns the same result.

- [ ] **Step 3: Run RED**

```bash
node --test tests/vvip-commission-policy.test.cjs
```

Expected: FAIL with module-not-found before implementation.

- [ ] **Step 4: Implement exact rational policy**

Store money/share math as integers/rationals only. Display strings (`7.94`, `9.11`, `11.01`) are metadata and must not feed calculation.

For removed-share minor units, use integer division by three and assign remainder deterministically from a SHA-256 ordering seeded by `policyVersion + transactionKey`; never fix the extra unit permanently to one beneficiary.

- [ ] **Step 5: Run GREEN and repeatability tests**

```bash
node --test tests/vvip-commission-policy.test.cjs
```

Expected: PASS with exact sum for every tested amount and deterministic replay.

- [ ] **Step 6: Commit**

```bash
git add scripts/finance/vvip-commission-policy.js tests/vvip-commission-policy.test.cjs
git commit -m "feat(finance): add exact central commission policy for all sectors"
```

---

### Task 4: Prevent legacy aliases from re-entering active behavior

**Files:**
- Create: `tests/vvip-retired-role-alias-guard.test.cjs`
- Modify only active initialization/runtime files proven to reintroduce `supervisor`, `area_manager`, `SECONDARY_MARKETER`, or Arabic semantic equivalents.
- Do not rewrite historical review reports, old audit evidence, or immutable provenance documents.

**Interfaces:**
- Produces an allowlisted static guard that distinguishes historical evidence from active executable/configuration paths.

- [ ] **Step 1: Add alias guard**

Search active executable/configuration surfaces for exact and semantic aliases:

```text
SECONDARY_MARKETER
secondary_marketer
secondary marketer
المسوق الثاني
SUPERVISOR
supervisor
مشرف
AREA_MANAGER
area_manager
area manager
مدير المنطقة
```

The test fails when these occur in active role catalogs, payout code, assignment UI, runtime DB initialization/policies, or current report filters. Explicit historical documents/tests may be allowlisted by exact path and reason.

- [ ] **Step 2: Remove active legacy supervisor/area initialization**

If root schema/bootstrap artifacts still create `supervisor` access or `مدير منطقة` / `مشرف` active account types, remove those active grants/seeds while preserving historical migration/audit evidence. Do not apply anything to Production.

- [ ] **Step 3: Run guard**

```bash
node --test tests/vvip-retired-role-alias-guard.test.cjs
```

Expected: PASS with zero unapproved active occurrences.

- [ ] **Step 4: Commit**

```bash
git add tests/vvip-retired-role-alias-guard.test.cjs supabase-schema.sql scripts/ operations-console/
git commit -m "chore(authz): block retired role aliases from active paths"
```

---

### Task 5: Full same-head verification and PR readiness

**Files:**
- No implementation expansion unless a failing gate identifies an in-scope regression.

- [ ] **Step 1: Run isolated quality gate**

```bash
bash scripts/quality-gate.sh
```

Expected: `VVIP_QUALITY_GATE=PASS`.

- [ ] **Step 2: Verify protected same-head GitHub checks**

Require on one exact PR head SHA:

```text
VVIP Quality Gate = success
V14 Release Candidate = success
CodeQL = success
Dependency Review = success
Project Control Integrity = success
TIGER CleanGuard = success
```

- [ ] **Step 3: Review diff for scope and history preservation**

Confirm:

```text
no production migration apply
no real-money execution
no direct main write
no Clerk/DNS/secrets change
no historical financial/audit rewrite
no active area_manager assignment path
no active supervisor/secondary marketer commission path
one central inherited commission policy
identityBinding server verification preserved
```

- [ ] **Step 4: Only then convert PR #191 from Draft to Ready for Review**

Human protected review/merge remains the final gate.
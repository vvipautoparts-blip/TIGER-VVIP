"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/finance/tiger-sales-dna.js")
).href;

async function loadModule() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

function buildLineage(api, overrides = {}) {
  const manager = api.createAssignmentEpoch({
    assignmentId: "asg_manager_auto_001",
    subjectId: "acct_manager_001",
    role: "SECTOR_MANAGER",
    countryId: "JO",
    sectorId: "AUTO",
    responsibilityCellId: "cell_auto_amman_001",
    validFrom: "2026-08-01T00:00:00.000Z",
    status: "ACTIVE",
    ...(overrides.manager || {})
  });

  const marketer = api.createAssignmentEpoch({
    assignmentId: "asg_marketer_auto_001",
    subjectId: "acct_marketer_001",
    role: "MARKETER",
    countryId: "JO",
    sectorId: "AUTO",
    responsibilityCellId: "cell_auto_amman_001",
    managerAssignmentId: manager.assignmentId,
    validFrom: "2026-08-05T00:00:00.000Z",
    status: "ACTIVE",
    ...(overrides.marketer || {})
  });

  const claim = api.createSaleOwnershipClaim({
    claimId: "claim_auto_001",
    customerId: "customer_001",
    opportunityId: "opp_auto_001",
    sectorId: "AUTO",
    marketerAssignmentId: marketer.assignmentId,
    source: "REFERRAL_LINK",
    createdAt: "2026-08-10T12:00:00.000Z",
    expiresAt: "2026-09-10T12:00:00.000Z",
    status: "ELIGIBLE",
    ...(overrides.claim || {})
  });

  return { manager, marketer, claim };
}

test("owner-approved allocation is exactly 10000 bps and does not encode population counts", async () => {
  const { FINANCIAL_ALLOCATION_BPS } = await loadModule();

  assert.deepEqual(FINANCIAL_ALLOCATION_BPS, {
    OWNER: 500,
    PARTNER_1: 500,
    PARTNER_2: 500,
    PARTNER_3: 500,
    GENERAL_MANAGER: 500,
    SECTOR_MANAGER: 500,
    MARKETER: 500,
    CUSTOMER_SUPPORT_POOL: 150,
    TECH_CONTENT_OPS_POOL: 150,
    PLATFORM_TREASURY_RESERVE: 6200
  });

  assert.equal(
    Object.values(FINANCIAL_ALLOCATION_BPS).reduce((sum, value) => sum + value, 0),
    10000
  );
});

test("Sales DNA locks one manager and one marketer lineage and survives later object mutation attempts", async () => {
  const api = await loadModule();
  const { manager, marketer, claim } = buildLineage(api);

  const snapshot = api.createSalesDnaSnapshot({
    saleId: "sale_auto_0001",
    countryId: "JO",
    sectorId: "AUTO",
    responsibilityCellId: "cell_auto_amman_001",
    managerAssignment: manager,
    marketerAssignment: marketer,
    ownershipClaim: claim,
    financialPolicyVersion: api.SALES_DNA_POLICY_VERSION,
    lockedAt: "2026-08-19T00:00:00.000Z"
  });

  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(snapshot.manager.subjectId, "acct_manager_001");
  assert.equal(snapshot.marketer.subjectId, "acct_marketer_001");
  assert.equal(snapshot.manager.assignmentId, "asg_manager_auto_001");
  assert.equal(snapshot.marketer.assignmentId, "asg_marketer_auto_001");
  assert.match(snapshot.revenueAddress, /^TRA_[A-F0-9]{24}$/);
  assert.equal(snapshot.revenueAddress.includes("acct_manager_001"), false);
  assert.equal(snapshot.revenueAddress.includes("acct_marketer_001"), false);
  assert.equal(api.verifySalesDnaSnapshot(snapshot), true);

  assert.throws(() => {
    manager.subjectId = "acct_manager_hijack";
  }, TypeError);
  assert.equal(snapshot.manager.subjectId, "acct_manager_001");
});

test("tampering with locked lineage invalidates the cryptographic attribution seal", async () => {
  const api = await loadModule();
  const { manager, marketer, claim } = buildLineage(api);
  const snapshot = api.createSalesDnaSnapshot({
    saleId: "sale_auto_0002",
    countryId: "JO",
    sectorId: "AUTO",
    responsibilityCellId: "cell_auto_amman_001",
    managerAssignment: manager,
    marketerAssignment: marketer,
    ownershipClaim: claim,
    financialPolicyVersion: api.SALES_DNA_POLICY_VERSION,
    lockedAt: "2026-08-19T00:00:00.000Z"
  });

  const tampered = {
    ...snapshot,
    manager: {
      ...snapshot.manager,
      subjectId: "acct_manager_other"
    }
  };

  assert.equal(api.verifySalesDnaSnapshot(tampered), false);
});

test("assignment epochs prevent cross-sector, cross-cell, and retroactive lineage hijacking", async () => {
  const api = await loadModule();
  const { manager, marketer, claim } = buildLineage(api);

  assert.throws(
    () => api.createSalesDnaSnapshot({
      saleId: "sale_wrong_sector_001",
      countryId: "JO",
      sectorId: "REAL_ESTATE",
      responsibilityCellId: "cell_auto_amman_001",
      managerAssignment: manager,
      marketerAssignment: marketer,
      ownershipClaim: claim,
      financialPolicyVersion: api.SALES_DNA_POLICY_VERSION,
      lockedAt: "2026-08-19T00:00:00.000Z"
    }),
    /LINEAGE_SECTOR_MISMATCH/
  );

  const futureManager = api.createAssignmentEpoch({
    assignmentId: "asg_manager_future_001",
    subjectId: "acct_manager_future",
    role: "SECTOR_MANAGER",
    countryId: "JO",
    sectorId: "AUTO",
    responsibilityCellId: "cell_auto_amman_001",
    validFrom: "2026-09-01T00:00:00.000Z",
    status: "ACTIVE"
  });

  assert.throws(
    () => api.createSalesDnaSnapshot({
      saleId: "sale_future_hijack_001",
      countryId: "JO",
      sectorId: "AUTO",
      responsibilityCellId: "cell_auto_amman_001",
      managerAssignment: futureManager,
      marketerAssignment: null,
      ownershipClaim: null,
      financialPolicyVersion: api.SALES_DNA_POLICY_VERSION,
      lockedAt: "2026-08-19T00:00:00.000Z"
    }),
    /ASSIGNMENT_NOT_EFFECTIVE/
  );
});

test("marketer lineage must point to the exact locked manager assignment", async () => {
  const api = await loadModule();
  const { manager, claim } = buildLineage(api);
  const marketer = api.createAssignmentEpoch({
    assignmentId: "asg_marketer_wrong_parent_001",
    subjectId: "acct_marketer_wrong_parent",
    role: "MARKETER",
    countryId: "JO",
    sectorId: "AUTO",
    responsibilityCellId: "cell_auto_amman_001",
    managerAssignmentId: "asg_manager_other_999",
    validFrom: "2026-08-05T00:00:00.000Z",
    status: "ACTIVE"
  });

  assert.throws(
    () => api.createSalesDnaSnapshot({
      saleId: "sale_wrong_parent_001",
      countryId: "JO",
      sectorId: "AUTO",
      responsibilityCellId: "cell_auto_amman_001",
      managerAssignment: manager,
      marketerAssignment: marketer,
      ownershipClaim: { ...claim, marketerAssignmentId: marketer.assignmentId },
      financialPolicyVersion: api.SALES_DNA_POLICY_VERSION,
      lockedAt: "2026-08-19T00:00:00.000Z"
    }),
    /MARKETER_MANAGER_LINEAGE_MISMATCH/
  );
});

test("missing manager and marketer attribution route to separate reserves without increasing treasury bps", async () => {
  const api = await loadModule();
  const snapshot = api.createSalesDnaSnapshot({
    saleId: "sale_direct_0001",
    countryId: "JO",
    sectorId: "AUTO",
    responsibilityCellId: "cell_auto_direct_001",
    managerAssignment: null,
    marketerAssignment: null,
    ownershipClaim: null,
    financialPolicyVersion: api.SALES_DNA_POLICY_VERSION,
    lockedAt: "2026-08-19T00:00:00.000Z"
  });

  const result = api.allocateSalesDnaMinorUnits({
    baseDistributableMinorUnits: 10000,
    financialEventId: "fin_event_direct_0001",
    snapshot
  });

  const byBucket = Object.fromEntries(result.entries.map((entry) => [entry.bucket, entry]));

  assert.equal(byBucket.MANAGEMENT_UNATTRIBUTED_RESERVE.basisPoints, 500);
  assert.equal(byBucket.MARKETING_UNATTRIBUTED_RESERVE.basisPoints, 500);
  assert.equal(byBucket.PLATFORM_TREASURY_RESERVE.basisPoints, 6200);
  assert.equal(result.totalBasisPoints, 10000);
});

test("allocation reconciles every minor unit exactly and deterministically", async () => {
  const api = await loadModule();
  const { manager, marketer, claim } = buildLineage(api);
  const snapshot = api.createSalesDnaSnapshot({
    saleId: "sale_reconcile_0001",
    countryId: "JO",
    sectorId: "AUTO",
    responsibilityCellId: "cell_auto_amman_001",
    managerAssignment: manager,
    marketerAssignment: marketer,
    ownershipClaim: claim,
    financialPolicyVersion: api.SALES_DNA_POLICY_VERSION,
    lockedAt: "2026-08-19T00:00:00.000Z"
  });

  for (const amount of [0, 1, 2, 3, 7, 99, 100, 101, 999, 10001, 999999]) {
    const first = api.allocateSalesDnaMinorUnits({
      baseDistributableMinorUnits: amount,
      financialEventId: `fin_event_reconcile_${amount}`,
      snapshot
    });
    const replay = api.allocateSalesDnaMinorUnits({
      baseDistributableMinorUnits: amount,
      financialEventId: `fin_event_reconcile_${amount}`,
      snapshot
    });

    assert.deepEqual(first, replay);
    assert.equal(first.entries.reduce((sum, entry) => sum + entry.amountMinorUnits, 0), amount);
    assert.ok(first.entries.every((entry) => Number.isSafeInteger(entry.amountMinorUnits)));
    assert.ok(first.entries.every((entry) => entry.amountMinorUnits >= 0));
    assert.equal(first.totalBasisPoints, 10000);
  }
});

test("invalid money and ambiguous lineage fail closed", async () => {
  const api = await loadModule();
  const { manager, marketer, claim } = buildLineage(api);
  const snapshot = api.createSalesDnaSnapshot({
    saleId: "sale_invalid_inputs_001",
    countryId: "JO",
    sectorId: "AUTO",
    responsibilityCellId: "cell_auto_amman_001",
    managerAssignment: manager,
    marketerAssignment: marketer,
    ownershipClaim: claim,
    financialPolicyVersion: api.SALES_DNA_POLICY_VERSION,
    lockedAt: "2026-08-19T00:00:00.000Z"
  });

  for (const invalid of [-1, 1.5, NaN, Infinity, "100"] ) {
    assert.throws(
      () => api.allocateSalesDnaMinorUnits({
        baseDistributableMinorUnits: invalid,
        financialEventId: "fin_event_invalid_001",
        snapshot
      }),
      /INVALID_MINOR_UNITS/
    );
  }

  assert.throws(
    () => api.createAssignmentEpoch({
      assignmentId: "x",
      subjectId: "acct_bad",
      role: "SECTOR_MANAGER",
      countryId: "JO",
      sectorId: "AUTO",
      responsibilityCellId: "cell_auto_amman_001",
      validFrom: "not-a-date",
      status: "ACTIVE"
    }),
    /INVALID_ASSIGNMENT_ID|INVALID_TIMESTAMP/
  );
});

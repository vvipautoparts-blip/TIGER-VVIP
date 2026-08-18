"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/finance/vvip-commission-policy.js")
).href;

async function loadPolicy() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

const REFERRED_SHARES = {
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
};

const DIRECT_SHARES = {
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
};

function sumAllocation(result) {
  return Object.values(result.allocations)
    .reduce((sum, allocation) => sum + allocation.amountMinor, 0);
}

test("V2 exposes the exact owner-approved referred and direct policies", async () => {
  const {
    COMMISSION_POLICY_VERSION,
    SALE_CHANNELS,
    CENTRAL_COMMISSION_POLICIES,
    RETIRED_COMMISSION_RECIPIENTS
  } = await loadPolicy();

  assert.equal(COMMISSION_POLICY_VERSION, "VVIP_DYNAMIC_YIELD_2026_08_19_V2");
  assert.deepEqual([...SALE_CHANNELS], ["REFERRED_SALE", "DIRECT_PLATFORM"]);
  assert.deepEqual(CENTRAL_COMMISSION_POLICIES.REFERRED_SALE.shares, REFERRED_SHARES);
  assert.deepEqual(CENTRAL_COMMISSION_POLICIES.DIRECT_PLATFORM.shares, DIRECT_SHARES);
  assert.equal(CENTRAL_COMMISSION_POLICIES.REFERRED_SALE.totalBasisPoints, 10000);
  assert.equal(CENTRAL_COMMISSION_POLICIES.DIRECT_PLATFORM.totalBasisPoints, 10000);
  assert.equal(CENTRAL_COMMISSION_POLICIES.REFERRED_SALE.calculationBase, "NET_RECOGNIZED_REVENUE");
  assert.equal(CENTRAL_COMMISSION_POLICIES.DIRECT_PLATFORM.calculationBase, "NET_RECOGNIZED_REVENUE");
  assert.equal(CENTRAL_COMMISSION_POLICIES.REFERRED_SALE.sectorOverridesAllowed, false);
  assert.equal(CENTRAL_COMMISSION_POLICIES.DIRECT_PLATFORM.sectorOverridesAllowed, false);
  assert.equal(Object.isFrozen(CENTRAL_COMMISSION_POLICIES), true);
  assert.equal(Object.isFrozen(CENTRAL_COMMISSION_POLICIES.REFERRED_SALE), true);
  assert.equal(Object.isFrozen(CENTRAL_COMMISSION_POLICIES.REFERRED_SALE.shares), true);
  assert.deepEqual([...RETIRED_COMMISSION_RECIPIENTS], [
    "SECONDARY_MARKETER",
    "SUPERVISOR",
    "AREA_MANAGER"
  ]);

  for (const recipient of RETIRED_COMMISSION_RECIPIENTS) {
    assert.equal(Object.hasOwn(REFERRED_SHARES, recipient), false);
    assert.equal(Object.hasOwn(DIRECT_SHARES, recipient), false);
  }
});

test("channel lookup returns one immutable central policy and rejects unknown channels", async () => {
  const { CENTRAL_COMMISSION_POLICIES, getCommissionPolicyForSaleChannel } = await loadPolicy();

  assert.equal(
    getCommissionPolicyForSaleChannel("REFERRED_SALE"),
    CENTRAL_COMMISSION_POLICIES.REFERRED_SALE
  );
  assert.equal(
    getCommissionPolicyForSaleChannel("DIRECT_PLATFORM"),
    CENTRAL_COMMISSION_POLICIES.DIRECT_PLATFORM
  );
  assert.throws(
    () => getCommissionPolicyForSaleChannel("UNKNOWN"),
    /VVIP_INVALID_SALE_CHANNEL/
  );
  assert.throws(
    () => getCommissionPolicyForSaleChannel(null),
    /VVIP_INVALID_SALE_CHANNEL/
  );
});

test("100 JOD-equivalent inputs produce the literal approved allocation amounts", async () => {
  const { allocateNetRecognizedRevenueMinorUnits } = await loadPolicy();

  const referred = allocateNetRecognizedRevenueMinorUnits({
    amountMinor: 100000,
    saleChannel: "REFERRED_SALE",
    transactionKey: "txn_referred_100_jod_001"
  });
  assert.equal(referred.allocations.OWNER_MANAGEMENT.amountMinor, 5000);
  assert.equal(referred.allocations.PRIMARY_MARKETER.amountMinor, 5000);
  assert.equal(referred.allocations.TECH_CONTENT.amountMinor, 1500);
  assert.equal(referred.allocations.PLATFORM_RETAINED.amountMinor, 62000);
  assert.equal(sumAllocation(referred), 100000);
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
  assert.equal(sumAllocation(direct), 100000);
  assert.equal(direct.residualMinor, 0);
});

test("every tested minor-unit amount reconciles exactly and replays deterministically", async () => {
  const { allocateNetRecognizedRevenueMinorUnits } = await loadPolicy();
  const amounts = [
    0,
    1,
    2,
    3,
    7,
    11,
    999,
    10000,
    10001,
    100000,
    Number.MAX_SAFE_INTEGER
  ];

  for (const saleChannel of ["REFERRED_SALE", "DIRECT_PLATFORM"]) {
    for (const amountMinor of amounts) {
      const input = {
        amountMinor,
        saleChannel,
        transactionKey: `txn_${saleChannel.toLowerCase()}_${amountMinor}`
      };
      const first = allocateNetRecognizedRevenueMinorUnits(input);
      const replay = allocateNetRecognizedRevenueMinorUnits(input);

      assert.deepEqual(first, replay);
      assert.equal(first.amountMinor, amountMinor);
      assert.equal(sumAllocation(first), amountMinor);
      assert.equal(first.residualMinor, 0);
      assert.equal(Object.isFrozen(first), true);
      assert.equal(Object.isFrozen(first.allocations), true);

      for (const allocation of Object.values(first.allocations)) {
        assert.equal(Number.isSafeInteger(allocation.amountMinor), true);
        assert.ok(allocation.amountMinor >= 0);
        assert.ok(allocation.roundingAdjustmentMinor === 0
          || allocation.roundingAdjustmentMinor === 1);
        assert.equal(Object.isFrozen(allocation), true);
      }
    }
  }
});

test("transaction-bound tie rotation does not permanently favor one equal-share recipient", async () => {
  const { allocateNetRecognizedRevenueMinorUnits } = await loadPolicy();
  const winners = new Set();

  for (let index = 0; index < 1024; index += 1) {
    const result = allocateNetRecognizedRevenueMinorUnits({
      amountMinor: 3,
      saleChannel: "REFERRED_SALE",
      transactionKey: `txn_v2_tie_rotation_${index}`
    });
    for (const [recipient, allocation] of Object.entries(result.allocations)) {
      if (recipient !== "PLATFORM_RETAINED"
        && allocation.roundingAdjustmentMinor === 1) {
        winners.add(recipient);
      }
    }
  }

  assert.deepEqual([...winners].sort(), [
    "GENERAL_MANAGER",
    "OPERATING_PARTNER_1",
    "OPERATING_PARTNER_2",
    "OPERATING_PARTNER_3",
    "OWNER_MANAGEMENT",
    "PRIMARY_MARKETER",
    "SECTOR_MANAGER"
  ]);
});

test("allocator rejects unsafe money, ambiguous keys, and unsupported channels", async () => {
  const {
    allocateNetRecognizedRevenueMinorUnits,
    getCommissionPolicyForSaleChannel
  } = await loadPolicy();

  for (const amountMinor of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "1"]) {
    assert.throws(
      () => allocateNetRecognizedRevenueMinorUnits({
        amountMinor,
        saleChannel: "REFERRED_SALE",
        transactionKey: "txn_invalid_money_001"
      }),
      /VVIP_INVALID_MONEY/
    );
  }

  for (const transactionKey of ["", "short", null, undefined]) {
    assert.throws(
      () => allocateNetRecognizedRevenueMinorUnits({
        amountMinor: 100,
        saleChannel: "REFERRED_SALE",
        transactionKey
      }),
      /VVIP_INVALID_TRANSACTION_KEY/
    );
  }

  assert.throws(
    () => getCommissionPolicyForSaleChannel("REFERRED"),
    /VVIP_INVALID_SALE_CHANNEL/
  );
});

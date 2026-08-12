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

const RECIPIENTS = [
  "COUNTRY_EXECUTIVE_COMMISSIONER",
  "MARKETING",
  "SECTOR_MANAGER"
].sort();

test("central policy exposes exact owner-approved rational shares and retired recipients", async () => {
  const {
    COMMISSION_POLICY_VERSION,
    CENTRAL_COMMISSION_POLICY,
    ACTIVE_COMMISSION_RECIPIENTS,
    RETIRED_COMMISSION_RECIPIENTS
  } = await loadPolicy();

  assert.match(COMMISSION_POLICY_VERSION, /^VVIP_COMMISSION_[A-Z0-9._-]+$/);
  assert.equal(Object.isFrozen(CENTRAL_COMMISSION_POLICY), true);
  assert.equal(Object.isFrozen(ACTIVE_COMMISSION_RECIPIENTS), true);
  assert.equal(Object.isFrozen(RETIRED_COMMISSION_RECIPIENTS), true);

  assert.deepEqual([...RETIRED_COMMISSION_RECIPIENTS], [
    "SECONDARY_MARKETER",
    "SUPERVISOR",
    "AREA_MANAGER"
  ]);

  assert.deepEqual(CENTRAL_COMMISSION_POLICY.primaryMarketer, {
    basisPointsNumerator: 430,
    basisPointsDenominator: 1
  });

  assert.deepEqual(CENTRAL_COMMISSION_POLICY.redistribution.SECTOR_MANAGER, {
    numerator: 2383,
    denominator: 3
  });
  assert.deepEqual(CENTRAL_COMMISSION_POLICY.redistribution.COUNTRY_EXECUTIVE_COMMISSIONER, {
    numerator: 2734,
    denominator: 3
  });
  assert.deepEqual(CENTRAL_COMMISSION_POLICY.redistribution.MARKETING, {
    numerator: 3304,
    denominator: 3
  });

  assert.equal(ACTIVE_COMMISSION_RECIPIENTS.includes("PRIMARY_MARKETER"), true);
  assert.equal(ACTIVE_COMMISSION_RECIPIENTS.includes("SECONDARY_MARKETER"), false);
  assert.equal(ACTIVE_COMMISSION_RECIPIENTS.includes("SUPERVISOR"), false);
  assert.equal(ACTIVE_COMMISSION_RECIPIENTS.includes("AREA_MANAGER"), false);
});

test("every sector inherits one immutable central policy with no local override", async () => {
  const { CENTRAL_COMMISSION_POLICY, getCommissionPolicyForSector } = await loadPolicy();

  for (const sectorId of [
    "JO:AUTOMOTIVE",
    "JO:REAL",
    "GLOBAL:FUTURE-SECTOR-2040"
  ]) {
    const result = getCommissionPolicyForSector(sectorId);
    assert.equal(result, CENTRAL_COMMISSION_POLICY);
    assert.equal(Object.isFrozen(result), true);
  }

  assert.throws(() => getCommissionPolicyForSector(""), /INVALID_SECTOR_ID/);
  assert.throws(() => getCommissionPolicyForSector(null), /INVALID_SECTOR_ID/);
});

test("removed-share allocation reconciles every minor unit exactly and deterministically", async () => {
  const { allocateRemovedShareMinorUnits } = await loadPolicy();

  for (let amount = 0; amount <= 10000; amount += 1) {
    const transactionKey = `txn_commission_${amount}`;
    const first = allocateRemovedShareMinorUnits({
      removedShareMinorUnits: amount,
      transactionKey
    });
    const replay = allocateRemovedShareMinorUnits({
      removedShareMinorUnits: amount,
      transactionKey
    });

    assert.deepEqual(first, replay);
    assert.equal(first.removedShareMinorUnits, amount);
    assert.deepEqual(Object.keys(first.amounts).sort(), RECIPIENTS);

    const values = Object.values(first.amounts);
    assert.equal(values.reduce((sum, value) => sum + value, 0), amount);
    assert.ok(values.every(Number.isSafeInteger));
    assert.ok(values.every((value) => value >= 0));
    assert.ok(Math.max(...values) - Math.min(...values) <= 1);
  }
});

test("remainder order is transaction-bound instead of permanently favoring one beneficiary", async () => {
  const { allocateRemovedShareMinorUnits } = await loadPolicy();
  const extraRecipients = new Set();

  for (let index = 0; index < 512; index += 1) {
    const result = allocateRemovedShareMinorUnits({
      removedShareMinorUnits: 1,
      transactionKey: `txn_remainder_rotation_${index}`
    });
    const winner = Object.entries(result.amounts).find(([, amount]) => amount === 1)?.[0];
    assert.ok(winner);
    extraRecipients.add(winner);
  }

  assert.deepEqual([...extraRecipients].sort(), RECIPIENTS);
});

test("allocator rejects unsafe or ambiguous money inputs", async () => {
  const { allocateRemovedShareMinorUnits } = await loadPolicy();

  for (const invalidAmount of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "1"] ) {
    assert.throws(
      () => allocateRemovedShareMinorUnits({
        removedShareMinorUnits: invalidAmount,
        transactionKey: "txn_invalid_amount_001"
      }),
      /INVALID_REMOVED_SHARE_MINOR_UNITS/
    );
  }

  for (const invalidKey of ["", "short", null, undefined]) {
    assert.throws(
      () => allocateRemovedShareMinorUnits({
        removedShareMinorUnits: 10,
        transactionKey: invalidKey
      }),
      /INVALID_TRANSACTION_KEY/
    );
  }
});

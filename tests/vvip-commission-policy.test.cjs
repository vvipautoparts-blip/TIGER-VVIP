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

test("historical commission policy is explicitly retired under Issue #312", async () => {
  const {
    COMMISSION_POLICY_VERSION,
    COMMISSION_POLICY_STATUS,
    COMMISSION_POLICY_SUPERSEDED_BY,
    CENTRAL_COMMISSION_POLICY,
    ACTIVE_COMMISSION_RECIPIENTS,
    RETIRED_COMMISSION_RECIPIENTS
  } = await loadPolicy();

  assert.match(COMMISSION_POLICY_VERSION, /^VVIP_COMMISSION_[A-Z0-9._-]+$/);
  assert.equal(COMMISSION_POLICY_STATUS, "RETIRED_BROKERAGE");
  assert.equal(COMMISSION_POLICY_SUPERSEDED_BY, "ISSUE_312_PRIVATE_DISCOVERY_RENDEZVOUS");
  assert.equal(CENTRAL_COMMISSION_POLICY.status, "RETIRED_BROKERAGE");
  assert.equal(CENTRAL_COMMISSION_POLICY.authority, "HISTORICAL_EVIDENCE_ONLY");
  assert.equal(CENTRAL_COMMISSION_POLICY.currentEffect, "NO_TRANSACTION_VALUE_COMMISSION");
  assert.deepEqual([...ACTIVE_COMMISSION_RECIPIENTS], []);
  assert.equal(Object.isFrozen(ACTIVE_COMMISSION_RECIPIENTS), true);
  assert.equal(Object.isFrozen(RETIRED_COMMISSION_RECIPIENTS), true);

  for (const formerRecipient of [
    "PRIMARY_MARKETER",
    "SECONDARY_MARKETER",
    "SUPERVISOR",
    "AREA_MANAGER",
    "SECTOR_MANAGER",
    "COUNTRY_EXECUTIVE_COMMISSIONER",
    "MARKETING"
  ]) {
    assert.ok(RETIRED_COMMISSION_RECIPIENTS.includes(formerRecipient), formerRecipient);
  }
});

test("no sector can obtain an active transaction-value commission policy", async () => {
  const { getCommissionPolicyForSector } = await loadPolicy();

  for (const sectorId of [
    "JO:AUTOMOTIVE",
    "JO:REAL",
    "GLOBAL:FUTURE-SECTOR-2040"
  ]) {
    assert.throws(
      () => getCommissionPolicyForSector(sectorId),
      /BROKERAGE_COMMISSION_RETIRED/
    );
  }

  assert.throws(() => getCommissionPolicyForSector(""), /INVALID_SECTOR_ID/);
  assert.throws(() => getCommissionPolicyForSector(null), /INVALID_SECTOR_ID/);
});

test("transaction-bound commission allocation is unavailable fail-closed", async () => {
  const { allocateRemovedShareMinorUnits } = await loadPolicy();

  for (const input of [
    { removedShareMinorUnits: 0, transactionKey: "txn_commission_000" },
    { removedShareMinorUnits: 1, transactionKey: "txn_commission_001" },
    { removedShareMinorUnits: 10000, transactionKey: "txn_commission_10000" }
  ]) {
    assert.throws(
      () => allocateRemovedShareMinorUnits(input),
      /BROKERAGE_COMMISSION_RETIRED/
    );
  }
});

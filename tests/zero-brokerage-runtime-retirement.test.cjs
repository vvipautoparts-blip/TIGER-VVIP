"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..");
const moduleUrl = pathToFileURL(
  path.join(ROOT, "scripts", "finance", "vvip-commission-policy.js")
).href;

async function loadCommissionPolicy() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

test("transaction-value commission runtime is retired and fails closed", async () => {
  const policy = await loadCommissionPolicy();

  assert.equal(policy.COMMISSION_POLICY_STATUS, "RETIRED_BROKERAGE");
  assert.deepEqual([...policy.ACTIVE_COMMISSION_RECIPIENTS], []);
  assert.equal(Object.isFrozen(policy.ACTIVE_COMMISSION_RECIPIENTS), true);

  assert.throws(
    () => policy.getCommissionPolicyForSector("JO:AUTOMOTIVE"),
    /BROKERAGE_COMMISSION_RETIRED/
  );
  assert.throws(
    () => policy.allocateRemovedShareMinorUnits({
      removedShareMinorUnits: 100,
      transactionKey: "txn_commission_001"
    }),
    /BROKERAGE_COMMISSION_RETIRED/
  );
});

test("machine-readable commission owner decision cannot remain active authority", () => {
  const decision = JSON.parse(fs.readFileSync(
    path.join(ROOT, "project-control", "commission-policy", "v1", "owner-decision.json"),
    "utf8"
  ));

  assert.equal(decision.authority, "HISTORICAL_EVIDENCE_ONLY");
  assert.equal(decision.status, "SUPERSEDED");
  assert.equal(decision.superseded_by, "ISSUE_312_PRIVATE_DISCOVERY_RENDEZVOUS");
  assert.equal(decision.safety.real_money_execution_authorized, false);
});

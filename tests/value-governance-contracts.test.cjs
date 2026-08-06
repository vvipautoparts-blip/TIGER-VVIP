"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const contractsUrl = pathToFileURL(path.resolve(
  __dirname,
  "../project-control/value-governance/contracts.mjs"
)).href;

test("value governance contracts are closed and stable", async () => {
  const {
    ACTION_CLASSES,
    LIFECYCLE_STATES,
    POLICY_VERSION,
    VALUE_REASON_CODES,
    validateAssetId,
    validateSha256
  } = await import(`${contractsUrl}?test=${Date.now()}-${Math.random()}`);

  assert.equal(POLICY_VERSION, "CVGE_REPOSITORY_V1");
  assert.deepEqual(ACTION_CLASSES, ["A", "B", "C"]);
  assert.deepEqual(LIFECYCLE_STATES, [
    "DISCOVERED",
    "ACTIVE",
    "WATCH",
    "DEPRECATION_CANDIDATE",
    "QUARANTINED",
    "REMOVAL_READY",
    "REMOVED",
    "RESTORED",
    "PROTECTED"
  ]);
  assert.ok(VALUE_REASON_CODES.includes("EVIDENCE_INCOMPLETE"));
  assert.ok(VALUE_REASON_CODES.includes("PROTECTED_OBLIGATION"));
  assert.ok(VALUE_REASON_CODES.includes("VALUE_NOT_PROVEN_ZERO"));
  assert.equal(validateAssetId("asset:project-control:quality-gate"), true);
  assert.equal(validateAssetId("../escape"), false);
  assert.equal(validateAssetId("asset:Uppercase"), false);
  assert.equal(validateSha256("a".repeat(64)), true);
  assert.equal(validateSha256("A".repeat(64)), false);
  assert.equal(validateSha256("deadbeef"), false);
});

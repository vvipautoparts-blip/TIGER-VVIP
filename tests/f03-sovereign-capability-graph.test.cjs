"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(path.resolve(__dirname, "../scripts/fusion/f03-capability-graph.js")).href;
const now = Date.parse("2026-08-14T00:00:00.000Z");
const base = {
  schemaVersion: "VVIP_TIGER_SCG_SNAPSHOT_V1",
  serverConfirmed: true,
  actorId: "user_12345678",
  authorityClass: "DELEGATED",
  permissionIds: ["authorization.assignment.read"],
  scope: { level: "platform" },
  policyVersion: "V13.1",
  assignmentRevision: 1,
  issuedAt: "2026-08-13T23:59:00.000Z",
  expiresAt: "2026-08-14T00:04:00.000Z"
};

async function loadModule() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

test("F03 fails closed without remote confirmation", async () => {
  const { buildCapabilityView } = await loadModule();
  assert.equal(buildCapabilityView(null, now).code, "REMOTE_CONFIRMATION_REQUIRED");
  assert.equal(buildCapabilityView({ ...base, serverConfirmed: false }, now).code, "REMOTE_CONFIRMATION_REQUIRED");
});

test("F03 rejects expired and overlong snapshots", async () => {
  const { buildCapabilityView } = await loadModule();
  assert.equal(buildCapabilityView({ ...base, expiresAt: "2026-08-13T23:59:30.000Z" }, now).code, "CAPABILITY_SNAPSHOT_EXPIRED");
  assert.equal(buildCapabilityView({ ...base, issuedAt: "2026-08-13T23:00:00.000Z" }, now).code, "CAPABILITY_SNAPSHOT_TTL_EXCEEDED");
});

test("F03 rejects stale policy versions and malformed scopes", async () => {
  const { buildCapabilityView } = await loadModule();
  assert.equal(buildCapabilityView({ ...base, policyVersion: "V12.0" }, now).code, "STALE_AUTHORIZATION_ENVELOPE");
  assert.equal(buildCapabilityView({ ...base, scope: { level: "platform", countryCode: "JO" } }, now).code, "MALFORMED_CAPABILITY_SNAPSHOT");
  assert.equal(buildCapabilityView({ ...base, scope: { level: "country", countryCode: "Jordan" } }, now).code, "MALFORMED_CAPABILITY_SNAPSHOT");
});

test("F03 rejects unknown and marketplace-intermediary capabilities", async () => {
  const { buildCapabilityView } = await loadModule();
  assert.equal(buildCapabilityView({ ...base, permissionIds: ["unknown.permission"] }, now).code, "UNKNOWN_PERMISSION");
  for (const permission of ["checkout.execute", "escrow.release", "delivery.dispatch", "shipping.book", "transaction.settlement.execute", "transaction.commission.collect", "dispute.resolve"]) {
    assert.equal(buildCapabilityView({ ...base, permissionIds: [permission] }, now).code, "MARKETPLACE_INTERMEDIARY_CAPABILITY_DENIED", permission);
  }
});

test("F03 maps exact confirmed permissions to immutable entries", async () => {
  const { buildCapabilityView } = await loadModule();
  const result = buildCapabilityView({ ...base, permissionIds: ["authorization.assignment.read", "country.governance.read"] }, now);
  assert.equal(result.ok, true);
  assert.deepEqual(result.entries.map((entry) => entry.id), ["my-capabilities", "countries"]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.entries), true);
  assert.equal(Object.isFrozen(result.entries[0]), true);
});

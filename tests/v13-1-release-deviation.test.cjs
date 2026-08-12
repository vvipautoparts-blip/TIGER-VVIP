"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/release/v13-release-deviation.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadModule() {
  return import(`${moduleUrl}?release-deviation=${Date.now()}-${Math.random()}`);
}

const NOW = Date.parse("2026-08-06T13:00:00.000Z");
const HEAD = "a".repeat(40);
const CONTEXT = Object.freeze({
  expectedHeadSha: HEAD,
  nowMs: NOW,
  classifiedDomains: Object.freeze(["PERFORMANCE_NON_SECURITY"])
});

function validDeviation(overrides = {}) {
  return {
    deviationId: "deviation_00000001",
    schemaVersion: 1,
    policyVersion: "V13.1_RELEASE_POLICY_1",
    subjectHeadSha: HEAD,
    scopePaths: ["scripts/example/non-security-performance.js"],
    scopeCapability: "PERFORMANCE_NON_SECURITY",
    reasonCode: "TEMPORARY_PERFORMANCE_BASELINE_GAP",
    riskOwner: "risk_owner_00000001",
    approvedByClass: "RELEASE_MANAGER",
    issuedAt: "2026-08-06T12:55:00.000Z",
    expiresAt: "2026-08-07T12:55:00.000Z",
    compensatingControl: "Existing response budget remains enforced by the full quality gate.",
    remediationTicket: "remediation_00000001",
    rollbackPlan: "Close the delivery pull request or revert the bounded deviation metadata.",
    verificationPlan: "Re-run the focused performance contract and the full same-SHA quality gates.",
    maximumBlastRadius: "One non-production performance assertion in the declared path only.",
    automaticFailClosedAtExpiry: true,
    ...overrides
  };
}

test("a bounded temporary non-security deviation is normalized and deeply frozen without granting eligibility", async () => {
  const module = await loadModule();
  const input = validDeviation();
  const result = module.normalizeTemporaryDeviation(input, CONTEXT);

  assert.equal(result.ok, true);
  assert.deepEqual(result.deviation, input);
  assert.notEqual(result.deviation, input);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.deviation), true);
  assert.equal(Object.isFrozen(result.deviation.scopePaths), true);
  assert.equal("state" in result.deviation, false);
  assert.equal("mergeEligible" in result.deviation, false);
  assert.equal("releaseEligible" in result.deviation, false);

  input.scopePaths.push("another/path.js");
  assert.deepEqual(result.deviation.scopePaths, ["scripts/example/non-security-performance.js"]);
});

test("missing expired future reversed and permanent deviations fail closed", async () => {
  const module = await loadModule();

  for (const overrides of [
    { expiresAt: undefined },
    { expiresAt: null },
    { expiresAt: "" },
    { expiresAt: "9999-12-31T23:59:59.999Z" },
    { issuedAt: "2026-08-06T13:06:00.000Z", expiresAt: "2026-08-07T13:06:00.000Z" },
    { issuedAt: "2026-08-07T12:55:00.000Z", expiresAt: "2026-08-06T12:55:00.000Z" }
  ]) {
    const result = module.normalizeTemporaryDeviation(validDeviation(overrides), CONTEXT);
    assert.deepEqual(result, { ok: false, code: "RELEASE_DEVIATION_INVALID" });
  }

  const expired = module.normalizeTemporaryDeviation(validDeviation({
    expiresAt: "2026-08-06T12:59:59.999Z"
  }), CONTEXT);
  assert.deepEqual(expired, { ok: false, code: "RELEASE_DEVIATION_EXPIRED" });

  const permanentMarker = module.normalizeTemporaryDeviation({
    ...validDeviation(),
    permanent: true
  }, CONTEXT);
  assert.deepEqual(permanentMarker, { ok: false, code: "RELEASE_DEVIATION_INVALID" });
});

test("zero-tolerance domains can never be waived", async () => {
  const module = await loadModule();

  for (const domain of [
    "AUTHENTICATION",
    "AUTHORIZATION",
    "OWNER_PARTNER_AUTHORITY",
    "PRIVACY",
    "MEDIA_INTEGRITY",
    "RLS_TENANT_ISOLATION",
    "STORAGE_ISOLATION",
    "SECRET_MANAGEMENT",
    "DANGEROUS_SQL",
    "FAIL_CLOSED",
    "COUNTRY_BOUNDARIES",
    "LEGAL_ENTITY_BOUNDARIES",
    "DATA_RESIDENCY",
    "AUDIT_APPEND_ONLY",
    "ARTIFACT_PROVENANCE",
    "PRODUCTION_CREDENTIALS",
    "ROLLBACK_STATEFUL"
  ]) {
    const result = module.normalizeTemporaryDeviation(validDeviation({
      scopeCapability: domain
    }), {
      ...CONTEXT,
      classifiedDomains: [domain]
    });
    assert.deepEqual(result, { ok: false, code: "RELEASE_DEVIATION_FORBIDDEN" });
  }
});

test("deviation scope is exact bounded repository-local and cannot use wildcard or traversal", async () => {
  const module = await loadModule();

  for (const scopePaths of [
    [],
    ["*"],
    ["scripts/**"],
    ["../outside.js"],
    ["/absolute/path.js"],
    ["scripts/../outside.js"],
    ["scripts/bad\\path.js"],
    ["scripts/file.js?query=x"],
    Array.from({ length: 33 }, (_, index) => `scripts/path-${index}.js`)
  ]) {
    const result = module.normalizeTemporaryDeviation(validDeviation({ scopePaths }), CONTEXT);
    assert.deepEqual(result, { ok: false, code: "RELEASE_DEVIATION_INVALID" });
  }

  const duplicate = module.normalizeTemporaryDeviation(validDeviation({
    scopePaths: ["scripts/a.js", "scripts/a.js"]
  }), CONTEXT);
  assert.deepEqual(duplicate, { ok: false, code: "RELEASE_DEVIATION_INVALID" });
});

test("deviation requires an authorized human risk decision and complete compensating controls", async () => {
  const module = await loadModule();

  for (const overrides of [
    { approvedByClass: "CI_SYSTEM" },
    { approvedByClass: "UNKNOWN" },
    { riskOwner: "" },
    { compensatingControl: "" },
    { remediationTicket: "" },
    { rollbackPlan: "" },
    { verificationPlan: "" },
    { maximumBlastRadius: "" },
    { reasonCode: "" },
    { automaticFailClosedAtExpiry: false },
    { automaticFailClosedAtExpiry: undefined },
    { subjectHeadSha: "b".repeat(40) },
    { deviationId: "bad deviation" },
    { remediationTicket: "bad ticket" }
  ]) {
    const result = module.normalizeTemporaryDeviation(validDeviation(overrides), CONTEXT);
    const expectedCode = overrides.subjectHeadSha
      ? "RELEASE_HEAD_MISMATCH"
      : "RELEASE_DEVIATION_INVALID";
    assert.deepEqual(result, { ok: false, code: expectedCode });
  }
});

test("unknown secret and authority-shaped fields are denied without echo", async () => {
  const module = await loadModule();

  for (const field of [
    "token",
    "secret",
    "password",
    "environmentValues",
    "connectionString",
    "ownerOverride",
    "mergeEligible",
    "releaseEligible"
  ]) {
    const attackerValue = `do-not-echo-${field}`;
    const result = module.normalizeTemporaryDeviation({
      ...validDeviation(),
      [field]: attackerValue
    }, CONTEXT);
    assert.deepEqual(result, { ok: false, code: "RELEASE_DEVIATION_INVALID" });
    assert.doesNotMatch(JSON.stringify(result), new RegExp(attackerValue));
  }
});

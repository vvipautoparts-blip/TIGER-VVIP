"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/release/v13-release-evidence.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadModule() {
  return import(`${moduleUrl}?release-evidence=${Date.now()}-${Math.random()}`);
}

const NOW = Date.parse("2026-08-06T12:30:00.000Z");
const HEAD = "a".repeat(40);
const CONTEXT = Object.freeze({
  expectedRepository: "vvipautoparts-blip/TIGER-VVIP",
  expectedPullRequest: 131,
  expectedHeadSha: HEAD,
  nowMs: NOW
});

function validEvidence(overrides = {}) {
  return {
    schemaVersion: 1,
    policyVersion: "V13.1_RELEASE_POLICY_1",
    evidenceType: "QUALITY_GATE",
    subjectRepository: "vvipautoparts-blip/TIGER-VVIP",
    subjectPullRequest: 131,
    subjectHeadSha: HEAD,
    issuerClass: "CI_SYSTEM",
    issuerIdHash: "b".repeat(64),
    issuedAt: "2026-08-06T12:00:00.000Z",
    expiresAt: "2026-08-06T13:00:00.000Z",
    status: "PASS",
    summaryCode: "QUALITY_GATE_PASS",
    evidenceDigest: "c".repeat(64),
    correlationId: "release_corr_00000001",
    ...overrides
  };
}

test("valid exact-head evidence is normalized allowlisted and deeply frozen", async () => {
  const module = await loadModule();
  const input = validEvidence();
  const result = module.normalizeReleaseEvidence(input, CONTEXT);

  assert.equal(result.ok, true);
  assert.deepEqual(result.evidence, input);
  assert.notEqual(result.evidence, input);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.evidence), true);

  input.summaryCode = "MUTATED";
  assert.equal(result.evidence.summaryCode, "QUALITY_GATE_PASS");
});

test("evidence is bound to repository pull request and exact head", async () => {
  const module = await loadModule();

  for (const input of [
    validEvidence({ subjectRepository: "other/repository" }),
    validEvidence({ subjectPullRequest: 130 }),
    validEvidence({ subjectHeadSha: "d".repeat(40) })
  ]) {
    const result = module.normalizeReleaseEvidence(input, CONTEXT);
    assert.equal(result.ok, false);
    assert.equal(result.code, "RELEASE_HEAD_MISMATCH");
    assert.deepEqual(Object.keys(result), ["ok", "code"]);
  }
});

test("expired future and internally inconsistent timestamps fail closed", async () => {
  const module = await loadModule();

  const expired = module.normalizeReleaseEvidence(validEvidence({
    expiresAt: "2026-08-06T12:29:59.999Z"
  }), CONTEXT);
  assert.deepEqual(expired, { ok: false, code: "RELEASE_EVIDENCE_STALE" });

  const future = module.normalizeReleaseEvidence(validEvidence({
    issuedAt: "2026-08-06T12:36:00.000Z",
    expiresAt: "2026-08-06T13:36:00.000Z"
  }), CONTEXT);
  assert.deepEqual(future, { ok: false, code: "RELEASE_EVIDENCE_INVALID" });

  const reversed = module.normalizeReleaseEvidence(validEvidence({
    issuedAt: "2026-08-06T13:00:00.000Z",
    expiresAt: "2026-08-06T12:59:59.999Z"
  }), CONTEXT);
  assert.deepEqual(reversed, { ok: false, code: "RELEASE_EVIDENCE_INVALID" });
});

test("unknown forbidden and malformed evidence fields are rejected without echo", async () => {
  const module = await loadModule();

  for (const field of [
    "token",
    "secret",
    "password",
    "rawLog",
    "event_payload",
    "envelope",
    "connectionString",
    "environmentValues"
  ]) {
    const attackerValue = `do-not-echo-${field}`;
    const result = module.normalizeReleaseEvidence(validEvidence({
      [field]: attackerValue
    }), CONTEXT);
    assert.deepEqual(result, { ok: false, code: "RELEASE_CLIENT_FIELDS_DENIED" });
    assert.doesNotMatch(JSON.stringify(result), new RegExp(attackerValue));
  }

  const unknown = module.normalizeReleaseEvidence(validEvidence({
    unexpectedField: "value"
  }), CONTEXT);
  assert.deepEqual(unknown, { ok: false, code: "RELEASE_CONTRACT_INVALID" });

  for (const overrides of [
    { schemaVersion: 2 },
    { policyVersion: "V13.1_RELEASE_POLICY_2" },
    { evidenceType: "UNKNOWN" },
    { issuerClass: "UNKNOWN" },
    { issuerIdHash: "b".repeat(63) },
    { evidenceDigest: "c".repeat(63) },
    { correlationId: "bad correlation" },
    { summaryCode: "x".repeat(257) },
    { subjectPullRequest: 0 }
  ]) {
    const result = module.normalizeReleaseEvidence(validEvidence(overrides), CONTEXT);
    assert.deepEqual(result, { ok: false, code: "RELEASE_EVIDENCE_INVALID" });
  }
});

test("inconclusive statuses and automation impersonation never become accepted evidence", async () => {
  const module = await loadModule();

  for (const status of ["TIMEOUT", "INCONCLUSIVE"]) {
    const result = module.normalizeReleaseEvidence(validEvidence({ status }), CONTEXT);
    assert.deepEqual(result, { ok: false, code: "RELEASE_TIMEOUT_INCONCLUSIVE" });
  }

  for (const status of ["CANCELLED", "SKIPPED", "NEUTRAL", "UNKNOWN"]) {
    const result = module.normalizeReleaseEvidence(validEvidence({ status }), CONTEXT);
    assert.deepEqual(result, { ok: false, code: "RELEASE_EVIDENCE_INVALID" });
  }

  const automationReview = module.normalizeReleaseEvidence(validEvidence({
    evidenceType: "INDEPENDENT_REVIEW",
    issuerClass: "CI_SYSTEM",
    summaryCode: "INDEPENDENT_REVIEW_APPROVED"
  }), CONTEXT);
  assert.deepEqual(automationReview, {
    ok: false,
    code: "RELEASE_EVIDENCE_INVALID"
  });

  const humanReview = module.normalizeReleaseEvidence(validEvidence({
    evidenceType: "INDEPENDENT_REVIEW",
    issuerClass: "INDEPENDENT_REVIEWER",
    issuerIdHash: "d".repeat(64),
    summaryCode: "INDEPENDENT_REVIEW_APPROVED",
    evidenceDigest: "e".repeat(64)
  }), CONTEXT);
  assert.equal(humanReview.ok, true);
});

test("evidence sets are bounded deduplicated and contradictory attestations fail closed", async () => {
  const module = await loadModule();

  const first = validEvidence();
  const exactDuplicate = { ...first };
  const deduplicated = module.validateEvidenceSet([first, exactDuplicate], CONTEXT);
  assert.equal(deduplicated.ok, true);
  assert.equal(deduplicated.evidence.length, 1);
  assert.equal(Object.isFrozen(deduplicated), true);
  assert.equal(Object.isFrozen(deduplicated.evidence), true);
  assert.equal(Object.isFrozen(deduplicated.evidence[0]), true);

  const conflicting = module.validateEvidenceSet([
    first,
    validEvidence({
      status: "FAIL",
      summaryCode: "QUALITY_GATE_FAIL",
      evidenceDigest: "f".repeat(64)
    })
  ], CONTEXT);
  assert.deepEqual(conflicting, {
    ok: false,
    code: "RELEASE_EVIDENCE_CONFLICT"
  });

  const excessive = Array.from({ length: 129 }, (_, index) => validEvidence({
    evidenceType: index % 2 === 0 ? "QUALITY_GATE" : "PROJECT_CONTROL",
    issuerIdHash: index.toString(16).padStart(64, "0"),
    evidenceDigest: (index + 1).toString(16).padStart(64, "0"),
    correlationId: `release_corr_${String(index).padStart(8, "0")}`
  }));
  const bounded = module.validateEvidenceSet(excessive, CONTEXT);
  assert.deepEqual(bounded, {
    ok: false,
    code: "RELEASE_EVIDENCE_INVALID"
  });
});

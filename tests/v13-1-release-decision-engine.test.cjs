"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/release/v13-release-decision-engine.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadModule() {
  return import(`${moduleUrl}?release-decision=${Date.now()}-${Math.random()}`);
}

const HEAD = "a".repeat(40);
const BASE = "b".repeat(40);
const NOW = Date.parse("2026-08-06T14:00:00.000Z");

const subject = Object.freeze({
  repository: "vvipautoparts-blip/TIGER-VVIP",
  pullRequest: 131,
  headSha: HEAD,
  baseSha: BASE
});

function surface(overrides = {}) {
  return {
    code: true,
    authorization: false,
    media: false,
    database: false,
    storage: false,
    production: false,
    privacy: false,
    legal: false,
    country: false,
    payment: false,
    accessibility: false,
    performance: false,
    stateful: false,
    ...overrides
  };
}

function evidence(evidenceType, overrides = {}) {
  return {
    evidenceType,
    subjectHeadSha: HEAD,
    status: "PASS",
    issuerClass: evidenceType === "INDEPENDENT_REVIEW"
      ? "INDEPENDENT_REVIEWER"
      : evidenceType === "PRODUCTION_APPROVAL"
        ? "RELEASE_MANAGER"
        : "CI_SYSTEM",
    summaryCode: `${evidenceType}_PASS`,
    evidenceDigest: evidenceType.toLowerCase().padEnd(64, "a").slice(0, 64),
    ...overrides
  };
}

const BASELINE_TECHNICAL = Object.freeze([
  "QUALITY_GATE",
  "PROJECT_CONTROL",
  "DEPENDENCY_REVIEW",
  "STATIC_ANALYSIS",
  "SECRET_SCAN",
  "DANGEROUS_SQL_SCAN",
  "LISTING_CONTRACT"
]);

function technicalEvidence(extra = []) {
  return [...BASELINE_TECHNICAL, ...extra].map((type) => evidence(type));
}

const dependencyOk = Object.freeze({
  ok: true,
  orderedDependencies: Object.freeze([])
});

function input(overrides = {}) {
  return {
    subject,
    changeSurface: surface(),
    evidence: technicalEvidence(),
    deviations: [],
    dependencyResult: dependencyOk,
    requestedState: "SHA_LOCKED",
    nowMs: NOW,
    ...overrides
  };
}

test("exact-head technical evidence reaches SHA_LOCKED deterministically", async () => {
  const module = await loadModule();
  const first = module.evaluateReleaseDecision(input());
  const second = module.evaluateReleaseDecision(input({
    evidence: [...technicalEvidence()].reverse()
  }));

  assert.deepEqual(first, second);
  assert.equal(first.state, "SHA_LOCKED");
  assert.equal(first.decisionCode, "SHA_LOCKED");
  assert.deepEqual(first.missingEvidence, []);
  assert.deepEqual(first.rejectedEvidence, []);
  assert.deepEqual(first.blockingReasons, []);
  assert.equal(first.nextEligibleState, "REVIEW_ELIGIBLE");
  assert.equal(Object.isFrozen(first), true);
  for (const key of [
    "requiredEvidence",
    "acceptedEvidence",
    "rejectedEvidence",
    "missingEvidence",
    "activeDeviations",
    "blockingReasons"
  ]) {
    assert.equal(Object.isFrozen(first[key]), true);
  }
});

test("media and authorization surfaces derive non-removable integrity evidence", async () => {
  const module = await loadModule();
  const result = module.evaluateReleaseDecision(input({
    changeSurface: surface({ authorization: true, media: true }),
    evidence: technicalEvidence(),
    requestedState: "SHA_LOCKED"
  }));

  assert.equal(result.state, "BLOCKED");
  assert.equal(result.decisionCode, "RELEASE_EVIDENCE_REQUIRED");
  assert.deepEqual(result.missingEvidence, [
    "AUTHORIZATION_INTEGRITY",
    "MEDIA_INTEGRITY"
  ]);
  assert.equal(result.nextEligibleState, "SHA_LOCKED");
});

test("independent exact-head review is mandatory and stale review is classified explicitly", async () => {
  const module = await loadModule();

  const missing = module.evaluateReleaseDecision(input({
    requestedState: "MERGE_ELIGIBLE"
  }));
  assert.equal(missing.state, "SHA_LOCKED");
  assert.equal(missing.decisionCode, "RELEASE_REVIEW_REQUIRED");
  assert.deepEqual(missing.missingEvidence, ["INDEPENDENT_REVIEW"]);
  assert.equal(missing.nextEligibleState, "REVIEW_ELIGIBLE");

  const stale = module.evaluateReleaseDecision(input({
    requestedState: "MERGE_ELIGIBLE",
    evidence: [
      ...technicalEvidence(),
      evidence("INDEPENDENT_REVIEW", { subjectHeadSha: "c".repeat(40) })
    ]
  }));
  assert.equal(stale.state, "SHA_LOCKED");
  assert.equal(stale.decisionCode, "RELEASE_REVIEW_STALE");
  assert.deepEqual(stale.rejectedEvidence, ["INDEPENDENT_REVIEW"]);
});

test("a blocked dependency train caps an approved candidate at review eligibility", async () => {
  const module = await loadModule();
  const result = module.evaluateReleaseDecision(input({
    requestedState: "MERGE_ELIGIBLE",
    evidence: [...technicalEvidence(), evidence("INDEPENDENT_REVIEW")],
    dependencyResult: {
      ok: false,
      code: "RELEASE_DEPENDENCY_BLOCKED",
      blockingNodeIds: ["pr_130"]
    }
  }));

  assert.equal(result.state, "REVIEW_ELIGIBLE");
  assert.equal(result.decisionCode, "RELEASE_DEPENDENCY_BLOCKED");
  assert.deepEqual(result.blockingReasons, [
    "RELEASE_DEPENDENCY_BLOCKED:pr_130"
  ]);
  assert.equal(result.nextEligibleState, "MERGE_ELIGIBLE");
});

test("zero-tolerance failures block regardless of deviations", async () => {
  const module = await loadModule();
  const result = module.evaluateReleaseDecision(input({
    requestedState: "MERGE_ELIGIBLE",
    changeSurface: surface({ authorization: true }),
    evidence: [
      ...technicalEvidence(),
      evidence("AUTHORIZATION_INTEGRITY", {
        status: "FAIL",
        summaryCode: "AUTHORIZATION_INTEGRITY_FAIL"
      }),
      evidence("INDEPENDENT_REVIEW")
    ],
    deviations: [{
      deviationId: "deviation_00000001",
      subjectHeadSha: HEAD,
      scopeCapability: "AUTHORIZATION",
      expiresAt: "2026-08-07T14:00:00.000Z"
    }]
  }));

  assert.equal(result.state, "BLOCKED");
  assert.equal(result.decisionCode, "RELEASE_ZERO_TOLERANCE_FAILURE");
  assert.deepEqual(result.rejectedEvidence, ["AUTHORIZATION_INTEGRITY"]);
  assert.deepEqual(result.activeDeviations, []);
  assert.equal(result.nextEligibleState, "SHA_LOCKED");
});

test("an active non-security deviation may preserve review but never grants merge or release", async () => {
  const module = await loadModule();
  const result = module.evaluateReleaseDecision(input({
    requestedState: "MERGE_ELIGIBLE",
    changeSurface: surface({ performance: true }),
    evidence: [...technicalEvidence(), evidence("INDEPENDENT_REVIEW")],
    deviations: [{
      deviationId: "deviation_00000001",
      subjectHeadSha: HEAD,
      scopeCapability: "PERFORMANCE_NON_SECURITY",
      expiresAt: "2026-08-07T14:00:00.000Z"
    }]
  }));

  assert.equal(result.state, "REVIEW_ELIGIBLE");
  assert.equal(result.decisionCode, "RELEASE_EVIDENCE_REQUIRED");
  assert.deepEqual(result.missingEvidence, ["PERFORMANCE_BUDGET"]);
  assert.deepEqual(result.activeDeviations, ["deviation_00000001"]);
  assert.equal(result.nextEligibleState, "MERGE_ELIGIBLE");
});

test("stateful changes require rollback proof before merge eligibility", async () => {
  const module = await loadModule();
  const result = module.evaluateReleaseDecision(input({
    requestedState: "MERGE_ELIGIBLE",
    changeSurface: surface({ database: true, stateful: true }),
    evidence: [
      ...technicalEvidence([
        "MIGRATION_LOCAL_REPEATABILITY",
        "RLS_CONTRACT",
        "BACKUP_RECOVERY"
      ]),
      evidence("INDEPENDENT_REVIEW")
    ]
  }));

  assert.equal(result.state, "REVIEW_ELIGIBLE");
  assert.equal(result.decisionCode, "RELEASE_ROLLBACK_REQUIRED");
  assert.deepEqual(result.missingEvidence, ["ROLLBACK_DRY_RUN"]);
});

test("production release requirements fail in deterministic precedence", async () => {
  const module = await loadModule();
  const baseEvidence = [
    ...technicalEvidence(),
    evidence("INDEPENDENT_REVIEW")
  ];
  const baseInput = {
    requestedState: "RELEASE_ELIGIBLE",
    changeSurface: surface({ production: true, stateful: true }),
    dependencyResult: dependencyOk
  };

  const provenance = module.evaluateReleaseDecision(input({
    ...baseInput,
    evidence: baseEvidence
  }));
  assert.equal(provenance.state, "MERGE_ELIGIBLE");
  assert.equal(provenance.decisionCode, "RELEASE_PROVENANCE_REQUIRED");
  assert.deepEqual(provenance.missingEvidence, ["ARTIFACT_DIGEST", "PROVENANCE"]);

  const rollback = module.evaluateReleaseDecision(input({
    ...baseInput,
    evidence: [
      ...baseEvidence,
      evidence("PROVENANCE"),
      evidence("ARTIFACT_DIGEST")
    ]
  }));
  assert.equal(rollback.state, "MERGE_ELIGIBLE");
  assert.equal(rollback.decisionCode, "RELEASE_ROLLBACK_REQUIRED");

  const canary = module.evaluateReleaseDecision(input({
    ...baseInput,
    evidence: [
      ...baseEvidence,
      evidence("PROVENANCE"),
      evidence("ARTIFACT_DIGEST"),
      evidence("ROLLBACK_DRY_RUN")
    ]
  }));
  assert.equal(canary.decisionCode, "RELEASE_CANARY_REQUIRED");

  const killSwitch = module.evaluateReleaseDecision(input({
    ...baseInput,
    evidence: [
      ...baseEvidence,
      evidence("PROVENANCE"),
      evidence("ARTIFACT_DIGEST"),
      evidence("ROLLBACK_DRY_RUN"),
      evidence("CANARY_PLAN")
    ]
  }));
  assert.equal(killSwitch.decisionCode, "RELEASE_KILL_SWITCH_REQUIRED");

  const observability = module.evaluateReleaseDecision(input({
    ...baseInput,
    evidence: [
      ...baseEvidence,
      evidence("PROVENANCE"),
      evidence("ARTIFACT_DIGEST"),
      evidence("ROLLBACK_DRY_RUN"),
      evidence("CANARY_PLAN"),
      evidence("KILL_SWITCH")
    ]
  }));
  assert.equal(observability.decisionCode, "RELEASE_OBSERVABILITY_REQUIRED");

  const incident = module.evaluateReleaseDecision(input({
    ...baseInput,
    evidence: [
      ...baseEvidence,
      evidence("PROVENANCE"),
      evidence("ARTIFACT_DIGEST"),
      evidence("ROLLBACK_DRY_RUN"),
      evidence("CANARY_PLAN"),
      evidence("KILL_SWITCH"),
      evidence("OBSERVABILITY")
    ]
  }));
  assert.equal(incident.decisionCode, "RELEASE_INCIDENT_READINESS_REQUIRED");

  const approval = module.evaluateReleaseDecision(input({
    ...baseInput,
    evidence: [
      ...baseEvidence,
      evidence("PROVENANCE"),
      evidence("ARTIFACT_DIGEST"),
      evidence("ROLLBACK_DRY_RUN"),
      evidence("CANARY_PLAN"),
      evidence("KILL_SWITCH"),
      evidence("OBSERVABILITY"),
      evidence("INCIDENT_READINESS")
    ]
  }));
  assert.equal(approval.decisionCode, "RELEASE_PRODUCTION_APPROVAL_REQUIRED");
});

test("complete exact-head production evidence reaches release eligibility", async () => {
  const module = await loadModule();
  const result = module.evaluateReleaseDecision(input({
    requestedState: "RELEASE_ELIGIBLE",
    changeSurface: surface({ production: true, stateful: true }),
    evidence: [
      ...technicalEvidence(),
      evidence("INDEPENDENT_REVIEW"),
      evidence("PROVENANCE"),
      evidence("ARTIFACT_DIGEST"),
      evidence("ROLLBACK_DRY_RUN"),
      evidence("CANARY_PLAN"),
      evidence("KILL_SWITCH"),
      evidence("OBSERVABILITY"),
      evidence("INCIDENT_READINESS"),
      evidence("PRODUCTION_APPROVAL")
    ]
  }));

  assert.equal(result.state, "RELEASE_ELIGIBLE");
  assert.equal(result.decisionCode, "RELEASE_ELIGIBLE");
  assert.deepEqual(result.missingEvidence, []);
  assert.deepEqual(result.blockingReasons, []);
  assert.equal(result.nextEligibleState, "CANARY_ACTIVE");
});

test("timeouts inconclusive evidence malformed inputs and foreign heads fail closed", async () => {
  const module = await loadModule();

  for (const status of ["TIMEOUT", "INCONCLUSIVE"] ) {
    const result = module.evaluateReleaseDecision(input({
      evidence: [
        ...technicalEvidence().filter((item) => item.evidenceType !== "QUALITY_GATE"),
        evidence("QUALITY_GATE", { status })
      ]
    }));
    assert.equal(result.state, "BLOCKED");
    assert.equal(result.decisionCode, "RELEASE_TIMEOUT_INCONCLUSIVE");
  }

  const foreign = module.evaluateReleaseDecision(input({
    evidence: [
      ...technicalEvidence().filter((item) => item.evidenceType !== "QUALITY_GATE"),
      evidence("QUALITY_GATE", { subjectHeadSha: "c".repeat(40) })
    ]
  }));
  assert.equal(foreign.state, "BLOCKED");
  assert.equal(foreign.decisionCode, "RELEASE_HEAD_MISMATCH");

  for (const malformed of [
    null,
    {},
    input({ subject: { ...subject, unexpected: true } }),
    input({ changeSurface: { ...surface(), unknown: true } }),
    input({ requestedState: "RELEASED" }),
    input({ nowMs: Number.NaN }),
    input({ evidence: "not-an-array" }),
    input({ deviations: "not-an-array" })
  ]) {
    const result = module.evaluateReleaseDecision(malformed);
    assert.equal(result.state, "BLOCKED");
    assert.equal(result.decisionCode, "RELEASE_CONTRACT_INVALID");
  }
});

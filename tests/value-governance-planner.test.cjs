"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const plannerUrl = pathToFileURL(path.resolve(
  __dirname,
  "../project-control/value-governance/planner.mjs"
)).href;

async function loadPlannerModule() {
  return import(`${plannerUrl}?test=${Date.now()}-${Math.random()}`);
}

function policy() {
  return {
    policyVersion: "CVGE_REPOSITORY_V1",
    mode: "ANALYSIS_ONLY",
    automaticRemovalClasses: ["A"],
    automaticQuarantineClasses: ["B"],
    protectedClass: "C",
    minimumEvidenceConfidence: 1,
    staleEvidenceHours: 24,
    allowWorktreeMutation: false,
    allowNetwork: false,
    allowProduction: false
  };
}

function removalDecision(overrides = {}) {
  return {
    assetId: "asset:test:dead-artifact",
    path: "generated/dead.tmp",
    currentState: "DEPRECATION_CANDIDATE",
    proposedState: "REMOVAL_READY",
    actionClass: "A",
    decision: "PREPARE_REMOVAL",
    reasonCodes: [
      "DEPENDENCY_FREE",
      "ROLLBACK_REPRODUCIBLE",
      "VALUE_NOT_PRESENT"
    ],
    confidence: 1,
    evidenceHashes: ["a".repeat(64)],
    ...overrides
  };
}

function quarantineDecision(overrides = {}) {
  return {
    assetId: "asset:test:old-job",
    path: "jobs/old.mjs",
    currentState: "DEPRECATION_CANDIDATE",
    proposedState: "QUARANTINED",
    actionClass: "B",
    decision: "QUARANTINE",
    reasonCodes: ["QUARANTINE_REQUIRED"],
    confidence: 1,
    evidenceHashes: ["b".repeat(64)],
    ...overrides
  };
}

function protectedDecision(overrides = {}) {
  return {
    assetId: "asset:test:audit",
    path: "audit/ledger.log",
    currentState: "PROTECTED",
    proposedState: "PROTECTED",
    actionClass: "C",
    decision: "NO_ACTION",
    reasonCodes: ["PROTECTED_OBLIGATION"],
    confidence: 1,
    evidenceHashes: ["c".repeat(64)],
    ...overrides
  };
}

test("analysis report hash is semantic deterministic and timestamp independent", async () => {
  const { buildAnalysisReport } = await loadPlannerModule();
  const forward = buildAnalysisReport({
    policy: policy(),
    decisions: [removalDecision(), quarantineDecision(), protectedDecision()],
    generatedAt: "2026-08-06T06:00:00.000Z"
  });
  const reverse = buildAnalysisReport({
    policy: policy(),
    decisions: [protectedDecision(), quarantineDecision(), removalDecision()],
    generatedAt: "2026-08-06T07:00:00.000Z"
  });

  assert.equal(forward.planHash, reverse.planHash);
  assert.match(forward.planHash, /^[a-f0-9]{64}$/);
  assert.notEqual(forward.generatedAt, reverse.generatedAt);
  assert.deepEqual(forward.contract, {
    name: "CVGE_ANALYSIS_REPORT",
    version: 1
  });
  assert.deepEqual(forward.summary, {
    total: 3,
    noAction: 1,
    quarantine: 1,
    prepareRemoval: 1
  });
  assert.deepEqual(forward.decisions.map((entry) => entry.assetId), [
    "asset:test:audit",
    "asset:test:dead-artifact",
    "asset:test:old-job"
  ]);
  assert.equal(Object.isFrozen(forward), true);
  assert.equal(Object.isFrozen(forward.decisions), true);
  assert.equal(Object.isFrozen(forward.decisions[0]), true);
});

test("Class A removal candidates produce non-executable content-addressed plans", async () => {
  const { buildNonExecutableCleanupPlan } = await loadPlannerModule();
  const plan = buildNonExecutableCleanupPlan(removalDecision());

  assert.equal(plan.executable, false);
  assert.equal(plan.assetId, "asset:test:dead-artifact");
  assert.equal(plan.targetPath, "generated/dead.tmp");
  assert.equal(plan.expectedContentHash, "a".repeat(64));
  assert.deepEqual(plan.rollback, {
    required: true,
    method: "CONTENT_ADDRESSED_RESTORE"
  });
  assert.deepEqual(plan.preconditions, [
    "ACTION_CLASS_A",
    "DEPENDENCY_FREE",
    "EXPECTED_CONTENT_HASH_MATCH",
    "POLICY_ANALYSIS_ONLY",
    "ROLLBACK_REPRODUCIBLE"
  ]);
  assert.deepEqual(plan.postconditions, [
    "AUDIT_APPEND_REQUIRED",
    "QUALITY_GATES_REQUIRED",
    "WORKTREE_CHANGE_REVIEW_REQUIRED"
  ]);
  assert.match(plan.planHash, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.rollback), true);
});

test("Class B and Class C decisions never receive removal plans", async () => {
  const { buildNonExecutableCleanupPlan } = await loadPlannerModule();
  assert.equal(buildNonExecutableCleanupPlan(quarantineDecision()), null);
  assert.equal(buildNonExecutableCleanupPlan(protectedDecision()), null);
});

test("planner ignores unapproved diagnostic content and rejects unsafe paths", async () => {
  const { buildAnalysisReport, buildNonExecutableCleanupPlan } = await loadPlannerModule();
  const secretMarker = "SECRET_SHOULD_NEVER_APPEAR";
  const report = buildAnalysisReport({
    policy: policy(),
    decisions: [removalDecision({
      debug: { environment: secretMarker },
      rawFileContent: secretMarker,
      absolutePath: `/tmp/${secretMarker}`
    })],
    generatedAt: "2026-08-06T06:00:00.000Z"
  });

  assert.doesNotMatch(JSON.stringify(report), new RegExp(secretMarker));
  assert.throws(() => buildNonExecutableCleanupPlan(removalDecision({
    path: "/tmp/unsafe"
  })), /PATH_ESCAPE_DENIED/);
  assert.throws(() => buildNonExecutableCleanupPlan(removalDecision({
    evidenceHashes: ["not-a-sha"]
  })), /ANALYSIS_DECISION_INVALID/);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..");
const POLICY = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "project-control/value-governance/policy.v1.json"),
    "utf8"
  )
);

async function loadPlanner() {
  return import(
    pathToFileURL(
      path.join(ROOT, "project-control/value-governance/planner.mjs")
    ).href
  );
}

function removalDecision({
  assetId = "asset:legacy:dead_module",
  targetPath = "legacy/dead-module.js",
  contentHash = "a".repeat(64)
} = {}) {
  return {
    assetId,
    path: targetPath,
    currentState: "DEPRECATION_CANDIDATE",
    proposedState: "REMOVAL_READY",
    actionClass: "A",
    decision: "PREPARE_REMOVAL",
    reasonCodes: [
      "VALUE_NOT_PRESENT",
      "DEPENDENCY_FREE",
      "ROLLBACK_REPRODUCIBLE"
    ],
    confidence: 1,
    evidenceHashes: [contentHash]
  };
}

test("cleanup transaction manifest binds exact source, analysis plan and target hashes without becoming executable", async () => {
  const planner = await loadPlanner();
  assert.equal(typeof planner.buildCleanupTransactionManifest, "function");

  const analysisReport = planner.buildAnalysisReport({
    policy: POLICY,
    decisions: [removalDecision()],
    generatedAt: "2026-08-25T00:00:00.000Z"
  });

  const manifest = planner.buildCleanupTransactionManifest({
    analysisReport,
    sourceCommitSha: "1".repeat(40),
    sourceTreeSha: "2".repeat(40)
  });

  assert.deepEqual(manifest.contract, {
    name: "CVGE_CLEANUP_TRANSACTION_MANIFEST",
    version: 1
  });
  assert.deepEqual(manifest.source, {
    commitSha: "1".repeat(40),
    treeSha: "2".repeat(40)
  });
  assert.equal(manifest.policyVersion, "CVGE_REPOSITORY_V1");
  assert.equal(manifest.analysisPlanHash, analysisReport.planHash);
  assert.equal(manifest.executable, false);
  assert.match(manifest.manifestHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(manifest.preconditions, [
    "EXACT_SOURCE_COMMIT_MATCH",
    "EXACT_SOURCE_TREE_MATCH",
    "ANALYSIS_PLAN_HASH_MATCH",
    "TARGET_CONTENT_HASH_MATCH",
    "CLEAN_WORKTREE_REQUIRED"
  ]);
  assert.deepEqual(manifest.operations, [
    {
      assetId: "asset:legacy:dead_module",
      targetPath: "legacy/dead-module.js",
      intent: "PREPARE_REMOVAL",
      expectedContentHash: "a".repeat(64),
      cleanupPlanHash: analysisReport.cleanupPlans[0].planHash,
      rollback: {
        required: true,
        method: "CONTENT_ADDRESSED_RESTORE"
      }
    }
  ]);
});

test("cleanup transaction manifest is deterministic and fails closed on invalid source identity or duplicate targets", async () => {
  const planner = await loadPlanner();
  assert.equal(typeof planner.buildCleanupTransactionManifest, "function");

  const firstReport = planner.buildAnalysisReport({
    policy: POLICY,
    decisions: [removalDecision()],
    generatedAt: "2026-08-25T00:00:00.000Z"
  });
  const secondReport = planner.buildAnalysisReport({
    policy: POLICY,
    decisions: [removalDecision()],
    generatedAt: "2026-08-25T01:00:00.000Z"
  });

  const first = planner.buildCleanupTransactionManifest({
    analysisReport: firstReport,
    sourceCommitSha: "1".repeat(40),
    sourceTreeSha: "2".repeat(40)
  });
  const second = planner.buildCleanupTransactionManifest({
    analysisReport: secondReport,
    sourceCommitSha: "1".repeat(40),
    sourceTreeSha: "2".repeat(40)
  });

  assert.deepEqual(first, second);

  assert.throws(
    () => planner.buildCleanupTransactionManifest({
      analysisReport: firstReport,
      sourceCommitSha: "not-a-git-object-id",
      sourceTreeSha: "2".repeat(40)
    }),
    /TRANSACTION_MANIFEST_INVALID/
  );

  const duplicateReport = {
    ...firstReport,
    cleanupPlans: [
      firstReport.cleanupPlans[0],
      {
        ...firstReport.cleanupPlans[0],
        assetId: "asset:legacy:second"
      }
    ]
  };
  assert.throws(
    () => planner.buildCleanupTransactionManifest({
      analysisReport: duplicateReport,
      sourceCommitSha: "1".repeat(40),
      sourceTreeSha: "2".repeat(40)
    }),
    /TRANSACTION_MANIFEST_INVALID/
  );
});

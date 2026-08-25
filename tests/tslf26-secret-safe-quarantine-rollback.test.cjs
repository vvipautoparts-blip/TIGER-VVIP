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
  assetId = "asset:legacy:secret_bearing_fixture",
  targetPath = "legacy/secret-bearing-fixture.txt",
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

function buildTransaction(planner) {
  const analysisReport = planner.buildAnalysisReport({
    policy: POLICY,
    decisions: [removalDecision()],
    generatedAt: "2026-08-25T00:00:00.000Z"
  });

  return planner.buildCleanupTransactionManifest({
    analysisReport,
    sourceCommitSha: "1".repeat(40),
    sourceTreeSha: "2".repeat(40)
  });
}

function assertNoSensitivePayloadKeys(value) {
  const blocked = /^(?:content|rawcontent|secret|token|password|credential|privatekey|authorization)$/i;
  const visit = (entry) => {
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (!entry || typeof entry !== "object") return;
    for (const [key, nested] of Object.entries(entry)) {
      assert.ok(!blocked.test(key), `sensitive payload key must be absent: ${key}`);
      visit(nested);
    }
  };
  visit(value);
}

test("secret-safe quarantine manifest is metadata-only, content-addressed, reversible and non-executable", async () => {
  const planner = await loadPlanner();
  assert.equal(typeof planner.buildSecretSafeQuarantineManifest, "function");

  const transactionManifest = buildTransaction(planner);
  const manifest = planner.buildSecretSafeQuarantineManifest({ transactionManifest });

  assert.deepEqual(manifest.contract, {
    name: "CVGE_SECRET_SAFE_QUARANTINE_MANIFEST",
    version: 1
  });
  assert.deepEqual(manifest.source, transactionManifest.source);
  assert.equal(manifest.policyVersion, "CVGE_REPOSITORY_V1");
  assert.equal(manifest.transactionManifestHash, transactionManifest.manifestHash);
  assert.equal(manifest.executable, false);
  assert.equal(manifest.containsRawContent, false);
  assert.match(manifest.manifestHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(manifest.preconditions, [
    "TRANSACTION_MANIFEST_HASH_MATCH",
    "EXACT_SOURCE_COMMIT_MATCH",
    "EXACT_SOURCE_TREE_MATCH",
    "TARGET_CONTENT_HASH_MATCH",
    "SECRET_SAFE_METADATA_ONLY",
    "QUARANTINE_HASH_VERIFICATION_REQUIRED",
    "RESTORE_REHEARSAL_REQUIRED"
  ]);

  assert.equal(manifest.operations.length, 1);
  const operation = manifest.operations[0];
  assert.equal(operation.assetId, "asset:legacy:secret_bearing_fixture");
  assert.equal(operation.targetPath, "legacy/secret-bearing-fixture.txt");
  assert.equal(operation.expectedContentHash, "a".repeat(64));
  assert.equal(operation.quarantineIntent, "COPY_TO_VERIFIED_QUARANTINE");
  assert.match(operation.quarantineObjectId, /^q-[a-f0-9]{64}$/);
  assert.deepEqual(operation.rollback, {
    required: true,
    method: "CONTENT_ADDRESSED_RESTORE",
    targetPath: "legacy/secret-bearing-fixture.txt",
    expectedContentHash: "a".repeat(64)
  });
  assertNoSensitivePayloadKeys(manifest);
});

test("secret-safe quarantine manifest is deterministic and rejects tampering or raw payload metadata", async () => {
  const planner = await loadPlanner();
  assert.equal(typeof planner.buildSecretSafeQuarantineManifest, "function");

  const transactionManifest = buildTransaction(planner);
  const first = planner.buildSecretSafeQuarantineManifest({ transactionManifest });
  const second = planner.buildSecretSafeQuarantineManifest({ transactionManifest });
  assert.deepEqual(first, second);

  assert.throws(
    () => planner.buildSecretSafeQuarantineManifest({
      transactionManifest: {
        ...transactionManifest,
        manifestHash: "f".repeat(64)
      }
    }),
    /QUARANTINE_MANIFEST_INVALID/
  );

  assert.throws(
    () => planner.buildSecretSafeQuarantineManifest({
      transactionManifest: {
        ...transactionManifest,
        rawContent: "forbidden-payload"
      }
    }),
    /QUARANTINE_MANIFEST_INVALID/
  );

  assert.throws(
    () => planner.buildSecretSafeQuarantineManifest({
      transactionManifest: {
        ...transactionManifest,
        executable: true
      }
    }),
    /QUARANTINE_MANIFEST_INVALID/
  );
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const evaluatorUrl = pathToFileURL(path.resolve(
  __dirname,
  "../project-control/value-governance/evaluator.mjs"
)).href;

async function loadEvaluatorModule() {
  return import(`${evaluatorUrl}?test=${Date.now()}-${Math.random()}`);
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

function asset(overrides = {}) {
  return {
    assetId: "asset:test:candidate",
    type: "generated_artifact",
    path: "generated/candidate.tmp",
    purpose: "Deterministic disposable fixture",
    accountableRole: "OWNER_ROOT",
    actionClass: "A",
    lifecycleState: "DEPRECATION_CANDIDATE",
    protectedObligations: [],
    expectedEvidence: [
      "file_exists",
      "sha256",
      "reference_count",
      "rollback_reproducible"
    ],
    canonicalReplacement: null,
    ...overrides
  };
}

function registry(assets) {
  return {
    registryVersion: "CVGE_ASSET_REGISTRY_V1",
    policyVersion: "CVGE_REPOSITORY_V1",
    completeness: "INITIAL_CRITICAL_ASSETS_ONLY",
    assets
  };
}

function evidenceFor(target, overrides = {}) {
  return {
    assetId: target.assetId,
    path: target.path,
    exists: true,
    kind: "file",
    size: 12,
    sha256: "a".repeat(64),
    referenceCount: 0,
    evidenceCodes: [
      "FILE_EXISTS",
      "REFERENCE_COUNT_COLLECTED",
      "ROLLBACK_REPRODUCIBLE",
      "SHA256_COLLECTED"
    ],
    ...overrides
  };
}

function evidence(assets) {
  return {
    generatedAt: "2026-08-06T06:00:00.000Z",
    assets
  };
}

test("protected Class C assets always remain protected", async () => {
  const { evaluateAssets } = await loadEvaluatorModule();
  const protectedAsset = asset({
    assetId: "asset:test:audit-ledger",
    path: "audit/ledger.log",
    type: "audit_control",
    actionClass: "C",
    lifecycleState: "PROTECTED",
    protectedObligations: ["audit", "legal"],
    expectedEvidence: ["file_exists", "sha256"]
  });

  const decisions = evaluateAssets({
    policy: policy(),
    registry: registry([protectedAsset]),
    evidence: evidence([evidenceFor(protectedAsset)])
  });

  assert.deepEqual(decisions, [{
    assetId: protectedAsset.assetId,
    path: protectedAsset.path,
    currentState: "PROTECTED",
    proposedState: "PROTECTED",
    actionClass: "C",
    decision: "NO_ACTION",
    reasonCodes: ["PROTECTED_OBLIGATION"],
    confidence: 1,
    evidenceHashes: ["a".repeat(64)]
  }]);
  assert.equal(Object.isFrozen(decisions), true);
  assert.equal(Object.isFrozen(decisions[0]), true);
});

test("missing or incomplete evidence never authorizes quarantine or removal", async () => {
  const { evaluateAssets } = await loadEvaluatorModule();
  const candidate = asset();

  const decisions = evaluateAssets({
    policy: policy(),
    registry: registry([candidate]),
    evidence: evidence([evidenceFor(candidate, {
      exists: false,
      kind: "missing",
      size: null,
      sha256: null,
      evidenceCodes: ["ASSET_MISSING"]
    })])
  });

  assert.deepEqual(decisions[0], {
    assetId: candidate.assetId,
    path: candidate.path,
    currentState: "DEPRECATION_CANDIDATE",
    proposedState: "DEPRECATION_CANDIDATE",
    actionClass: "A",
    decision: "NO_ACTION",
    reasonCodes: ["EVIDENCE_INCOMPLETE"],
    confidence: 0,
    evidenceHashes: []
  });
});

test("only fully proven Class A candidates reach REMOVAL_READY", async () => {
  const { evaluateAssets } = await loadEvaluatorModule();
  const candidate = asset();
  const decisions = evaluateAssets({
    policy: policy(),
    registry: registry([candidate]),
    evidence: evidence([evidenceFor(candidate)])
  });

  assert.deepEqual(decisions[0], {
    assetId: candidate.assetId,
    path: candidate.path,
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
    evidenceHashes: ["a".repeat(64)]
  });
});

test("Class B may be quarantined but never marked removal ready in phase one", async () => {
  const { evaluateAssets } = await loadEvaluatorModule();
  const reversible = asset({
    assetId: "asset:test:reversible-job",
    path: "jobs/reversible.mjs",
    type: "scheduled_job",
    actionClass: "B",
    lifecycleState: "DEPRECATION_CANDIDATE"
  });
  const decisions = evaluateAssets({
    policy: policy(),
    registry: registry([reversible]),
    evidence: evidence([evidenceFor(reversible)])
  });

  assert.equal(decisions[0].decision, "QUARANTINE");
  assert.equal(decisions[0].proposedState, "QUARANTINED");
  assert.deepEqual(decisions[0].reasonCodes, ["QUARANTINE_REQUIRED"]);
});

test("unknown or contradictory evidence fails closed", async () => {
  const { evaluateAssets } = await loadEvaluatorModule();
  const candidate = asset();
  const decisions = evaluateAssets({
    policy: policy(),
    registry: registry([candidate]),
    evidence: evidence([evidenceFor(candidate, {
      referenceCount: 2,
      evidenceCodes: [
        "FILE_EXISTS",
        "REFERENCE_COUNT_COLLECTED",
        "ROLLBACK_REPRODUCIBLE",
        "SHA256_COLLECTED",
        "UNTRUSTED_AI_ASSERTION"
      ]
    })])
  });

  assert.equal(decisions[0].decision, "NO_ACTION");
  assert.deepEqual(decisions[0].reasonCodes, ["EVIDENCE_INVALID"]);
});

test("registry and evidence ordering do not change canonical decisions", async () => {
  const { evaluateAssets } = await loadEvaluatorModule();
  const firstAsset = asset({
    assetId: "asset:test:first",
    path: "generated/first.tmp"
  });
  const secondAsset = asset({
    assetId: "asset:test:second",
    path: "generated/second.tmp"
  });
  const firstEvidence = evidenceFor(firstAsset);
  const secondEvidence = evidenceFor(secondAsset);

  const forward = evaluateAssets({
    policy: policy(),
    registry: registry([firstAsset, secondAsset]),
    evidence: evidence([firstEvidence, secondEvidence])
  });
  const reverse = evaluateAssets({
    policy: policy(),
    registry: registry([secondAsset, firstAsset]),
    evidence: evidence([secondEvidence, firstEvidence])
  });

  assert.equal(JSON.stringify(forward), JSON.stringify(reverse));
  assert.deepEqual(forward.map((entry) => entry.assetId), [
    "asset:test:first",
    "asset:test:second"
  ]);
});

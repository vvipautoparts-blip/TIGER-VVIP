import { createHash } from "node:crypto";
import path from "node:path";

import {
  LIFECYCLE_STATES,
  POLICY_VERSION,
  deepFreeze,
  isPlainObject,
  validateAssetId,
  validateSha256
} from "./contracts.mjs";

const TRANSACTION_MANIFEST_CONTRACT = Object.freeze({
  name: "CVGE_CLEANUP_TRANSACTION_MANIFEST",
  version: 1
});

const ANALYSIS_REPORT_CONTRACT = Object.freeze({
  name: "CVGE_ANALYSIS_REPORT",
  version: 1
});

const CLEANUP_PLAN_CONTRACT = Object.freeze({
  name: "CVGE_NON_EXECUTABLE_CLEANUP_PLAN",
  version: 1
});

const MANIFEST_PRECONDITIONS = Object.freeze([
  "EXACT_SOURCE_COMMIT_MATCH",
  "EXACT_SOURCE_TREE_MATCH",
  "ANALYSIS_PLAN_HASH_MATCH",
  "TARGET_CONTENT_HASH_MATCH",
  "CLEAN_WORKTREE_REQUIRED"
]);

const CLEANUP_PLAN_PRECONDITIONS = Object.freeze([
  "ACTION_CLASS_A",
  "DEPENDENCY_FREE",
  "EXPECTED_CONTENT_HASH_MATCH",
  "POLICY_ANALYSIS_ONLY",
  "ROLLBACK_REPRODUCIBLE"
]);

const CLEANUP_PLAN_POSTCONDITIONS = Object.freeze([
  "AUDIT_APPEND_REQUIRED",
  "QUALITY_GATES_REQUIRED",
  "WORKTREE_CHANGE_REVIEW_REQUIRED"
]);

const REQUIRED_REMOVAL_REASONS = Object.freeze([
  "DEPENDENCY_FREE",
  "ROLLBACK_REPRODUCIBLE",
  "VALUE_NOT_PRESENT"
]);

const GIT_OBJECT_ID_PATTERN = /^[a-f0-9]{40}$/;

function fail() {
  throw new TypeError("TRANSACTION_MANIFEST_INVALID");
}

function assertExactKeys(value, expected) {
  if (!isPlainObject(value)) fail();
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])) {
    fail();
  }
}

function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail();
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (!isPlainObject(value)) fail();

  const normalized = {};
  for (const key of Object.keys(value).sort()) {
    normalized[key] = canonicalize(value[key]);
  }
  return normalized;
}

function hashCanonical(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");
}

function isSafeRepositoryPath(value) {
  if (typeof value !== "string"
    || value.length === 0
    || value.length > 512
    || value !== value.trim()
    || value.includes("\0")
    || value.includes("\\")
    || path.posix.isAbsolute(value)
    || path.win32.isAbsolute(value)) {
    return false;
  }
  const segments = value.split("/");
  return segments.length > 0
    && segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function validateGitObjectId(value) {
  if (typeof value !== "string" || !GIT_OBJECT_ID_PATTERN.test(value)) fail();
  return value;
}

function equalStringArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function validateCleanupPlan(plan) {
  assertExactKeys(plan, [
    "contract",
    "assetId",
    "targetPath",
    "actionClass",
    "currentState",
    "proposedState",
    "expectedContentHash",
    "reasonCodes",
    "preconditions",
    "postconditions",
    "rollback",
    "executable",
    "planHash"
  ]);
  assertExactKeys(plan.contract, ["name", "version"]);
  assertExactKeys(plan.rollback, ["required", "method"]);

  if (plan.contract.name !== CLEANUP_PLAN_CONTRACT.name
    || plan.contract.version !== CLEANUP_PLAN_CONTRACT.version
    || !validateAssetId(plan.assetId)
    || !isSafeRepositoryPath(plan.targetPath)
    || plan.actionClass !== "A"
    || !LIFECYCLE_STATES.includes(plan.currentState)
    || plan.proposedState !== "REMOVAL_READY"
    || !validateSha256(plan.expectedContentHash)
    || !validateSha256(plan.planHash)
    || plan.executable !== false
    || plan.rollback.required !== true
    || plan.rollback.method !== "CONTENT_ADDRESSED_RESTORE"
    || !equalStringArray(plan.preconditions, CLEANUP_PLAN_PRECONDITIONS)
    || !equalStringArray(plan.postconditions, CLEANUP_PLAN_POSTCONDITIONS)
    || !Array.isArray(plan.reasonCodes)
    || plan.reasonCodes.length === 0
    || plan.reasonCodes.some((reason) => typeof reason !== "string")
    || REQUIRED_REMOVAL_REASONS.some((reason) => !plan.reasonCodes.includes(reason))) {
    fail();
  }

  const semanticPlan = {
    contract: plan.contract,
    assetId: plan.assetId,
    targetPath: plan.targetPath,
    actionClass: plan.actionClass,
    currentState: plan.currentState,
    proposedState: plan.proposedState,
    expectedContentHash: plan.expectedContentHash,
    reasonCodes: plan.reasonCodes,
    preconditions: plan.preconditions,
    postconditions: plan.postconditions,
    rollback: plan.rollback,
    executable: plan.executable
  };
  if (hashCanonical(semanticPlan) !== plan.planHash) fail();

  return plan;
}

function validateAnalysisReport(report) {
  assertExactKeys(report, [
    "contract",
    "policyVersion",
    "generatedAt",
    "summary",
    "decisions",
    "cleanupPlans",
    "planHash"
  ]);
  assertExactKeys(report.contract, ["name", "version"]);

  if (report.contract.name !== ANALYSIS_REPORT_CONTRACT.name
    || report.contract.version !== ANALYSIS_REPORT_CONTRACT.version
    || report.policyVersion !== POLICY_VERSION
    || !validateSha256(report.planHash)
    || !Array.isArray(report.decisions)
    || !Array.isArray(report.cleanupPlans)
    || report.cleanupPlans.length === 0
    || report.cleanupPlans.length > 10_000) {
    fail();
  }

  const semanticProjection = {
    contract: report.contract,
    policyVersion: report.policyVersion,
    decisions: report.decisions,
    cleanupPlans: report.cleanupPlans
  };
  if (hashCanonical(semanticProjection) !== report.planHash) fail();

  const plans = report.cleanupPlans.map((plan) => validateCleanupPlan(plan));
  const assetIds = plans.map((plan) => plan.assetId);
  const targetPaths = plans.map((plan) => plan.targetPath);
  if (new Set(assetIds).size !== assetIds.length
    || new Set(targetPaths).size !== targetPaths.length) {
    fail();
  }

  return plans;
}

export function buildCleanupTransactionManifest({
  analysisReport,
  sourceCommitSha,
  sourceTreeSha
} = {}) {
  const plans = validateAnalysisReport(analysisReport)
    .slice()
    .sort((left, right) => left.assetId.localeCompare(right.assetId));

  const source = {
    commitSha: validateGitObjectId(sourceCommitSha),
    treeSha: validateGitObjectId(sourceTreeSha)
  };

  const operations = plans.map((plan) => ({
    assetId: plan.assetId,
    targetPath: plan.targetPath,
    intent: "PREPARE_REMOVAL",
    expectedContentHash: plan.expectedContentHash,
    cleanupPlanHash: plan.planHash,
    rollback: {
      required: true,
      method: "CONTENT_ADDRESSED_RESTORE"
    }
  }));

  const semanticManifest = {
    contract: TRANSACTION_MANIFEST_CONTRACT,
    source,
    policyVersion: analysisReport.policyVersion,
    analysisPlanHash: analysisReport.planHash,
    preconditions: MANIFEST_PRECONDITIONS,
    operations,
    executable: false
  };

  return deepFreeze({
    ...semanticManifest,
    manifestHash: hashCanonical(semanticManifest)
  });
}

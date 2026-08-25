import { createHash } from "node:crypto";
import path from "node:path";

import {
  ACTION_CLASSES,
  LIFECYCLE_STATES,
  deepFreeze,
  isPlainObject,
  validateAssetId,
  validateSha256
} from "./contracts.mjs";
import { validatePolicy } from "./registry.mjs";

const REPORT_CONTRACT = Object.freeze({
  name: "CVGE_ANALYSIS_REPORT",
  version: 1
});

const CLEANUP_PLAN_CONTRACT = Object.freeze({
  name: "CVGE_NON_EXECUTABLE_CLEANUP_PLAN",
  version: 1
});

const DECISIONS = new Set([
  "NO_ACTION",
  "PREPARE_REMOVAL",
  "QUARANTINE"
]);

const PRECONDITIONS = Object.freeze([
  "ACTION_CLASS_A",
  "DEPENDENCY_FREE",
  "EXPECTED_CONTENT_HASH_MATCH",
  "POLICY_ANALYSIS_ONLY",
  "ROLLBACK_REPRODUCIBLE"
]);

const POSTCONDITIONS = Object.freeze([
  "AUDIT_APPEND_REQUIRED",
  "QUALITY_GATES_REQUIRED",
  "WORKTREE_CHANGE_REVIEW_REQUIRED"
]);

function boundedText(value, max) {
  return typeof value === "string"
    && value === value.trim()
    && value.length > 0
    && value.length <= max;
}

function isSafeRepositoryPath(value) {
  if (!boundedText(value, 512)
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

function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("ANALYSIS_DECISION_INVALID");
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (!isPlainObject(value)) throw new TypeError("ANALYSIS_DECISION_INVALID");

  const normalized = {};
  for (const key of Object.keys(value).sort()) {
    normalized[key] = canonicalize(value[key]);
  }
  return normalized;
}

function hashCanonical(value) {
  const canonicalJson = JSON.stringify(canonicalize(value));
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

function uniqueSortedTextList(value, maxItems, maxLength) {
  if (!Array.isArray(value)
    || value.length === 0
    || value.length > maxItems
    || value.some((entry) => !boundedText(entry, maxLength))) {
    throw new TypeError("ANALYSIS_DECISION_INVALID");
  }
  const sorted = [...value].sort();
  if (new Set(sorted).size !== sorted.length) {
    throw new TypeError("ANALYSIS_DECISION_INVALID");
  }
  return Object.freeze(sorted);
}

function normalizeDecision(value) {
  if (!isPlainObject(value)
    || !validateAssetId(value.assetId)
    || !LIFECYCLE_STATES.includes(value.currentState)
    || !LIFECYCLE_STATES.includes(value.proposedState)
    || !ACTION_CLASSES.includes(value.actionClass)
    || !DECISIONS.has(value.decision)
    || typeof value.confidence !== "number"
    || !Number.isFinite(value.confidence)
    || value.confidence < 0
    || value.confidence > 1) {
    throw new TypeError("ANALYSIS_DECISION_INVALID");
  }
  if (!isSafeRepositoryPath(value.path)) throw new TypeError("PATH_ESCAPE_DENIED");

  const reasonCodes = uniqueSortedTextList(value.reasonCodes, 32, 96);
  if (!Array.isArray(value.evidenceHashes) || value.evidenceHashes.length > 32) {
    throw new TypeError("ANALYSIS_DECISION_INVALID");
  }
  const evidenceHashes = [...value.evidenceHashes].sort();
  if (evidenceHashes.some((entry) => !validateSha256(entry))
    || new Set(evidenceHashes).size !== evidenceHashes.length) {
    throw new TypeError("ANALYSIS_DECISION_INVALID");
  }

  if (value.actionClass === "A"
    && value.decision === "PREPARE_REMOVAL"
    && value.proposedState !== "REMOVAL_READY") {
    throw new TypeError("ANALYSIS_DECISION_INVALID");
  }
  if (value.actionClass === "B"
    && (value.decision !== "QUARANTINE" || value.proposedState !== "QUARANTINED")) {
    throw new TypeError("ANALYSIS_DECISION_INVALID");
  }
  if (value.actionClass === "C"
    && (value.decision !== "NO_ACTION" || value.proposedState !== "PROTECTED")) {
    throw new TypeError("ANALYSIS_DECISION_INVALID");
  }

  return deepFreeze({
    assetId: value.assetId,
    path: value.path,
    currentState: value.currentState,
    proposedState: value.proposedState,
    actionClass: value.actionClass,
    decision: value.decision,
    reasonCodes,
    confidence: value.confidence,
    evidenceHashes
  });
}

function validateGeneratedAt(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError("ANALYSIS_REPORT_INVALID");
  }
  return value;
}

function summarize(decisions) {
  return Object.freeze({
    total: decisions.length,
    noAction: decisions.filter((entry) => entry.decision === "NO_ACTION").length,
    quarantine: decisions.filter((entry) => entry.decision === "QUARANTINE").length,
    prepareRemoval: decisions.filter((entry) => entry.decision === "PREPARE_REMOVAL").length
  });
}

export function buildAnalysisReport({ policy, decisions, generatedAt } = {}) {
  const policyDecision = validatePolicy(policy);
  if (!policyDecision.ok) throw new TypeError(policyDecision.code);
  if (!Array.isArray(decisions) || decisions.length > 10_000) {
    throw new TypeError("ANALYSIS_REPORT_INVALID");
  }

  const normalizedDecisions = decisions
    .map((entry) => normalizeDecision(entry))
    .sort((left, right) => left.assetId.localeCompare(right.assetId));
  if (new Set(normalizedDecisions.map((entry) => entry.assetId)).size !== normalizedDecisions.length) {
    throw new TypeError("ANALYSIS_REPORT_INVALID");
  }

  const cleanupPlans = normalizedDecisions
    .map((decision) => buildNonExecutableCleanupPlan(decision))
    .filter((plan) => plan !== null)
    .sort((left, right) => left.assetId.localeCompare(right.assetId));

  const semanticProjection = {
    contract: REPORT_CONTRACT,
    policyVersion: policy.policyVersion,
    decisions: normalizedDecisions,
    cleanupPlans
  };

  return deepFreeze({
    contract: REPORT_CONTRACT,
    policyVersion: policy.policyVersion,
    generatedAt: validateGeneratedAt(generatedAt),
    summary: summarize(normalizedDecisions),
    decisions: normalizedDecisions,
    cleanupPlans,
    planHash: hashCanonical(semanticProjection)
  });
}

export function buildNonExecutableCleanupPlan(decision) {
  const normalized = normalizeDecision(decision);
  if (normalized.actionClass !== "A"
    || normalized.decision !== "PREPARE_REMOVAL"
    || normalized.proposedState !== "REMOVAL_READY") {
    return null;
  }

  const requiredReasons = [
    "DEPENDENCY_FREE",
    "ROLLBACK_REPRODUCIBLE",
    "VALUE_NOT_PRESENT"
  ];
  if (normalized.confidence !== 1
    || normalized.evidenceHashes.length !== 1
    || requiredReasons.some((reason) => !normalized.reasonCodes.includes(reason))) {
    throw new TypeError("ANALYSIS_DECISION_INVALID");
  }

  const semanticPlan = {
    contract: CLEANUP_PLAN_CONTRACT,
    assetId: normalized.assetId,
    targetPath: normalized.path,
    actionClass: "A",
    currentState: normalized.currentState,
    proposedState: normalized.proposedState,
    expectedContentHash: normalized.evidenceHashes[0],
    reasonCodes: normalized.reasonCodes,
    preconditions: PRECONDITIONS,
    postconditions: POSTCONDITIONS,
    rollback: {
      required: true,
      method: "CONTENT_ADDRESSED_RESTORE"
    },
    executable: false
  };

  return deepFreeze({
    ...semanticPlan,
    planHash: hashCanonical(semanticPlan)
  });
}

export { buildCleanupTransactionManifest } from "./transaction-manifest.mjs";
export { buildSecretSafeQuarantineManifest } from "./quarantine-manifest.mjs";
